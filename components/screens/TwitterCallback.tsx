/**
 * TwitterCallback - Handle Twitter OAuth callback
 *
 * This component processes the OAuth redirect from Twitter,
 * exchanges the code for tokens, and redirects back to the app.
 */

import React, { useEffect, useState } from 'react';
import { TwitterAuthService } from '../../services/auth/TwitterAuthService';
import { Logger } from '../../services/system/Logger';

interface TwitterCallbackProps {
  /** Where to redirect after successful auth */
  successRedirect?: string;
  /** Where to redirect after failed auth */
  errorRedirect?: string;
}

export const TwitterCallback: React.FC<TwitterCallbackProps> = ({
  successRedirect = '/',
  errorRedirect = '/',
}) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );
  const [message, setMessage] = useState('Connecting to Twitter...');

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const processCallback = async () => {
      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Handle Twitter errors
      if (error) {
        Logger.error('[TwitterCallback] OAuth error:', error, { errorDescription });
        setStatus('error');
        setMessage(errorDescription ?? error);

        // Redirect after delay
        redirectTimer = setTimeout(() => {
          window.location.href = `${errorRedirect}?twitter_error=${encodeURIComponent(errorDescription ?? error)}`;
        }, 2000);
        return;
      }

      // Validate required params
      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization parameters');
        redirectTimer = setTimeout(() => {
          window.location.href = `${errorRedirect}?twitter_error=missing_params`;
        }, 2000);
        return;
      }

      // Initialize service and process callback
      TwitterAuthService.initialize();
      setMessage('Verifying authentication...');

      const result = await TwitterAuthService.handleCallback(code, state);

      if (result.success) {
        setStatus('success');
        setMessage('Twitter connected successfully!');
        redirectTimer = setTimeout(() => {
          window.location.href = `${successRedirect}?twitter_linked=true`;
        }, 1500);
      } else {
        setStatus('error');
        setMessage(result.error ?? 'Failed to connect Twitter');
        redirectTimer = setTimeout(() => {
          window.location.href = `${errorRedirect}?twitter_error=${encodeURIComponent(result.error ?? 'unknown')}`;
        }, 2000);
      }
    };

    void processCallback();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [successRedirect, errorRedirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="mx-4 w-full max-w-md rounded-sm border border-gray-700 bg-gray-800 p-8 text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
          )}
          {status === 'success' && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        {/* X (Twitter) Logo */}
        <div className="mb-4">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto h-8 w-8 text-white"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* Message */}
        <h2
          className={`mb-2 text-xl font-bold ${
            status === 'success'
              ? 'text-green-400'
              : status === 'error'
                ? 'text-red-400'
                : 'text-white'
          }`}
        >
          {status === 'processing' && 'Connecting...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Connection Failed'}
        </h2>
        <p className="text-gray-400">{message}</p>

        {/* Redirect notice */}
        {status !== 'processing' && (
          <p className="mt-4 text-sm text-gray-500">
            Redirecting you back to the game...
          </p>
        )}
      </div>
    </div>
  );
};

export default TwitterCallback;
