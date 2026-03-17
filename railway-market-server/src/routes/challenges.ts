import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// ── Challenge template pool (server generates from these) ─────────

interface ChallengeTemplate {
  name: string;
  description: string;
  constraints: Array<{ type: string; value: string | number }>;
  objectives: Array<{ type: string; target: number }>;
  reward: { metaCoins: number; bonusXp: number };
}

const DAILY_TEMPLATES: ChallengeTemplate[] = [
  {
    name: 'Bear Trap',
    description: 'Survive 5 minutes in a SHORT position with 10x+ leverage',
    constraints: [{ type: 'position', value: 'SHORT' }, { type: 'leverage_min', value: 10 }],
    objectives: [{ type: 'survive_seconds', target: 300 }],
    reward: { metaCoins: 200, bonusXp: 100 },
  },
  {
    name: 'Diamond Hands',
    description: 'Reach level 10 in a LONG position with 50x+ leverage',
    constraints: [{ type: 'position', value: 'LONG' }, { type: 'leverage_min', value: 50 }],
    objectives: [{ type: 'reach_level', target: 10 }],
    reward: { metaCoins: 350, bonusXp: 200 },
  },
  {
    name: 'Whale Hunter',
    description: 'Kill 3 Whale enemies in a single run',
    constraints: [],
    objectives: [{ type: 'whale_kill_count', target: 3 }],
    reward: { metaCoins: 250, bonusXp: 150 },
  },
  {
    name: 'Speed Runner',
    description: 'Reach level 8 in under 3 minutes',
    constraints: [],
    objectives: [{ type: 'reach_level', target: 8 }, { type: 'survive_seconds_max', target: 180 }],
    reward: { metaCoins: 300, bonusXp: 200 },
  },
  {
    name: 'Pacifist Run',
    description: 'Survive 4 minutes with less than 50 kills',
    constraints: [],
    objectives: [{ type: 'survive_seconds', target: 240 }, { type: 'kill_count_max', target: 50 }],
    reward: { metaCoins: 400, bonusXp: 250 },
  },
  {
    name: 'Degen Mode',
    description: 'Survive 2 minutes at 100x leverage',
    constraints: [{ type: 'leverage_min', value: 100 }],
    objectives: [{ type: 'survive_seconds', target: 120 }],
    reward: { metaCoins: 500, bonusXp: 300 },
  },
  {
    name: 'Kill Frenzy',
    description: 'Get 200 kills in a single run',
    constraints: [],
    objectives: [{ type: 'kill_count', target: 200 }],
    reward: { metaCoins: 250, bonusXp: 150 },
  },
];

const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  {
    name: 'The Liquidator',
    description: 'Survive 60 seconds in the liquidation zone at 100x SHORT',
    constraints: [{ type: 'position', value: 'SHORT' }, { type: 'leverage_min', value: 100 }],
    objectives: [{ type: 'survive_liquidation_zone', target: 60 }],
    reward: { metaCoins: 1500, bonusXp: 500 },
  },
  {
    name: 'Marathon Runner',
    description: 'Survive 15 minutes in any mode and reach level 15',
    constraints: [],
    objectives: [{ type: 'survive_seconds', target: 900 }, { type: 'reach_level', target: 15 }],
    reward: { metaCoins: 2000, bonusXp: 750 },
  },
];

/**
 * Deterministic seed from a date string.
 */
function hashDate(dateStr: string): number {
  const hash = crypto.createHash('sha256').update(dateStr).digest();
  // Use first 6 bytes as a number (safe for JS integers)
  return hash.readUIntBE(0, 6);
}

/**
 * Deterministic template selection from seed.
 */
function selectTemplate(templates: ChallengeTemplate[], seed: number): ChallengeTemplate {
  return templates[seed % templates.length];
}

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
 * GET /api/v1/challenges/today — Get today's daily challenge
 * Auto-generates if not yet created for today.
 */
router.get('/today', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // "2026-03-17"
    const challengeId = `${today}-daily`;

    // Check if already exists
    const { rows: existing } = await query(
      `SELECT * FROM daily_challenges WHERE id = $1`,
      [challengeId]
    );

    if (existing.length > 0) {
      res.json(formatChallenge(existing[0]));
      return;
    }

    // Generate from template
    const seed = hashDate(today);
    const template = selectTemplate(DAILY_TEMPLATES, seed);
    const expiresAt = new Date(`${today}T23:59:59.999Z`);

    const { rows } = await query(
      `INSERT INTO daily_challenges (id, type, name, description, constraints, objectives, reward, expires_at, seed)
       VALUES ($1, 'daily', $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        challengeId,
        template.name,
        template.description,
        JSON.stringify(template.constraints),
        JSON.stringify(template.objectives),
        JSON.stringify(template.reward),
        expiresAt.toISOString(),
        seed,
      ]
    );

    // Log seed for audit
    await query(
      `INSERT INTO challenge_seed_log (challenge_date, challenge_type, seed, challenge_id)
       VALUES ($1, 'daily', $2, $3)
       ON CONFLICT (challenge_date, challenge_type) DO NOTHING`,
      [today, seed, challengeId]
    );

    if (rows.length > 0) {
      res.json(formatChallenge(rows[0]));
    } else {
      // Race condition: another request created it
      const { rows: retry } = await query(
        `SELECT * FROM daily_challenges WHERE id = $1`,
        [challengeId]
      );
      res.json(formatChallenge(retry[0]));
    }
  } catch (error) {
    Logger.error('[Challenges] Today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * GET /api/v1/challenges/weekly — Get this week's weekly challenge
 */
router.get('/weekly', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    // ISO week: Monday-based
    const dayOfWeek = now.getUTCDay() || 7; // 1=Mon, 7=Sun
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
    const weekStr = monday.toISOString().split('T')[0];
    const challengeId = `${weekStr}-weekly`;

    const { rows: existing } = await query(
      `SELECT * FROM daily_challenges WHERE id = $1`,
      [challengeId]
    );

    if (existing.length > 0) {
      res.json(formatChallenge(existing[0]));
      return;
    }

    const seed = hashDate(weekStr + '-weekly');
    const template = selectTemplate(WEEKLY_TEMPLATES, seed);
    // Expires Sunday 23:59:59
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const expiresAt = new Date(`${sunday.toISOString().split('T')[0]}T23:59:59.999Z`);

    const { rows } = await query(
      `INSERT INTO daily_challenges (id, type, name, description, constraints, objectives, reward, expires_at, seed)
       VALUES ($1, 'weekly', $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        challengeId,
        template.name,
        template.description,
        JSON.stringify(template.constraints),
        JSON.stringify(template.objectives),
        JSON.stringify(template.reward),
        expiresAt.toISOString(),
        seed,
      ]
    );

    await query(
      `INSERT INTO challenge_seed_log (challenge_date, challenge_type, seed, challenge_id)
       VALUES ($1, 'weekly', $2, $3)
       ON CONFLICT (challenge_date, challenge_type) DO NOTHING`,
      [weekStr, seed, challengeId]
    );

    if (rows.length > 0) {
      res.json(formatChallenge(rows[0]));
    } else {
      const { rows: retry } = await query(
        `SELECT * FROM daily_challenges WHERE id = $1`,
        [challengeId]
      );
      res.json(formatChallenge(retry[0]));
    }
  } catch (error) {
    Logger.error('[Challenges] Weekly error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * POST /api/v1/challenges/complete — Submit challenge completion
 * Body: { challengeId, sessionId, score, survivalSeconds, kills, levelReached, objectivesCompleted }
 */
router.post('/complete', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      challengeId,
      sessionId,
      score,
      survivalSeconds,
      kills,
      levelReached,
      objectivesCompleted,
    } = req.body as {
      challengeId?: string;
      sessionId?: string;
      score?: number;
      survivalSeconds?: number;
      kills?: number;
      levelReached?: number;
      objectivesCompleted?: unknown[];
    };

    if (!challengeId || !score) {
      res.status(400).json({ error: 'challengeId and score are required' });
      return;
    }

    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Verify challenge exists and is active
    const { rows: challenges } = await query(
      `SELECT * FROM daily_challenges WHERE id = $1 AND is_active = true AND expires_at > now()`,
      [challengeId]
    );

    if (challenges.length === 0) {
      res.status(404).json({ error: 'Challenge not found or expired' });
      return;
    }

    // Insert completion (UNIQUE constraint prevents duplicates)
    const { rows } = await query(
      `INSERT INTO challenge_completions
         (profile_id, challenge_id, session_id, score, survival_seconds, kills, level_reached, objectives_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (profile_id, challenge_id) DO UPDATE SET
         score = GREATEST(challenge_completions.score, EXCLUDED.score),
         survival_seconds = GREATEST(challenge_completions.survival_seconds, EXCLUDED.survival_seconds),
         kills = GREATEST(challenge_completions.kills, EXCLUDED.kills),
         level_reached = GREATEST(challenge_completions.level_reached, EXCLUDED.level_reached)
       RETURNING id, score`,
      [
        profileId,
        challengeId,
        sessionId ?? null,
        score ?? 0,
        survivalSeconds ?? 0,
        kills ?? 0,
        levelReached ?? 1,
        JSON.stringify(objectivesCompleted ?? []),
      ]
    );

    // Credit meta coin reward
    const challenge = challenges[0];
    const reward = challenge.reward as { metaCoins?: number; bonusXp?: number };
    if (reward.metaCoins && reward.metaCoins > 0) {
      await query(
        `SELECT * FROM transfer_meta_coins($1, $2, 1.0)`,
        [profileId, reward.metaCoins]
      );
    }

    Logger.info(`[Challenges] ${profileId} completed ${challengeId} with score ${rows[0].score}`);

    res.json({
      completionId: rows[0].id,
      score: rows[0].score,
      reward,
    });
  } catch (error) {
    Logger.error('[Challenges] Complete error:', error);
    res.status(500).json({ error: 'Completion failed' });
  }
}));

/**
 * GET /api/v1/challenges/:challengeId/leaderboard — Challenge leaderboard
 */
router.get('/:challengeId/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;

    const { rows } = await query(
      `SELECT * FROM v_challenge_leaderboard
       WHERE challenge_id = $1
       LIMIT 100`,
      [challengeId]
    );

    res.json({
      challengeId,
      entries: rows.map(r => ({
        nickname: r.nickname,
        avatarUrl: r.avatar_url,
        score: r.score,
        survivalSeconds: r.survival_seconds,
        kills: r.kills,
        levelReached: r.level_reached,
        completedAt: r.completed_at,
      })),
    });
  } catch (error) {
    Logger.error('[Challenges] Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * GET /api/v1/challenges/status — Check if current user completed today's/weekly challenges
 */
router.get('/status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { rows } = await query(
      `SELECT cc.challenge_id, cc.score, cc.completed_at, dc.type, dc.name
       FROM challenge_completions cc
       JOIN daily_challenges dc ON cc.challenge_id = dc.id
       WHERE cc.profile_id = $1
         AND dc.expires_at > now()
       ORDER BY cc.completed_at DESC`,
      [profileId]
    );

    res.json({
      completions: rows.map(r => ({
        challengeId: r.challenge_id,
        type: r.type,
        name: r.name,
        score: r.score,
        completedAt: r.completed_at,
      })),
    });
  } catch (error) {
    Logger.error('[Challenges] Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// ── Helpers ──────────────────────────────────────────────────

function formatChallenge(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    constraints: row.constraints,
    objectives: row.objectives,
    reward: row.reward,
    expiresAt: row.expires_at,
    seed: Number(row.seed),
    isActive: row.is_active,
  };
}

export default router;
