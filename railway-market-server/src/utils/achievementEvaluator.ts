/**
 * Achievement evaluator — server-authoritative unlock logic.
 *
 * Called after a session is verified (transaction committed). Reads cumulative
 * player stats from the sessions table, determines which achievements the player
 * newly qualifies for, and inserts them idempotently into player_achievements.
 *
 * This is intentionally non-transactional with the reward flow: achievement
 * unlocks are best-effort and never block or fail session verification. If the
 * evaluator errors, the session is still verified — we log and return [].
 */

import { sql, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { playerAchievements } from '../db/schema';
import { Logger } from './logger';
import {
  ACTIVE_ACHIEVEMENTS,
  isAchievementConditionMet,
  type AchievementDefinition,
  type PlayerAggregateStats,
} from '../config/achievementCatalog';

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  name: string;
  description: string;
  category: string;
  iconKey: string;
  rewardGold: number;
  unlockedAt: string;
}

/**
 * Query cumulative aggregate stats for a profile from verified sessions.
 * PnL is computed from entry/exit prices + position direction.
 */
export async function getPlayerAggregateStats(
  profileId: string
): Promise<PlayerAggregateStats> {
  const db = getDb();
  const result = await db.execute(
    sql`
      SELECT
        COALESCE(SUM(kills), 0)::INT                       AS total_kills,
        COALESCE(MAX(survival_seconds), 0)::INT            AS max_survival_seconds,
        COALESCE(MAX(level), 0)::INT                       AS max_level,
        COALESCE(MAX(
          CASE
            WHEN entry_price IS NOT NULL
             AND exit_price IS NOT NULL
             AND entry_price > 0
            THEN (exit_price - entry_price) / entry_price
                 * CASE WHEN position = 'SHORT' THEN -1 ELSE 1 END
          END
        ), 0)::FLOAT                                       AS max_pnl
      FROM sessions
      WHERE profile_id = ${profileId}
        AND is_verified = true
    `
  );

  const row = (result.rows[0] ?? {}) as {
    total_kills: number;
    max_survival_seconds: number;
    max_level: number;
    max_pnl: number;
  };

  return {
    totalKills: Number(row.total_kills ?? 0),
    maxSurvivalSeconds: Number(row.max_survival_seconds ?? 0),
    maxLevel: Number(row.max_level ?? 0),
    maxPnl: Number(row.max_pnl ?? 0),
  };
}

/**
 * Get the set of achievement IDs this profile has already unlocked.
 */
async function getExistingUnlocks(profileId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .select({ achievementId: playerAchievements.achievementId })
    .from(playerAchievements)
    .where(eq(playerAchievements.profileId, profileId));
  return new Set(rows.map((r) => r.achievementId));
}

/**
 * Evaluate and persist newly-unlocked achievements for a profile after a
 * verified session. Returns the full definitions of newly unlocked achievements
 * so the verify response can surface them to the client for UI popups.
 *
 * @param profileId  The profile that just had a session verified.
 * @param sessionId  The session that triggered the evaluation (for traceability).
 * @returns          Newly unlocked achievements (empty if none or on error).
 */
export async function evaluateAndUnlockAchievements(
  profileId: string,
  sessionId: string
): Promise<UnlockedAchievement[]> {
  try {
    const [stats, existing] = await Promise.all([
      getPlayerAggregateStats(profileId),
      getExistingUnlocks(profileId),
    ]);

    // Determine which active achievements are met but not yet recorded.
    const newlyMet: AchievementDefinition[] = ACTIVE_ACHIEVEMENTS.filter(
      (a) => !existing.has(a.id) && isAchievementConditionMet(a, stats)
    );

    if (newlyMet.length === 0) {
      return [];
    }

    // Idempotent bulk insert — ON CONFLICT skips any that slipped in concurrently.
    const db = getDb();
    const insertResult = await db
      .insert(playerAchievements)
      .values(
        newlyMet.map((a) => ({
          profileId,
          achievementId: a.id,
          sessionId,
        }))
      )
      .onConflictDoNothing()
      .returning({
        achievementId: playerAchievements.achievementId,
        unlockedAt: playerAchievements.unlockedAt,
      });

    // Build the response from actually-inserted rows (concurrency-safe).
    const insertedMap = new Map(
      insertResult.map((r) => {
        const ts = r.unlockedAt instanceof Date ? r.unlockedAt.toISOString() : String(r.unlockedAt);
        return [r.achievementId, ts] as const;
      })
    );

    // Fallback: if RETURNING yielded nothing (some DB configs), use newlyMet
    // with a timestamp — the ON CONFLICT guarantees they're now recorded.
    const unlocked: UnlockedAchievement[] = newlyMet
      .filter((a) => insertedMap.size === 0 || insertedMap.has(a.id))
      .map((a) => ({
        id: a.id,
        achievementId: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        iconKey: a.iconKey,
        rewardGold: a.rewardGold,
        unlockedAt: insertedMap.get(a.id) ?? new Date().toISOString(),
      }));

    if (unlocked.length > 0) {
      Logger.info(
        `[Achievements] Profile ${profileId} unlocked ${unlocked.length} achievement(s): ${unlocked.map((u) => u.achievementId).join(', ')}`
      );
    }

    return unlocked;
  } catch (error) {
    // Never fail session verification due to achievement errors.
    Logger.error('[Achievements] Evaluation failed (non-fatal):', error);
    return [];
  }
}
