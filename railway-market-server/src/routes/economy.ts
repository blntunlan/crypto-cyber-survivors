import { Router, type Request, type Response } from 'express';
import { getRequiredAccountId, requireAuth } from '../middleware/auth';
import { claimRunRewardSchema } from '../db/validation';
import { query, withTransaction } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { getClientInfo } from '../utils/auditLogger';
import { Logger } from '../utils/logger';

const router = Router();
const CLAIM_SCOPE = 'economy.claim-run-reward';

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
