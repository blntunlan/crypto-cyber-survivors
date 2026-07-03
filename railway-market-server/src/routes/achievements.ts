import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { playerAchievements } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { Logger } from '../utils/logger';
import { ACTIVE_ACHIEVEMENTS } from '../config/achievementCatalog';

const router = Router();

/**
 * GET /api/v1/achievements — full achievement catalog (active definitions).
 * Public-ish: requires auth (JWT) but returns the same catalog to everyone.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      achievements: ACTIVE_ACHIEVEMENTS.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        iconKey: a.iconKey,
        conditionType: a.conditionType,
        conditionValue: a.conditionValue,
        rewardGold: a.rewardGold,
        isActive: a.isActive,
      })),
    });
  })
);

/**
 * GET /api/v1/achievements/mine — achievements this profile has unlocked.
 */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const authUserId = getRequiredAuthUserId(req);
      const profileId = await getProfileId(authUserId);
      if (!profileId) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      const db = getDb();
      const rows = await db
        .select({
          id: playerAchievements.id,
          profileId: playerAchievements.profileId,
          achievementId: playerAchievements.achievementId,
          unlockedAt: playerAchievements.unlockedAt,
        })
        .from(playerAchievements)
        .where(eq(playerAchievements.profileId, profileId));

      const unlocked = rows.map((r) => ({
        id: r.id,
        profileId: r.profileId,
        achievementId: r.achievementId,
        unlockedAt: r.unlockedAt instanceof Date ? r.unlockedAt.toISOString() : String(r.unlockedAt),
      }));

      res.json({ unlocked });
    } catch (error) {
      Logger.error('[Achievements] Fetch mine error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  })
);

export default router;
