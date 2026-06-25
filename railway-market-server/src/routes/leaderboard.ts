import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/leaderboard — Public leaderboard
 * No pair:  one row per player (v_leaderboard, pair-agnostic)
 * ?pair=BTC: one row per player per pair (v_leaderboard_by_pair)
 * Query params: ?pair=BTC&limit=50&offset=0&sort=max_survival_time
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const pair = req.query.pair as string | undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const allowedSorts = ['max_survival_time', 'total_kills', 'high_score', 'total_sessions'] as const;
    type AllowedSort = (typeof allowedSorts)[number];
    const sortParam = req.query.sort as string | undefined;
    const isAllowedSort = (value: string): value is AllowedSort =>
      allowedSorts.includes(value as AllowedSort);
    const sort = sortParam && isAllowedSort(sortParam)
      ? sortParam
      : 'max_survival_time';

    // Deterministic tiebreakers per sort column. Without a secondary ORDER BY,
    // players tied on the primary metric are returned in non-deterministic
    // physical-storage order, so LIMIT 10 (desktop sidebar) and LIMIT 50
    // (mobile/desktop full screen) surface DIFFERENT people in the visible top
    // ranks — the mobile vs desktop leaderboard mismatch. The final
    // `display_name ASC` guarantees a fully deterministic order regardless of
    // LIMIT/OFFSET or materialized-view refresh reordering.
    const ORDER_BY_CLAUSES: Record<AllowedSort, string> = {
      high_score: 'high_score DESC, total_kills DESC, max_survival_time DESC, display_name ASC',
      max_survival_time: 'max_survival_time DESC, total_kills DESC, high_score DESC, display_name ASC',
      total_kills: 'total_kills DESC, max_survival_time DESC, high_score DESC, display_name ASC',
      total_sessions: 'total_sessions DESC, total_kills DESC, max_survival_time DESC, display_name ASC',
    };
    const orderByClause = ORDER_BY_CLAUSES[sort];

    const db = getDb();

    // View queries stay as raw SQL since Drizzle views are read-only and
    // dynamic ORDER BY with whitelisted column names is safer this way.
    // Use v_leaderboard (per-player, pair-agnostic) when no pair is requested
    // so a user never appears more than once. Use v_leaderboard_by_pair when a
    // specific pair is requested (groups by profile + pair).
    const result = pair
      ? await db.execute(
          sql`SELECT * FROM v_leaderboard_by_pair WHERE pair = ${pair} ORDER BY ${sql.raw(orderByClause)} LIMIT ${limit} OFFSET ${offset}`
        )
      : await db.execute(
          sql`SELECT * FROM v_leaderboard ORDER BY ${sql.raw(orderByClause)} LIMIT ${limit} OFFSET ${offset}`
        );

    res.json({ data: result.rows, limit, offset, sort });
  } catch (error) {
    Logger.error('[Leaderboard] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
