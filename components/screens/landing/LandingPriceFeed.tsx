import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MARKET } from '../../../constants';
import {
  SSEMarketService,
  type SSEConnectionStatus,
  type SSEMarketUpdate,
} from '../../../services/market/SSEMarketService';

type FeedStatus = 'connecting' | 'live' | 'cached';

type LandingMarketPoint = {
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

const MAX_FEED_POINTS = 24;
const VISIBLE_CANDLES = 14;
const SEED_POINT_INTERVAL_MS = 1800;
const FALLBACK_BTC_PRICE = MARKET.FALLBACK_PRICES.BTC;

const FEED_STATUS_COPY: Record<FeedStatus, string> = {
  connecting: 'SYNCING',
  live: 'LIVE',
  cached: 'CACHED',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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

const formatDisplayPrice = (price: number, status: FeedStatus): string =>
  status === 'connecting' ? 'SYNCING' : formatCompactPrice(price);

const formatPercent = (value: number): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const generateSeedPoint = (
  sequence: number,
  previousPrice: number = FALLBACK_BTC_PRICE
): LandingMarketPoint => {
  const wave = Math.sin(sequence * 0.78) * 180 + Math.cos(sequence * 0.37) * 92;
  const microMove = Math.sin(sequence * 1.7) * 34;
  const price = Number((FALLBACK_BTC_PRICE + wave + microMove).toFixed(2));
  const changePercent = ((price - previousPrice) / previousPrice) * 100;
  const trendDirection =
    changePercent > 0.16 ? 'UPTREND' : changePercent < -0.16 ? 'DOWNTREND' : 'SIDEWAYS';
  const rsi = clamp(50 + changePercent * 82 + Math.sin(sequence * 0.5) * 10, 24, 78);
  const atrPercent = clamp(
    0.0028 + Math.abs(changePercent) / 100 + Math.sin(sequence) * 0.0007,
    0.0015,
    0.011
  );
  const normalizedVolume = clamp(
    1 + Math.abs(changePercent) * 2.6 + Math.cos(sequence * 0.42) * 0.18,
    0.72,
    2.35
  );
  const volumePercentile = clamp(
    0.42 + normalizedVolume * 0.18 + Math.sin(sequence * 0.25) * 0.08,
    0.28,
    0.92
  );

  return {
    price,
    volume: 0,
    rsi: Number(rsi.toFixed(1)),
    atrPercent: Number(atrPercent.toFixed(5)),
    normalizedVolume: Number(normalizedVolume.toFixed(2)),
    volumePercentile: Number(volumePercentile.toFixed(2)),
    whaleTier: normalizedVolume > 1.8 ? 2 : normalizedVolume > 1.35 ? 1 : 0,
    trendStrength: Number(clamp(Math.abs(changePercent) * 6.5, 0.08, 0.86).toFixed(2)),
    trendDirection,
    timestamp: Date.now() + sequence * SEED_POINT_INTERVAL_MS,
    isSynthetic: true,
  };
};

const createInitialPoints = (): LandingMarketPoint[] => {
  const points: LandingMarketPoint[] = [];
  for (let index = 0; index < MAX_FEED_POINTS; index++) {
    const previousPoint = points[points.length - 1];
    points.push(generateSeedPoint(index - MAX_FEED_POINTS, previousPoint?.price));
  }
  return points;
};

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
});

const appendPoint = (
  points: LandingMarketPoint[],
  point: LandingMarketPoint
): LandingMarketPoint[] => [...points.slice(-(MAX_FEED_POINTS - 1)), point];

const createSeedPointsAround = (
  anchorPoint: LandingMarketPoint
): LandingMarketPoint[] => {
  const points: LandingMarketPoint[] = [];
  for (let index = 0; index < MAX_FEED_POINTS; index++) {
    const offset = index - (MAX_FEED_POINTS - 1);
    const wavePercent =
      Math.sin(offset * 0.63) * 0.0018 + Math.cos(offset * 0.27) * 0.0009;
    points.push({
      ...anchorPoint,
      price:
        index === MAX_FEED_POINTS - 1
          ? anchorPoint.price
          : Number((anchorPoint.price * (1 + wavePercent)).toFixed(2)),
      timestamp: anchorPoint.timestamp + offset * SEED_POINT_INTERVAL_MS,
    });
  }
  return points;
};

const getLatestPoint = (points: LandingMarketPoint[]): LandingMarketPoint =>
  points[points.length - 1] ?? generateSeedPoint(0);

const getPreviousPoint = (points: LandingMarketPoint[]): LandingMarketPoint =>
  points[points.length - 2] ?? getLatestPoint(points);

const buildSparklinePath = (points: LandingMarketPoint[]): string => {
  if (points.length === 0) return '';

  const prices = points.map(point => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(maxPrice - minPrice, 1);

  return points
    .map((point, index) => {
      const xCoordinate = (index / Math.max(points.length - 1, 1)) * 100;
      const yCoordinate = 86 - ((point.price - minPrice) / priceRange) * 66;
      return `${index === 0 ? 'M' : 'L'} ${xCoordinate.toFixed(2)} ${yCoordinate.toFixed(2)}`;
    })
    .join(' ');
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

export const LandingPriceFeed: React.FC = () => {
  const [points, setPoints] = useState<LandingMarketPoint[]>(createInitialPoints);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const feedStatusRef = useRef<FeedStatus>('connecting');

  useEffect(() => {
    feedStatusRef.current = feedStatus;
  }, [feedStatus]);

  useEffect(() => {
    const service = new SSEMarketService({
      pair: 'BTC',
      onData: update => {
        const nextPoint = fromSseUpdate(update);
        setPoints(currentPoints => {
          const latestPoint = getLatestPoint(currentPoints);
          const shouldRebaseLiveHistory =
            !nextPoint.isSynthetic &&
            latestPoint.isSynthetic &&
            latestPoint.price > 0 &&
            Math.abs(nextPoint.price - latestPoint.price) / latestPoint.price > 0.08;

          return shouldRebaseLiveHistory
            ? createSeedPointsAround(nextPoint)
            : appendPoint(currentPoints, nextPoint);
        });
        setFeedStatus(update.isSynthetic ? 'cached' : 'live');
      },
      onStatusChange: (status: SSEConnectionStatus) => {
        if (status.state === 'connected') {
          setFeedStatus(status.isUsingFallbackData ? 'cached' : 'live');
          return;
        }

        if (feedStatusRef.current !== 'live' && feedStatusRef.current !== 'cached') {
          setFeedStatus('connecting');
        }
      },
    });

    service.connect();

    return () => {
      service.disconnect();
    };
  }, []);

  const latestPoint = getLatestPoint(points);
  const previousPoint = getPreviousPoint(points);
  const priceChangePercent =
    previousPoint.price > 0
      ? ((latestPoint.price - previousPoint.price) / previousPoint.price) * 100
      : 0;
  const sparklinePath = useMemo(() => buildSparklinePath(points), [points]);
  const forecast = useMemo(() => buildForecast(points), [points]);
  const visibleCandles = points.slice(-VISIBLE_CANDLES);
  const candlePrices = visibleCandles.map(point => point.price);
  const candleMinPrice = Math.min(...candlePrices);
  const candleMaxPrice = Math.max(...candlePrices);
  const candleRange = Math.max(candleMaxPrice - candleMinPrice, 1);

  return (
    <section
      className="landing-price-feed bg-[#03050b]/92 relative max-w-full overflow-hidden border border-[#d6b85c]/25 p-3 font-mono shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_90px_rgba(178,34,34,0.2)] sm:p-4"
      aria-label="BTC live price feed and market pressure forecast"
      style={{
        clipPath:
          'polygon(0 18px, 18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)',
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(214,184,92,0.12),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(255,214,0,0.14),transparent_28%),radial-gradient(circle_at_72%_82%,rgba(178,34,34,0.28),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,184,92,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(178,34,34,0.06)_1px,transparent_1px)] bg-[length:28px_28px] opacity-70" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd86a] to-transparent" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.34em] text-[#ffd86a]">
              BTC/USD LIVE FEED
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <div
                data-testid="landing-btc-price"
                className="font-cyber text-4xl font-black italic leading-none tracking-tighter text-white sm:text-5xl"
              >
                {formatDisplayPrice(latestPoint.price, feedStatus)}
              </div>
              <div
                className={`text-sm font-black ${priceChangePercent >= 0 ? 'text-[#6ee7b7]' : 'text-[#ff7777]'}`}
              >
                {formatPercent(priceChangePercent)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#6ee7b7]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
            </span>
            <span data-testid="landing-feed-status">
              {FEED_STATUS_COPY[feedStatus]}
            </span>
          </div>
        </div>

        <div className="bg-[#05070d]/88 relative min-h-[170px] overflow-hidden border border-white/10 p-3 sm:min-h-[210px] sm:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(214,184,92,0.12),transparent_30%),linear-gradient(180deg,transparent,rgba(2,6,23,0.58))]" />
          <svg
            className="relative z-10 h-28 w-full text-[#d6b85c] sm:h-36"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={`${sparklinePath} L 100 100 L 0 100 Z`}
              fill="url(#landingPriceFill)"
              opacity="0.24"
            />
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            <defs>
              <linearGradient id="landingPriceFill" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#d6b85c" />
                <stop offset="1" stopColor="#b22222" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative z-10 mt-2 flex h-16 items-end gap-1.5">
            {visibleCandles.map((point, index) => {
              const previousVisiblePoint = visibleCandles[index - 1] ?? point;
              const candleHeight =
                22 + ((point.price - candleMinPrice) / candleRange) * 42;
              const isUp = point.price >= previousVisiblePoint.price;
              return (
                <span
                  key={`${point.timestamp}-${index}`}
                  className={`w-full min-w-0 ${isUp ? 'bg-[#22c55e]' : 'bg-[#b22222]'} shadow-[0_0_16px_rgba(214,184,92,0.12)]`}
                  style={{ height: `${candleHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        <div className="landing-forecast-panel border border-[#d6b85c]/20 bg-black/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                MARKET PRESSURE FORECAST
              </div>
              <div
                className={`landing-forecast-bias mt-2 inline-flex border px-3 py-2 text-sm font-black uppercase tracking-widest ${getBiasTone(forecast.bias)}`}
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

          <div className="mt-3 grid gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 sm:grid-cols-3">
            <div className="border border-white/10 bg-[#05070d]/70 p-2">
              <span className="block text-slate-500">Projected range</span>
              {formatCompactPrice(forecast.projectedLow)}–
              {formatCompactPrice(forecast.projectedHigh)}
            </div>
            <div className="border border-white/10 bg-[#05070d]/70 p-2">
              <span className="block text-slate-500">RSI / ATR</span>
              {latestPoint.rsi.toFixed(1)} / {(latestPoint.atrPercent * 100).toFixed(2)}
              %
            </div>
            <div className="border border-white/10 bg-[#05070d]/70 p-2">
              <span className="block text-slate-500">Volume</span>
              {latestPoint.normalizedVolume.toFixed(2)}x · T{latestPoint.whaleTier}
            </div>
          </div>

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
        </div>
      </div>
    </section>
  );
};
