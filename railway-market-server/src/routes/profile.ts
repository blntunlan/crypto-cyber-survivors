import { Router, type Request, type Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles } from '../db/schema';
import { createProfileSchema, updateProfileSchema } from '../db/validation';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/profile — Fetch current user's profile
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, req.authUserId!))
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
 * POST /api/v1/profile — Create or return existing profile (upsert semantics)
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
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
      .where(eq(profiles.authUserId, req.authUserId!))
      .limit(1);

    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    // Create new profile
    const rows = await db
      .insert(profiles)
      .values({
        authUserId: req.authUserId!,
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
      .where(eq(profiles.authUserId, req.authUserId!))
      .returning();

    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

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
