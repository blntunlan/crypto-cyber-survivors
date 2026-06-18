import { type z } from 'zod';
import { verifySessionSchema } from '../db/validation';

const MIN_SESSION_SECONDS = 5;
const MAX_SESSION_SECONDS = 86_400;
const MAX_KILLS_PER_SECOND = 5;
const SYNC_DURATION_GRACE_SECONDS = 5;
const PRICE_DRIFT_TOLERANCE_RATIO = 0.0025;
const PNL_TOLERANCE = 0.005;

export type VerifyPayload = z.infer<typeof verifySessionSchema>['payload'];

export interface SessionSnapshot {
  createdAt?: Date | string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  survivalSeconds: number | null;
  kills: number | null;
  level: number | null;
}

export interface TrustedSessionMetrics {
  entryPrice: number;
  exitPrice: number;
  survivalSeconds: number;
  kills: number;
  level: number;
  maxStreak: number;
  pnl: number;
}

export interface TrustedMetricsResult {
  metrics: TrustedSessionMetrics;
  suspiciousFlags: string[];
}

interface TrustedMetricsOptions {
  nowMs?: number;
  realEntryPrice?: number;
  realExitPrice?: number;
}

const hasPositiveNumber = (value: number | null | undefined): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const hasNonNegativeNumber = (value: number | null | undefined): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
};

const isWithinTolerance = (
  left: number,
  right: number,
  toleranceRatio: number
): boolean => {
  const baseline = Math.max(Math.abs(left), Math.abs(right), 1);
  return Math.abs(left - right) <= baseline * toleranceRatio;
};

const getSessionAgeSeconds = (
  createdAt: Date | string | null | undefined,
  nowMs: number
): number | null => {
  if (!createdAt) {
    return null;
  }

  const createdAtMs =
    createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);

  if (!Number.isFinite(createdAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));
};

export const calculateRawPnlFromPrices = (
  entryPrice: number,
  exitPrice: number,
  position: string
): number => {
  if (!hasPositiveNumber(entryPrice) || !hasPositiveNumber(exitPrice)) {
    throw new Error('INVALID_PRICE_DATA');
  }

  let pnl = (exitPrice - entryPrice) / entryPrice;
  if (position === 'SHORT') {
    pnl = -pnl;
  }

  return pnl;
};

export const calculateLeveragedRewardPnl = (rawPnl: number, leverage: number): number =>
  Math.max(-1, rawPnl * leverage);

export const deriveTrustedSessionMetrics = (
  payload: VerifyPayload,
  snapshot: SessionSnapshot,
  options: TrustedMetricsOptions = {}
): TrustedMetricsResult => {
  const suspiciousFlags: string[] = [];

  if (!hasPositiveNumber(payload.claimedEntryPrice) || !hasPositiveNumber(payload.claimedExitPrice)) {
    throw new Error('INVALID_PRICE_DATA');
  }

  let entryPrice = payload.claimedEntryPrice;
  let exitPrice = payload.claimedExitPrice;
  let survivalSeconds = Math.floor(payload.survivalSeconds);
  let kills = payload.kills;
  let level = payload.level;
  let maxStreak = payload.maxStreak;

  if (survivalSeconds < MIN_SESSION_SECONDS) {
    throw new Error('SESSION_TOO_SHORT');
  }
  if (survivalSeconds > MAX_SESSION_SECONDS) {
    throw new Error('SESSION_DURATION_IMPLAUSIBLE');
  }
  if (maxStreak > kills) {
    throw new Error('STREAK_EXCEEDS_KILLS');
  }

  const sessionAgeSeconds = getSessionAgeSeconds(
    snapshot.createdAt,
    options.nowMs ?? Date.now()
  );
  if (sessionAgeSeconds !== null) {
    const maxServerBackedDuration =
      sessionAgeSeconds + SYNC_DURATION_GRACE_SECONDS;
    if (survivalSeconds > maxServerBackedDuration) {
      survivalSeconds = Math.max(MIN_SESSION_SECONDS, maxServerBackedDuration);
      suspiciousFlags.push('duration_clamped_to_server_age');
    }
  }

  if (
    hasPositiveNumber(options.realEntryPrice) &&
    !isWithinTolerance(entryPrice, options.realEntryPrice, PRICE_DRIFT_TOLERANCE_RATIO)
  ) {
    entryPrice = options.realEntryPrice;
    suspiciousFlags.push('entry_price_clamped_to_history');
  } else if (
    hasPositiveNumber(snapshot.entryPrice) &&
    !isWithinTolerance(entryPrice, snapshot.entryPrice, PRICE_DRIFT_TOLERANCE_RATIO)
  ) {
    entryPrice = snapshot.entryPrice;
    suspiciousFlags.push('entry_price_clamped_to_sync');
  }

  if (
    hasPositiveNumber(options.realExitPrice) &&
    !isWithinTolerance(exitPrice, options.realExitPrice, PRICE_DRIFT_TOLERANCE_RATIO)
  ) {
    exitPrice = options.realExitPrice;
    suspiciousFlags.push('exit_price_clamped_to_history');
  } else if (
    hasPositiveNumber(snapshot.exitPrice) &&
    !isWithinTolerance(exitPrice, snapshot.exitPrice, PRICE_DRIFT_TOLERANCE_RATIO)
  ) {
    exitPrice = snapshot.exitPrice;
    suspiciousFlags.push('exit_price_clamped_to_sync');
  }

  if (
    hasNonNegativeNumber(snapshot.survivalSeconds) &&
    snapshot.survivalSeconds > 0 &&
    survivalSeconds > snapshot.survivalSeconds + SYNC_DURATION_GRACE_SECONDS
  ) {
    survivalSeconds = snapshot.survivalSeconds;
    suspiciousFlags.push('duration_clamped_to_sync');
  }

  const trustedKillsSnapshot =
    hasNonNegativeNumber(snapshot.kills) && snapshot.kills > 0 ? snapshot.kills : null;
  const trustedLevelSnapshot =
    hasPositiveNumber(snapshot.level) && snapshot.level > 1 ? snapshot.level : null;

  if (trustedKillsSnapshot !== null && kills > trustedKillsSnapshot) {
    kills = trustedKillsSnapshot;
    suspiciousFlags.push('kills_clamped_to_sync');
  }

  if (trustedLevelSnapshot !== null && level > trustedLevelSnapshot) {
    level = trustedLevelSnapshot;
    suspiciousFlags.push('level_clamped_to_sync');
  }

  const maxPlausibleKills = Math.ceil(survivalSeconds * MAX_KILLS_PER_SECOND);
  if (kills > maxPlausibleKills) {
    throw new Error('KILL_RATE_IMPLAUSIBLE');
  }

  if (maxStreak > kills) {
    maxStreak = kills;
    suspiciousFlags.push('streak_clamped_to_kills');
  }

  const pnl = calculateRawPnlFromPrices(entryPrice, exitPrice, payload.position);
  if (!isWithinTolerance(payload.claimedPnL, pnl, PNL_TOLERANCE)) {
    suspiciousFlags.push('pnl_recomputed_from_prices');
  }

  return {
    metrics: {
      entryPrice,
      exitPrice,
      survivalSeconds,
      kills,
      level,
      maxStreak,
      pnl,
    },
    suspiciousFlags,
  };
};
