import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { Logger } from '../utils/logger';
import { cacheMiddleware, cacheInvalidator } from '../middleware/responseCache';
import { LeaderboardCache } from '../services/cacheService';

const router = Router();

// Invalidate HTTP response cache on any write to this router
router.use(cacheInvalidator);

/**
 * GET /api/v1/leaderboard — Public leaderboard (aggregated per player)
 * Query params: ?pair=BTC&limit=50&offset=0&sort=max_survival_time
 *
 * Cached for 60 s at the service layer; HTTP response also carries
 * Cache-Control: public, max-age=60 via cacheMiddleware.
 */
router.get('/', cacheMiddleware(60), asyncHandler(async (req: Request, res: Response) => {
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

    // Service-level cache key encodes all query dimensions
    const cacheKey = `leaderboard:${pair ?? 'all'}:${sort}:${limit}:${offset}`;
    const cached = LeaderboardCache.get<{ data: unknown[]; limit: number; offset: number; sort: string }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const db = getDb();

    // View queries stay as raw SQL since Drizzle views are read-only and
    // dynamic ORDER BY with whitelisted column names is safer this way
    const result = pair
      ? await db.execute(
          sql`SELECT * FROM v_leaderboard WHERE pair = ${pair} ORDER BY ${sql.raw(sort)} DESC LIMIT ${limit} OFFSET ${offset}`
        )
      : await db.execute(
          sql`SELECT * FROM v_leaderboard ORDER BY ${sql.raw(sort)} DESC LIMIT ${limit} OFFSET ${offset}`
        );

    const payload = { data: result.rows, limit, offset, sort };
    LeaderboardCache.set(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    Logger.error('[Leaderboard] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
