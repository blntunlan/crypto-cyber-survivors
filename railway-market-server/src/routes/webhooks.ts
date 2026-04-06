import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles } from '../db/schema';
import { Logger } from '../utils/logger';
import { logAudit } from '../utils/auditLogger';

const router = Router();

// Webhook secret for verifying Supabase webhook requests
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

/**
 * Verify webhook signature from Supabase.
 * Supabase sends a shared secret in the Authorization header.
 */
function verifyWebhookSignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    Logger.warn(
      '[Webhook] SUPABASE_WEBHOOK_SECRET not configured — skipping verification'
    );
    return true; // Allow in dev when not configured
  }
  const authHeader = req.headers['authorization'];
  return authHeader === `Bearer ${WEBHOOK_SECRET}`;
}

type WebhookEventType =
  | 'user.signed_up'
  | 'user.signed_in'
  | 'user.updated'
  | 'user.deleted';

type WebhookPayload = {
  type: WebhookEventType;
  table: string;
  record: {
    id: string;
    email?: string;
    raw_user_meta_data?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
    last_sign_in_at?: string;
  };
  old_record?: {
    id: string;
    email?: string;
  };
};

/**
 * POST /api/v1/webhooks/auth — Handle Supabase auth webhook events
 */
router.post(
  '/auth',
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyWebhookSignature(req)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    const payload = req.body as WebhookPayload;
    const { type, record } = payload;

    Logger.info(`[Webhook] Received auth event: ${type} for user ${record?.id}`);

    const db = getDb();

    try {
      switch (type) {
        case 'user.signed_in': {
          // Update last_seen_at for the profile
          if (record?.id) {
            await db
              .update(profiles)
              .set({ lastSeenAt: new Date() })
              .where(eq(profiles.authUserId, record.id));
          }
          break;
        }

        case 'user.updated': {
          // Sync metadata changes (display_name, avatar_url)
          if (record?.id) {
            const updates: Record<string, unknown> = {
              updatedAt: new Date(),
            };

            const metadata = record.raw_user_meta_data;
            if (metadata?.display_name) {
              updates.displayName = metadata.display_name as string;
            }
            if (metadata?.avatar_url) {
              updates.avatarUrl = metadata.avatar_url as string;
            }

            await db
              .update(profiles)
              .set(updates)
              .where(eq(profiles.authUserId, record.id));
          }
          break;
        }

        case 'user.deleted': {
          // Cascade delete handled by FK constraints, but explicitly remove profile
          if (record?.id) {
            const deleted = await db
              .delete(profiles)
              .where(eq(profiles.authUserId, record.id))
              .returning({ id: profiles.id });

            const deletedProfile = deleted[0];
            if (deletedProfile) {
              Logger.info(
                `[Webhook] Deleted profile ${deletedProfile.id} for auth user ${record.id}`
              );
              await logAudit({
                profileId: deletedProfile.id,
                action: 'profile.update',
                resource: '/api/v1/webhooks/auth',
                details: { event: 'user.deleted', authUserId: record.id },
              });
            }
          }
          break;
        }

        case 'user.signed_up': {
          // Profile creation handled by POST /api/v1/profile — just log
          Logger.info(`[Webhook] New signup: ${record?.id}`);
          break;
        }

        default:
          Logger.warn(`[Webhook] Unknown auth event type: ${type as string}`);
      }

      res.json({ received: true });
    } catch (error) {
      Logger.error(`[Webhook] Error processing ${type}:`, error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  })
);

export default router;
