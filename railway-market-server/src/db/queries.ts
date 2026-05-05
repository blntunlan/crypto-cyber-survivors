/**
 * Optimized Query Helpers
 *
 * Centralises the most frequently executed database queries with:
 *   - Explicit column selection (no SELECT *)
 *   - LIMIT clauses on every list query
 *   - Consistent parameter binding via Drizzle (prepared-statement semantics)
 *   - Indexes documented alongside each query so they stay in sync
 *
 * Index recommendations (applied via migration 003_pg_best_practices.sql or
 * added here as comments for the next migration):
 *
 *   market_state(pair)        — PRIMARY KEY, already indexed
 *   market_state(updated_at)  — CREATE INDEX idx_market_state_updated_at ON market_state(updated_at DESC)
 *   profiles(auth_user_id)    — idx_profiles_auth_user_id (already exists)
 *   sessions(profile_id)      — idx_sessions_profile_id (already exists)
 *   sessions(is_verified, pair, survival_seconds) — idx_sessions_verified_pair_survival (already exists)
 *   meta_progression(profile_id) — idx_meta_progression_profile (already exists)
 *   challenge_completions(profile_id, challenge_id) — unique index (already exists)
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from './index';
import {
  profiles,
  marketState,
  metaProgression,
  sessions,
} from './schema';

// ── Market state ─────────────────────────────────────────────────────────────

export interface MarketStateRow {
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  rsi: number;
  rsiState: string;
  atr: number;
  atrPercent: number;
  spawnRateMultiplier: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: number;
  enemyAggroMultiplierLong: number;
  enemyAggroMultiplierShort: number;
  updatedAt: Date;
}

/**
 * Fetch a single market state row by pair.
 * Uses the PRIMARY KEY index on market_state(pair).
 */
export async function getMarketState(pair: string): Promise<MarketStateRow | null> {
  const db = getDb();
  const rows = await db
    .select({
      pair: marketState.pair,
      price: marketState.price,
      volume: marketState.volume,
      high: marketState.high,
      low: marketState.low,
      rsi: marketState.rsi,
      rsiState: marketState.rsiState,
      atr: marketState.atr,
      atrPercent: marketState.atrPercent,
      spawnRateMultiplier: marketState.spawnRateMultiplier,
      normalizedVolume: marketState.normalizedVolume,
      volumePercentile: marketState.volumePercentile,
      whaleTier: marketState.whaleTier,
      enemyAggroMultiplierLong: marketState.enemyAggroMultiplierLong,
      enemyAggroMultiplierShort: marketState.enemyAggroMultiplierShort,
      updatedAt: marketState.updatedAt,
    })
    .from(marketState)
    .where(eq(marketState.pair, pair))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Fetch all market state rows, ordered by most recently updated.
 * Relies on idx_market_state_updated_at (recommended index).
 */
export async function getAllMarketStates(limit = 50): Promise<MarketStateRow[]> {
  const db = getDb();
  return db
    .select({
      pair: marketState.pair,
      price: marketState.price,
      volume: marketState.volume,
      high: marketState.high,
      low: marketState.low,
      rsi: marketState.rsi,
      rsiState: marketState.rsiState,
      atr: marketState.atr,
      atrPercent: marketState.atrPercent,
      spawnRateMultiplier: marketState.spawnRateMultiplier,
      normalizedVolume: marketState.normalizedVolume,
      volumePercentile: marketState.volumePercentile,
      whaleTier: marketState.whaleTier,
      enemyAggroMultiplierLong: marketState.enemyAggroMultiplierLong,
      enemyAggroMultiplierShort: marketState.enemyAggroMultiplierShort,
      updatedAt: marketState.updatedAt,
    })
    .from(marketState)
    .orderBy(desc(marketState.updatedAt))
    .limit(limit);
}

// ── Profile / user stats ─────────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  authUserId: string | null;
  nickname: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  primaryAuthProvider: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch a profile by auth_user_id.
 * Uses idx_profiles_auth_user_id.
 */
export async function getProfileByAuthUserId(authUserId: string): Promise<ProfileRow | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: profiles.id,
      authUserId: profiles.authUserId,
      nickname: profiles.nickname,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      walletAddress: profiles.walletAddress,
      primaryAuthProvider: profiles.primaryAuthProvider,
      lastSeenAt: profiles.lastSeenAt,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);

  return rows[0] ?? null;
}

// ── Meta progression ─────────────────────────────────────────────────────────

export interface MetaProgressionRow {
  metaCoins: number;
  upgrades: unknown;
  totalRunsCompleted: number;
  totalMetaCoinsEarned: number;
}

/**
 * Fetch meta progression for a profile.
 * Uses idx_meta_progression_profile.
 */
export async function getMetaProgression(profileId: string): Promise<MetaProgressionRow | null> {
  const db = getDb();
  const rows = await db
    .select({
      metaCoins: metaProgression.metaCoins,
      upgrades: metaProgression.upgrades,
      totalRunsCompleted: metaProgression.totalRunsCompleted,
      totalMetaCoinsEarned: metaProgression.totalMetaCoinsEarned,
    })
    .from(metaProgression)
    .where(eq(metaProgression.profileId, profileId))
    .limit(1);

  return rows[0] ?? null;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionSummaryRow {
  id: string;
  pair: string;
  position: string;
  leverage: number;
  isVerified: boolean;
  rewardAmount: number | null;
  survivalSeconds: number | null;
  kills: number | null;
  level: number | null;
  createdAt: Date;
}

/**
 * Fetch recent sessions for a profile (most recent first).
 * Uses idx_sessions_profile_id.
 */
export async function getRecentSessions(
  profileId: string,
  limit = 20
): Promise<SessionSummaryRow[]> {
  const db = getDb();
  return db
    .select({
      id: sessions.id,
      pair: sessions.pair,
      position: sessions.position,
      leverage: sessions.leverage,
      isVerified: sessions.isVerified,
      rewardAmount: sessions.rewardAmount,
      survivalSeconds: sessions.survivalSeconds,
      kills: sessions.kills,
      level: sessions.level,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.profileId, profileId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);
}

/**
 * Fetch verified sessions for a profile, ordered by survival time.
 * Uses idx_sessions_verified_pair_survival composite index.
 */
export async function getVerifiedSessions(
  profileId: string,
  pair?: string,
  limit = 20
): Promise<SessionSummaryRow[]> {
  const db = getDb();
  const conditions = pair
    ? and(
        eq(sessions.profileId, profileId),
        eq(sessions.isVerified, true),
        eq(sessions.pair, pair)
      )
    : and(eq(sessions.profileId, profileId), eq(sessions.isVerified, true));

  return db
    .select({
      id: sessions.id,
      pair: sessions.pair,
      position: sessions.position,
      leverage: sessions.leverage,
      isVerified: sessions.isVerified,
      rewardAmount: sessions.rewardAmount,
      survivalSeconds: sessions.survivalSeconds,
      kills: sessions.kills,
      level: sessions.level,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(conditions)
    .orderBy(desc(sessions.survivalSeconds))
    .limit(limit);
}

// ── Price history ─────────────────────────────────────────────────────────────

export interface PriceHistoryRow {
  price: number;
  volume: number;
  timestamp: Date;
}

/**
 * Fetch recent price history for a pair.
 * Uses idx_price_history_pair_ts composite index.
 * Returns rows in chronological order (oldest first).
 */
export async function getPriceHistory(
  pair: string,
  limit = 300
): Promise<PriceHistoryRow[]> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT price, volume, timestamp
        FROM price_history
        WHERE pair = ${pair}
        ORDER BY timestamp DESC
        LIMIT ${limit}`
  );
  // Reverse to chronological order
  return (result.rows as PriceHistoryRow[]).reverse();
}
