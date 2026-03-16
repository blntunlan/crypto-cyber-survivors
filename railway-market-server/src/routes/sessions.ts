import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { RewardCalculator, type ExitType, type PortalType } from '../shared/RewardCalculator';

const router = Router();

/**
 * POST /api/v1/sessions/start — Start a new game session
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { pair, leverage, position, userId } = req.body as {
      pair?: string;
      leverage?: number;
      position?: string;
      userId?: string;
    };

    if (!pair || !leverage || !position) {
      res.status(400).json({ error: 'pair, leverage, and position are required' });
      return;
    }

    // Look up profile by auth_user_id or nickname
    let profileQuery: string;
    let profileParam: string;

    if (userId) {
      // First try by nickname (legacy client sends nickname as userId)
      profileQuery = `SELECT id FROM profiles WHERE nickname = $1 OR auth_user_id = $1`;
      profileParam = userId;
    } else {
      profileQuery = `SELECT id FROM profiles WHERE auth_user_id = $1`;
      profileParam = req.authUserId ?? '';
    }

    const { rows: profiles } = await query(profileQuery, [profileParam]);
    if (profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profiles[0].id;

    // Generate session secret
    const sessionSecret = crypto.randomBytes(32).toString('hex');

    const { rows } = await query(
      `INSERT INTO sessions (profile_id, pair, position, leverage, session_secret)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [profileId, pair, position, leverage, sessionSecret]
    );

    const session = rows[0];

    Logger.info(`[Sessions] Started session ${session.id} for profile ${profileId}`);

    res.json({
      sessionId: session.id,
      startTime: session.created_at,
      sessionSecret,
    });
  } catch (error) {
    Logger.error('[Sessions] Start error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/v1/sessions/verify — Verify game results and credit rewards
 * Ported from supabase/functions/verify-game/index.ts
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { sessionId, signature, payload } = req.body as {
      sessionId?: string;
      signature?: string;
      payload?: Record<string, unknown>;
    };

    if (!sessionId || !signature || !payload) {
      res.status(400).json({ error: 'sessionId, signature, and payload are required' });
      return;
    }

    // 1. Session exists + not verified
    const { rows: sessions } = await query(
      `SELECT id, profile_id, session_secret, is_verified FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessions.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessions[0];

    if (session.is_verified) {
      res.status(409).json({ error: 'Already verified' });
      return;
    }

    // 2. HMAC verification
    const verificationPayload = JSON.stringify({
      sessionId: payload.sessionId,
      pair: payload.pair,
      position: payload.position,
      leverage: payload.leverage,
      claimedEntryPrice: payload.claimedEntryPrice,
      claimedExitPrice: payload.claimedExitPrice,
      claimedPnL: payload.claimedPnL,
      kills: payload.kills,
      level: payload.level,
      survivalSeconds: payload.survivalSeconds,
      exitType: payload.exitType,
      portalType: payload.portalType,
    });

    const expectedSignature = crypto
      .createHmac('sha256', session.session_secret)
      .update(verificationPayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      Logger.error(`[Security] Invalid signature for session ${sessionId}`);
      res.status(403).json({ error: 'Invalid security signature' });
      return;
    }

    // 3. Duration check
    const duration = Number(payload.survivalSeconds) || 0;
    if (duration < 5) {
      res.status(400).json({ error: 'Session too short' });
      return;
    }

    // 4. Profile check
    const { rows: profiles } = await query(
      `SELECT id FROM profiles WHERE id = $1`,
      [session.profile_id]
    );
    if (profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // 5. Reward calculation
    const calculator = new RewardCalculator();
    const calculation = calculator.calculate({
      survivalTimeSeconds: duration,
      kills: Number(payload.kills) || 0,
      level: Number(payload.level) || 1,
      pnl: Number(payload.claimedPnL) || 0,
      maxStreak: 0,
      exitType: payload.exitType as ExitType | undefined,
      portalType: payload.portalType as PortalType | undefined,
    });

    const reward = Math.min(50000, calculation.total);

    // 6. Atomic coin crediting
    const { rows: creditResult } = await query(
      `SELECT * FROM credit_coins($1, $2, $3, $4, $5)`,
      [
        session.profile_id,
        Math.floor(reward),
        'game_reward',
        sessionId,
        JSON.stringify({
          pnl: payload.claimedPnL,
          kills: payload.kills,
          duration,
        }),
      ]
    );

    if (creditResult.length === 0) {
      Logger.error(`[Security] Failed to credit coins for session ${sessionId}`);
      res.status(500).json({ error: 'Failed to process reward' });
      return;
    }

    // 7. Mark session verified
    await query(
      `UPDATE sessions SET
         exit_price = $1,
         survival_seconds = $2,
         is_verified = true,
         reward_amount = $3,
         kills = $4,
         level = $5,
         exit_type = $6,
         portal_type = $7,
         verified_at = now()
       WHERE id = $8`,
      [
        payload.claimedExitPrice,
        Math.floor(duration),
        Math.floor(reward),
        payload.kills,
        payload.level,
        payload.exitType,
        payload.portalType,
        sessionId,
      ]
    );

    Logger.info(
      `[Sessions] Verified session ${sessionId}: reward=${Math.floor(reward)}`
    );

    res.json({
      verified: true,
      reward: Math.floor(reward),
      pnl: payload.claimedPnL,
    });
  } catch (error) {
    Logger.error('[Sessions] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/v1/sessions/sync — Sync session metrics (update or insert)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionData } = req.body as {
      sessionId?: string;
      sessionData?: Record<string, unknown>;
    };

    if (!sessionData) {
      res.status(400).json({ error: 'sessionData is required' });
      return;
    }

    // Build column list from sessionData
    const columns = Object.keys(sessionData);
    const values = Object.values(sessionData);

    let resultId: string | null = null;

    // If sessionId provided and valid UUID, try UPDATE first
    if (sessionId && !sessionId.startsWith('local-')) {
      const paramPlaceholders = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const { rows } = await query(
        `UPDATE sessions SET ${paramPlaceholders} WHERE id = $1 RETURNING id`,
        [sessionId, ...values]
      );
      if (rows.length > 0) {
        resultId = rows[0].id;
      }
    }

    // If no result from update, INSERT
    if (!resultId) {
      const colNames = columns.join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query(
        `INSERT INTO sessions (${colNames}) VALUES (${placeholders}) RETURNING id`,
        values
      );
      if (rows.length > 0) {
        resultId = rows[0].id;
      }
    }

    res.json({ id: resultId });
  } catch (error) {
    // PostgreSQL unique constraint violation (replay protection)
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Session already exists (replay protection)' });
      return;
    }
    Logger.error('[Sessions] Sync error:', error);
    res.status(500).json({ error: 'Failed to sync session' });
  }
});

export default router;
