import { Router, type Request, type Response } from 'express';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/leaderboard — Public leaderboard
 * Query params: ?pair=BTC&limit=50&offset=0
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const pair = req.query.pair as string | undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    let sql = `SELECT * FROM v_leaderboard`;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pair) {
      sql += ` WHERE pair = $${paramIdx++}`;
      params.push(pair);
    }

    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);

    res.json({ data: rows, limit, offset });
  } catch (error) {
    Logger.error('[Leaderboard] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
