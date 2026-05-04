import { Router, type Request, type Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { metaProgression } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { Logger } from '../utils/logger';
import { logAudit, getClientInfo } from '../utils/auditLogger';

const router = Router();

// Valid upgrade IDs and their max levels + cost tables
const META_UPGRADE_DEFS: Record<string, { maxLevel: number; costPerLevel: number[] }> = {
  // Combat
  DAMAGE_BOOST:      { maxLevel: 5, costPerLevel: [50, 120, 250, 500, 1000] },
  CRIT_MASTERY:      { maxLevel: 3, costPerLevel: [80, 200, 450] },
  EXTRA_PROJECTILE:  { maxLevel: 2, costPerLevel: [300, 800] },
  // Survival
  HP_RESERVOIR:      { maxLevel: 5, costPerLevel: [40, 100, 200, 400, 800] },
  ARMOR_PLATING:     { maxLevel: 3, costPerLevel: [100, 250, 600] },
  DASH_COOLDOWN:     { maxLevel: 2, costPerLevel: [150, 400] },
  // Economy
  COIN_MAGNET:       { maxLevel: 5, costPerLevel: [30, 70, 150, 300, 600] },
  LUCK_GENE:         { maxLevel: 4, costPerLevel: [60, 150, 350, 700] },
  XP_ACCELERATOR:    { maxLevel: 3, costPerLevel: [80, 180, 400] },
  // Special (single level)
  STARTING_LEVEL_2:  { maxLevel: 1, costPerLevel: [2000] },
  QUAD_CARD_CHOICE:  { maxLevel: 1, costPerLevel: [3000] },
  GRACE_EXTENSION:   { maxLevel: 1, costPerLevel: [1500] },
};

/**
 * GET /api/v1/meta/state — Get full meta progression state
 */
router.get('/state', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
        metaCoins: metaProgression.metaCoins,
        upgrades: metaProgression.upgrades,
        totalRunsCompleted: metaProgression.totalRunsCompleted,
        totalMetaCoinsEarned: metaProgression.totalMetaCoinsEarned,
      })
      .from(metaProgression)
      .where(eq(metaProgression.profileId, profileId))
      .limit(1);

    if (rows.length === 0) {
      // Auto-create if missing (edge case: profile created before migration)
      await db
        .insert(metaProgression)
        .values({ profileId })
        .onConflictDoNothing();

      res.json({
        metaCoins: 0,
        upgrades: {},
        totalRunsCompleted: 0,
        totalMetaCoinsEarned: 0,
      });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    Logger.error('[MetaProgression] State error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * POST /api/v1/meta/purchase — Purchase a meta upgrade
 */
router.post('/purchase', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const { upgradeId } = req.body as { upgradeId?: string };

    if (!upgradeId || !META_UPGRADE_DEFS[upgradeId]) {
      res.status(400).json({ error: 'Invalid upgrade ID' });
      return;
    }

    const profileId = await getProfileId(authUserId);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const def = META_UPGRADE_DEFS[upgradeId];
    const db = getDb();

    // Get current level to determine cost
    const stateResult = await db.execute(
      sql`SELECT COALESCE((upgrades->>${upgradeId})::INTEGER, 0) AS current_level
          FROM meta_progression WHERE profile_id = ${profileId}`
    );

    if (stateResult.rows.length === 0) {
      res.status(404).json({ error: 'Meta progression not found' });
      return;
    }

    const currentLevel = (stateResult.rows[0] as { current_level: number }).current_level;
    if (currentLevel >= def.maxLevel) {
      res.status(409).json({ error: 'Already at max level' });
      return;
    }

    const cost = def.costPerLevel[currentLevel];

    // Atomic purchase via DB function
    const result = await db.execute(
      sql`SELECT * FROM purchase_meta_upgrade(${profileId}, ${upgradeId}, ${cost}, ${def.maxLevel})`
    );

    if (result.rows.length === 0) {
      res.status(500).json({ error: 'Purchase failed' });
      return;
    }

    const row = result.rows[0] as { upgrade_id: string; new_level: number; new_meta_coins: string };
    Logger.info(`[MetaProgression] ${profileId} purchased ${upgradeId} → level ${row.new_level}`);

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId,
      action: 'wallet.spend',
      resource: '/api/v1/meta/purchase',
      details: { upgradeId, newLevel: row.new_level, cost },
      ipAddress,
      userAgent,
    });

    res.json({
      upgradeId: row.upgrade_id,
      newLevel: row.new_level,
      newMetaCoins: Number(row.new_meta_coins),
      cost,
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('Insufficient meta coins')) {
      res.status(400).json({ error: 'Insufficient meta coins' });
      return;
    }
    if (msg.includes('max level')) {
      res.status(409).json({ error: 'Already at max level' });
      return;
    }
    Logger.error('[MetaProgression] Purchase error:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
}));

/**
 * POST /api/v1/meta/transfer — Transfer run coins to meta wallet
 */
router.post('/transfer', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const profileId = await getProfileId(authUserId);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId,
      action: 'wallet.credit_blocked',
      resource: '/api/v1/meta/transfer',
      details: {
        reason: 'deprecated_endpoint',
        message: 'Meta progression rewards are applied during session verification',
      },
      ipAddress,
      userAgent,
    });

    res.status(410).json({
      error: 'Meta progression rewards are applied during session verification',
    });
  } catch (error) {
    Logger.error('[MetaProgression] Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
}));

/**
 * GET /api/v1/meta/leaderboard — Top players by total meta coins earned
 */
router.get('/leaderboard', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.execute(
      sql`SELECT * FROM v_meta_leaderboard LIMIT 100`
    );

    res.json({
      entries: result.rows.map((r: Record<string, unknown>) => ({
        nickname: r.nickname,
        avatarUrl: r.avatar_url,
        metaCoins: Number(r.meta_coins),
        totalRunsCompleted: r.total_runs_completed,
        totalMetaCoinsEarned: Number(r.total_meta_coins_earned),
      })),
    });
  } catch (error) {
    Logger.error('[MetaProgression] Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
