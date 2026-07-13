import { Router, type Request, type Response } from 'express';
import { getRequiredAccountId, requireAuth } from '../middleware/auth';
import {
  cashOutDecisionSchema,
  cashOutFailureSchema,
  cashOutQuoteSchema,
  claimRunRewardSchema,
} from '../db/validation';
import { query, withTransaction } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { getClientInfo } from '../utils/auditLogger';
import { Logger } from '../utils/logger';
import { AuthoritativeQuoteService } from '../services/economy/AuthoritativeQuoteService';
import { CashOutQuoteSigner } from '../services/economy/CashOutQuoteSigner';
import { ShardLedger } from '../services/economy/RewardLedger';

const router = Router();
const CLAIM_SCOPE = 'economy.claim-run-reward';
const MAX_VERIFIED_KILLS_FOR_MASTERY = 200;
const MAX_VERIFIED_LEVEL_FOR_MASTERY = 20;
const KILL_MASTERY_WEIGHT = 0.7;
const LEVEL_MASTERY_WEIGHT = 0.3;

type CashOutQuoteSessionRow = {
  id: string;
  created_at: Date;
  entry_price: number | null;
  position: 'LONG' | 'SHORT';
  leverage: number;
  pair: string;
  survival_seconds: number;
  kills: number;
  level: number;
};

type CanonicalPriceRow = {
  id: number;
  price: number;
  timestamp: Date;
};

type CanonicalAlignmentRow = {
  average_price: number | null;
  sample_count: number;
};

type CashOutEscrowRow = {
  id: string;
  greed_level: number;
  last_decision_at_seconds: number | null;
};

type CashOutOpenQuoteRow = {
  quote_id: string;
  canonical_sequence: number;
  reward_points: number;
  signature: string;
  issued_at: Date;
  expires_at: Date;
};

type CashOutDecisionQuoteRow = {
  escrow_id: string;
  session_id: string;
  quote_id: string;
  canonical_sequence: number;
  reward_points: number;
  signature: string;
  issued_at: Date;
  expires_at: Date;
  status: 'open' | 'accepted' | 'rejected' | 'expired' | 'safe_exit';
  greed_level: number;
  safe_exit_available_at: Date | null;
};

type CashOutFailureSessionRow = {
  id: string;
  survival_seconds: number;
  kills: number;
};

type ProfileRow = {
  id: string;
};

type WalletRow = {
  id: string;
  balance: string;
  currency: string;
};

type LedgerRow = {
  id: string;
  amount: string;
  balance_after: string;
  entry_type: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

type ClaimResult = {
  statusCode: number;
  body: Record<string, unknown>;
};

const getVerifiedCombatMastery = (session: CashOutQuoteSessionRow): number => {
  const killMastery = Math.min(1, Math.max(0, session.kills) / MAX_VERIFIED_KILLS_FOR_MASTERY);
  const levelMastery = Math.min(
    1,
    Math.max(0, session.level - 1) / (MAX_VERIFIED_LEVEL_FOR_MASTERY - 1)
  );

  return killMastery * KILL_MASTERY_WEIGHT + levelMastery * LEVEL_MASTERY_WEIGHT;
};

async function getProfileIdForAccount(accountId: string): Promise<string | null> {
  const { rows } = await query<ProfileRow>(
    `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
    [accountId]
  );
  return rows[0]?.id ?? null;
}

async function ensureWallet(accountId: string, profileId: string): Promise<WalletRow> {
  const { rows } = await query<WalletRow>(
    `INSERT INTO wallets (account_id, profile_id, balance, currency)
     VALUES ($1, $2, 0, 'gold')
     ON CONFLICT (account_id)
     DO UPDATE SET profile_id = EXCLUDED.profile_id, updated_at = now()
     RETURNING id, balance::TEXT AS balance, currency`,
    [accountId, profileId]
  );

  const wallet = rows[0];
  if (!wallet) {
    throw new Error('WALLET_NOT_FOUND');
  }

  return wallet;
}

router.get('/wallet', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = getRequiredAccountId(req);
    const profileId = await getProfileIdForAccount(accountId);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const wallet = await ensureWallet(accountId, profileId);
    const { rows: ledger } = await query<LedgerRow>(
      `SELECT id, amount::TEXT AS amount, balance_after::TEXT AS balance_after,
              entry_type, reference_type, reference_id, created_at::TEXT AS created_at
       FROM ledger_entries
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [accountId]
    );

    res.json({
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        currency: wallet.currency,
      },
      ledger: ledger.map(entry => ({
        id: entry.id,
        amount: Number(entry.amount),
        balanceAfter: Number(entry.balance_after),
        entryType: entry.entry_type,
        referenceType: entry.reference_type,
        referenceId: entry.reference_id,
        createdAt: entry.created_at,
      })),
    });
  } catch (error) {
    Logger.error('[Economy] Wallet read error:', error);
    res.status(500).json({ error: 'Failed to read wallet' });
  }
}));

router.post('/cash-out/quote', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = cashOutQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const quoteSecret = process.env.CASH_OUT_QUOTE_SECRET;
  if (!quoteSecret) {
    res.status(503).json({ error: 'Cash-out quotes are unavailable' });
    return;
  }

  const accountId = getRequiredAccountId(req);
  const { session_id: sessionId, pacing_state: pacingState } = parsed.data;

  try {
    const result = await withTransaction(async (client) => {
      const profileResult = await client.query<ProfileRow>(
        `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
        [accountId]
      );
      const profileId = profileResult.rows[0]?.id;
      if (!profileId) return { statusCode: 404, body: { error: 'Profile not found' } };

      const sessionResult = await client.query<CashOutQuoteSessionRow>(
        `SELECT id, created_at, entry_price, position, leverage, pair, survival_seconds, kills, level
         FROM sessions WHERE id = $1 AND profile_id = $2 FOR UPDATE`,
        [sessionId, profileId]
      );
      const session = sessionResult.rows[0];
      if (!session) return { statusCode: 404, body: { error: 'Session not found' } };
      if (!session.entry_price || session.entry_price <= 0) {
        return { statusCode: 409, body: { error: 'Session has no canonical entry price' } };
      }

      const priceResult = await client.query<CanonicalPriceRow>(
        `SELECT id, price, timestamp FROM price_history WHERE pair = $1
         ORDER BY timestamp DESC LIMIT 1`,
        [session.pair]
      );
      const price = priceResult.rows[0];
      if (!price || price.price <= 0) {
        return { statusCode: 503, body: { error: 'Canonical market price unavailable' } };
      }
      const canonicalTimestampMs = new Date(price.timestamp).getTime();
      if (!Number.isFinite(canonicalTimestampMs)) {
        return { statusCode: 503, body: { error: 'Canonical market timestamp unavailable' } };
      }
      const marketStaleSeconds = Math.max(
        0,
        Math.floor((Date.now() - canonicalTimestampMs) / 1_000)
      );
      const nowSeconds = Math.floor(Date.now() / 1_000);
      const effectiveRewardEndSeconds = Math.min(
        nowSeconds,
        Math.floor(canonicalTimestampMs / 1_000)
      );
      const rewardElapsedSeconds = Math.max(
        0,
        effectiveRewardEndSeconds - Math.floor(session.created_at.getTime() / 1_000)
      );
      const alignmentResult = await client.query<CanonicalAlignmentRow>(
        `SELECT AVG(price)::double precision AS average_price, COUNT(*)::integer AS sample_count
         FROM price_history
         WHERE pair = $1 AND timestamp >= $2 AND timestamp <= $3`,
        [session.pair, session.created_at, price.timestamp]
      );
      const timeWeightedCanonicalPrice =
        alignmentResult.rows[0]?.average_price && alignmentResult.rows[0].average_price > 0
          ? alignmentResult.rows[0].average_price
          : price.price;

      const escrowResult = await client.query<CashOutEscrowRow>(
        `INSERT INTO run_escrows (
           session_id, profile_id, last_market_sequence, market_stale_since, safe_exit_available_at
         )
         VALUES (
           $1, $2, $3,
           CASE WHEN $4 > 0 THEN now() ELSE NULL END,
           CASE WHEN $4 >= 60 THEN now() ELSE NULL END
         )
         ON CONFLICT (session_id)
         DO UPDATE SET
           updated_at = now(), last_market_sequence = EXCLUDED.last_market_sequence,
           market_stale_since = CASE
             WHEN $4 > 0 THEN COALESCE(run_escrows.market_stale_since, now())
             ELSE NULL
           END,
           safe_exit_available_at = CASE
             WHEN $4 >= 60 THEN COALESCE(run_escrows.safe_exit_available_at, now())
             ELSE NULL
           END
         RETURNING id, greed_level,
           (
             SELECT EXTRACT(EPOCH FROM MAX(responded_at))
             FROM cash_out_quotes
             WHERE escrow_id = run_escrows.id
           ) AS last_decision_at_seconds`,
        [sessionId, profileId, price.id, marketStaleSeconds]
      );
      const escrow = escrowResult.rows[0];
      if (!escrow) throw new Error('RUN_ESCROW_NOT_FOUND');

      const expiredQuoteResult = await client.query<{ id: string }>(
        `UPDATE cash_out_quotes
         SET status = 'expired', responded_at = now()
         WHERE escrow_id = $1 AND status = 'open' AND expires_at <= now()
         RETURNING id`,
        [escrow.id]
      );
      let greedLevel = escrow.greed_level;
      let lastDecisionAtSeconds = escrow.last_decision_at_seconds;
      if (expiredQuoteResult.rows.length > 0) {
        const reactivatedEscrow = await client.query<{ greed_level: number }>(
          `UPDATE run_escrows
           SET state = 'active', greed_level = greed_level + 1, updated_at = now()
           WHERE id = $1
           RETURNING greed_level`,
          [escrow.id]
        );
        greedLevel = reactivatedEscrow.rows[0]?.greed_level ?? greedLevel + 1;
        lastDecisionAtSeconds = nowSeconds;
      }

      const openQuoteResult = await client.query<CashOutOpenQuoteRow>(
        `SELECT quote_id, canonical_sequence, reward_points, signature, issued_at, expires_at
         FROM cash_out_quotes
         WHERE escrow_id = $1 AND status = 'open' AND expires_at > now()
         ORDER BY issued_at DESC LIMIT 1 FOR UPDATE`,
        [escrow.id]
      );
      const openQuote = openQuoteResult.rows[0];
      if (openQuote) {
        return {
          statusCode: 200,
          body: {
            quote: {
              quoteId: openQuote.quote_id,
              sessionId,
              canonicalSequence: openQuote.canonical_sequence,
              rewardPoints: openQuote.reward_points,
              issuedAtSeconds: Math.floor(openQuote.issued_at.getTime() / 1_000),
              expiresAtSeconds: Math.floor(openQuote.expires_at.getTime() / 1_000),
            },
            signature: openQuote.signature,
            shouldForceRecovery: false,
            safeExitOnly: marketStaleSeconds >= 60,
          },
        };
      }

      const quoteService = new AuthoritativeQuoteService(quoteSecret);
      const quoteResult = quoteService.issue({
        sessionId,
        createdAtSeconds: Math.floor(session.created_at.getTime() / 1_000),
        nowSeconds,
        rewardElapsedSeconds,
        entryPrice: session.entry_price,
        canonicalPrice: price.price,
        timeWeightedCanonicalPrice,
        canonicalSequence: price.id,
        position: session.position,
        leverage: session.leverage,
        greedLevel,
        pacingState,
        marketStaleSeconds,
        combatMastery: getVerifiedCombatMastery(session),
        lastDecisionAtSeconds,
      });

      const insertedQuoteResult = await client.query<{ quote_id: string }>(
        `WITH marked_escrow AS (
           UPDATE run_escrows SET state = 'quote_open', updated_at = now()
           WHERE id = $1 AND state = 'active'
           RETURNING id
         )
         INSERT INTO cash_out_quotes (
           escrow_id, quote_id, canonical_sequence, reward_points, signature, expires_at
         )
         SELECT id, $2, $3, $4, $5, to_timestamp($6) FROM marked_escrow
         RETURNING quote_id`,
        [
          escrow.id,
          quoteResult.quote.quoteId,
          quoteResult.quote.canonicalSequence,
          quoteResult.rewardPoints,
          quoteResult.signature,
          quoteResult.quote.expiresAtSeconds,
        ]
      );
      if (!insertedQuoteResult.rows[0]) {
        throw new Error('CASH_OUT_QUOTE_STATE_CONFLICT');
      }

      return {
        statusCode: 200,
        body: {
          quote: quoteResult.quote,
          signature: quoteResult.signature,
          shouldForceRecovery: quoteResult.shouldForceRecovery,
          safeExitOnly: quoteResult.safeExitOnly,
        },
      };
    });

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    if ((error as Error).message === 'CASH_OUT_NOT_ELIGIBLE') {
      res.status(409).json({ error: 'Cash-out is not eligible' });
      return;
    }
    Logger.error('[Economy] Cash-out quote error:', error);
    res.status(500).json({ error: 'Failed to issue cash-out quote' });
  }
}));

router.post('/cash-out/decision', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = cashOutDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const quoteSecret = process.env.CASH_OUT_QUOTE_SECRET;
  if (!quoteSecret) {
    res.status(503).json({ error: 'Cash-out decisions are unavailable' });
    return;
  }

  const accountId = getRequiredAccountId(req);
  const { quote_id: quoteId, decision, signature, idempotency_key: idempotencyKey } = parsed.data;

  try {
    const result = await withTransaction(async (client) => {
      const profileResult = await client.query<ProfileRow>(
        `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
        [accountId]
      );
      const profileId = profileResult.rows[0]?.id;
      if (!profileId) return { statusCode: 404, body: { error: 'Profile not found' } };

      const idempotencyResult = await client.query<{
        response_body: Record<string, unknown> | null;
        status_code: number | null;
      }>(
        `SELECT response_body, status_code FROM idempotency_keys
         WHERE account_id = $1 AND scope = 'economy.cash_out_decision' AND key = $2
           AND expires_at > now() LIMIT 1`,
        [accountId, idempotencyKey]
      );
      const replay = idempotencyResult.rows[0];
      if (replay?.response_body && replay.status_code) {
        return { statusCode: replay.status_code, body: replay.response_body };
      }

      const quoteResult = await client.query<CashOutDecisionQuoteRow>(
        `SELECT q.escrow_id, q.quote_id, q.canonical_sequence, q.reward_points,
                q.signature, q.issued_at, q.expires_at, q.status,
                e.session_id, e.greed_level, e.safe_exit_available_at
         FROM cash_out_quotes q
         JOIN run_escrows e ON e.id = q.escrow_id
         WHERE q.quote_id = $1 AND e.profile_id = $2 FOR UPDATE`,
        [quoteId, profileId]
      );
      const quote = quoteResult.rows[0];
      if (!quote) return { statusCode: 404, body: { error: 'Cash-out quote not found' } };
      if (quote.status !== 'open') return { statusCode: 409, body: { error: 'Cash-out quote is closed' } };

      const nowSeconds = Math.floor(Date.now() / 1_000);
      const signer = new CashOutQuoteSigner(quoteSecret);
      const quoteIsValid = signer.verify(
        {
          quoteId: quote.quote_id,
          sessionId: quote.session_id,
          canonicalSequence: quote.canonical_sequence,
          rewardPoints: quote.reward_points,
          issuedAtSeconds: Math.floor(quote.issued_at.getTime() / 1_000),
          expiresAtSeconds: Math.floor(quote.expires_at.getTime() / 1_000),
        },
        signature,
        nowSeconds
      );
      const expired = nowSeconds > Math.floor(quote.expires_at.getTime() / 1_000);
      if (!quoteIsValid && !expired) {
        return { statusCode: 403, body: { error: 'Invalid cash-out quote signature' } };
      }
      if (decision === 'safe_exit' && quote.safe_exit_available_at === null) {
        return { statusCode: 409, body: { error: 'Safe Exit is unavailable' } };
      }

      const resolvedDecision = expired ? 'expired' : decision;
      const settlesPrimary = resolvedDecision === 'accept' || resolvedDecision === 'safe_exit';
      const greedDelta = resolvedDecision === 'reject' || resolvedDecision === 'expired' ? 1 : 0;
      const state = settlesPrimary ? 'settled' : 'active';
      const body = {
        state,
        rewardPoints: settlesPrimary ? quote.reward_points : 0,
        greedDelta,
      };

      await client.query(
        `UPDATE cash_out_quotes SET status = $1, responded_at = now(), idempotency_key = $2
         WHERE quote_id = $3`,
        [resolvedDecision === 'accept' ? 'accepted' : resolvedDecision, idempotencyKey, quote.quote_id]
      );
      await client.query(
        `UPDATE run_escrows
         SET state = $1, greed_level = greed_level + $2,
             primary_reward_points = CASE WHEN $3 THEN $4 ELSE primary_reward_points END,
             settled_at = CASE WHEN $3 THEN now() ELSE settled_at END, updated_at = now()
         WHERE id = $5`,
        [state, greedDelta, settlesPrimary, quote.reward_points, quote.escrow_id]
      );
      if (settlesPrimary) {
        await client.query(
          `INSERT INTO reward_point_entries (
             session_id, escrow_id, profile_id, amount, entry_type, quote_id, metadata
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           ON CONFLICT (session_id) DO NOTHING`,
          [
            quote.session_id,
            quote.escrow_id,
            profileId,
            quote.reward_points,
            resolvedDecision === 'accept' ? 'cash_out_accepted' : 'safe_exit',
            quote.quote_id,
            JSON.stringify({ canonicalSequence: quote.canonical_sequence }),
          ]
        );
      }
      await client.query(
        `INSERT INTO audit_events (
           account_id, profile_id, event_type, resource, severity, metadata, ip_address, user_agent
         )
         VALUES ($1, $2, $3, '/api/v1/economy/cash-out/decision', 'info', $4::jsonb, $5, $6)`,
        [
          accountId,
          profileId,
          `economy.cash_out_${resolvedDecision}`,
          JSON.stringify({
            sessionId: quote.session_id,
            escrowId: quote.escrow_id,
            quoteId: quote.quote_id,
            canonicalSequence: quote.canonical_sequence,
            rewardPoints: body.rewardPoints,
            greedDelta,
          }),
          req.ip,
          req.get('user-agent') ?? null,
        ]
      );
      await client.query(
        `INSERT INTO idempotency_keys (account_id, key, scope, response_body, status_code)
         VALUES ($1, $2, 'economy.cash_out_decision', $3::jsonb, 200)`,
        [accountId, idempotencyKey, JSON.stringify(body)]
      );

      return { statusCode: 200, body };
    });

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    Logger.error('[Economy] Cash-out decision error:', error);
    res.status(500).json({ error: 'Failed to process cash-out decision' });
  }
}));

router.post('/cash-out/failure', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = cashOutFailureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const accountId = getRequiredAccountId(req);
  const { session_id: sessionId, failure_type: failureType, idempotency_key: idempotencyKey } = parsed.data;

  try {
    const result = await withTransaction(async (client) => {
      const profileResult = await client.query<ProfileRow>(
        `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
        [accountId]
      );
      const profileId = profileResult.rows[0]?.id;
      if (!profileId) return { statusCode: 404, body: { error: 'Profile not found' } };

      const idempotencyResult = await client.query<{
        response_body: Record<string, unknown> | null;
        status_code: number | null;
      }>(
        `SELECT response_body, status_code FROM idempotency_keys
         WHERE account_id = $1 AND scope = 'economy.cash_out_failure' AND key = $2
           AND expires_at > now() LIMIT 1`,
        [accountId, idempotencyKey]
      );
      const replay = idempotencyResult.rows[0];
      if (replay?.response_body && replay.status_code) {
        return { statusCode: replay.status_code, body: replay.response_body };
      }

      const sessionResult = await client.query<CashOutFailureSessionRow>(
        `SELECT id, survival_seconds, kills FROM sessions
         WHERE id = $1 AND profile_id = $2 FOR UPDATE`,
        [sessionId, profileId]
      );
      const session = sessionResult.rows[0];
      if (!session) return { statusCode: 404, body: { error: 'Session not found' } };

      const escrowResult = await client.query<{ id: string }>(
        `INSERT INTO run_escrows (session_id, profile_id, state, failure_type)
         VALUES ($1, $2, 'failed', $3)
         ON CONFLICT (session_id)
         DO UPDATE SET state = 'failed', failure_type = EXCLUDED.failure_type,
                       primary_reward_points = 0, settled_at = NULL, updated_at = now()
         WHERE run_escrows.state <> 'settled'
         RETURNING id`,
        [sessionId, profileId, failureType]
      );
      if (!escrowResult.rows[0]) {
        return { statusCode: 409, body: { error: 'Run escrow is already settled' } };
      }

      const shards = new ShardLedger().calculate({
        survivalSeconds: session.survival_seconds,
        hasCombatParticipation: session.kills > 0,
      });
      const shardResult = await client.query<{ amount: number }>(
        `INSERT INTO shard_entries (
           session_id, profile_id, amount, failure_type, participation_verified, metadata
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (session_id) DO UPDATE SET amount = shard_entries.amount
         RETURNING amount`,
        [
          sessionId,
          profileId,
          shards,
          failureType,
          session.kills > 0,
          JSON.stringify({ source: 'cash_out_failure' }),
        ]
      );
      const body = {
        state: 'failed',
        primaryRewardPoints: 0,
        shards: shardResult.rows[0]?.amount ?? shards,
      };
      await client.query(
        `INSERT INTO audit_events (
           account_id, profile_id, event_type, resource, severity, metadata, ip_address, user_agent
         )
         VALUES ($1, $2, 'economy.cash_out_failure', '/api/v1/economy/cash-out/failure', 'info', $3::jsonb, $4, $5)`,
        [
          accountId,
          profileId,
          JSON.stringify({
            sessionId,
            escrowId: escrowResult.rows[0].id,
            failureType,
            primaryRewardPoints: 0,
            shards: body.shards,
          }),
          req.ip,
          req.get('user-agent') ?? null,
        ]
      );
      await client.query(
        `INSERT INTO idempotency_keys (account_id, key, scope, response_body, status_code)
         VALUES ($1, $2, 'economy.cash_out_failure', $3::jsonb, 200)`,
        [accountId, idempotencyKey, JSON.stringify(body)]
      );
      return { statusCode: 200, body };
    });

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    Logger.error('[Economy] Cash-out failure error:', error);
    res.status(500).json({ error: 'Failed to process cash-out failure' });
  }
}));

router.post('/claim-run-reward', requireAuth, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = claimRunRewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const accountId = getRequiredAccountId(req);
  const { session_id: sessionId, idempotency_key: idempotencyKey } = parsed.data;
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const result = await withTransaction(async (client): Promise<ClaimResult> => {
      const existingIdempotency = await client.query<{
        response_body: Record<string, unknown> | null;
        status_code: number | null;
      }>(
        `SELECT response_body, status_code
         FROM idempotency_keys
         WHERE scope = $1 AND key = $2 AND account_id = $3 AND expires_at > now()
         LIMIT 1`,
        [CLAIM_SCOPE, idempotencyKey, accountId]
      );

      const replay = existingIdempotency.rows[0];
      if (replay?.response_body && replay.status_code) {
        return { statusCode: replay.status_code, body: replay.response_body };
      }

      const profileResult = await client.query<ProfileRow>(
        `SELECT id FROM profiles WHERE auth_user_id = $1 LIMIT 1`,
        [accountId]
      );
      const profileId = profileResult.rows[0]?.id;
      if (!profileId) {
        return { statusCode: 404, body: { error: 'Profile not found' } };
      }

      const sessionResult = await client.query<{
        id: string;
        reward_amount: number;
        is_verified: boolean;
      }>(
        `SELECT id, COALESCE(reward_amount, 0) AS reward_amount, is_verified
         FROM sessions
         WHERE id = $1 AND profile_id = $2
         FOR UPDATE`,
        [sessionId, profileId]
      );

      const session = sessionResult.rows[0];
      if (!session) {
        return { statusCode: 404, body: { error: 'Session not found' } };
      }
      if (!session.is_verified) {
        return { statusCode: 409, body: { error: 'Session is not verified' } };
      }
      if (session.reward_amount <= 0) {
        return { statusCode: 409, body: { error: 'Session has no claimable reward' } };
      }

      const existingClaim = await client.query<{
        id: string;
        amount: string;
      }>(
        `SELECT id, amount::TEXT AS amount
         FROM reward_claims
         WHERE session_id = $1
         LIMIT 1`,
        [sessionId]
      );

      if (existingClaim.rows[0]) {
        const walletRows = await client.query<WalletRow>(
          `SELECT id, balance::TEXT AS balance, currency
           FROM wallets
           WHERE account_id = $1
           LIMIT 1`,
          [accountId]
        );
        const wallet = walletRows.rows[0];
        const body = {
          claimed: false,
          alreadyClaimed: true,
          claimId: existingClaim.rows[0].id,
          amount: Number(existingClaim.rows[0].amount),
          wallet: wallet
            ? { id: wallet.id, balance: Number(wallet.balance), currency: wallet.currency }
            : null,
        };

        await client.query(
          `INSERT INTO idempotency_keys (
             account_id, key, scope, response_body, status_code
           )
           VALUES ($1, $2, $3, $4::jsonb, 200)
           ON CONFLICT (scope, key)
           DO UPDATE SET response_body = EXCLUDED.response_body, status_code = EXCLUDED.status_code`,
          [accountId, idempotencyKey, CLAIM_SCOPE, JSON.stringify(body)]
        );

        return { statusCode: 200, body };
      }

      const walletResult = await client.query<WalletRow>(
        `INSERT INTO wallets (account_id, profile_id, balance, currency)
         VALUES ($1, $2, 0, 'gold')
         ON CONFLICT (account_id)
         DO UPDATE SET profile_id = EXCLUDED.profile_id, updated_at = now()
         RETURNING id, balance::TEXT AS balance, currency`,
        [accountId, profileId]
      );
      const wallet = walletResult.rows[0];
      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND');
      }

      const amount = Math.floor(session.reward_amount);
      const updatedWallet = await client.query<WalletRow>(
        `UPDATE wallets
         SET balance = balance + $1, updated_at = now()
         WHERE id = $2
         RETURNING id, balance::TEXT AS balance, currency`,
        [amount, wallet.id]
      );

      const nextWallet = updatedWallet.rows[0];
      if (!nextWallet) {
        throw new Error('WALLET_UPDATE_FAILED');
      }

      const claimResult = await client.query<{ id: string }>(
        `INSERT INTO reward_claims (
           account_id, profile_id, session_id, amount, status, idempotency_key, metadata
         )
         VALUES ($1, $2, $3, $4, 'claimed', $5, $6::jsonb)
         RETURNING id`,
        [
          accountId,
          profileId,
          sessionId,
          amount,
          idempotencyKey,
          JSON.stringify({ source: 'session_reward' }),
        ]
      );

      const claimId = claimResult.rows[0]?.id;
      if (!claimId) {
        throw new Error('CLAIM_CREATE_FAILED');
      }

      const ledgerResult = await client.query<{ id: string }>(
        `INSERT INTO ledger_entries (
           account_id, wallet_id, profile_id, amount, balance_after,
           entry_type, reference_type, reference_id, idempotency_key, metadata
         )
         VALUES ($1, $2, $3, $4, $5, 'session_reward', 'session', $6, $7, $8::jsonb)
         RETURNING id`,
        [
          accountId,
          nextWallet.id,
          profileId,
          amount,
          Number(nextWallet.balance),
          sessionId,
          idempotencyKey,
          JSON.stringify({ claimId }),
        ]
      );

      const body = {
        claimed: true,
        alreadyClaimed: false,
        claimId,
        ledgerEntryId: ledgerResult.rows[0]?.id,
        amount,
        wallet: {
          id: nextWallet.id,
          balance: Number(nextWallet.balance),
          currency: nextWallet.currency,
        },
      };

      await client.query(
        `INSERT INTO audit_events (
           account_id, profile_id, event_type, resource, severity, metadata, ip_address, user_agent
         )
         VALUES ($1, $2, 'economy.reward_claimed', '/api/v1/economy/claim-run-reward', 'info', $3::jsonb, $4, $5)`,
        [
          accountId,
          profileId,
          JSON.stringify({ sessionId, claimId, amount }),
          ipAddress,
          userAgent,
        ]
      );

      await client.query(
        `INSERT INTO idempotency_keys (
           account_id, key, scope, response_body, status_code
         )
         VALUES ($1, $2, $3, $4::jsonb, 200)
         ON CONFLICT (scope, key)
         DO UPDATE SET response_body = EXCLUDED.response_body, status_code = EXCLUDED.status_code`,
        [accountId, idempotencyKey, CLAIM_SCOPE, JSON.stringify(body)]
      );

      return { statusCode: 200, body };
    });

    res.status(result.statusCode).json(result.body);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Reward already claimed' });
      return;
    }

    Logger.error('[Economy] Reward claim error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
}));

export default router;
