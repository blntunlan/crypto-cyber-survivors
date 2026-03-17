import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/identities — Link an OAuth identity
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { provider, provider_user_id, provider_username, access_token, refresh_token, token_expires_at } =
      req.body as {
        provider?: string;
        provider_user_id?: string;
        provider_username?: string;
        access_token?: string;
        refresh_token?: string;
        token_expires_at?: string;
      };

    if (!provider || !provider_user_id) {
      res.status(400).json({ error: 'provider and provider_user_id are required' });
      return;
    }

    // Find profile
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
      `INSERT INTO identities (profile_id, provider, provider_user_id, provider_username, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (provider, provider_user_id) DO UPDATE SET
         provider_username = EXCLUDED.provider_username,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         updated_at = now()
       RETURNING id, provider, provider_user_id, provider_username, created_at`,
      [
        profileId,
        provider,
        provider_user_id,
        provider_username ?? null,
        access_token ?? null,
        refresh_token ?? null,
        token_expires_at ?? null,
      ]
    );

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

    const { rows: profiles } = await query(
      `SELECT id FROM profiles WHERE auth_user_id = $1`,
      [req.authUserId]
    );

    if (profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profiles[0].id;

    const { rowCount } = await query(
      `DELETE FROM identities WHERE profile_id = $1 AND provider = $2`,
      [profileId, provider]
    );

    if (rowCount === 0) {
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
