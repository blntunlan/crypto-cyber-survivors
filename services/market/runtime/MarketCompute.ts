import { type MarketData } from '../../../types';
import {
  type MarketRuntimeTick,
  type MarketRunConstants,
  type MarketRuntimeSnapshot,
} from '../../../types/marketRuntime';
import {
  getRSIStateWithHysteresis,
  getWhaleTierFromVolume,
} from '../../../types/indicators';
import { createRuntimeSnapshot } from './RuntimeContractBuilder';

const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const VOLUME_WINDOW = 30;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toFixed = (value: number, decimals: number): number => {
  return Number(value.toFixed(decimals));
};

const calculateRawPnl = (price: number, runConstants: MarketRunConstants): number => {
  if (runConstants.entryPrice <= 0 || price <= 0) return 0;

  const delta = (price - runConstants.entryPrice) / runConstants.entryPrice;
  return runConstants.position === 'SHORT' ? -delta : delta;
};

const updateEma = (price: number, previous: number | null, period: number): number => {
  if (previous === null) return price;
  const alpha = 2 / (period + 1);
  return previous + alpha * (price - previous);
};

const computeTrueRange = (
  tick: MarketRuntimeTick,
  previousClose: number | null
): number => {
  if (previousClose === null) {
    return Math.abs(tick.high - tick.low);
  }

  const highLow = Math.abs(tick.high - tick.low);
  const highPrevClose = Math.abs(tick.high - previousClose);
  const lowPrevClose = Math.abs(tick.low - previousClose);
  return Math.max(highLow, highPrevClose, lowPrevClose);
};

/**
 * Percentile rank of the newest sample inside the rolling window.
 *
 * The previous min-max scaling returned exactly 1.0 whenever the newest sample
 * happened to be the window maximum — which is most ticks on a rising volume
 * feed. That pinned normalizedVolume (and therefore whaleTier, which is derived
 * from it) to the ceiling for entire runs, so the volume and whale terms of the
 * market pressure became constants. A percentile rank is bounded the same way
 * but only reaches 1.0 when the sample genuinely dominates its own history.
 */
const normalizeVolume = (window: number[]): number => {
  const count = window.length;
  if (count === 0) return 0.5;

  const latest = window[count - 1];
  if (latest === undefined) return 0.5;
  if (count === 1) return 0.5;

  let lowerCount = 0;
  let equalCount = 0;
  for (let index = 0; index < count; index += 1) {
    const sample = window[index] ?? 0;
    if (sample < latest) {
      lowerCount += 1;
    } else if (sample === latest) {
      equalCount += 1;
    }
  }

  // Ties share the band; subtract the sample itself from the equal count.
  return clamp((lowerCount + Math.max(0, equalCount - 1) * 0.5) / (count - 1), 0, 1);
};

export interface MarketComputeState {
  tickCount: number;
  prevClose: number | null;
  avgGain: number;
  avgLoss: number;
  ema12: number | null;
  ema26: number | null;
  atr: number | null;
  trWindow: number[];
  volumeWindow: number[];
  /** Last raw feed volume, used to turn cumulative candle volume into a rate. */
  prevRawVolume: number | null;
}

export interface MarketComputeOutput {
  snapshot: MarketRuntimeSnapshot;
  nextState: MarketComputeState;
}

export const createInitialMarketComputeState = (): MarketComputeState => {
  return {
    tickCount: 0,
    prevClose: null,
    avgGain: 0,
    avgLoss: 0,
    ema12: null,
    ema26: null,
    atr: null,
    trWindow: [],
    volumeWindow: [],
    prevRawVolume: null,
  };
};

/**
 * The Binance `kline_1m` feed reports `k.v` — the *cumulative* base volume of
 * the candle in progress — so it climbs monotonically for a minute and then
 * resets. Fed straight into any normalizer, the newest sample is almost always
 * its own window maximum and the result pins to 1.0 forever (which also pinned
 * whaleTier to MEGA_WHALE). Convert it to a per-tick rate first; a drop means
 * the candle rolled over, in which case the new level is itself the delta.
 */
const toVolumeRate = (rawVolume: number, prevRawVolume: number | null): number => {
  if (!Number.isFinite(rawVolume) || rawVolume < 0) return 0;
  if (prevRawVolume === null) return rawVolume;
  return rawVolume >= prevRawVolume ? rawVolume - prevRawVolume : rawVolume;
};

const calculateDifficulty = (
  rawPnl: number,
  effectivePnl: number,
  rsi: number,
  atrPercent: number,
  normalizedVolumeValue: number
): {
  difficulty: number;
  spawnRateMultiplier: number;
  enemyDamage: number;
  enemySpeed: number;
  gemValueMultiplier: number;
  momentum: number;
} => {
  const pnlPressure = Math.min(Math.abs(effectivePnl), 3);
  const rsiPressure = Math.max(0, Math.abs(rsi - 50) - 20) / 30;
  const volatilityPressure = Math.min(atrPercent * 120, 2);

  const difficulty = clamp(
    1 + pnlPressure * 0.4 + rsiPressure * 0.8 + volatilityPressure * 0.6,
    0.5,
    5
  );

  const spawnRateMultiplier = clamp(
    1 + difficulty * 0.08 + normalizedVolumeValue * 0.12,
    0.6,
    3
  );
  const enemyDamage = clamp(1 + difficulty * 0.1, 0.6, 3.5);
  const enemySpeed = clamp(1 + difficulty * 0.07, 0.7, 3);
  const gemValueMultiplier = clamp(
    1 + (rawPnl < 0 ? Math.abs(rawPnl) * 0.5 : 0.05),
    1,
    2.5
  );
  const momentum = toFixed(effectivePnl * 0.1 + (normalizedVolumeValue - 0.5) * 0.2, 8);

  return {
    difficulty: toFixed(difficulty, 8),
    spawnRateMultiplier: toFixed(spawnRateMultiplier, 8),
    enemyDamage: toFixed(enemyDamage, 8),
    enemySpeed: toFixed(enemySpeed, 8),
    gemValueMultiplier: toFixed(gemValueMultiplier, 8),
    momentum,
  };
};

export interface ComputeRuntimeSnapshotInput {
  runConstants: MarketRunConstants;
  tick: MarketRuntimeTick;
  previousSnapshot: MarketRuntimeSnapshot | null;
  previousState: MarketComputeState;
}

export const computeRuntimeSnapshot = (
  input: ComputeRuntimeSnapshotInput
): MarketComputeOutput => {
  const { runConstants, tick, previousSnapshot, previousState } = input;
  const prevClose = previousState.prevClose;
  const priceDelta = prevClose === null ? 0 : tick.price - prevClose;
  const gain = Math.max(priceDelta, 0);
  const loss = Math.max(-priceDelta, 0);

  let avgGain: number;
  let avgLoss: number;
  if (previousState.tickCount === 0) {
    avgGain = gain;
    avgLoss = loss;
  } else if (previousState.tickCount < RSI_PERIOD) {
    const denominator = previousState.tickCount + 1;
    avgGain = (previousState.avgGain * previousState.tickCount + gain) / denominator;
    avgLoss = (previousState.avgLoss * previousState.tickCount + loss) / denominator;
  } else {
    avgGain = (previousState.avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
    avgLoss = (previousState.avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;
  }

  let rsi = 50;
  if (avgLoss === 0 && avgGain > 0) {
    rsi = 100;
  } else if (avgLoss > 0) {
    const rs = avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
  }
  rsi = toFixed(clamp(rsi, 0, 100), 4);

  const ema12 = updateEma(tick.price, previousState.ema12, 12);
  const ema26 = updateEma(tick.price, previousState.ema26, 26);
  const macd = toFixed(ema12 - ema26, 8);

  const trueRange = computeTrueRange(tick, prevClose);
  const trWindow = [...previousState.trWindow, trueRange].slice(-ATR_PERIOD);
  const atr =
    previousState.atr === null
      ? trWindow.reduce((sum, value) => sum + value, 0) / trWindow.length
      : (previousState.atr * (ATR_PERIOD - 1) + trueRange) / ATR_PERIOD;
  const atrPercent = tick.price > 0 ? toFixed(atr / tick.price, 8) : 0;

  const volumeRate = toVolumeRate(tick.volume, previousState.prevRawVolume);
  const volumeWindow = [...previousState.volumeWindow, volumeRate].slice(
    -VOLUME_WINDOW
  );
  const normalizedVolumeValue = toFixed(normalizeVolume(volumeWindow), 8);
  const rsiState = getRSIStateWithHysteresis(
    rsi,
    previousSnapshot?.rsiState ?? 'NEUTRAL'
  );
  const whaleTier = getWhaleTierFromVolume(normalizedVolumeValue) as 0 | 1 | 2 | 3;

  const rawPnl = toFixed(calculateRawPnl(tick.price, runConstants), 8);
  const effectivePnl = toFixed(rawPnl * runConstants.leverage, 8);
  const multipliers = calculateDifficulty(
    rawPnl,
    effectivePnl,
    rsi,
    atrPercent,
    normalizedVolumeValue
  );

  const marketData: MarketData = {
    price: tick.price,
    volume: tick.volume,
    pnl: rawPnl,
    effectivePnl,
    leverage: runConstants.leverage as MarketData['leverage'],
    rsi,
    rsiState,
    difficulty: multipliers.difficulty,
    momentum: multipliers.momentum,
    atrPercent,
    normalizedVolume: normalizedVolumeValue,
    whaleTier,
    spawnRateMultiplier: multipliers.spawnRateMultiplier,
    enemyDamage: multipliers.enemyDamage,
    enemySpeed: multipliers.enemySpeed,
    gemValueMultiplier: multipliers.gemValueMultiplier,
  };

  const snapshot = createRuntimeSnapshot({
    runConstants,
    tick,
    marketData,
    createdAt: tick.recvTs,
    macd,
  });

  return {
    snapshot,
    nextState: {
      tickCount: previousState.tickCount + 1,
      prevClose: tick.price,
      avgGain,
      avgLoss,
      ema12,
      ema26,
      atr,
      trWindow,
      volumeWindow,
      prevRawVolume: tick.volume,
    },
  };
};
