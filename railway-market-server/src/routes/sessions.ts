import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { getRequiredAuthUserId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, sessions } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { startSessionSchema, verifySessionSchema, syncSessionSchema } from '../db/validation';
import { Logger } from '../utils/logger';
import { RewardCalculator, type ExitType, type PortalType } from '../shared/RewardCalculator';
import { logAudit, getClientInfo } from '../utils/auditLogger';
import {
  calculateLeveragedRewardPnl,
  deriveTrustedSessionMetrics,
} from '../utils/trustedSessionMetrics';

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

    const { pair, leverage, position } = parsed.data;
    const db = getDb();

    // Session ownership is bound to the authenticated Supabase user only.
    const authUserId = getRequiredAuthUserId(req);
    const profileRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

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

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId,
      action: 'session.start',
      resource: '/api/v1/sessions/start',
      details: { sessionId: session.id, pair, position, leverage },
      ipAddress,
      userAgent,
    });

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
router.post('/verify', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const parsed = verifySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionId, signature, and payload are required' });
      return;
    }

    const { sessionId, signature, payload } = parsed.data;
    const db = getDb();
    const authProfileId = await getProfileId(authUserId);

    if (!authProfileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // 1. Session exists + not verified
    const sessionRows = await db
      .select({
        id: sessions.id,
        profileId: sessions.profileId,
        sessionSecret: sessions.sessionSecret,
        isVerified: sessions.isVerified,
        pair: sessions.pair,
        position: sessions.position,
        leverage: sessions.leverage,
        entryPrice: sessions.entryPrice,
        exitPrice: sessions.exitPrice,
        survivalSeconds: sessions.survivalSeconds,
        kills: sessions.kills,
        level: sessions.level,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (sessionRows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessionRows[0];

    if (session.profileId !== authProfileId) {
      res.status(403).json({ error: 'Not authorized to verify this session' });
      return;
    }

    if (session.isVerified) {
      res.status(409).json({ error: 'Already verified' });
      return;
    }

    if (
      payload.pair !== session.pair ||
      payload.position !== session.position ||
      payload.leverage !== session.leverage
    ) {
      Logger.warn(
        `[Security] Session ${sessionId} payload mismatch: pair/position/leverage diverged from server state`
      );
      res.status(400).json({ error: 'Session payload does not match server state' });
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
      survivalSeconds: Math.floor(payload.survivalSeconds),
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
        survivalSeconds: Math.floor(payload.survivalSeconds),
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

    const { metrics: trustedMetrics, suspiciousFlags } = deriveTrustedSessionMetrics(payload, {
      entryPrice: session.entryPrice,
      exitPrice: session.exitPrice,
      survivalSeconds: session.survivalSeconds,
      kills: session.kills,
      level: session.level,
    });

    if (suspiciousFlags.length > 0) {
      Logger.warn(`[verify] Session ${sessionId} required metric normalization`, {
        claimed: {
          entryPrice: payload.claimedEntryPrice,
          exitPrice: payload.claimedExitPrice,
          survivalSeconds: payload.survivalSeconds,
          kills: payload.kills,
          level: payload.level,
          maxStreak: payload.maxStreak,
          pnl: payload.claimedPnL,
        },
        trusted: trustedMetrics,
        suspiciousFlags,
      });
      const { ipAddress: susIp, userAgent: susUa } = getClientInfo(req);
      await logAudit({
        profileId: session.profileId,
        action: 'session.suspicious',
        resource: '/api/v1/sessions/verify',
        details: {
          sessionId,
          flags: suspiciousFlags,
          claimed: {
            kills: payload.kills,
            level: payload.level,
            duration: payload.survivalSeconds,
            pnl: payload.claimedPnL,
          },
          trusted: {
            kills: trustedMetrics.kills,
            level: trustedMetrics.level,
            duration: trustedMetrics.survivalSeconds,
            pnl: trustedMetrics.pnl,
          },
        },
        ipAddress: susIp,
        userAgent: susUa,
      });
    }

    // 4. Reward calculation
    const calculator = new RewardCalculator();
    const rewardPnl = calculateLeveragedRewardPnl(
      trustedMetrics.pnl,
      payload.leverage
    );
    const calculation = calculator.calculate({
      survivalTimeSeconds: trustedMetrics.survivalSeconds,
      kills: trustedMetrics.kills,
      level: trustedMetrics.level,
      pnl: rewardPnl,
      maxStreak: trustedMetrics.maxStreak,
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
      const lockedResult = await tx.execute(
        sql`SELECT id, profile_id, is_verified FROM sessions WHERE id = ${sessionId} FOR UPDATE`
      );

      if (lockedResult.rows.length === 0) {
        throw new Error('SESSION_NOT_FOUND');
      }

      const lockedSession = lockedResult.rows[0] as {
        id: string;
        profile_id: string;
        is_verified: boolean;
      };
      if (lockedSession.profile_id !== authProfileId) {
        throw new Error('SESSION_FORBIDDEN');
      }

      if (lockedSession.is_verified) {
        throw new Error('ALREADY_VERIFIED');
      }

      // 5a. Atomic coin crediting (PG function)
      const creditResult = await tx.execute(
        sql`SELECT * FROM credit_coins(${session.profileId}, ${Math.floor(reward)}, 'game_reward', ${sessionId}, ${JSON.stringify({
          pnl: trustedMetrics.pnl,
          kills: trustedMetrics.kills,
          level: trustedMetrics.level,
          maxStreak: trustedMetrics.maxStreak,
          exitType: payload.exitType,
          portalType: payload.portalType,
          duration: trustedMetrics.survivalSeconds,
          suspiciousFlags,
        })}::jsonb)`
      );

      if (creditResult.rows.length === 0) {
        throw new Error(`Failed to credit coins for session ${sessionId}`);
      }

      // 5b. Mark session verified
      const updatedRows = await tx
        .update(sessions)
        .set({
          entryPrice: trustedMetrics.entryPrice,
          exitPrice: trustedMetrics.exitPrice,
          survivalSeconds: trustedMetrics.survivalSeconds,
          isVerified: true,
          rewardAmount: Math.floor(reward),
          kills: trustedMetrics.kills,
          level: trustedMetrics.level,
          exitType: payload.exitType ?? null,
          portalType: payload.portalType ?? null,
          verifiedAt: sql`now()`,
        })
        .where(and(eq(sessions.id, sessionId), eq(sessions.isVerified, false)))
        .returning({ id: sessions.id });

      if (updatedRows.length === 0) {
        throw new Error('ALREADY_VERIFIED');
      }

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

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId: session.profileId,
      action: 'session.verify',
      resource: '/api/v1/sessions/verify',
      details: {
        sessionId,
        reward: Math.floor(reward),
        metaShare: txResult.metaShare,
        duration: trustedMetrics.survivalSeconds,
        kills: trustedMetrics.kills,
        level: trustedMetrics.level,
        normalized: suspiciousFlags.length > 0,
      },
      ipAddress,
      userAgent,
    });

    res.json({
      verified: true,
      reward: Math.floor(reward),
      metaShare: txResult.metaShare,
      pnl: trustedMetrics.pnl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'ALREADY_VERIFIED') {
      res.status(409).json({ error: 'Already verified' });
      return;
    }
    if (message === 'SESSION_FORBIDDEN') {
      res.status(403).json({ error: 'Not authorized to verify this session' });
      return;
    }
    if (message === 'SESSION_NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (message === 'SESSION_TOO_SHORT') {
      res.status(400).json({ error: 'Session too short' });
      return;
    }
    if (message === 'SESSION_DURATION_IMPLAUSIBLE') {
      res.status(400).json({ error: 'Session duration is not plausible' });
      return;
    }
    if (message === 'KILL_RATE_IMPLAUSIBLE') {
      res.status(400).json({ error: 'Kill count is not plausible for session duration' });
      return;
    }
    if (message === 'STREAK_EXCEEDS_KILLS') {
      res.status(400).json({ error: 'Max streak cannot exceed total kills' });
      return;
    }
    if (message === 'INVALID_PRICE_DATA') {
      res.status(400).json({ error: 'Invalid price data supplied for verification' });
      return;
    }
    Logger.error('[Sessions] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
}));

/**
 * POST /api/v1/sessions/sync — Sync mutable session metrics for the owner
 */
router.post('/sync', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const authUserId = getRequiredAuthUserId(req);
    const parsed = syncSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionData is required' });
      return;
    }

    const profileId = await getProfileId(authUserId);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { sessionId, sessionData } = parsed.data;
    if (!sessionId || sessionId.startsWith('local-')) {
      res.status(400).json({ error: 'Valid server sessionId is required' });
      return;
    }

    const db = getDb();
    const existingRows = await db
      .select({
        id: sessions.id,
        profileId: sessions.profileId,
        isVerified: sessions.isVerified,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const existing = existingRows[0];
    if (existing.profileId !== profileId) {
      res.status(403).json({ error: 'Not authorized to sync this session' });
      return;
    }

    if (existing.isVerified) {
      res.status(409).json({ error: 'Verified sessions cannot be mutated' });
      return;
    }

    // Strict column whitelist — only runtime metrics can be synced after start.
    // SECURITY: ownership, start-time trade terms, rewards, verification state, and secrets are server-only.
    const COLUMN_MAP: Record<string, true> = {
      entry_price: true, exit_price: true, survival_seconds: true,
      kills: true, level: true,
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
    const paramPlaceholders = columns.map((col, i) => `${col} = $${i + 3}`).join(', ');
    const { rows } = await query(
      `UPDATE sessions SET ${paramPlaceholders} WHERE id = $1 AND profile_id = $2 AND is_verified = false RETURNING id`,
      [sessionId, profileId, ...values]
    );

    if (rows.length === 0) {
      res.status(409).json({ error: 'Session sync rejected' });
      return;
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId,
      action: 'session.sync',
      resource: '/api/v1/sessions/sync',
      details: { sessionId, updatedFields: columns },
      ipAddress,
      userAgent,
    });

    res.json({ id: rows[0].id });
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

/**
 * GET /api/v1/sessions/:id/recover — Recover session secret for unverified sessions
 * Only the session owner can recover their own session secret.
 */
router.get('/:id/recover', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const authUserId = getRequiredAuthUserId(req);
    const db = getDb();

    // Find user's profile
    const profileRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId))
      .limit(1);

    if (profileRows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profileId = profileRows[0].id;

    // Find session — must belong to this profile and not yet verified
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

    // Ownership check
    if (session.profileId !== profileId) {
      res.status(403).json({ error: 'Not authorized to access this session' });
      return;
    }

    // Already verified — secret is no longer useful
    if (session.isVerified) {
      res.status(410).json({ error: 'Session already verified' });
      return;
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId,
      action: 'session.recover',
      resource: `/api/v1/sessions/${sessionId}/recover`,
      details: { sessionId, recovered: true },
      ipAddress,
      userAgent,
    });

    res.json({
      sessionId: session.id,
      sessionSecret: session.sessionSecret,
    });
  } catch (error) {
    Logger.error('[Sessions] Recover error:', error);
    res.status(500).json({ error: 'Failed to recover session' });
  }
}));

export default router;
