import { Router, type Request, type Response } from 'express';
import { marketRuntimeBatchSchema } from '../db/validation';
import { getProfileId } from '../db/helpers';
import { withTransaction } from '../db/pool';
import { getRequiredAccountId, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getClientInfo } from '../utils/auditLogger';
import { Logger } from '../utils/logger';

const router = Router();

type JsonObject = Record<string, unknown>;

type MarketAuditInsertRow = {
  id: string;
};

function getStringField(source: JsonObject, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getClientCreatedAt(snapshot: JsonObject, tick: JsonObject): string | null {
  const rawValue = snapshot['createdAt'] ?? tick['recvTs'] ?? tick['sourceTs'];
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  const date = new Date(rawValue);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function getSessionId(runConstants: JsonObject, snapshot: JsonObject): string | null {
  const candidate = getStringField(runConstants, 'sessionId') ?? getStringField(snapshot, 'sessionId');
  if (!candidate) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

router.post(
  '/runtime-batch',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = marketRuntimeBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid market runtime batch' });
      return;
    }

    const { runId, count, items } = parsed.data;
    if (count !== items.length) {
      res.status(400).json({ error: 'count must match items length' });
      return;
    }

    if (runId && items.some(item => item.runId !== runId)) {
      res.status(400).json({ error: 'runId must match all batch items' });
      return;
    }

    const accountId = getRequiredAccountId(req);
    const profileId = await getProfileId(accountId);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    const batchRunId = runId ?? items[0]?.runId ?? null;

    try {
      const result = await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO accounts (id, account_type, status)
           VALUES ($1, 'registered', 'active')
           ON CONFLICT (id)
           DO UPDATE SET updated_at = now(), last_seen_at = now()`,
          [accountId]
        );

        let accepted = 0;
        let duplicates = 0;

        for (const item of items) {
          const runConstants = item.runConstants as JsonObject;
          const tick = item.tick as JsonObject;
          const snapshot = item.snapshot as JsonObject;
          const pair =
            getStringField(snapshot, 'pair') ??
            getStringField(tick, 'pair') ??
            getStringField(runConstants, 'pair') ??
            'UNKNOWN';
          const source = getStringField(tick, 'source');
          const tickHash = getStringField(tick, 'hash');
          const snapshotChecksum = getStringField(snapshot, 'checksum');
          const sessionId = getSessionId(runConstants, snapshot);
          const clientCreatedAt = getClientCreatedAt(snapshot, tick);

          const insertResult = await client.query<MarketAuditInsertRow>(
            `INSERT INTO market_runtime_audit (
               account_id, profile_id, session_id, run_id, seq, pair, source,
               run_constants, tick, snapshot, tick_hash, snapshot_checksum, client_created_at
             )
             VALUES (
               $1, $2, $3, $4, $5, $6, $7,
               $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13
             )
             ON CONFLICT (account_id, run_id, seq) DO NOTHING
             RETURNING id`,
            [
              accountId,
              profileId,
              sessionId,
              item.runId,
              item.seq,
              pair,
              source,
              JSON.stringify(runConstants),
              JSON.stringify(tick),
              JSON.stringify(snapshot),
              tickHash,
              snapshotChecksum,
              clientCreatedAt,
            ]
          );

          if (insertResult.rows[0]) {
            accepted += 1;
          } else {
            duplicates += 1;
          }
        }

        await client.query(
          `INSERT INTO audit_events (
             account_id, profile_id, event_type, resource, severity, metadata, ip_address, user_agent
           )
           VALUES ($1, $2, 'market.runtime_batch_ingested', '/api/v1/market/runtime-batch', 'info', $3::jsonb, $4, $5)`,
          [
            accountId,
            profileId,
            JSON.stringify({
              runId: batchRunId,
              received: items.length,
              accepted,
              duplicates,
            }),
            ipAddress,
            userAgent,
          ]
        );

        return { accepted, duplicates };
      });

      res.status(202).json({
        runId: batchRunId,
        received: items.length,
        accepted: result.accepted,
        duplicates: result.duplicates,
      });
    } catch (error) {
      Logger.error('[MarketRuntime] Batch ingest failed:', error);
      res.status(500).json({ error: 'Failed to ingest market runtime batch' });
    }
  })
);

export default router;
