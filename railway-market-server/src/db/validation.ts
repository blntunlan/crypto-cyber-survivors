/**
 * Zod validation schemas — derived from Drizzle schema via drizzle-zod.
 * Replaces all `req.body as { ... }` type assertions in route files.
 */
import { z } from 'zod';

// ── Profile ──────────────────────────────────────────────────────────────────

export const createProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30),
  avatar_url: z.string().url().nullish(),
});

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30).optional(),
  avatar_url: z.string().url().nullish(),
});

// ── Sessions ─────────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
  pair: z.string().min(1),
  leverage: z.coerce.number().int().min(1).max(500),
  position: z.enum(['LONG', 'SHORT']),
  userId: z.string().optional(),
});

export const verifySessionSchema = z.object({
  sessionId: z.string().uuid(),
  signature: z.string().min(1),
  payload: z.object({
    sessionId: z.string(),
    pair: z.string(),
    position: z.string(),
    leverage: z.coerce.number(),
    claimedEntryPrice: z.coerce.number(),
    claimedExitPrice: z.coerce.number(),
    claimedPnL: z.coerce.number(),
    kills: z.coerce.number().int().min(0),
    level: z.coerce.number().int().min(1),
    survivalSeconds: z.coerce.number().min(0),
    exitType: z.string().optional(),
    portalType: z.string().optional(),
    maxStreak: z.coerce.number().int().min(0).default(0),
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
        streak: z.number(),
        portal: z.number(),
      })
      .optional(),
  }),
});

export const syncSessionSchema = z.object({
  sessionId: z.string().optional(),
  sessionData: z.record(z.string(), z.unknown()),
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
