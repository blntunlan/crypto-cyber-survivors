/**
 * ErrorSanitizer - Privacy-safe sanitization utilities for error data
 *
 * Handles:
 * - Message sanitization (removes API keys, tokens, passwords)
 * - Stack trace truncation
 * - URL sanitization
 * - Context sanitization
 * - Fingerprint creation
 *
 * @module Extracted from ErrorTracker.ts for better modularity
 */

// =============================================================================
// HASH UTILITY
// =============================================================================

/**
 * Simple hash function for fingerprinting
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// =============================================================================
// FINGERPRINT
// =============================================================================

/**
 * Create a unique fingerprint for error grouping
 */
export function createFingerprint(type: string, message: string, stack?: string): string {
  // Extract first meaningful line from stack if available
  const stackLine = stack?.split('\n')[1]?.trim().substring(0, 100) ?? '';
  const input = `${type}|${message.substring(0, 100)}|${stackLine}`;
  return simpleHash(input);
}

// =============================================================================
// MESSAGE SANITIZATION
// =============================================================================

/**
 * Sanitize error message by removing sensitive data
 */
export function sanitizeMessage(message: string): string {
  if (!message) return '';
  return message
    .substring(0, 500)
    .replace(/api[_-]?key[=:]\s*[\w-]+/gi, 'api_key=***')
    .replace(/token[=:]\s*[\w-]+/gi, 'token=***')
    .replace(/password[=:]\s*[\w-]+/gi, 'password=***')
    .replace(/bearer\s+[\w.-]+/gi, 'bearer ***');
}

/**
 * Sanitize stack trace (truncate for storage)
 */
export function sanitizeStackTrace(stack?: string): string | undefined {
  if (!stack) return undefined;
  return stack.substring(0, 2000);
}

// =============================================================================
// URL SANITIZATION
// =============================================================================

/**
 * Sanitize URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove sensitive query params
    ['token', 'key', 'password', 'secret', 'auth'].forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***');
      }
    });
    return parsed.toString();
  } catch {
    return url.substring(0, 200);
  }
}

// =============================================================================
// CONTEXT SANITIZATION
// =============================================================================

/**
 * Sanitize context object (truncate long strings, stringify objects)
 */
export function sanitizeContext(
  context?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
    } else if (typeof value === 'object' && value !== null) {
      try {
        sanitized[key] = JSON.parse(JSON.stringify(value));
      } catch {
        sanitized[key] = '[Object]';
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// =============================================================================
// SESSION UTILITIES
// =============================================================================

/**
 * Get current session ID from storage
 */
export function getSessionId(): string | undefined {
  return sessionStorage.getItem('current_session_id') ?? undefined;
}

/**
 * Generate device fingerprint from browser properties
 */
export function getDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ];
  return simpleHash(components.join('|'));
}
