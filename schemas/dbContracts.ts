/**
 * Database Contracts (Zod Schemas)
 *
 * This file contains the source-of-truth schemas for all database tables.
 * Use these to validate data BEFORE sending it to Supabase.
 */

import { z } from 'zod';

// ============================================
// CORE TABLE SCHEMAS
// ============================================

/**
 * Game Sessions Table Contract
 */
export const GameSessionSchema = z.object({
  player_id: z.uuid(),
  crypto_pair: z.string().min(1),
  position_chosen: z.enum(['long', 'short']),
  leverage: z.number().int().min(1).max(125),
  max_level: z.number().int().default(1),
  total_kills: z.number().int().default(0),
  survival_time_ms: z.number().int().default(0),
  gold_collected: z.number().int().default(0),
  is_verified: z.boolean().default(false),
  session_id: z.string().optional(), // nanoid
  session_secret: z.uuid().optional(),
  end_reason: z.string().optional(),
  client_ip: z.string().optional(),
});

export type GameSessionRow = z.infer<typeof GameSessionSchema>;

/**
 * Error Reports Table Contract
 */
export const ErrorReportSchema = z.object({
  player_id: z.uuid().nullable().optional(),
  error_type: z.string().min(1),
  error_message: z.string().optional(),
  stack_trace: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum([
    'runtime',
    'network',
    'performance',
    'resource',
    'console',
    'game',
    'ui',
  ]),
  user_agent: z.string().optional(),
  browser_info: z.string().optional(),
  page_url: z.string().optional(),
  context: z.record(z.string(), z.any()).default({}),
  status: z.enum(['new', 'open', 'resolved', 'closed']).default('new'),
  fingerprint: z.string().optional(),
});

export type ErrorReportRow = z.infer<typeof ErrorReportSchema>;

/**
 * Players Table Contract
 */
export const PlayerSchema = z.object({
  display_name: z.string().min(2).max(50),
  auth_provider: z.string().default('nickname'),
  auth_id: z.string().optional(),
  total_sessions: z.number().int().default(1),
  total_kills: z.number().int().default(0),
  high_score: z.number().int().default(0),
  is_banned: z.boolean().default(false),
});

export type PlayerRow = z.infer<typeof PlayerSchema>;

// ============================================
// VALIDATION UTILITIES
// ============================================

export function validateRow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function tryValidateRow<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: boolean; data?: T; error?: unknown } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
