import { type WavePhase, type LeverageScale } from './types';

export const DIFFICULTY_CONFIG = {
  /** Cycle duration (seconds) */
  cycleDuration: 300,

  /** PnL history buffer size */
  pnlHistorySize: 30,

  /** Kill streak timeout (ms) */
  streakTimeoutMs: 3000,

  /** Shock detection threshold (underlying price %) */
  shockThreshold: 0.005,

  /** Clamp limits */
  limits: {
    total: { min: 0.5, max: 10.0 },
    spawnRate: { min: 0.5, max: 8.0 },
    enemySpeed: { min: 0.5, max: 4.0 },
    enemyHP: { min: 0.5, max: 5.0 },
    enemyDamage: { min: 0.8, max: 8.0 },
  },
};

export const LEVERAGE_TIERS: Record<number, LeverageScale> = {
  1: { spawn: 0.7, speed: 0.8, hp: 0.8, damage: 0.8, xpReq: 1.0 },
  2: { spawn: 0.8, speed: 0.85, hp: 0.9, damage: 0.9, xpReq: 1.1 },
  5: { spawn: 1.0, speed: 1.0, hp: 1.0, damage: 1.0, xpReq: 1.25 },
  10: { spawn: 1.2, speed: 1.1, hp: 1.1, damage: 1.15, xpReq: 1.5 },
  25: { spawn: 1.5, speed: 1.25, hp: 1.2, damage: 1.4, xpReq: 2.0 },
  50: { spawn: 2.0, speed: 1.4, hp: 1.4, damage: 1.8, xpReq: 3.0 },
  100: { spawn: 2.5, speed: 2.0, hp: 1.6, damage: 3.0, xpReq: 5.0 },
};

/**
 * Wave phase definitions
 */
export const WAVE_PHASES: Array<{
  name: WavePhase;
  duration: number;
  multiplier: number;
}> = [
  { name: 'warmup', duration: 25, multiplier: 0.3 },
  { name: 'buildup', duration: 60, multiplier: 0.5 },
  { name: 'firstPeak', duration: 30, multiplier: 1.3 },
  { name: 'breather', duration: 45, multiplier: 0.6 },
  { name: 'escalation', duration: 60, multiplier: 1.15 },
  { name: 'climax', duration: 45, multiplier: 1.5 },
  { name: 'resolution', duration: 35, multiplier: 0.5 },
];

/**
 * Get nearest leverage tier
 */
export function getNearestLeverageTier(leverage: number): number {
  const tiers = [1, 2, 5, 10, 25, 50, 100];
  return tiers.reduce((prev, curr) =>
    Math.abs(curr - leverage) < Math.abs(prev - leverage) ? curr : prev
  );
}

/**
 * Get leverage scale config
 */
export function getLeverageScale(leverage: number): LeverageScale {
  const tier = getNearestLeverageTier(leverage);
  return LEVERAGE_TIERS[tier] ?? LEVERAGE_TIERS[5]!;
}
