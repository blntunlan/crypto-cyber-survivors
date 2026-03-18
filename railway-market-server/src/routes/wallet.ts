import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, virtualAccounts } from '../db/schema';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/wallet/balance — Get gold balance for current user
 */
router.get('/balance', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const db = getDb();

    const profile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, req.authUserId!))
      .limit(1);

    if (profile.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const account = await db
      .select({ goldBalance: virtualAccounts.goldBalance })
      .from(virtualAccounts)
      .where(eq(virtualAccounts.profileId, profile[0].id))
      .limit(1);

    const balance = account[0]?.goldBalance ?? 0;

    res.json({ balance });
  } catch (error) {
    Logger.error('[Wallet] Balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
