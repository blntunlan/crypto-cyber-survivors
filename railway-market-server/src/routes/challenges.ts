import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { eq, and, sql, gt } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { dailyChallenges, challengeCompletions, challengeSeedLog } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { Logger } from '../utils/logger';

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

function hashDate(dateStr: string): number {
  const hash = crypto.createHash('sha256').update(dateStr).digest();
  return hash.readUIntBE(0, 6);
}

function selectTemplate(templates: ChallengeTemplate[], seed: number): ChallengeTemplate {
  return templates[seed % templates.length];
}

type ChallengeRow = typeof dailyChallenges.$inferSelect;

function formatChallenge(row: ChallengeRow) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    constraints: row.constraints,
    objectives: row.objectives,
    reward: row.reward,
    expiresAt: row.expiresAt,
    seed: row.seed,
    isActive: row.isActive,
  };
}

/**
 * GET /api/v1/challenges/today — Get today's daily challenge
 */
router.get('/today', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0]!;
    const challengeId = `${today}-daily`;
    const db = getDb();

    const existing = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.id, challengeId))
      .limit(1);

    if (existing.length > 0) {
      res.json(formatChallenge(existing[0]));
      return;
    }

    const seed = hashDate(today);
    const template = selectTemplate(DAILY_TEMPLATES, seed);
    const expiresAt = new Date(`${today}T23:59:59.999Z`);

    const rows = await db
      .insert(dailyChallenges)
      .values({
        id: challengeId,
        type: 'daily',
        name: template.name,
        description: template.description,
        constraints: template.constraints,
        objectives: template.objectives,
        reward: template.reward,
        expiresAt,
        seed,
      })
      .onConflictDoNothing()
      .returning();

    // Log seed for audit
    await db
      .insert(challengeSeedLog)
      .values({ challengeDate: today, challengeType: 'daily', seed, challengeId })
      .onConflictDoNothing();

    if (rows.length > 0) {
      res.json(formatChallenge(rows[0]));
    } else {
      const retry = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, challengeId)).limit(1);
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
    const dayOfWeek = now.getUTCDay() || 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
    const weekStr = monday.toISOString().split('T')[0]!;
    const challengeId = `${weekStr}-weekly`;
    const db = getDb();

    const existing = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.id, challengeId))
      .limit(1);

    if (existing.length > 0) {
      res.json(formatChallenge(existing[0]));
      return;
    }

    const seed = hashDate(weekStr + '-weekly');
    const template = selectTemplate(WEEKLY_TEMPLATES, seed);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const expiresAt = new Date(`${sunday.toISOString().split('T')[0]}T23:59:59.999Z`);

    const rows = await db
      .insert(dailyChallenges)
      .values({
        id: challengeId,
        type: 'weekly',
        name: template.name,
        description: template.description,
        constraints: template.constraints,
        objectives: template.objectives,
        reward: template.reward,
        expiresAt,
        seed,
      })
      .onConflictDoNothing()
      .returning();

    await db
      .insert(challengeSeedLog)
      .values({ challengeDate: weekStr, challengeType: 'weekly', seed, challengeId })
      .onConflictDoNothing();

    if (rows.length > 0) {
      res.json(formatChallenge(rows[0]));
    } else {
      const retry = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, challengeId)).limit(1);
      res.json(formatChallenge(retry[0]));
    }
  } catch (error) {
    Logger.error('[Challenges] Weekly error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * POST /api/v1/challenges/complete — Submit challenge completion
 */
router.post('/complete', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      challengeId, sessionId, score, survivalSeconds, kills, levelReached, objectivesCompleted,
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

    const profileId = await getProfileId(req.authUserId!);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const db = getDb();

    // Verify challenge exists and is active
    const challenges = await db
      .select()
      .from(dailyChallenges)
      .where(
        and(
          eq(dailyChallenges.id, challengeId),
          eq(dailyChallenges.isActive, true),
          gt(dailyChallenges.expiresAt, sql`now()`)
        )
      )
      .limit(1);

    if (challenges.length === 0) {
      res.status(404).json({ error: 'Challenge not found or expired' });
      return;
    }

    // Insert completion (UNIQUE constraint prevents duplicates)
    const rows = await db
      .insert(challengeCompletions)
      .values({
        profileId,
        challengeId,
        sessionId: sessionId ?? null,
        score: score ?? 0,
        survivalSeconds: survivalSeconds ?? 0,
        kills: kills ?? 0,
        levelReached: levelReached ?? 1,
        objectivesCompleted: objectivesCompleted ?? [],
      })
      .onConflictDoUpdate({
        target: [challengeCompletions.profileId, challengeCompletions.challengeId],
        set: {
          score: sql`GREATEST(${challengeCompletions.score}, EXCLUDED.score)`,
          survivalSeconds: sql`GREATEST(${challengeCompletions.survivalSeconds}, EXCLUDED.survival_seconds)`,
          kills: sql`GREATEST(${challengeCompletions.kills}, EXCLUDED.kills)`,
          levelReached: sql`GREATEST(${challengeCompletions.levelReached}, EXCLUDED.level_reached)`,
        },
      })
      .returning({ id: challengeCompletions.id, score: challengeCompletions.score });

    // Credit meta coin reward
    const challenge = challenges[0];
    const reward = challenge.reward as { metaCoins?: number; bonusXp?: number };
    if (reward.metaCoins && reward.metaCoins > 0) {
      await db.execute(
        sql`SELECT * FROM transfer_meta_coins(${profileId}, ${reward.metaCoins}, 1.0)`
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
    const db = getDb();

    const result = await db.execute(
      sql`SELECT * FROM v_challenge_leaderboard WHERE challenge_id = ${challengeId} LIMIT 100`
    );

    res.json({
      challengeId,
      entries: result.rows.map((r: Record<string, unknown>) => ({
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
    const profileId = await getProfileId(req.authUserId!);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const db = getDb();

    const result = await db.execute(
      sql`SELECT cc.challenge_id, cc.score, cc.completed_at, dc.type, dc.name
          FROM challenge_completions cc
          JOIN daily_challenges dc ON cc.challenge_id = dc.id
          WHERE cc.profile_id = ${profileId}
            AND dc.expires_at > now()
          ORDER BY cc.completed_at DESC`
    );

    res.json({
      completions: result.rows.map((r: Record<string, unknown>) => ({
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

export default router;
