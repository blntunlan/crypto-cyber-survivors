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
export function createFingerprint(
  type: string,
  message: string,
  stack?: string
): string {
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
    .replace(/api[_-]?key[=:]\s*["']?[\w-]{20,}["']?/gi, 'api_key=***')
    .replace(/token[=:]\s*["']?[\w.-]{30,}["']?/gi, 'token=***')
    .replace(/password[=:]\s*["']?[\w%@#$!^&*()]+["']?/gi, 'password=***')
    .replace(/secret[=:]\s*["']?[\w-]{20,}["']?/gi, 'secret=***')
    .replace(/bearer\s+[\w.-]+/gi, 'bearer ***')
    .replace(/x-api-key\s*[=:]\s*["']?[\w-]+["']?/gi, 'x-api-key=***')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email_redacted]');
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

  const seen = new WeakSet();
  const walk = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (seen.has(obj as object)) return '[Circular]';
    seen.add(obj as object);

    if (Array.isArray(obj)) {
      return obj.map(item => walk(item));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 200) {
        result[key] = value.substring(0, 200) + '...';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = walk(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return walk(context) as Record<string, unknown>;
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
