import { Router, type Request, type Response } from 'express';
import { anonymousAuthSchema } from '../db/validation';
import { withTransaction } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { getClientInfo } from '../utils/auditLogger';
import { Logger } from '../utils/logger';
import {
  isRailwayJwtConfigured,
  signRailwayAccessToken,
} from '../utils/railwayJwt';

const router = Router();

type AnonymousBootstrapRow = {
  account_id: string;
  profile_id: string;
  wallet_id: string;
  display_name: string;
  balance: string;
  currency: string;
};

router.post('/anonymous', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!isRailwayJwtConfigured()) {
    res.status(500).json({ error: 'Railway auth is not configured' });
    return;
  }

  const parsed = anonymousAuthSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }

  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const bootstrap = await withTransaction(async (client): Promise<AnonymousBootstrapRow> => {
      const accountResult = await client.query<{ id: string }>(
        `INSERT INTO accounts (account_type, status, display_name)
         VALUES ('anonymous', 'active', $1)
         RETURNING id`,
        [parsed.data.display_name ?? null]
      );

      const accountId = accountResult.rows[0]?.id;
      if (!accountId) {
        throw new Error('ACCOUNT_CREATE_FAILED');
      }

      const displayName = parsed.data.display_name ?? `anon_${accountId.replace(/-/g, '').slice(0, 8)}`;

      await client.query(
        `UPDATE accounts
         SET display_name = $2, updated_at = now(), last_seen_at = now()
         WHERE id = $1`,
        [accountId, displayName]
      );

      await client.query(
        `INSERT INTO account_identities (account_id, provider, provider_subject, provider_username, metadata)
         VALUES ($1, 'anonymous', $1, $2, $3::jsonb)
         ON CONFLICT (provider, provider_subject)
         DO UPDATE SET updated_at = now(), metadata = EXCLUDED.metadata`,
        [
          accountId,
          displayName,
          JSON.stringify({ deviceFingerprint: parsed.data.device_fingerprint ?? null }),
        ]
      );

      const profileResult = await client.query<{ id: string; display_name: string }>(
        `INSERT INTO profiles (auth_user_id, nickname, display_name, primary_auth_provider)
         VALUES ($1, $2, $2, 'railway_anonymous')
         ON CONFLICT (auth_user_id)
         DO UPDATE SET last_seen_at = now(), updated_at = now()
         RETURNING id, display_name`,
        [accountId, displayName]
      );

      const profile = profileResult.rows[0];
      if (!profile) {
        throw new Error('PROFILE_CREATE_FAILED');
      }

      const walletResult = await client.query<{
        id: string;
        balance: string;
        currency: string;
      }>(
        `INSERT INTO wallets (account_id, profile_id, balance, currency)
         VALUES ($1, $2, 0, 'gold')
         ON CONFLICT (account_id)
         DO UPDATE SET profile_id = EXCLUDED.profile_id, updated_at = now()
         RETURNING id, balance::TEXT AS balance, currency`,
        [accountId, profile.id]
      );

      const wallet = walletResult.rows[0];
      if (!wallet) {
        throw new Error('WALLET_CREATE_FAILED');
      }

      await client.query(
        `INSERT INTO audit_events (
           account_id, profile_id, event_type, resource, severity, metadata, ip_address, user_agent
         )
         VALUES ($1, $2, 'auth.anonymous_created', '/api/v1/auth/anonymous', 'info', $3::jsonb, $4, $5)`,
        [
          accountId,
          profile.id,
          JSON.stringify({ provider: 'anonymous' }),
          ipAddress,
          userAgent,
        ]
      );

      return {
        account_id: accountId,
        profile_id: profile.id,
        wallet_id: wallet.id,
        display_name: profile.display_name,
        balance: wallet.balance,
        currency: wallet.currency,
      };
    });

    const { accessToken, expiresIn } = signRailwayAccessToken({
      accountId: bootstrap.account_id,
      accountType: 'anonymous',
    });

    res.status(201).json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      account: {
        id: bootstrap.account_id,
        type: 'anonymous',
      },
      profile: {
        id: bootstrap.profile_id,
        displayName: bootstrap.display_name,
      },
      wallet: {
        id: bootstrap.wallet_id,
        balance: Number(bootstrap.balance),
        currency: bootstrap.currency,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Display name already taken' });
      return;
    }

    Logger.error('[Auth] Anonymous bootstrap error:', error);
    res.status(500).json({ error: 'Anonymous auth failed' });
  }
}));

export default router;
