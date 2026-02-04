/**
 * AuthCallback - Handles OAuth callback from Supabase Auth
 *
 * This component is rendered when users are redirected back from
 * OAuth providers (Twitter, Google, Discord, etc.) or after
 * clicking magic link / password reset emails.
 *
 * Route: /auth/callback
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SupabaseAuthService } from '../../services/auth/SupabaseAuthService';
import { Logger } from '../../services/system/Logger';

interface AuthCallbackProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type CallbackStatus = 'processing' | 'success' | 'error';

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onSuccess, onError }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Helper to safely get translation string
  const getText = useCallback(
    (key: string, fallback: string): string => {
      const val = t(key);
      return Array.isArray(val) ? (val[0] ?? fallback) : val;
    },
    [t]
  );

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL for any error parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);

        // Check for errors in URL
        const error = hashParams.get('error') ?? searchParams.get('error');
        const errorDescription =
          hashParams.get('error_description') ?? searchParams.get('error_description');

        if (error) {
          Logger.error('[AuthCallback] OAuth error:', { error, errorDescription });
          setStatus('error');
          setMessage(getText('common.auth.callback.login_failed', 'Login failed'));
          setErrorDetails(errorDescription ?? error);
          onError?.(errorDescription ?? error);
          return;
        }

        // Check for access token (OAuth success)
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          // Token-based callback (magic link, password reset)
          Logger.info('[AuthCallback] Token received, verifying session...');
          setMessage(
            getText('common.auth.callback.session_verifying', 'Verifying session...')
          );

          // Supabase client should automatically pick up the session
          const session = await SupabaseAuthService.getSession();

          if (session) {
            Logger.info('[AuthCallback] Session verified successfully');
            setMessage(
              getText('common.auth.callback.preparing_profile', 'Preparing profile...')
            );

            // Initialize or create player profile
            const { ProfileService } =
              await import('../../services/auth/ProfileService');
            const profileResult = await ProfileService.getInstance().initialize();

            if (profileResult.isValid) {
              Logger.info(
                '[AuthCallback] Profile ready:',
                profileResult.profile?.displayName
              );
              setStatus('success');
              setMessage(
                getText(
                  'common.auth.callback.login_success',
                  'Login successful! Redirecting...'
                )
              );
            } else if (profileResult.needsNickname) {
              Logger.info('[AuthCallback] Profile needs nickname setup');
              setStatus('success');
              setMessage(
                getText(
                  'common.auth.callback.welcome',
                  'Welcome! Profile will be created...'
                )
              );
            } else {
              Logger.warn(
                '[AuthCallback] Profile initialization issue:',
                profileResult.error
              );
              // Continue anyway, profile can be created later
              setStatus('success');
              setMessage(
                getText('common.auth.callback.login_success', 'Login successful!')
              );
            }

            // Check if this is a password reset
            const type = hashParams.get('type');
            if (type === 'recovery') {
              setMessage(
                getText(
                  'common.auth.callback.password_reset',
                  'Password reset verified. You can set a new password.'
                )
              );
              // Redirect to password reset page
              setTimeout(() => {
                window.location.href = '/auth/reset-password';
              }, 1500);
              return;
            }

            onSuccess?.();

            // Redirect to home after short delay
            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          } else {
            throw new Error('Session verification failed');
          }
        } else {
          // No token in URL - check for existing session (OAuth redirect)
          Logger.info('[AuthCallback] Checking for OAuth session...');
          setMessage(
            getText('common.auth.callback.checking_oauth', 'Checking OAuth session...')
          );

          // Wait a moment for Supabase to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 500));

          const session = await SupabaseAuthService.getSession();

          if (session) {
            Logger.info('[AuthCallback] OAuth session found');
            setMessage(
              getText('common.auth.callback.preparing_profile', 'Preparing profile...')
            );

            // Initialize or create player profile
            const { ProfileService } =
              await import('../../services/auth/ProfileService');
            const profileResult = await ProfileService.getInstance().initialize();

            if (profileResult.isValid) {
              Logger.info(
                '[AuthCallback] Profile ready:',
                profileResult.profile?.displayName
              );
            } else if (profileResult.needsNickname) {
              Logger.info('[AuthCallback] New user - profile will be created');
            }

            setStatus('success');
            setMessage(
              getText(
                'common.auth.callback.login_success',
                'Login successful! Redirecting...'
              )
            );
            onSuccess?.();

            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          } else {
            // No session found - might be an error or expired callback
            Logger.warn('[AuthCallback] No session found after OAuth callback');
            setStatus('error');
            setMessage(
              getText('common.auth.callback.session_not_found', 'Session not found')
            );
            setErrorDetails(
              getText(
                'common.auth.callback.oauth_incomplete',
                'OAuth process could not be completed. Please try again.'
              )
            );
            onError?.('No session found');
          }
        }
      } catch (err) {
        Logger.error('[AuthCallback] Exception:', err);
        setStatus('error');
        setMessage(getText('common.auth.callback.error_occurred', 'An error occurred'));
        setErrorDetails(
          err instanceof Error
            ? err.message
            : getText('common.auth.errors.generic_error', 'Unknown error')
        );
        onError?.(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    void handleCallback();
  }, [onSuccess, onError, getText]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#fff',
        fontFamily: "'Exo 2', sans-serif",
        padding: '2rem',
      }}
    >
      {/* Logo/Brand */}
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          background: 'linear-gradient(90deg, #f7931a, #ff6b6b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        CRYPTO SURVIVORS
      </div>

      {/* Status Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          padding: '2rem 3rem',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {status === 'processing' && '🔄'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>

        {/* Status Message */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color:
              status === 'error'
                ? '#ff6b6b'
                : status === 'success'
                  ? '#4ade80'
                  : '#fff',
          }}
        >
          {message}
        </h2>

        {/* Error Details */}
        {errorDetails && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '0.5rem',
            }}
          >
            {errorDetails}
          </p>
        )}

        {/* Loading Spinner */}
        {status === 'processing' && (
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#f7931a',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        )}

        {/* Retry Button */}
        {status === 'error' && (
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 2rem',
              background: 'linear-gradient(90deg, #f7931a, #ff6b6b)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(247, 147, 26, 0.4)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {getText('common.auth.callback.return_home', 'Return to Home')}
          </button>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
