import { Router, type Request, type Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, identities } from '../db/schema';
import { createIdentitySchema } from '../db/validation';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/identities — Link an OAuth identity
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const parsed = createIdentitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
      return;
    }

    const db = getDb();

    // Find profile
    const profile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    if (profile.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profile[0].id;
    const data = parsed.data;

    const rows = await db
      .insert(identities)
      .values({
        profileId,
        provider: data.provider,
        providerUserId: data.provider_user_id,
        providerUsername: data.provider_username ?? null,
        accessToken: data.access_token ?? null,
        refreshToken: data.refresh_token ?? null,
        tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
      })
      .onConflictDoUpdate({
        target: [identities.provider, identities.providerUserId],
        set: {
          providerUsername: sql`EXCLUDED.provider_username`,
          accessToken: sql`EXCLUDED.access_token`,
          refreshToken: sql`EXCLUDED.refresh_token`,
          tokenExpiresAt: sql`EXCLUDED.token_expires_at`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: identities.id,
        provider: identities.provider,
        providerUserId: identities.providerUserId,
        providerUsername: identities.providerUsername,
        createdAt: identities.createdAt,
      });

    res.json(rows[0]);
  } catch (error) {
    Logger.error('[Identities] POST error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * DELETE /api/v1/identities/:provider — Unlink an OAuth identity
 */
router.delete('/:provider', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const authUserId = getRequiredAuthUserId(req);
    const db = getDb();

    const profile = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    if (profile.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const deleted = await db
      .delete(identities)
      .where(
        and(
          eq(identities.profileId, profile[0].id),
          eq(identities.provider, provider)
        )
      )
      .returning({ id: identities.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Identity not found' });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    Logger.error('[Identities] DELETE error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
