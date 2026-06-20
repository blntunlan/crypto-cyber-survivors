import { Router, type Request, type Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, sessions, wallets } from '../db/schema';
import { createProfileSchema, updateProfileSchema } from '../db/validation';
import { Logger } from '../utils/logger';
import { logAudit, getClientInfo } from '../utils/auditLogger';

const router = Router();

/**
 * GET /api/v1/profile — Fetch current user's profile
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const db = getDb();
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    Logger.error('[Profile] GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * GET /api/v1/profile/stats — Fetch verified gameplay stats for current user.
 */
router.get('/stats', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const db = getDb();
    const profileRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    const profileId = profileRows[0]?.id;
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const statsRows = await db
      .select({
        totalKills: sql<number>`COALESCE(SUM(${sessions.kills}), 0)::int`,
        totalSurvivalTime: sql<number>`COALESCE(SUM(${sessions.survivalSeconds}), 0)::int`,
        totalGames: sql<number>`COUNT(${sessions.id})::int`,
        maxSurvivalTime: sql<number>`COALESCE(MAX(${sessions.survivalSeconds}), 0)::int`,
        maxKills: sql<number>`COALESCE(MAX(${sessions.kills}), 0)::int`,
        totalGoldEarned: sql<number>`COALESCE(SUM(${sessions.rewardAmount}), 0)::int`,
      })
      .from(sessions)
      .where(and(eq(sessions.profileId, profileId), eq(sessions.isVerified, true)));

    const walletRows = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.profileId, profileId))
      .limit(1);

    const stats = statsRows[0];
    res.json({
      stats: {
        totalKills: Number(stats?.totalKills ?? 0),
        totalSurvivalTime: Number(stats?.totalSurvivalTime ?? 0),
        totalGames: Number(stats?.totalGames ?? 0),
        maxSurvivalTime: Number(stats?.maxSurvivalTime ?? 0),
        maxKills: Number(stats?.maxKills ?? 0),
        totalGoldEarned: Number(stats?.totalGoldEarned ?? 0),
        goldBalance: Number(walletRows[0]?.balance ?? 0),
        gemsBalance: 0,
      },
    });
  } catch (error) {
    Logger.error('[Profile] GET stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * POST /api/v1/profile — Create or return existing profile (upsert semantics)
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
      return;
    }

    const { nickname, avatar_url } = parsed.data;
    const db = getDb();

    // Check if profile already exists for this auth user
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    // Create new profile
    const rows = await db
      .insert(profiles)
      .values({
        authUserId,
        nickname: nickname,
        displayName: nickname,
        avatarUrl: avatar_url ?? null,
      })
      .onConflictDoUpdate({
        target: profiles.authUserId,
        set: { updatedAt: sql`now()` },
      })
      .returning();

    Logger.info(`[Profile] Created profile for ${nickname}`);

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId: rows[0]?.id,
      action: 'profile.create',
      resource: '/api/v1/profile',
      details: { nickname },
      ipAddress,
      userAgent,
    });

    res.status(201).json(rows[0]);
  } catch (error) {
    // Unique constraint violation on nickname
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Nickname already taken' });
      return;
    }
    Logger.error('[Profile] POST error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * PATCH /api/v1/profile — Update profile fields
 */
router.patch('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
      return;
    }

    const db = getDb();
    const updateData: Record<string, unknown> = {
      lastSeenAt: sql`now()`,
      updatedAt: sql`now()`,
    };

    if (parsed.data.nickname !== undefined) {
      updateData.nickname = parsed.data.nickname;
    }
    if (parsed.data.avatar_url !== undefined) {
      updateData.avatarUrl = parsed.data.avatar_url;
    }

    const rows = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.authUserId, authUserId))
      .returning();

    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId: rows[0]?.id,
      action: 'profile.update',
      resource: '/api/v1/profile',
      details: { fields: Object.keys(parsed.data) },
      ipAddress,
      userAgent,
    });

    res.json(rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Nickname already taken' });
      return;
    }
    Logger.error('[Profile] PATCH error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
