/**
 * Deterministic input generators shared by the golden tests.
 *
 * These generators are pure functions of the step/tick index — no randomness,
 * no wall clock. They are shared between the legacy-pipeline golden test
 * (Katman B) and the future Director parity test (Katman C) so both consume
 * byte-identical input sequences.
 */
import { BASELINE_SOURCE_REVISION, createBaselineArtifact } from './baselineArtifact';

// ---------------------------------------------------------------------------
// Katman B/C — SSE tick dizisi (120 tick, ~1 Hz)
// ---------------------------------------------------------------------------

export const SSE_TICK_COUNT = 120;
export const SSE_BASE_PRICE = 50_000;
export const SSE_TICK_INTERVAL_MS = 1_000;

export type GoldenSseTick = {
  /** BTC/USD fiyatı */
  price: number;
  /** Hacim (adet) */
  volume: number;
  /** OHLC high (ATR hesabı için) */
  high: number;
  /** OHLC low (ATR hesabı için) */
  low: number;
  /** Tick zaman damgası (ms) */
  timestamp: number;
  /** Harness girdileri — oyuncu durumu */
  level: number;
  hpPercent: number;
};

/**
 * Deterministik fiyat yürüyüşü: iki sinüs bileşeni + hafif aşağı sürüklenme,
 * 60–70. tick'lerde flash-dip (şok/momentum yollarını tetikler).
 */
export function generateSseTicks(): GoldenSseTick[] {
  const ticks: GoldenSseTick[] = [];
  for (let i = 0; i < SSE_TICK_COUNT; i++) {
    const wave = 0.004 * Math.sin(i / 7) + 0.002 * Math.sin(i / 3.1);
    const drift = -0.00004 * i;
    const inDip = i >= 60 && i < 70;
    const dip = inDip ? -0.015 * Math.sin(((i - 60) / 10) * Math.PI) : 0;

    const price = SSE_BASE_PRICE * (1 + wave + drift + dip);
    const spreadPct = inDip ? 0.004 : 0.0012;
    const volume = 800 + 400 * Math.sin(i / 5) * Math.sin(i / 5) + (inDip ? 1_700 : 0);

    ticks.push({
      price,
      volume,
      high: price * (1 + spreadPct),
      low: price * (1 - spreadPct),
      timestamp: 1_000_000 + i * SSE_TICK_INTERVAL_MS,
      level: 1 + Math.floor(i / 20),
      hpPercent: 0.85 - 0.2 * Math.sin(i / 9) * Math.sin(i / 9),
    });
  }
  return ticks;
}

// ---------------------------------------------------------------------------
// CS-DIR-01 — Canonical recorded market scenarios
// ---------------------------------------------------------------------------

const MARKET_SCENARIO_FRAME_COUNT = 48;
const MARKET_SCENARIO_BASE_PRICE = 50_000;
const MARKET_SCENARIO_START_TIMESTAMP = 1_000_000;
const MARKET_SCENARIO_INTERVAL_MS = 1_000;

export type MarketConnectionState = 'connected' | 'stale';

export type MarketScenarioName =
  | 'calm'
  | 'trend-up'
  | 'trend-down'
  | 'volume-surge'
  | 'volatility-spike'
  | 'stale-reconnect';

export type MarketScenarioFrame = {
  sequence: number;
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  connection: MarketConnectionState;
  rawPnl: number;
  level: number;
  hpPercent: number;
};

export type MarketScenario = {
  name: MarketScenarioName;
  frames: readonly MarketScenarioFrame[];
};

export type MarketScenarioPayload = {
  scenarios: readonly MarketScenario[];
};

type PriceAt = (step: number) => number;
type VolumeAt = (step: number) => number;

const connectionAt = (name: MarketScenarioName, step: number): MarketConnectionState =>
  name === 'stale-reconnect' && step >= 18 && step < 24 ? 'stale' : 'connected';

const sequenceAt = (name: MarketScenarioName, step: number): number =>
  name === 'stale-reconnect' && step >= 24 ? 10_000 + step - 24 : step + 1;

const createMarketScenario = (
  name: MarketScenarioName,
  priceAt: PriceAt,
  volumeAt: VolumeAt
): MarketScenario => {
  const frames: MarketScenarioFrame[] = [];

  for (let step = 0; step < MARKET_SCENARIO_FRAME_COUNT; step += 1) {
    const price = priceAt(step);
    const spikeWindow = name === 'volatility-spike' && step >= 18 && step < 30;
    const spreadPercent = spikeWindow ? 0.035 : 0.001;

    frames.push({
      sequence: sequenceAt(name, step),
      timestamp: MARKET_SCENARIO_START_TIMESTAMP + step * MARKET_SCENARIO_INTERVAL_MS,
      price,
      volume: volumeAt(step),
      high: price * (1 + spreadPercent),
      low: price * (1 - spreadPercent),
      connection: connectionAt(name, step),
      rawPnl: (price - MARKET_SCENARIO_BASE_PRICE) / MARKET_SCENARIO_BASE_PRICE,
      level: 1 + Math.floor(step / 12),
      hpPercent: 0.85,
    });
  }

  return { name, frames };
};

export const MARKET_SCENARIOS: readonly MarketScenario[] = [
  createMarketScenario(
    'calm',
    step => MARKET_SCENARIO_BASE_PRICE + step * 2,
    () => 800
  ),
  createMarketScenario(
    'trend-up',
    step => MARKET_SCENARIO_BASE_PRICE * (1 + step * 0.0015),
    () => 800
  ),
  createMarketScenario(
    'trend-down',
    step => MARKET_SCENARIO_BASE_PRICE * (1 - step * 0.0015),
    () => 800
  ),
  createMarketScenario(
    'volume-surge',
    step => MARKET_SCENARIO_BASE_PRICE + step * 10,
    step => (step >= 20 && step < 28 ? 3_200 : 800)
  ),
  createMarketScenario(
    'volatility-spike',
    step =>
      step >= 18 && step < 30
        ? MARKET_SCENARIO_BASE_PRICE + (step % 2 === 0 ? 900 : -750)
        : MARKET_SCENARIO_BASE_PRICE + step * 5,
    () => 800
  ),
  createMarketScenario(
    'stale-reconnect',
    step => MARKET_SCENARIO_BASE_PRICE + step * 5,
    () => 800
  ),
];

export const createMarketScenarioArtifact = () =>
  createBaselineArtifact<MarketScenarioPayload>({
    fixtureId: 'market-scenarios.v1',
    producer: 'market-scenarios',
    sourceRevision: BASELINE_SOURCE_REVISION,
    payload: { scenarios: MARKET_SCENARIOS },
  });
