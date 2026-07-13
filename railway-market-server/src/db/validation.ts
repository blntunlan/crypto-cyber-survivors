/**
 * Zod validation schemas — derived from Drizzle schema via drizzle-zod.
 * Replaces all `req.body as { ... }` type assertions in route files.
 */
import { z } from 'zod';

const exitTypeSchema = z.enum(['portal', 'death', 'afk_death', 'cycle_complete']);
const portalTypeSchema = z.enum(['TAKE_PROFIT', 'STOP_LOSS', 'FLOW_EXIT', 'FORCED']);

// ── Profile ──────────────────────────────────────────────────────────────────

const nicknameSchema = z
  .string()
  .trim()
  .min(3, 'Nickname must be at least 3 characters')
  .max(16, 'Nickname must be at most 16 characters')
  .regex(/^[a-zA-Z0-9_-]{3,16}$/, 'Nickname may only contain letters, digits, underscores, and hyphens');

export const anonymousAuthSchema = z.object({
  display_name: nicknameSchema.optional(),
  device_fingerprint: z.string().trim().min(8).max(128).optional(),
});

export const createProfileSchema = z.object({
  nickname: nicknameSchema,
  avatar_url: z.string().url().nullish(),
});

export const updateProfileSchema = z.object({
  nickname: nicknameSchema.optional(),
  avatar_url: z.string().url().nullish(),
});

// ── Sessions ─────────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
  pair: z.string().min(1),
  leverage: z.coerce.number().int().min(1).max(500),
  position: z.enum(['LONG', 'SHORT']),
  userId: z.string().optional(),
});

const verifyPayloadSchema = z
  .object({
    sessionId: z.string().uuid(),
    pair: z.string(),
    position: z.string(),
    leverage: z.coerce.number(),
    claimedEntryPrice: z.coerce.number(),
    claimedExitPrice: z.coerce.number(),
    claimedPnL: z.coerce.number(),
    kills: z.coerce.number().int().min(0),
    level: z.coerce.number().int().min(1),
    survivalSeconds: z.coerce.number().min(0),
    exitType: exitTypeSchema,
    portalType: portalTypeSchema.nullish(),
    maxStreak: z.coerce.number().int().min(0),
    rawCoins: z.coerce.number().int().min(0).optional(),
    enemyDropCoins: z.coerce.number().int().min(0).optional(),
    totalCoins: z.coerce.number().int().min(0).optional(),
    pnlPercent: z.coerce.number().optional(),
    breakdown: z
      .object({
        base: z.number(),
        survival: z.number(),
        kill: z.number(),
        level: z.number(),
        market: z.number(),
        streak: z.number(),
        portal: z.number(),
      })
      .optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.exitType === 'portal' && payload.portalType == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['portalType'],
        message: 'portalType is required for portal exits',
      });
    }

    if (payload.exitType !== 'portal' && payload.portalType != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['portalType'],
        message: 'portalType is only valid for portal exits',
      });
    }
  });

export const verifySessionSchema = z.object({
  sessionId: z.string().uuid(),
  signature: z.string().min(1),
  payload: verifyPayloadSchema,
}).superRefine((body, ctx) => {
  if (body.payload.sessionId !== body.sessionId) {
    ctx.addIssue({
      code: 'custom',
      path: ['payload', 'sessionId'],
      message: 'payload.sessionId must match sessionId',
    });
  }
});

const syncSessionDataSchema = z
  .object({
    entry_price: z.coerce.number().positive().optional(),
    exit_price: z.coerce.number().positive().optional(),
    survival_seconds: z.coerce.number().int().min(0).max(86_400).optional(),
    kills: z.coerce.number().int().min(0).optional(),
    level: z.coerce.number().int().min(1).optional(),
    exit_type: exitTypeSchema.optional(),
    portal_type: portalTypeSchema.nullish().optional(),
  })
  .strict()
  .superRefine((sessionData, ctx) => {
    if (
      Object.keys(sessionData).length === 0 ||
      Object.values(sessionData).every(value => value === undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'sessionData must include at least one syncable field',
      });
    }

    if (sessionData.exit_type === 'portal' && sessionData.portal_type == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['portal_type'],
        message: 'portal_type is required for portal exits',
      });
    }

    if (sessionData.exit_type !== 'portal' && sessionData.portal_type != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['portal_type'],
        message: 'portal_type is only valid for portal exits',
      });
    }
  });

export const syncSessionSchema = z.object({
  sessionId: z.string().uuid(),
  sessionData: syncSessionDataSchema,
});

// ── Economy ─────────────────────────────────────────────────────────────────

export const claimRunRewardSchema = z.object({
  session_id: z.string().uuid(),
  idempotency_key: z.string().trim().min(8).max(128),
});

export const cashOutQuoteSchema = z.object({
  session_id: z.string().uuid(),
  pacing_state: z.enum(['BUILD_UP', 'PEAK', 'PEAK_FADE', 'RECOVERY', 'DOOM']),
});

export const cashOutDecisionSchema = z.object({
  quote_id: z.string().uuid().or(z.string().trim().min(1).max(128)),
  decision: z.enum(['accept', 'reject', 'safe_exit']),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
  idempotency_key: z.string().trim().min(8).max(128),
});

export const cashOutFailureSchema = z.object({
  session_id: z.string().uuid(),
  failure_type: z.enum(['death', 'liquidation']),
  idempotency_key: z.string().trim().min(8).max(128),
});

// ── Identities ───────────────────────────────────────────────────────────────

export const createIdentitySchema = z.object({
  provider: z.string().min(1),
  provider_user_id: z.string().min(1),
  provider_username: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().datetime().optional(),
});

// ── Telemetry ────────────────────────────────────────────────────────────────

export const errorReportSchema = z.object({
  error_type: z.string().min(1),
  message: z.string().min(1).max(2000),
  stack_trace: z.string().max(10000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().default('runtime'),
  page_url: z.string().optional(),
  browser_info: z.string().optional(),
  context_data: z.record(z.string(), z.unknown()).optional(),
});

export const batchErrorReportSchema = z.object({
  errors: z.array(errorReportSchema).min(1).max(50),
});

export const cheatReportSchema = z.object({
  session_id: z.string().uuid().optional(),
  cheat_type: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const deviceProfileSchema = z.object({
  fingerprint: z.string().min(1),
  device_type: z.string().optional(),
  browser: z.string().optional(),
  screen_width: z.coerce.number().int().optional(),
  screen_height: z.coerce.number().int().optional(),
  hardware_concurrency: z.coerce.number().int().optional(),
  device_memory: z.coerce.number().optional(),
  recommended_profile: z.string().optional(),
  benchmark_score: z.coerce.number().optional(),
});

export const performanceMetricsSchema = z.object({
  session_id: z.string().uuid().optional(),
  device_platform: z.string().optional(),
  device_model: z.string().optional(),
  os_info: z.string().optional(),
  memory_gb: z.coerce.number().optional(),
  cpu_cores: z.coerce.number().int().optional(),
  avg_fps: z.coerce.number().optional(),
  min_fps: z.coerce.number().optional(),
  max_fps: z.coerce.number().optional(),
  frame_drops: z.coerce.number().int().optional(),
  resolution: z.string().optional(),
  gpu_info: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Market runtime audit ────────────────────────────────────────────────────

const marketRuntimeJsonObjectSchema = z.record(z.string(), z.unknown());

const marketRuntimeBatchItemSchema = z.object({
  runId: z.string().trim().min(1).max(128),
  seq: z.coerce.number().int().min(0).max(1_000_000),
  runConstants: marketRuntimeJsonObjectSchema,
  tick: marketRuntimeJsonObjectSchema,
  snapshot: marketRuntimeJsonObjectSchema,
});

export const marketRuntimeBatchSchema = z.object({
  runId: z.string().trim().min(1).max(128).nullable().optional(),
  count: z.coerce.number().int().min(1).max(250),
  items: z.array(marketRuntimeBatchItemSchema).min(1).max(250),
});

// ── Replays ──────────────────────────────────────────────────────────────────

export const saveReplaySchema = z.object({
  session_id: z.string().uuid(),
  score: z.coerce.number().int().min(0),
  duration_ms: z.coerce.number().int().min(0),
  final_level: z.coerce.number().int().min(1),
  total_kills: z.coerce.number().int().min(0),
  pair: z.string().min(1),
  position: z.enum(['LONG', 'SHORT']),
  leverage: z.coerce.number().int().min(1).max(500),
  replay_data: z.string().min(1), // base64 encoded
  version: z.coerce.number().int().default(2),
});

// ── Challenges ───────────────────────────────────────────────────────────────

export const completeChallengeSchema = z.object({
  challenge_id: z.string().min(1),
  session_id: z.string().uuid().optional(),
  score: z.coerce.number().int().min(0),
  survival_seconds: z.coerce.number().int().min(0),
  kills: z.coerce.number().int().min(0),
  level_reached: z.coerce.number().int().min(1),
  objectives_completed: z.array(z.unknown()).default([]),
});

// ── Meta Progression ─────────────────────────────────────────────────────────

export const purchaseUpgradeSchema = z.object({
  upgrade_id: z.string().min(1),
  cost: z.coerce.number().int().min(0),
  max_level: z.coerce.number().int().min(1).default(10),
});

export const transferMetaCoinsSchema = z.object({
  earned_coins: z.coerce.number().int().min(0),
});
