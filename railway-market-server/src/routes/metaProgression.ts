import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

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
 * Helper: resolve profile_id from auth_user_id
 */
async function getProfileId(authUserId: string): Promise<string | null> {
  const { rows } = await query(
    `SELECT id FROM profiles WHERE auth_user_id = $1`,
    [authUserId]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * GET /api/v1/meta/state — Get full meta progression state
 */
router.get('/state', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { rows } = await query(
      `SELECT meta_coins, upgrades, total_runs_completed, total_meta_coins_earned
       FROM meta_progression WHERE profile_id = $1`,
      [profileId]
    );

    if (rows.length === 0) {
      // Auto-create if missing (edge case: profile created before migration)
      await query(
        `INSERT INTO meta_progression (profile_id) VALUES ($1) ON CONFLICT (profile_id) DO NOTHING`,
        [profileId]
      );
      res.json({
        metaCoins: 0,
        upgrades: {},
        totalRunsCompleted: 0,
        totalMetaCoinsEarned: 0,
      });
      return;
    }

    const row = rows[0];
    res.json({
      metaCoins: Number(row.meta_coins),
      upgrades: row.upgrades,
      totalRunsCompleted: row.total_runs_completed,
      totalMetaCoinsEarned: Number(row.total_meta_coins_earned),
    });
  } catch (error) {
    Logger.error('[MetaProgression] State error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * POST /api/v1/meta/purchase — Purchase a meta upgrade
 * Body: { upgradeId: string }
 */
router.post('/purchase', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { upgradeId } = req.body as { upgradeId?: string };

    if (!upgradeId || !META_UPGRADE_DEFS[upgradeId]) {
      res.status(400).json({ error: 'Invalid upgrade ID' });
      return;
    }

    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const def = META_UPGRADE_DEFS[upgradeId];

    // Get current level to determine cost
    const { rows: stateRows } = await query(
      `SELECT COALESCE((upgrades->>$2)::INTEGER, 0) AS current_level
       FROM meta_progression WHERE profile_id = $1`,
      [profileId, upgradeId]
    );

    if (stateRows.length === 0) {
      res.status(404).json({ error: 'Meta progression not found' });
      return;
    }

    const currentLevel = stateRows[0].current_level as number;
    if (currentLevel >= def.maxLevel) {
      res.status(409).json({ error: 'Already at max level' });
      return;
    }

    const cost = def.costPerLevel[currentLevel];

    // Atomic purchase via DB function
    const { rows } = await query(
      `SELECT * FROM purchase_meta_upgrade($1, $2, $3, $4)`,
      [profileId, upgradeId, cost, def.maxLevel]
    );

    if (rows.length === 0) {
      res.status(500).json({ error: 'Purchase failed' });
      return;
    }

    const result = rows[0];
    Logger.info(`[MetaProgression] ${profileId} purchased ${upgradeId} → level ${result.new_level}`);

    res.json({
      upgradeId: result.upgrade_id,
      newLevel: result.new_level,
      newMetaCoins: Number(result.new_meta_coins),
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
 * Body: { earnedCoins: number }
 * Called by session verify flow or client post-game.
 */
router.post('/transfer', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { earnedCoins } = req.body as { earnedCoins?: number };

    if (typeof earnedCoins !== 'number' || earnedCoins < 0) {
      res.status(400).json({ error: 'earnedCoins must be a non-negative number' });
      return;
    }

    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { rows } = await query(
      `SELECT * FROM transfer_meta_coins($1, $2)`,
      [profileId, Math.floor(earnedCoins)]
    );

    if (rows.length === 0) {
      res.status(500).json({ error: 'Transfer failed' });
      return;
    }

    const result = rows[0];
    Logger.info(`[MetaProgression] ${profileId} transferred ${result.meta_share} meta coins`);

    res.json({
      metaShare: Number(result.meta_share),
      newMetaBalance: Number(result.new_meta_balance),
      newTotalEarned: Number(result.new_total_earned),
      newRunsCompleted: result.new_runs_completed,
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
    const { rows } = await query(
      `SELECT * FROM v_meta_leaderboard LIMIT 100`
    );

    res.json({
      entries: rows.map(r => ({
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
