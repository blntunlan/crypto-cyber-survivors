/**
 * Deterministic input generators shared by the golden tests.
 *
 * These generators are pure functions of the step/tick index — no randomness,
 * no wall clock. They are shared between the legacy-pipeline golden test
 * (Katman B) and the future Director parity test (Katman C) so both consume
 * byte-identical input sequences.
 */
import type { UnifiedInputs } from '../../../services/difficulty/UnifiedDirector';

// ---------------------------------------------------------------------------
// Katman A — UnifiedDirector rule pipeline scenarios (4 × 60 steps)
// ---------------------------------------------------------------------------

export const RULE_SCENARIO_STEPS = 60;

const NEUTRAL_INPUTS: UnifiedInputs = {
  rsi: 0.5,
  rsiMomentum: 0,
  atrPercent: 0.01,
  volumeNorm: 0.5,
  priceChange: 0,
  trendStrength: 0,
  macdHistogram: 0,
  side: 'long',
  hpPercent: 1,
  pnlRatio: 0,
  killsPerMin: 0.5,
  dashFrequency: 0.3,
  playerDPS: 0.2,
  damageTakenRate: 0.1,
  elapsedMinutes: 0,
  playerLevel: 0.1,
  leverage: 0.05,
  gemPileup: 0,
  engagementScore: 0.5,
  frustrationScore: 0.5,
};

export type RuleScenario = {
  name: string;
  inputsAt: (step: number) => UnifiedInputs;
};

/** 1 step = 1 saniye oyun zamanı */
const minutesAt = (step: number): number => step / 60;

export const RULE_SCENARIOS: readonly RuleScenario[] = [
  {
    name: 'neutral-flat',
    inputsAt: step => ({
      ...NEUTRAL_INPUTS,
      elapsedMinutes: minutesAt(step),
    }),
  },
  {
    name: 'profit-ramp-low-atr',
    inputsAt: step => {
      const t = step / (RULE_SCENARIO_STEPS - 1);
      return {
        ...NEUTRAL_INPUTS,
        elapsedMinutes: minutesAt(step),
        pnlRatio: 0.4 * t,
        rsi: 0.5 + 0.15 * t,
        rsiMomentum: 0.3 * t,
        atrPercent: 0.004,
        trendStrength: 0.6 * t,
        hpPercent: 0.9,
        killsPerMin: 0.8,
      };
    },
  },
  {
    name: 'loss-high-atr-mercy',
    inputsAt: step => {
      const t = step / (RULE_SCENARIO_STEPS - 1);
      return {
        ...NEUTRAL_INPUTS,
        elapsedMinutes: minutesAt(step),
        pnlRatio: -0.6 * t,
        rsi: 0.5 - 0.2 * t,
        rsiMomentum: -0.4 * t,
        atrPercent: 0.028,
        volumeNorm: 0.7,
        hpPercent: 0.9 - 0.65 * t, // 0.35 altına iner → mercy tetiklenir
        damageTakenRate: 0.5,
        frustrationScore: 0.5 + 0.4 * t,
      };
    },
  },
  {
    name: 'degen-100x-whale-zigzag',
    inputsAt: step => ({
      ...NEUTRAL_INPUTS,
      elapsedMinutes: minutesAt(step),
      leverage: 1.0, // 100x
      volumeNorm: 0.9,
      rsi: 0.5 + 0.35 * Math.sin(step / 3),
      rsiMomentum: 0.5 * Math.cos(step / 3),
      priceChange: 0.5 * Math.sin(step / 2),
      trendStrength: 0.8,
      macdHistogram: 0.4 * Math.sin(step / 4),
      pnlRatio: 0.3 * Math.sin(step / 5),
      gemPileup: 0.25,
      playerLevel: 0.5,
      killsPerMin: 1.2,
      playerDPS: 0.6,
      hpPercent: 0.6,
    }),
  },
];

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
