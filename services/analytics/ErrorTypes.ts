/**
 * ErrorTypes - Type definitions and constants for error tracking
 *
 * @module Extracted from ErrorTracker.ts for better modularity
 */

// =============================================================================
// SEVERITY & CATEGORY TYPES
// =============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'runtime'
  | 'network'
  | 'performance'
  | 'resource'
  | 'console'
  | 'game'
  | 'ui';

// =============================================================================
// INTERFACES
// =============================================================================

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface GameContext {
  gameStatus?: string;
  playerLevel?: number;
  playerHP?: number;
  survivalTimeMs?: number;
  cryptoPair?: string;
  position?: string;
  fps?: number;
  sessionId?: string;
}

export interface ErrorReport {
  // Core
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;

  // Fingerprint for grouping
  fingerprint: string;

  // Environment
  userAgent: string;
  url: string;
  viewport: { width: number; height: number };

  // User context
  profileId?: string;
  sessionId?: string;
  deviceFingerprint?: string;
  nickname?: string;

  // Error context
  context?: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  gameContext?: GameContext;

  // Timing
  reportedAt: string;
  sessionDurationMs?: number;

  // Tags for filtering
  tags: string[];
}

export interface QueuedError {
  report: ErrorReport;
  retryCount: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const ERROR_CONSTANTS = {
  STORAGE_KEY: 'error_tracker_queue',
  MAX_BREADCRUMBS: 25,
  RATE_LIMIT_MS: 30000, // 30 seconds per unique error
  MAX_QUEUE_SIZE: 100,
  BATCH_SIZE: 10,
  QUEUE_PROCESS_INTERVAL_MS: 15000, // 15 seconds
  MAX_RETRIES: 3,
} as const;
