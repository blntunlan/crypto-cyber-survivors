import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { eq, or, sql } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, sessions } from '../db/schema';
import { startSessionSchema, verifySessionSchema, syncSessionSchema } from '../db/validation';
import { Logger } from '../utils/logger';
import { RewardCalculator, type ExitType, type PortalType } from '../shared/RewardCalculator';

const router = Router();

/**
 * POST /api/v1/sessions/start — Start a new game session
 */
router.post('/start', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const parsed = startSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'pair, leverage, and position are required' });
      return;
    }

    const { pair, leverage, position, userId } = parsed.data;
    const db = getDb();

    // Look up profile: prefer JWT auth_user_id, fall back to nickname from body
    const authUserId = getRequiredAuthUserId(req);
    let profileRows;

    if (userId) {
      profileRows = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(or(eq(profiles.authUserId, authUserId), eq(profiles.nickname, userId)))
        .limit(1);
    } else {
      profileRows = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.authUserId, authUserId))
        .limit(1);
    }

    if (profileRows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profileRows[0].id;
    const sessionSecret = crypto.randomBytes(32).toString('hex');

    const rows = await db
      .insert(sessions)
      .values({
        profileId,
        pair,
        position,
        leverage,
        sessionSecret,
      })
      .returning({
        id: sessions.id,
        createdAt: sessions.createdAt,
      });

    const session = rows[0];
    Logger.info(`[Sessions] Started session ${session.id} for profile ${profileId}`);

    res.json({
      sessionId: session.id,
      startTime: session.createdAt,
      sessionSecret,
    });
  } catch (error) {
    Logger.error('[Sessions] Start error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
}));

/**
 * POST /api/v1/sessions/verify — Verify game results and credit rewards
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  try {
    const parsed = verifySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionId, signature, and payload are required' });
      return;
    }

    const { sessionId, signature, payload } = parsed.data;
    const db = getDb();

    // 1. Session exists + not verified
    const sessionRows = await db
      .select({
        id: sessions.id,
        profileId: sessions.profileId,
        sessionSecret: sessions.sessionSecret,
        isVerified: sessions.isVerified,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (sessionRows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessionRows[0];

    if (session.isVerified) {
      res.status(409).json({ error: 'Already verified' });
      return;
    }

    // 2. HMAC verification
    // Build signable payload — reward fields appended only when present (matches client createSignablePayload)
    const baseFields: Record<string, unknown> = {
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
      maxStreak: payload.maxStreak,
    };

    // Append reward fields only when present (backward compat with older clients)
    if (payload.rawCoins !== undefined) baseFields.rawCoins = payload.rawCoins;
    if (payload.enemyDropCoins !== undefined) baseFields.enemyDropCoins = payload.enemyDropCoins;
    if (payload.totalCoins !== undefined) baseFields.totalCoins = payload.totalCoins;
    if (payload.pnlPercent !== undefined) baseFields.pnlPercent = payload.pnlPercent;

    const verificationPayload = JSON.stringify(baseFields);

    const expectedSignature = crypto
      .createHmac('sha256', session.sessionSecret)
      .update(verificationPayload)
      .digest('hex');

    let signatureValid = signature === expectedSignature;
    if (!signatureValid) {
      // Fallback: old clients don't include exitType/portalType/maxStreak/reward fields in HMAC
      const legacyPayload = JSON.stringify({
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
      const legacyExpected = crypto
        .createHmac('sha256', session.sessionSecret)
        .update(legacyPayload)
        .digest('hex');
      signatureValid = signature === legacyExpected;
      if (signatureValid) {
        Logger.warn(`[Security] Session ${sessionId} used legacy HMAC format (missing maxStreak/reward fields)`);
      }
    }

    if (!signatureValid) {
      Logger.error(`[Security] Invalid signature for session ${sessionId}`);
      res.status(403).json({ error: 'Invalid security signature' });
      return;
    }

    // 3. Duration check
    const duration = payload.survivalSeconds;
    if (duration < 5) {
      res.status(400).json({ error: 'Session too short' });
      return;
    }

    // 4. Reward calculation
    const calculator = new RewardCalculator();
    const calculation = calculator.calculate({
      survivalTimeSeconds: duration,
      kills: payload.kills,
      level: payload.level,
      pnl: payload.claimedPnL,
      maxStreak: payload.maxStreak,
      exitType: payload.exitType as ExitType | undefined,
      portalType: payload.portalType as PortalType | undefined,
    });

    const reward = Math.min(50000, calculation.total);

    // Discrepancy logging: warn if client-claimed totalCoins diverges from server calculation
    if (payload.totalCoins !== undefined) {
      const diff = Math.abs(reward - payload.totalCoins);
      const threshold = reward * 0.1;
      if (diff > threshold) {
        Logger.warn(`[verify] Reward discrepancy: client=${payload.totalCoins} server=${reward} diff=${diff} session=${sessionId}`);
      }
    }

    // 5. Atomic transaction: credit coins + mark verified + transfer meta
    const txResult = await db.transaction(async (tx) => {
      // 5a. Atomic coin crediting (PG function)
      const creditResult = await tx.execute(
        sql`SELECT * FROM credit_coins(${session.profileId}, ${Math.floor(reward)}, 'game_reward', ${sessionId}, ${JSON.stringify({ pnl: payload.claimedPnL, kills: payload.kills, level: payload.level, exitType: payload.exitType, portalType: payload.portalType, duration })}::jsonb)`
      );

      if (creditResult.rows.length === 0) {
        throw new Error(`Failed to credit coins for session ${sessionId}`);
      }

      // 5b. Mark session verified
      await tx
        .update(sessions)
        .set({
          exitPrice: payload.claimedExitPrice,
          survivalSeconds: Math.floor(duration),
          isVerified: true,
          rewardAmount: Math.floor(reward),
          kills: payload.kills,
          level: payload.level,
          exitType: payload.exitType ?? null,
          portalType: payload.portalType ?? null,
          verifiedAt: sql`now()`,
        })
        .where(eq(sessions.id, sessionId));

      // 5c. Transfer meta coins (15% of reward → meta wallet)
      let metaShare = 0;
      try {
        const metaResult = await tx.execute(
          sql`SELECT * FROM transfer_meta_coins(${session.profileId}, ${Math.floor(reward)})`
        );
        if (metaResult.rows.length > 0) {
          metaShare = Number((metaResult.rows[0] as { meta_share: string }).meta_share);
        }
      } catch (metaErr) {
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
    const parsed = syncSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionData is required' });
      return;
    }

    const { sessionId, sessionData } = parsed.data;

    // Strict column whitelist — only safe columns for client sync
    // SECURITY: is_verified, session_secret, verified_at excluded (server-only via /verify)
    const COLUMN_MAP: Record<string, true> = {
      profile_id: true, pair: true, position: true, leverage: true,
      entry_price: true, exit_price: true, survival_seconds: true,
      reward_amount: true, kills: true, level: true,
      exit_type: true, portal_type: true,
    };

    const columns: string[] = [];
    const values: unknown[] = [];

    for (const col of Object.keys(sessionData)) {
      if (col in COLUMN_MAP) {
        columns.push(col);
        values.push(sessionData[col]);
      }
    }

    if (columns.length === 0) {
      res.status(400).json({ error: 'No valid fields provided' });
      return;
    }

    // Sync uses raw SQL since it has dynamic column names
    const { query } = await import('../db/pool');
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
