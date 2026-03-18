import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { query, withTransaction } from '../db/pool';
import { Logger } from '../utils/logger';
import { RewardCalculator, type ExitType, type PortalType } from '../shared/RewardCalculator';

const router = Router();

/**
 * POST /api/v1/sessions/start — Start a new game session
 */
router.post('/start', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

    // Look up profile: prefer JWT auth_user_id, fall back to nickname from body
    const authUserId = req.authUserId ?? '';
    let profileQuery: string;
    let profileParams: string[];

    if (userId) {
      // Client sends nickname as userId — search by nickname OR auth_user_id from JWT
      profileQuery = `SELECT id FROM profiles WHERE auth_user_id = $1::uuid OR nickname = $2`;
      profileParams = [authUserId, userId];
    } else {
      profileQuery = `SELECT id FROM profiles WHERE auth_user_id = $1::uuid`;
      profileParams = [authUserId];
    }

    const { rows: profiles } = await query(profileQuery, profileParams);
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
}));

/**
 * POST /api/v1/sessions/verify — Verify game results and credit rewards
 * Ported from supabase/functions/verify-game/index.ts
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
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

    // 1. Session exists + not verified (JOIN profile to avoid N+1)
    const { rows: sessions } = await query(
      `SELECT s.id, s.profile_id, s.session_secret, s.is_verified
       FROM sessions s
       JOIN profiles p ON s.profile_id = p.id
       WHERE s.id = $1`,
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

    // 4. Reward calculation
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

    // 5. Atomic transaction: credit coins + mark verified + transfer meta
    const txResult = await withTransaction(async (client) => {
      // 5a. Atomic coin crediting
      const { rows: creditResult } = await client.query(
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
        throw new Error(`Failed to credit coins for session ${sessionId}`);
      }

      // 5b. Mark session verified
      await client.query(
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

      // 5c. Transfer meta coins (15% of reward → meta wallet)
      let metaShare = 0;
      try {
        const { rows: metaResult } = await client.query(
          `SELECT * FROM transfer_meta_coins($1, $2)`,
          [session.profile_id, Math.floor(reward)]
        );
        if (metaResult.length > 0) {
          metaShare = Number(metaResult[0].meta_share);
        }
      } catch (metaErr) {
        // Non-critical: log but don't rollback the whole transaction
        Logger.warn(`[Sessions] Meta coin transfer failed for ${sessionId}:`, metaErr);
      }

      return { metaShare };
    });

    Logger.info(
      `[Sessions] Verified session ${sessionId}: reward=${Math.floor(reward)}, metaShare=${txResult.metaShare}`
    );

    res.json({
      verified: true,
      reward: Math.floor(reward),
      metaShare: txResult.metaShare,
      pnl: payload.claimedPnL,
    });
  } catch (error) {
    Logger.error('[Sessions] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
}));

/**
 * POST /api/v1/sessions/sync — Sync session metrics (update or insert)
 */
router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionData } = req.body as {
      sessionId?: string;
      sessionData?: Record<string, unknown>;
    };

    if (!sessionData) {
      res.status(400).json({ error: 'sessionData is required' });
      return;
    }

    // Strict column whitelist — only safe columns for client sync
    // SECURITY: is_verified, session_secret, verified_at excluded (server-only via /verify)
    const COLUMN_MAP: Record<string, true> = {
      profile_id: true, pair: true, position: true, leverage: true,
      entry_price: true, exit_price: true, survival_seconds: true,
      reward_amount: true, kills: true, level: true,
      exit_type: true, portal_type: true,
    };

    const requestedColumns = Object.keys(sessionData);
    const columns: string[] = [];
    const values: unknown[] = [];

    for (const col of requestedColumns) {
      if (col in COLUMN_MAP) {
        columns.push(col);
        values.push(sessionData[col]);
      }
    }

    if (columns.length === 0) {
      res.status(400).json({ error: 'No valid fields provided' });
      return;
    }

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
}));

export default router;
