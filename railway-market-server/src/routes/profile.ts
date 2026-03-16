import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/profile — Fetch current user's profile
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id, auth_user_id, nickname, display_name, avatar_url, wallet_address, primary_auth_provider, last_seen_at, created_at, updated_at
       FROM profiles WHERE auth_user_id = $1`,
      [req.authUserId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    Logger.error('[Profile] GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/profile — Create or return existing profile (upsert semantics)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { nickname, avatar_url } = req.body as {
      nickname?: string;
      avatar_url?: string;
    };

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      res.status(400).json({ error: 'nickname is required' });
      return;
    }

    // Check if profile already exists for this auth user
    const { rows: existing } = await query(
      `SELECT id, auth_user_id, nickname, display_name, avatar_url, wallet_address, primary_auth_provider, last_seen_at, created_at, updated_at
       FROM profiles WHERE auth_user_id = $1`,
      [req.authUserId]
    );

    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    // Create new profile
    const { rows } = await query(
      `INSERT INTO profiles (auth_user_id, nickname, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth_user_id) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [req.authUserId, nickname.trim(), nickname.trim(), avatar_url ?? null]
    );

    Logger.info(`[Profile] Created profile for ${nickname.trim()}`);
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
});

/**
 * PATCH /api/v1/profile — Update profile fields
 */
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { nickname, avatar_url } = req.body as {
      nickname?: string;
      avatar_url?: string;
    };

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIdx++}`);
      params.push(nickname.trim());
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIdx++}`);
      params.push(avatar_url);
    }

    // Always update last_seen_at and updated_at (supports heartbeat with empty body)
    updates.push(`last_seen_at = now()`);
    updates.push(`updated_at = now()`);
    params.push(req.authUserId);

    const { rows } = await query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE auth_user_id = $${paramIdx}
       RETURNING *`,
      params
    );

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
});

export default router;
