import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { getRequiredAccountId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { sessions, priceHistory } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { startSessionSchema, verifySessionSchema, syncSessionSchema } from '../db/validation';
import { Logger } from '../utils/logger';
import { RewardCalculator, type ExitType, type PortalType } from '../shared/RewardCalculator';
import { logAudit, getClientInfo } from '../utils/auditLogger';
import {
  calculateLeveragedRewardPnl,
  deriveTrustedSessionMetrics,
} from '../utils/trustedSessionMetrics';
import { evaluateAndUnlockAchievements } from '../utils/achievementEvaluator';

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

    // Session ownership is bound to the authenticated Railway account.
    const accountId = getRequiredAccountId(req);
    const profileId = await getProfileId(accountId);

    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

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
    const accountId = getRequiredAccountId(req);
    const parsed = verifySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionId, signature, and payload are required' });
      return;
    }

    const { sessionId, signature, payload } = parsed.data;
    const db = getDb();
    const authProfileId = await getProfileId(accountId);

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
        createdAt: sessions.createdAt,
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

    if (signature !== expectedSignature) {
      Logger.error(`[Security] Invalid signature for session ${sessionId}`);
      res.status(403).json({ error: 'Invalid security signature' });
      return;
    }

    // Fetch historic entry and exit prices from price_history table
    let realEntryPrice: number | null = null;
    let realExitPrice: number | null = null;

    try {
      const entryRows = await db
        .select({ price: priceHistory.price })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.pair, session.pair),
            sql`timestamp >= ${session.createdAt} - INTERVAL '30 seconds'`,
            sql`timestamp <= ${session.createdAt} + INTERVAL '30 seconds'`
          )
        )
        .orderBy(sql`ABS(EXTRACT(EPOCH FROM (timestamp - ${session.createdAt})))`)
        .limit(1);

      if (entryRows.length > 0 && entryRows[0]?.price) {
        realEntryPrice = entryRows[0].price;
      }

      const survivalSec = Math.floor(payload.survivalSeconds);
      const exitTime = new Date(new Date(session.createdAt).getTime() + survivalSec * 1000);
      const exitRows = await db
        .select({ price: priceHistory.price })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.pair, session.pair),
            sql`timestamp >= ${exitTime} - INTERVAL '30 seconds'`,
            sql`timestamp <= ${exitTime} + INTERVAL '30 seconds'`
          )
        )
        .orderBy(sql`ABS(EXTRACT(EPOCH FROM (timestamp - ${exitTime})))`)
        .limit(1);

      if (exitRows.length > 0 && exitRows[0]?.price) {
        realExitPrice = exitRows[0].price;
      }
    } catch (err) {
      Logger.warn(`[verify] Failed to fetch historic prices for validation: ${err}`);
    }

    // Persisted on the session so cheaters exploiting aggregator downtime
    // (no reference prices → cross-check silently disabled) leave a trail.
    const priceCheck: 'ok' | 'partial' | 'skipped' =
      realEntryPrice !== null && realExitPrice !== null
        ? 'ok'
        : realEntryPrice !== null || realExitPrice !== null
          ? 'partial'
          : 'skipped';
    if (priceCheck !== 'ok') {
      Logger.warn(
        `[verify] Price reconciliation ${priceCheck} for session ${sessionId} (pair=${session.pair}) — reward granted without full market cross-check`
      );
    }

    const { metrics: trustedMetrics, suspiciousFlags } = deriveTrustedSessionMetrics(
      payload,
      {
        createdAt: session.createdAt,
        entryPrice: session.entryPrice,
        exitPrice: session.exitPrice,
        survivalSeconds: session.survivalSeconds,
        kills: session.kills,
        level: session.level,
      },
      {
        realEntryPrice: realEntryPrice ?? undefined,
        realExitPrice: realExitPrice ?? undefined,
      }
    );

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

    const rewardAmount = Math.floor(reward);
    const metaShare = Math.floor(rewardAmount * 0.15);

    // 5. Atomic transaction: mark verified + credit Railway-native wallet ledger
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

      await tx.execute(
        sql`INSERT INTO accounts (id, account_type, status)
            VALUES (${accountId}, 'registered', 'active')
            ON CONFLICT (id)
            DO UPDATE SET updated_at = now(), last_seen_at = now()`
      );

      let claimId: string | null = null;
      let ledgerEntryId: string | null = null;
      let wallet: { id: string; balance: number; currency: string } | null = null;

      if (rewardAmount > 0) {
        const rewardMetadata = {
          source: 'session.verify',
          pnl: trustedMetrics.pnl,
          kills: trustedMetrics.kills,
          level: trustedMetrics.level,
          maxStreak: trustedMetrics.maxStreak,
          exitType: payload.exitType,
          portalType: payload.portalType,
          duration: trustedMetrics.survivalSeconds,
          suspiciousFlags,
        };
        const idempotencyKey = `session.verify:${sessionId}`;

        const walletResult = await tx.execute(
          sql`INSERT INTO wallets (account_id, profile_id, balance, currency)
              VALUES (${accountId}, ${session.profileId}, 0, 'gold')
              ON CONFLICT (account_id)
              DO UPDATE SET profile_id = EXCLUDED.profile_id, updated_at = now()
              RETURNING id, balance::TEXT AS balance, currency`
        );
        const walletRow = walletResult.rows[0] as
          | { id: string; balance: string; currency: string }
          | undefined;
        if (!walletRow) {
          throw new Error('WALLET_NOT_FOUND');
        }

        const updatedWalletResult = await tx.execute(
          sql`UPDATE wallets
              SET balance = balance + ${rewardAmount}, updated_at = now()
              WHERE id = ${walletRow.id}
              RETURNING id, balance::TEXT AS balance, currency`
        );
        const updatedWallet = updatedWalletResult.rows[0] as
          | { id: string; balance: string; currency: string }
          | undefined;
        if (!updatedWallet) {
          throw new Error('WALLET_UPDATE_FAILED');
        }

        const claimResult = await tx.execute(
          sql`INSERT INTO reward_claims (
                account_id, profile_id, session_id, amount, status, idempotency_key, metadata
              )
              VALUES (
                ${accountId}, ${session.profileId}, ${sessionId}, ${rewardAmount},
                'claimed', ${idempotencyKey}, ${JSON.stringify(rewardMetadata)}::jsonb
              )
              RETURNING id`
        );
        const claimRow = claimResult.rows[0] as { id: string } | undefined;
        if (!claimRow) {
          throw new Error('CLAIM_CREATE_FAILED');
        }
        claimId = claimRow.id;

        const ledgerResult = await tx.execute(
          sql`INSERT INTO ledger_entries (
                account_id, wallet_id, profile_id, amount, balance_after,
                entry_type, reference_type, reference_id, idempotency_key, metadata
              )
              VALUES (
                ${accountId}, ${updatedWallet.id}, ${session.profileId}, ${rewardAmount},
                ${Number(updatedWallet.balance)}, 'session_reward', 'session',
                ${sessionId}, ${idempotencyKey}, ${JSON.stringify({ claimId })}::jsonb
              )
              RETURNING id`
        );
        ledgerEntryId = ((ledgerResult.rows[0] as { id?: string } | undefined)?.id ?? null);
        wallet = {
          id: updatedWallet.id,
          balance: Number(updatedWallet.balance),
          currency: updatedWallet.currency,
        };
      }

      // 5b. Mark session verified
      const updatedRows = await tx
        .update(sessions)
        .set({
          entryPrice: trustedMetrics.entryPrice,
          exitPrice: trustedMetrics.exitPrice,
          survivalSeconds: trustedMetrics.survivalSeconds,
          isVerified: true,
          rewardAmount,
          kills: trustedMetrics.kills,
          level: trustedMetrics.level,
          exitType: payload.exitType ?? null,
          portalType: payload.portalType ?? null,
          maxStreak: trustedMetrics.maxStreak,
          priceCheck,
          verifiedAt: sql`now()`,
        })
        .where(and(eq(sessions.id, sessionId), eq(sessions.isVerified, false)))
        .returning({ id: sessions.id });

      if (updatedRows.length === 0) {
        throw new Error('ALREADY_VERIFIED');
      }

      return { claimId, ledgerEntryId, metaShare, wallet };
    });

    Logger.info(
      `[Sessions] Verified session ${sessionId}: reward=${rewardAmount}, metaShare=${txResult.metaShare}`
    );

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      profileId: session.profileId,
      action: 'session.verify',
      resource: '/api/v1/sessions/verify',
      details: {
        sessionId,
        reward: rewardAmount,
        metaShare: txResult.metaShare,
        duration: trustedMetrics.survivalSeconds,
        kills: trustedMetrics.kills,
        level: trustedMetrics.level,
        normalized: suspiciousFlags.length > 0,
      },
      ipAddress,
      userAgent,
    });

    // 6. Server-authoritative achievement evaluation (best-effort, non-fatal).
    //    Runs after the session is verified so cumulative stats include this run.
    const newlyUnlockedAchievements = await evaluateAndUnlockAchievements(
      session.profileId,
      sessionId
    );

    res.json({
      verified: true,
      reward: rewardAmount,
      metaShare: txResult.metaShare,
      claimId: txResult.claimId,
      ledgerEntryId: txResult.ledgerEntryId,
      wallet: txResult.wallet,
      pnl: trustedMetrics.pnl,
      newlyUnlockedAchievements:
        newlyUnlockedAchievements.length > 0 ? newlyUnlockedAchievements : undefined,
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
    const accountId = getRequiredAccountId(req);
    const parsed = syncSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'sessionData is required' });
      return;
    }

    const profileId = await getProfileId(accountId);
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
        createdAt: sessions.createdAt,
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

    // Validate sync values against implausible/manipulated metrics
    if (sessionData.survival_seconds !== undefined) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existing.createdAt).getTime()) / 1000);
      if (sessionData.survival_seconds > elapsedSeconds + 15) {
        res.status(400).json({ error: 'Implausible survival duration' });
        return;
      }
    }

    if (sessionData.kills !== undefined && sessionData.survival_seconds !== undefined) {
      const duration = Math.max(1, sessionData.survival_seconds);
      if (sessionData.kills / duration > 5) {
        res.status(400).json({ error: 'Implausible kill rate' });
        return;
      }
    }

    if (sessionData.level !== undefined && sessionData.survival_seconds !== undefined) {
      const duration = Math.max(1, sessionData.survival_seconds);
      if (sessionData.level / duration > 0.5 && sessionData.level > 5) {
        res.status(400).json({ error: 'Implausible progression rate' });
        return;
      }
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
    const syncValues = sessionData as Record<string, unknown>;

    for (const col of Object.keys(syncValues)) {
      if (col in COLUMN_MAP) {
        columns.push(col);
        values.push(syncValues[col]);
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
 * GET /api/v1/sessions/:id/recover — disabled.
 *
 * Session secrets are bearer-capability signing keys. Returning them after the
 * initial start response widens the replay window and undermines verification.
 */
router.get('/:id/recover', requireAuth, (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Session secret recovery is disabled' });
});

export default router;
