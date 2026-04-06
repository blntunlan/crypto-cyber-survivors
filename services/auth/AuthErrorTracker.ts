import { Logger } from '../system/Logger';

/**
 * Auth-specific error tracking that integrates with the global ErrorTracker.
 * Uses lazy import to avoid circular dependencies with ErrorTracker singleton.
 */
export class AuthErrorTracker {
  private static instance: AuthErrorTracker | null = null;

  static getInstance(): AuthErrorTracker {
    return (AuthErrorTracker.instance ??= new AuthErrorTracker());
  }

  /** Track a failed auth attempt */
  trackAuthFailure(provider: string, errorMessage: string, stage: string): void {
    void this.capture('auth_failure', {
      provider,
      errorMessage,
      stage,
      severity: 'medium' as const,
    });
  }

  /** Track a successful auth event */
  trackAuthSuccess(provider: string, stage: string): void {
    void this.capture('auth_success', {
      provider,
      stage,
      severity: 'low' as const,
    });
  }

  /** Track JWT token refresh events */
  trackTokenRefresh(success: boolean, errorMessage?: string): void {
    void this.capture('token_refresh', {
      success,
      errorMessage,
      severity: success ? ('low' as const) : ('high' as const),
    });
  }

  /** Track OAuth provider link/unlink */
  trackProviderAction(
    action: 'link' | 'unlink',
    provider: string,
    success: boolean
  ): void {
    void this.capture('provider_action', {
      action,
      provider,
      success,
      severity: 'low' as const,
    });
  }

  private async capture(
    errorType: string,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      const { default: errorTracker } = await import('../analytics/ErrorTracker');
      void errorTracker.captureError({
        errorType: `Auth_${errorType}`,
        errorMessage: `[Auth] ${errorType}`,
        category: 'auth',
        severity: context.severity as 'low' | 'medium' | 'high',
        context,
        tags: ['auth', errorType],
      });
    } catch {
      Logger.error(`[AuthErrorTracker] Failed to capture ${errorType}`);
    }
  }

  static reset(): void {
    AuthErrorTracker.instance = null;
  }
}
