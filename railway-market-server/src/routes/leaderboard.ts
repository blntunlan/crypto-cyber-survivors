import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/leaderboard — Public leaderboard (aggregated per player)
 * Query params: ?pair=BTC&limit=50&offset=0&sort=max_survival_time
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const pair = req.query.pair as string | undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const allowedSorts = ['max_survival_time', 'total_kills', 'high_score', 'total_sessions'] as const;
    const sortParam = req.query.sort as string | undefined;
    const sort = allowedSorts.includes(sortParam as typeof allowedSorts[number])
      ? sortParam!
      : 'max_survival_time';

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

    res.json({ data: result.rows, limit, offset, sort });
  } catch (error) {
    Logger.error('[Leaderboard] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
