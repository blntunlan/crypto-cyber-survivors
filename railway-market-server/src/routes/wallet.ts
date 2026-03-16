import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/wallet/balance — Get gold balance for current user
 */
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    // Find profile by auth user id
    const { rows: profiles } = await query(
      `SELECT id FROM profiles WHERE auth_user_id = $1`,
      [req.authUserId]
    );

    if (profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profiles[0].id;

    const { rows } = await query(
      `SELECT gold_balance FROM virtual_accounts WHERE profile_id = $1`,
      [profileId]
    );

    const balance = rows.length > 0 ? Number(rows[0].gold_balance) : 0;

    res.json({ balance });
  } catch (error) {
    Logger.error('[Wallet] Balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
