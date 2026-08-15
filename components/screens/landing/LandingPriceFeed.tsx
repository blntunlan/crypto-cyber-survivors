import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  marketApiClient,
  type MarketHistoryRow,
} from '../../../services/api/MarketApiClient';
import {
  SSEMarketService,
  type SSEConnectionStatus,
  type SSEMarketUpdate,
} from '../../../services/market/SSEMarketService';

type FeedStatus = 'connecting' | 'live' | 'cached';

export type LandingMarketPoint = {
  price: number;
  volume: number;
  rsi: number;
  atrPercent: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: number;
  trendStrength: number;
  trendDirection: string;
  timestamp: number;
  isSynthetic: boolean;
  hasIndicators: boolean;
};

type ForecastBias = 'Bull pressure' | 'Bear pressure' | 'Chop zone';

type Forecast = {
  bias: ForecastBias;
  confidence: number;
  projectedLow: number;
  projectedHigh: number;
  score: number;
  reasons: [string, string, string];
};

const MAX_FEED_POINTS = 48;
const HISTORY_FETCH_LIMIT = 300;
const HISTORY_WINDOW_HOURS = 24;
const MAX_HISTORY_AGE_MS = HISTORY_WINDOW_HOURS * 60 * 60 * 1000;
const FULL_DAY_TOLERANCE_MS = 45 * 60 * 1000; // 45 min tolerance for 24h label

const FEED_STATUS_COPY: Record<FeedStatus, string> = {
  connecting: 'SYNCING',
  live: 'LIVE',
  cached: 'CACHED',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Calculates the UTC 00:00:00 timestamp for a given reference timestamp.
 */
const getUtc0Timestamp = (referenceTimestamp: number = Date.now()): number => {
  const d = new Date(referenceTimestamp);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
};

/**
 * Resolves the baseline price for daily calculations.
 * In crypto markets, daily performance is anchored to UTC 00:00:00 (the official 1D open candle).
 * If data covers UTC 00:00, the closest price point to UTC 00:00 is used.
 * Otherwise, the earliest available price in the dataset is used.
 */
const getDailyOpenPrice = (
  points: LandingMarketPoint[],
  referenceTimestamp: number = Date.now()
): { price: number; timestamp: number; isUtc0: boolean } => {
  if (points.length === 0) {
    return { price: 0, timestamp: 0, isUtc0: false };
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (!firstPoint || !lastPoint) {
    return { price: 0, timestamp: 0, isUtc0: false };
  }

  const utc0 = getUtc0Timestamp(referenceTimestamp);

  // If the dataset doesn't cross UTC 00:00 (e.g. data starts after UTC 00:00 + 15m),
  // use the earliest data point as the window's open price.
  if (firstPoint.timestamp > utc0 + 15 * 60 * 1000 || lastPoint.timestamp < utc0) {
    return { price: firstPoint.price, timestamp: firstPoint.timestamp, isUtc0: false };
  }

  // Find the point closest to UTC 00:00:00
  let bestPoint = firstPoint;
  let bestDiff = Math.abs(firstPoint.timestamp - utc0);

  for (const point of points) {
    const diff = Math.abs(point.timestamp - utc0);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestPoint = point;
    }
  }

  return { price: bestPoint.price, timestamp: bestPoint.timestamp, isUtc0: true };
};

const normalizeTrendDirection = (direction: string): 'up' | 'down' | 'sideways' => {
  const normalized = direction.toUpperCase();
  if (normalized.includes('UP') || normalized.includes('BULL')) return 'up';
  if (normalized.includes('DOWN') || normalized.includes('BEAR')) return 'down';
  return 'sideways';
};

const formatCompactPrice = (price: number): string => {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(price).toLocaleString('en-US')}`;
};

const formatFullPrice = (price: number): string =>
  `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDisplayPrice = (
  price: number,
  status: FeedStatus,
  isSimulated: boolean = false
): string =>
  (status === 'connecting' && !isSimulated) || price <= 0
    ? 'SYNCING'
    : formatFullPrice(price);

const formatPercent = (value: number): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const formatDeltaDollar = (delta: number): string =>
  `${delta >= 0 ? '+' : '-'}$${Math.abs(delta).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTimeAgo = (timestamp: number, now: number): string => {
  const diffSec = Math.max(Math.round((now - timestamp) / 1000), 0);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ${diffMin % 60}m ago`;
};

const formatClockTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const EMPTY_POINT: LandingMarketPoint = {
  price: 0,
  volume: 0,
  rsi: 50,
  atrPercent: 0,
  normalizedVolume: 0,
  volumePercentile: 0,
  whaleTier: 0,
  trendStrength: 0,
  trendDirection: 'SIDEWAYS',
  timestamp: 0,
  isSynthetic: false,
  hasIndicators: false,
};

const getHistoryTrend = (price: number, previousPrice: number): string => {
  if (previousPrice <= 0) return 'SIDEWAYS';
  const changePercent = ((price - previousPrice) / previousPrice) * 100;
  return changePercent > 0.16
    ? 'UPTREND'
    : changePercent < -0.16
      ? 'DOWNTREND'
      : 'SIDEWAYS';
};

const fromHistoryRows = (rows: MarketHistoryRow[]): LandingMarketPoint[] =>
  rows.map((row, index) => {
    const previousRow = rows[index - 1];
    return {
      price: row.price,
      volume: row.volume,
      rsi: 50,
      atrPercent: 0.0028,
      normalizedVolume: row.volume > 0 ? 1 : 0,
      volumePercentile: row.volume > 0 ? 0.5 : 0,
      whaleTier: 0,
      trendStrength: previousRow
        ? clamp(
            Math.abs(((row.price - previousRow.price) / previousRow.price) * 100) * 6.5,
            0,
            1
          )
        : 0,
      trendDirection: getHistoryTrend(row.price, previousRow?.price ?? 0),
      timestamp: row.timestamp,
      isSynthetic: false,
      hasIndicators: false,
    };
  });

const fromSseUpdate = (update: SSEMarketUpdate): LandingMarketPoint => ({
  price: update.price,
  volume: update.volume,
  rsi: clamp(update.rsi, 0, 100),
  atrPercent: update.atrPercent > 0 ? clamp(update.atrPercent, 0.001, 0.02) : 0.0028,
  normalizedVolume:
    update.normalizedVolume > 0 ? clamp(update.normalizedVolume, 0.1, 3) : 1,
  volumePercentile: clamp(update.volumePercentile, 0, 1),
  whaleTier: Math.trunc(clamp(update.whaleTier, 0, 3)),
  trendStrength: clamp(update.trendStrength, 0, 1),
  trendDirection: update.trendDirection,
  timestamp: update.timestamp,
  isSynthetic: update.isSynthetic ?? false,
  hasIndicators: !(update.isSynthetic ?? false),
});

const trimTo24Hours = (
  points: LandingMarketPoint[],
  referenceTimestamp: number
): LandingMarketPoint[] =>
  points.filter(point => point.timestamp >= referenceTimestamp - MAX_HISTORY_AGE_MS);

const getLatestPoint = (points: LandingMarketPoint[]): LandingMarketPoint =>
  points[points.length - 1] ?? EMPTY_POINT;

const getPreviousPoint = (points: LandingMarketPoint[]): LandingMarketPoint =>
  points[points.length - 2] ?? getLatestPoint(points);

type ChartBucket = {
  slot: number;
  price: number;
  volume: number;
  timestamp: number;
  open: number;
};

/**
 * Collapses points into equal time slices.
 */
const bucketPointsByTime = (
  points: LandingMarketPoint[],
  bucketCount: number
): ChartBucket[] => {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (!firstPoint || !lastPoint) return [];

  const span = lastPoint.timestamp - firstPoint.timestamp;
  if (span <= 0) {
    return [
      {
        slot: bucketCount - 1,
        price: lastPoint.price,
        volume: lastPoint.volume,
        timestamp: lastPoint.timestamp,
        open: lastPoint.price,
      },
    ];
  }

  const closes = new Float64Array(bucketCount);
  const opens = new Float64Array(bucketCount);
  const volumeSums = new Float64Array(bucketCount);
  const sampleCounts = new Uint32Array(bucketCount);
  const timestamps = new Float64Array(bucketCount);

  for (const point of points) {
    const slot = clamp(
      Math.floor(((point.timestamp - firstPoint.timestamp) / span) * bucketCount),
      0,
      bucketCount - 1
    );

    if (sampleCounts[slot] === 0) {
      opens[slot] = point.price;
    }
    closes[slot] = point.price;
    volumeSums[slot] = (volumeSums[slot] ?? 0) + point.volume;
    sampleCounts[slot] = (sampleCounts[slot] ?? 0) + 1;
    timestamps[slot] = point.timestamp;
  }

  const buckets: ChartBucket[] = [];
  let carriedClose = firstPoint.price;

  for (let slot = 0; slot < bucketCount; slot++) {
    const sampleCount = sampleCounts[slot] ?? 0;
    const bucketTime = firstPoint.timestamp + (slot / (bucketCount - 1)) * span;

    if (sampleCount === 0) {
      if (carriedClose > 0) {
        buckets.push({
          slot,
          price: carriedClose,
          volume: 0,
          timestamp: bucketTime,
          open: carriedClose,
        });
      }
      continue;
    }

    carriedClose = closes[slot] ?? carriedClose;
    buckets.push({
      slot,
      price: carriedClose,
      volume: (volumeSums[slot] ?? 0) / sampleCount,
      timestamp: timestamps[slot] ?? bucketTime,
      open: opens[slot] ?? carriedClose,
    });
  }

  return buckets;
};

type ChartCoordinate = {
  x: number;
  y: number;
  price: number;
  volume: number;
  timestamp: number;
  isUp: boolean;
};

type ChartGridLevel = { y: number; label: string; price: number };

type ChartVolumeBar = {
  x: number;
  width: number;
  y: number;
  height: number;
  isUp: boolean;
};

type ChartModel = {
  coordinates: ChartCoordinate[];
  linePath: string;
  areaPath: string;
  gridLevels: ChartGridLevel[];
  volumeBars: ChartVolumeBar[];
  livePriceY: number;
  axisRange: number;
  windowChangePercent: number;
  windowChangeDollar: number;
  high24h: number;
  low24h: number;
  openPrice: number;
  isUtc0Open: boolean;
  utc0MarkerX: number | null;
  totalVolume: number;
  isWindowUp: boolean;
  windowLabel: '24H' | 'WINDOW';
};

const CHART_PRICE_TOP_Y = 10;
const CHART_PRICE_BOTTOM_Y = 74;
const CHART_AREA_BASE_Y = 78;
const CHART_VOLUME_MAX_HEIGHT = 16;
const CHART_VOLUME_BASE_Y = 98;

const EMPTY_CHART_MODEL: ChartModel = {
  coordinates: [],
  linePath: '',
  areaPath: '',
  gridLevels: [],
  volumeBars: [],
  livePriceY: 50,
  axisRange: 0,
  windowChangePercent: 0,
  windowChangeDollar: 0,
  high24h: 0,
  low24h: 0,
  openPrice: 0,
  isUtc0Open: false,
  utc0MarkerX: null,
  totalVolume: 0,
  isWindowUp: true,
  windowLabel: 'WINDOW',
};

const formatAxisPrice = (price: number, windowRange: number): string => {
  if (price < 10) {
    return `$${price.toFixed(3)}`;
  }
  if (price < 1000) {
    return `$${price.toFixed(windowRange < 5 ? 2 : 0)}`;
  }
  if (windowRange < 150) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  }
  return `$${Math.round(price).toLocaleString('en-US')}`;
};

/**
 * Exact Fritsch-Carlson Monotone Cubic Spline interpolation.
 * Prevents artificial overshoots on price peaks and troughs.
 */
const buildMonotonePath = (coordinates: ChartCoordinate[]): string => {
  const n = coordinates.length;
  if (n === 0) return '';
  const first = coordinates[0];
  if (!first) return '';
  if (n === 1) return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

  if (n === 2) {
    const second = coordinates[1];
    if (!second) return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
    return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}`;
  }

  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;

  const dxs = new Float64Array(n - 1);
  const dys = new Float64Array(n - 1);
  const slopes = new Float64Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    const curr = coordinates[i];
    const next = coordinates[i + 1];
    if (!curr || !next) continue;
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    dxs[i] = dx;
    dys[i] = dy;
    slopes[i] = dx !== 0 ? dy / dx : 0;
  }

  const tangents = new Float64Array(n);
  tangents[0] = slopes[0] ?? 0;
  tangents[n - 1] = slopes[n - 2] ?? 0;

  for (let i = 1; i < n - 1; i++) {
    const m0 = slopes[i - 1] ?? 0;
    const m1 = slopes[i] ?? 0;
    if (m0 * m1 <= 0) {
      tangents[i] = 0;
    } else {
      const dx0 = dxs[i - 1] ?? 1;
      const dx1 = dxs[i] ?? 1;
      tangents[i] = (3 * (dx0 + dx1)) / ((2 * dx1 + dx0) / m0 + (dx1 + 2 * dx0) / m1);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const p0 = coordinates[i];
    const p1 = coordinates[i + 1];
    if (!p0 || !p1) continue;
    const dx = dxs[i] ?? 1;
    const t0 = tangents[i] ?? 0;
    const t1 = tangents[i + 1] ?? 0;

    const cp1x = p0.x + dx / 3;
    const cp1y = p0.y + (t0 * dx) / 3;
    const cp2x = p1.x - dx / 3;
    const cp2y = p1.y - (t1 * dx) / 3;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  return path;
};

const buildChartModel = (allPoints: LandingMarketPoint[]): ChartModel => {
  const buckets = bucketPointsByTime(allPoints, MAX_FEED_POINTS);
  const firstBucket = buckets[0];
  const lastBucket = buckets[buckets.length - 1];
  if (!firstBucket || !lastBucket) return EMPTY_CHART_MODEL;

  const prices = buckets.map(bucket => bucket.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(maxPrice - minPrice, maxPrice * 0.0006, 1);

  const toY = (price: number): number =>
    CHART_PRICE_TOP_Y +
    ((maxPrice - price) / priceRange) * (CHART_PRICE_BOTTOM_Y - CHART_PRICE_TOP_Y);

  const toX = (slot: number): number => (slot / Math.max(MAX_FEED_POINTS - 1, 1)) * 100;

  const coordinates: ChartCoordinate[] = buckets.map((bucket, index) => {
    const prev = buckets[index - 1] ?? bucket;
    return {
      x: toX(bucket.slot),
      y: toY(bucket.price),
      price: bucket.price,
      volume: bucket.volume,
      timestamp: bucket.timestamp,
      isUp: bucket.price >= prev.price,
    };
  });

  const linePath = buildMonotonePath(coordinates);

  const lastCoord = coordinates[coordinates.length - 1];
  const firstCoord = coordinates[0];
  const areaPath = linePath
    ? `${linePath} L ${lastCoord?.x.toFixed(2) ?? 100} ${CHART_AREA_BASE_Y} L ${firstCoord?.x.toFixed(2) ?? 0} ${CHART_AREA_BASE_Y} Z`
    : '';

  const gridSteps = 4;
  const gridLevels: ChartGridLevel[] = Array.from({ length: gridSteps }, (_, i) => {
    const p = maxPrice - (i / (gridSteps - 1)) * (maxPrice - minPrice);
    return {
      y: toY(p),
      price: p,
      label: formatAxisPrice(p, maxPrice - minPrice),
    };
  });

  const maxVolume = Math.max(...buckets.map(bucket => bucket.volume), Number.EPSILON);
  const slotWidth = 100 / MAX_FEED_POINTS;

  const volumeBars: ChartVolumeBar[] = buckets.map((bucket, index) => {
    const height = Math.max((bucket.volume / maxVolume) * CHART_VOLUME_MAX_HEIGHT, 1.2);
    return {
      x: toX(bucket.slot) - slotWidth * 0.4,
      width: slotWidth * 0.8,
      y: CHART_VOLUME_BASE_Y - height,
      height,
      isUp: coordinates[index]?.isUp ?? true,
    };
  });

  const firstPoint = allPoints[0];
  const lastPoint = allPoints[allPoints.length - 1];
  const refTime = lastPoint?.timestamp ?? Date.now();
  const utc0 = getUtc0Timestamp(refTime);

  const dailyOpen = getDailyOpenPrice(allPoints, refTime);
  const openPrice = dailyOpen.price > 0 ? dailyOpen.price : firstBucket.price;
  const lastPrice = lastBucket.price;
  const priceDelta = lastPrice - openPrice;

  const windowDuration =
    firstPoint && lastPoint ? lastPoint.timestamp - firstPoint.timestamp : 0;

  const utc0MarkerX =
    firstPoint &&
    lastPoint &&
    windowDuration > 0 &&
    utc0 >= firstPoint.timestamp &&
    utc0 <= lastPoint.timestamp
      ? ((utc0 - firstPoint.timestamp) / windowDuration) * 100
      : null;

  const totalVolume = allPoints.reduce((sum, p) => sum + p.volume, 0);

  return {
    coordinates,
    linePath,
    areaPath,
    gridLevels,
    volumeBars,
    livePriceY: lastCoord?.y ?? 50,
    axisRange: maxPrice - minPrice,
    windowChangePercent: openPrice > 0 ? (priceDelta / openPrice) * 100 : 0,
    windowChangeDollar: priceDelta,
    high24h: maxPrice,
    low24h: minPrice,
    openPrice,
    isUtc0Open: dailyOpen.isUtc0,
    utc0MarkerX,
    totalVolume,
    isWindowUp: lastPrice >= openPrice,
    windowLabel:
      windowDuration >= MAX_HISTORY_AGE_MS - FULL_DAY_TOLERANCE_MS ? '24H' : 'WINDOW',
  };
};

const buildForecast = (points: LandingMarketPoint[]): Forecast => {
  const latestPoint = getLatestPoint(points);
  const previousPoint = getPreviousPoint(points);
  const trend = normalizeTrendDirection(latestPoint.trendDirection);
  const priceDeltaPercent =
    previousPoint.price > 0
      ? ((latestPoint.price - previousPoint.price) / previousPoint.price) * 100
      : 0;
  const trendSign = trend === 'up' ? 1 : trend === 'down' ? -1 : 0;
  const momentumScore = clamp(priceDeltaPercent * 620, -32, 32);
  const rsiScore = clamp((latestPoint.rsi - 50) * 1.08, -30, 30);
  const trendScore = trendSign * clamp(latestPoint.trendStrength * 34, 0, 34);
  const volumeScore =
    trendSign *
    clamp(
      (latestPoint.normalizedVolume - 1) * 18 +
        latestPoint.volumePercentile * 10 +
        latestPoint.whaleTier * 6,
      0,
      24
    );
  const score = clamp(momentumScore + rsiScore + trendScore + volumeScore, -100, 100);
  const bias: ForecastBias =
    score > 18 ? 'Bull pressure' : score < -18 ? 'Bear pressure' : 'Chop zone';
  const confidence = Math.round(
    clamp(
      46 +
        Math.abs(score) * 0.3 +
        clamp(latestPoint.atrPercent * 1200, 0, 12) +
        clamp(latestPoint.volumePercentile * 8, 0, 8),
      42,
      88
    )
  );
  const rangePercent =
    clamp(latestPoint.atrPercent, 0.0014, 0.014) *
    (1 + latestPoint.normalizedVolume * 0.16);
  const projectedLow = latestPoint.price * (1 - rangePercent);
  const projectedHigh = latestPoint.price * (1 + rangePercent);
  const rsiReason =
    latestPoint.rsi >= 62
      ? 'RSI hot'
      : latestPoint.rsi <= 38
        ? 'RSI cold'
        : 'RSI neutral';
  const atrReason = latestPoint.atrPercent >= 0.0045 ? 'ATR rising' : 'ATR quiet';
  const volumeReason =
    latestPoint.whaleTier >= 2
      ? 'whale volume'
      : latestPoint.normalizedVolume >= 1.2
        ? 'volume lift'
        : 'thin tape';

  return {
    bias,
    confidence,
    projectedLow,
    projectedHigh,
    score: Number(score.toFixed(1)),
    reasons: [rsiReason, atrReason, volumeReason],
  };
};

const getBiasTone = (bias: ForecastBias): string => {
  if (bias === 'Bull pressure') {
    return 'border-[#22c55e]/45 bg-[#22c55e]/10 text-[#6ee7b7]';
  }
  if (bias === 'Bear pressure') {
    return 'border-[#b22222]/55 bg-[#b22222]/15 text-[#ff7777]';
  }
  return 'border-[#d6b85c]/45 bg-[#d6b85c]/10 text-[#ffd86a]';
};

type SimMode = 'live' | 'pump' | 'dump' | 'volatility';

type HoveredPoint = {
  x: number;
  y: number;
  price: number;
  volume: number;
  timestamp: number;
  changePercent: number;
  changeDollar: number;
};

export const LandingPriceFeed: React.FC = () => {
  const [points, setPoints] = useState<LandingMarketPoint[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const [simMode, setSimMode] = useState<SimMode>('live');
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const feedStatusRef = useRef<FeedStatus>('connecting');
  const hasLiveDataRef = useRef(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedStatusRef.current = feedStatus;
  }, [feedStatus]);

  useEffect(() => {
    let isCancelled = false;

    void marketApiClient
      .getHistory('BTC', HISTORY_FETCH_LIMIT, HISTORY_WINDOW_HOURS)
      .then(history => {
        if (isCancelled) return;
        const historyPoints = fromHistoryRows(history);
        const latestHistoryTimestamp =
          historyPoints[historyPoints.length - 1]?.timestamp ?? Date.now();
        setPoints(currentPoints =>
          trimTo24Hours(
            [
              ...historyPoints,
              ...currentPoints.filter(
                point => point.timestamp > latestHistoryTimestamp
              ),
            ],
            latestHistoryTimestamp
          )
        );
      })
      .catch(() => {
        // Fallback: live stream provides updates
      });

    const service = new SSEMarketService({
      pair: 'BTC',
      onData: update => {
        const nextPoint = fromSseUpdate(update);
        if (!nextPoint.isSynthetic) {
          hasLiveDataRef.current = true;
        }
        setPoints(currentPoints => {
          return trimTo24Hours([...currentPoints, nextPoint], nextPoint.timestamp);
        });
        setFeedStatus(update.isSynthetic ? 'cached' : 'live');
      },
      onStatusChange: (status: SSEConnectionStatus) => {
        if (status.state === 'connected') {
          setFeedStatus(
            status.isUsingFallbackData
              ? 'cached'
              : hasLiveDataRef.current
                ? 'live'
                : 'connecting'
          );
          return;
        }

        if (feedStatusRef.current !== 'live' && feedStatusRef.current !== 'cached') {
          setFeedStatus('connecting');
        }
      },
    });

    service.connect();

    return () => {
      isCancelled = true;
      service.disconnect();
    };
  }, []);

  const displayPoints = useMemo(() => {
    if (simMode === 'live' || points.length === 0) return points;
    const basePoint = points[points.length - 1] ?? EMPTY_POINT;
    const basePrice = basePoint.price > 0 ? basePoint.price : 64000;

    if (simMode === 'pump') {
      const simPrice = basePrice * 1.054;
      const simPoint: LandingMarketPoint = {
        ...basePoint,
        price: simPrice,
        rsi: 78.4,
        atrPercent: 0.0058,
        normalizedVolume: 2.6,
        volumePercentile: 0.92,
        whaleTier: 2,
        trendStrength: 0.88,
        trendDirection: 'UPTREND',
        hasIndicators: true,
        timestamp: Date.now(),
      };
      return [...points.slice(0, -1), simPoint];
    }
    if (simMode === 'dump') {
      const simPrice = basePrice * 0.918;
      const simPoint: LandingMarketPoint = {
        ...basePoint,
        price: simPrice,
        rsi: 21.6,
        atrPercent: 0.0084,
        normalizedVolume: 3.4,
        volumePercentile: 0.96,
        whaleTier: 3,
        trendStrength: 0.92,
        trendDirection: 'DOWNTREND',
        hasIndicators: true,
        timestamp: Date.now(),
      };
      return [...points.slice(0, -1), simPoint];
    }
    const simPrice = basePrice * 1.012;
    const simPoint: LandingMarketPoint = {
      ...basePoint,
      price: simPrice,
      rsi: 54.2,
      atrPercent: 0.0142,
      normalizedVolume: 4.8,
      volumePercentile: 0.99,
      whaleTier: 4,
      trendStrength: 0.65,
      trendDirection: 'VOLATILE',
      hasIndicators: true,
      timestamp: Date.now(),
    };
    return [...points.slice(0, -1), simPoint];
  }, [points, simMode]);

  const latestPoint = getLatestPoint(displayPoints);
  const chartModel = useMemo(() => buildChartModel(displayPoints), [displayPoints]);
  const priceChangePercent = chartModel.windowChangePercent;
  const isPriceRising = priceChangePercent >= 0;

  const primaryColor = isPriceRising ? '#22c55e' : '#ff4444';
  const glowColor = isPriceRising ? '#6ee7b7' : '#ff7777';

  const prefersReducedMotion = useReducedMotion();
  const glideTransition = prefersReducedMotion
    ? 'none'
    : 'left 0.4s ease-out, top 0.4s ease-out, background-color 0.4s ease-out';

  const forecast = useMemo(() => buildForecast(displayPoints), [displayPoints]);

  // Pointer scrubber interaction
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = chartContainerRef.current;
      if (!container || chartModel.coordinates.length === 0) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const plotWidth = rect.width;
      const ratio = clamp(clientX / plotWidth, 0, 1);

      const closestIndex = Math.round(ratio * (chartModel.coordinates.length - 1));
      const coord = chartModel.coordinates[closestIndex];

      if (coord) {
        const deltaDollar = coord.price - chartModel.openPrice;
        const deltaPercent =
          chartModel.openPrice > 0 ? (deltaDollar / chartModel.openPrice) * 100 : 0;
        setHoveredPoint({
          x: coord.x,
          y: coord.y,
          price: coord.price,
          volume: coord.volume,
          timestamp: coord.timestamp,
          changePercent: deltaPercent,
          changeDollar: deltaDollar,
        });
      }
    },
    [chartModel.coordinates, chartModel.openPrice]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  const activePoint = hoveredPoint ?? {
    price: latestPoint.price,
    changePercent: priceChangePercent,
    changeDollar: chartModel.windowChangeDollar,
    timestamp: latestPoint.timestamp || Date.now(),
  };

  const activePriceRising = activePoint.changePercent >= 0;

  return (
    <section
      className="landing-price-feed relative max-w-full overflow-hidden border border-[#d6b85c]/30 bg-[#03050b]/95 p-3 font-mono shadow-[0_30px_90px_rgba(0,0,0,0.6),0_0_90px_rgba(214,184,92,0.15)] sm:p-5"
      aria-label="BTC live price feed and market pressure forecast"
      style={{
        clipPath:
          'polygon(0 16px, 16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)',
      }}
    >
      {/* Sci-Fi Background Glow & Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(214,184,92,0.14),transparent_35%),radial-gradient(circle_at_88%_14%,rgba(255,214,0,0.16),transparent_30%),radial-gradient(circle_at_70%_85%,rgba(178,34,34,0.22),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(214,184,92,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(214,184,92,0.06)_1px,transparent_1px)] bg-[length:24px_24px] opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd86a] to-transparent" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header: Title, Live Price, 24H Delta, Feed Status */}
        <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.34em] text-[#ffd86a]">
                BTC / USD REALTIME FEED
              </span>
              {hoveredPoint && (
                <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                  SCRUBBING
                </span>
              )}
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <div
                data-testid="landing-btc-price"
                className="font-cyber text-4xl font-black italic leading-none tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)] sm:text-5xl"
              >
                {formatDisplayPrice(activePoint.price, feedStatus, simMode !== 'live')}
              </div>

              <div className="flex items-center gap-2">
                <div
                  data-testid="landing-window-change"
                  className={`text-sm font-black ${
                    activePriceRising ? 'text-[#6ee7b7]' : 'text-[#ff7777]'
                  }`}
                >
                  <span className="border-current/30 mr-1 border px-1 py-0.5 text-[10px] uppercase tracking-widest opacity-80">
                    {chartModel.windowLabel}
                  </span>{' '}
                  {formatPercent(activePoint.changePercent)}
                </div>
                <span className="font-mono text-xs text-slate-300 opacity-80">
                  ({formatDeltaDollar(activePoint.changeDollar)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#6ee7b7]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
            </span>
            <span data-testid="landing-feed-status">
              {simMode !== 'live'
                ? `SIM: ${simMode.toUpperCase()}`
                : FEED_STATUS_COPY[feedStatus]}
            </span>
          </div>
        </div>

        {/* --- 24H / DAILY STATS BAR (High, Low, Open, Volume) --- */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider sm:grid-cols-4">
          <div className="border border-white/10 bg-black/40 px-2.5 py-1.5">
            <span className="block text-[9px] text-slate-500">24H HIGH</span>
            <span className="text-[#6ee7b7]">
              {chartModel.high24h > 0 ? formatFullPrice(chartModel.high24h) : '---'}
            </span>
          </div>
          <div className="border border-white/10 bg-black/40 px-2.5 py-1.5">
            <span className="block text-[9px] text-slate-500">24H LOW</span>
            <span className="text-[#ff7777]">
              {chartModel.low24h > 0 ? formatFullPrice(chartModel.low24h) : '---'}
            </span>
          </div>
          <div className="border border-white/10 bg-black/40 px-2.5 py-1.5">
            <span className="block text-[9px] text-slate-500">
              {chartModel.isUtc0Open ? 'UTC 0 OPEN' : '24H OPEN'}
            </span>
            <span className="text-[#ffd86a]">
              {chartModel.openPrice > 0 ? formatFullPrice(chartModel.openPrice) : '---'}
            </span>
          </div>
          <div className="border border-white/10 bg-black/40 px-2.5 py-1.5">
            <span className="block text-[9px] text-slate-500">24H VOL</span>
            <span className="text-slate-200">
              {chartModel.totalVolume > 0
                ? `${(chartModel.totalVolume / 1000).toFixed(1)}K BTC`
                : 'LIVE'}
            </span>
          </div>
        </div>

        {/* --- INTERACTIVE MARKET SHOCK TESTER --- */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
            TEST ARENA RESPONSE:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSimMode('live')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                simMode === 'live'
                  ? 'border border-[#22c55e] bg-[#22c55e]/20 text-[#6ee7b7] shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:text-white'
              }`}
            >
              ● LIVE STREAM
            </button>
            <button
              type="button"
              onClick={() => setSimMode('pump')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                simMode === 'pump'
                  ? 'border border-[#22c55e] bg-[#22c55e]/20 text-[#6ee7b7] shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              ▲ PUMP (+5%)
            </button>
            <button
              type="button"
              onClick={() => setSimMode('dump')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                simMode === 'dump'
                  ? 'border border-[#b22222] bg-[#b22222]/20 text-[#ff7777] shadow-[0_0_8px_rgba(178,34,34,0.3)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-red-500/40 hover:text-red-300'
              }`}
            >
              ▼ DUMP (-8%)
            </button>
            <button
              type="button"
              onClick={() => setSimMode('volatility')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                simMode === 'volatility'
                  ? 'border border-[#d6b85c] bg-[#d6b85c]/20 text-[#ffd86a] shadow-[0_0_8px_rgba(214,184,92,0.3)]'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-amber-500/40 hover:text-amber-300'
              }`}
            >
              ⚡ VOL SHOCK
            </button>
          </div>
        </div>

        {/* --- MAIN CHART CONTAINER --- */}
        <div className="bg-[#05070d]/92 relative min-h-[220px] overflow-hidden border border-white/10 p-2 sm:min-h-[270px] sm:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(214,184,92,0.08),transparent_40%),linear-gradient(180deg,transparent,rgba(2,6,23,0.7))]" />

          <div className="relative z-10 flex h-48 w-full flex-col sm:h-64">
            {/* SVG Plot Area with Right Gutter for Price Axis */}
            <div
              ref={chartContainerRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="relative flex-1 cursor-crosshair touch-none select-none"
            >
              <div className="absolute inset-y-0 left-0 right-16 sm:right-20">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="landingPriceAreaGrad"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={primaryColor} stopOpacity="0.32" />
                      <stop offset="60%" stopColor={primaryColor} stopOpacity="0.08" />
                      <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="volumeGradUp" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
                    </linearGradient>

                    <linearGradient id="volumeGradDown" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ff4444" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#ff4444" stopOpacity="0.1" />
                    </linearGradient>

                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Horizontal Price Grid Lines */}
                  {chartModel.gridLevels.map((level, index) => (
                    <line
                      key={`grid-${index}`}
                      x1="0"
                      x2="100"
                      y1={level.y}
                      y2={level.y}
                      stroke="#d6b85c"
                      strokeDasharray={
                        index === 0 || index === chartModel.gridLevels.length - 1
                          ? undefined
                          : '2 3'
                      }
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.15"
                    />
                  ))}

                  {/* Vertical Time Grid Lines */}
                  {[20, 40, 60, 80].map(gridX => (
                    <line
                      key={`vgrid-${gridX}`}
                      x1={gridX}
                      x2={gridX}
                      y1="0"
                      y2="100"
                      stroke="#d6b85c"
                      strokeDasharray="2 4"
                      strokeWidth="0.6"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.08"
                    />
                  ))}

                  {/* UTC 00:00 Daily Open Reference Marker */}
                  {chartModel.utc0MarkerX !== null && (
                    <g>
                      <line
                        x1={chartModel.utc0MarkerX}
                        x2={chartModel.utc0MarkerX}
                        y1="0"
                        y2="100"
                        stroke="#ffd86a"
                        strokeDasharray="2 3"
                        strokeWidth="0.8"
                        vectorEffect="non-scaling-stroke"
                        opacity="0.4"
                      />
                      <text
                        x={Math.min(chartModel.utc0MarkerX + 1, 84)}
                        y="94"
                        fill="#ffd86a"
                        fontSize="6"
                        fontFamily="monospace"
                        fontWeight="bold"
                        opacity="0.65"
                      >
                        00:00 UTC
                      </text>
                    </g>
                  )}

                  {/* Volume Histogram */}
                  {chartModel.volumeBars.map((bar, index) => (
                    <rect
                      key={`volume-${index}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={bar.isUp ? 'url(#volumeGradUp)' : 'url(#volumeGradDown)'}
                    />
                  ))}

                  {/* Area Gradient Fill */}
                  {chartModel.areaPath && (
                    <path d={chartModel.areaPath} fill="url(#landingPriceAreaGrad)" />
                  )}

                  {/* Glow Backdrop Line */}
                  {chartModel.linePath && (
                    <path
                      d={chartModel.linePath}
                      fill="none"
                      stroke={primaryColor}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.25"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Crisp Primary Price Line */}
                  {chartModel.linePath && (
                    <path
                      d={chartModel.linePath}
                      fill="none"
                      stroke={primaryColor}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {/* Live Price Horizontal Guideline */}
                  {!hoveredPoint && (
                    <line
                      x1="0"
                      x2="100"
                      y1={chartModel.livePriceY}
                      y2={chartModel.livePriceY}
                      stroke={primaryColor}
                      strokeDasharray="4 3"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      opacity="0.5"
                    />
                  )}

                  {/* Scrubber Crosshair Line */}
                  {hoveredPoint && (
                    <>
                      <line
                        x1={hoveredPoint.x}
                        x2={hoveredPoint.x}
                        y1="0"
                        y2="100"
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        opacity="0.8"
                      />
                      <line
                        x1="0"
                        x2="100"
                        y1={hoveredPoint.y}
                        y2={hoveredPoint.y}
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        opacity="0.6"
                      />
                    </>
                  )}
                </svg>

                {/* Live Price Pulse Beacon (At latest coordinate) */}
                {!hoveredPoint && chartModel.coordinates.length > 0 && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${chartModel.coordinates[chartModel.coordinates.length - 1]?.x ?? 100}%`,
                      top: `${chartModel.livePriceY}%`,
                      transition: glideTransition,
                    }}
                  >
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-60"
                      style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: glowColor,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 16px ${glowColor}, 0 0 28px ${primaryColor}`,
                      }}
                    />
                  </div>
                )}

                {/* Scrubber Hover Cursor Point */}
                {hoveredPoint && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${hoveredPoint.x}%`,
                      top: `${hoveredPoint.y}%`,
                    }}
                  >
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400"
                      style={{
                        width: '12px',
                        height: '12px',
                        boxShadow: '0 0 14px #38bdf8, 0 0 24px #0284c7',
                      }}
                    />
                  </div>
                )}

                {/* Hover Scrubber Tooltip Card */}
                {hoveredPoint && (
                  <div
                    className="pointer-events-none absolute z-20 -translate-y-full transform rounded border border-cyan-500/50 bg-[#030712]/95 px-2.5 py-1.5 text-left font-mono text-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.8),0_0_12px_rgba(56,189,248,0.3)] backdrop-blur-md"
                    style={{
                      left: `${clamp(hoveredPoint.x, 15, 85)}%`,
                      top: `${Math.max(hoveredPoint.y - 12, 18)}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 text-[9px] text-slate-400">
                      <span>{formatClockTime(hoveredPoint.timestamp)}</span>
                      <span>{formatTimeAgo(hoveredPoint.timestamp, Date.now())}</span>
                    </div>
                    <div className="mt-1 font-cyber text-sm font-bold text-white">
                      {formatFullPrice(hoveredPoint.price)}
                    </div>
                    <div
                      className={`text-[9px] font-bold ${
                        hoveredPoint.changePercent >= 0
                          ? 'text-[#6ee7b7]'
                          : 'text-[#ff7777]'
                      }`}
                    >
                      {formatPercent(hoveredPoint.changePercent)} (
                      {formatDeltaDollar(hoveredPoint.changeDollar)})
                    </div>
                  </div>
                )}
              </div>

              {/* Price Axis (Right Gutter) */}
              <div className="absolute inset-y-0 right-0 w-16 border-l border-white/10 sm:w-20">
                {chartModel.gridLevels.map((level, index) => (
                  <span
                    key={`axis-${index}`}
                    className="absolute right-1 -translate-y-1/2 text-[8px] font-bold tracking-tight text-[#d6b85c]/70 sm:text-[9px]"
                    style={{ top: `${level.y}%` }}
                  >
                    {level.label}
                  </span>
                ))}

                {/* Active / Hover Price Badge on Axis */}
                <span
                  className={`absolute right-0 z-10 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-black tracking-tight ${
                    hoveredPoint
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]'
                      : isPriceRising
                        ? 'bg-[#22c55e] text-black shadow-[0_0_10px_#22c55e]'
                        : 'bg-[#ff4444] text-white shadow-[0_0_10px_#ff4444]'
                  }`}
                  style={{
                    top: `${hoveredPoint ? hoveredPoint.y : chartModel.livePriceY}%`,
                    transition: hoveredPoint ? 'none' : glideTransition,
                  }}
                >
                  {feedStatus === 'connecting' || activePoint.price <= 0
                    ? '···'
                    : formatAxisPrice(activePoint.price, chartModel.axisRange)}
                </span>
              </div>
            </div>

            {/* X-Axis Time Indicators */}
            <div className="relative mt-2 flex justify-between border-t border-white/10 pr-16 pt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500 sm:pr-20 sm:text-[9px]">
              <span>-24H</span>
              <span>-18H</span>
              <span>-12H</span>
              <span>-6H</span>
              <span className="text-[#ffd86a]">NOW</span>
            </div>
          </div>
        </div>

        {/* --- MARKET PRESSURE FORECAST PANEL --- */}
        <div className="landing-forecast-panel border border-[#d6b85c]/25 bg-black/40 p-3.5">
          {!latestPoint.hasIndicators && (
            <div className="border border-[#d6b85c]/30 bg-[#d6b85c]/10 p-3 text-[10px] font-black uppercase tracking-widest text-[#ffd86a]">
              WARMING UP — waiting for live market indicators
            </div>
          )}

          {latestPoint.hasIndicators && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  MARKET PRESSURE FORECAST
                </div>
                <div
                  className={`landing-forecast-bias mt-2 inline-flex border px-3 py-1.5 text-xs font-black uppercase tracking-widest ${getBiasTone(
                    forecast.bias
                  )}`}
                >
                  {forecast.bias}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                <div className="border border-white/10 bg-white/[0.03] p-2">
                  <span className="block text-slate-500">Confidence</span>
                  {forecast.confidence}%
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-2">
                  <span className="block text-slate-500">Score</span>
                  {forecast.score}
                </div>
              </div>
            </div>
          )}

          {latestPoint.hasIndicators && (
            <div className="mt-3 grid gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 sm:grid-cols-3">
              <div className="border border-white/10 bg-[#05070d]/80 p-2">
                <span className="block text-slate-500">Projected range</span>
                {formatCompactPrice(forecast.projectedLow)}–
                {formatCompactPrice(forecast.projectedHigh)}
              </div>
              <div className="border border-white/10 bg-[#05070d]/80 p-2">
                <span className="block text-slate-500">RSI / ATR</span>
                {latestPoint.rsi.toFixed(1)} /{' '}
                {(latestPoint.atrPercent * 100).toFixed(2)}%
              </div>
              <div className="border border-white/10 bg-[#05070d]/80 p-2">
                <span className="block text-slate-500">Volume</span>
                {latestPoint.normalizedVolume.toFixed(2)}x · T{latestPoint.whaleTier}
              </div>
            </div>
          )}

          {latestPoint.hasIndicators && (
            <div className="mt-3 flex flex-wrap gap-2">
              {forecast.reasons.map(reason => (
                <span
                  key={reason}
                  className="border border-[#d6b85c]/20 bg-[#d6b85c]/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#ffd86a]"
                >
                  {reason}
                </span>
              ))}
              <span className="border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                Gameplay signal only
              </span>
            </div>
          )}

          <p className="mt-3 text-[9px] leading-relaxed tracking-wide text-slate-500">
            Not financial advice. Indicators shown are gameplay mechanics only and
            should not be used for trading decisions.
          </p>
        </div>
      </div>
    </section>
  );
};
