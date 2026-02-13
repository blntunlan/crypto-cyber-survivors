/**
 * Error System - Type-safe error handling patterns
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: unknown;
  isRetryable: boolean;
}

/**
 * Result Pattern - Type-safe success/failure return
 */
export type Result<T, E = AppError> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Helper to create Success result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper to create Failure result
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Base Domain Error Class
 */
export class DomainError extends Error implements AppError {
  constructor(
    public code: string,
    public message: string,
    public severity: ErrorSeverity = 'medium',
    public isRetryable: boolean = false,
    public context?: Record<string, unknown>,
    public originalError?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toReportObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      name: this.name,
      stack: this.stack,
    };
  }
}

/**
 * Specialized Error Types
 */

export class DatabaseError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>, original?: unknown) {
    super('DATABASE_ERROR', message, 'high', true, context, original);
  }
}

export class NetworkError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>, original?: unknown) {
    super('NETWORK_ERROR', message, 'medium', true, context, original);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 'low', false, context);
  }
}

export class AuthError extends DomainError {
  constructor(
    message: string,
    severity: ErrorSeverity = 'high',
    context?: Record<string, unknown>
  ) {
    super('AUTH_ERROR', message, severity, false, context);
  }
}
