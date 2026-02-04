/**
 * TwitterLoginButton - Connect Twitter account to player profile
 *
 * Uses OAuth 2.0 PKCE flow for secure authentication.
 * Displays linked account info when already connected.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TwitterAuthService } from '../../services/auth/TwitterAuthService';
import { EventBus } from '../../services/core/EventBus';

interface TwitterLoginButtonProps {
  /** Compact mode for smaller UI layouts */
  compact?: boolean;
  /** Called when Twitter is successfully linked */
  onLinked?: (username: string) => void;
  /** Called when Twitter is unlinked */
  onUnlinked?: () => void;
  /** Custom class name */
  className?: string;
}

interface LinkedProfile {
  username: string;
  name: string;
  profileImageUrl?: string;
}

export const TwitterLoginButton: React.FC<TwitterLoginButtonProps> = ({
  compact = false,
  onLinked,
  onUnlinked,
  className = '',
}) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [linkedProfile, setLinkedProfile] = useState<LinkedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check Twitter configuration and linked status
  const checkStatus = useCallback(async () => {
    TwitterAuthService.initialize();
    const configured = TwitterAuthService.isConfigured();
    setIsConfigured(configured);

    if (configured) {
      const hasLinked = await TwitterAuthService.hasTwitterLinked();
      setIsLinked(hasLinked);

      if (hasLinked) {
        const profile = await TwitterAuthService.getLinkedTwitterProfile();
        setLinkedProfile(profile);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void checkStatus();

    // Listen for auth events
    const unsubSuccess = EventBus.on('twitterLoginSuccess', data => {
      setIsLinked(true);
      setLinkedProfile({
        username: data.username,
        name: data.displayName,
      });
      onLinked?.(data.username);
    });

    const unsubUnlinked = EventBus.on('twitterUnlinked', () => {
      setIsLinked(false);
      setLinkedProfile(null);
      onUnlinked?.();
    });

    return () => {
      unsubSuccess();
      unsubUnlinked();
    };
  }, [checkStatus, onLinked, onUnlinked]);

  // Handle connect button click
  const handleConnect = async () => {
    setError(null);
    try {
      await TwitterAuthService.startAuthFlow();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    setError(null);
    setIsLoading(true);
    const result = await TwitterAuthService.unlinkTwitter();
    if (!result.success) {
      setError(result.error ?? 'Failed to unlink Twitter');
    }
    setIsLoading(false);
  };

  // Not configured - don't render
  if (!isConfigured) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  // Twitter/X brand colors
  const twitterBlue = 'rgb(29, 155, 240)';
  const twitterBlack = '#000000';

  // Linked state - show profile info
  if (isLinked && linkedProfile) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {linkedProfile.profileImageUrl && !compact && (
          <img
            src={linkedProfile.profileImageUrl}
            alt={linkedProfile.name}
            className="h-8 w-8 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            @{linkedProfile.username}
          </span>
          {!compact && (
            <button
              onClick={() => {
                void handleDisconnect();
              }}
              className="text-left text-xs text-gray-400 transition-colors hover:text-red-400"
            >
              Disconnect
            </button>
          )}
        </div>
        {compact && (
          <button
            onClick={() => {
              void handleDisconnect();
            }}
            className="ml-2 text-xs text-gray-400 transition-colors hover:text-red-400"
            title="Disconnect Twitter"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Not linked - show connect button
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <motion.button
        onClick={() => {
          void handleConnect();
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center justify-center gap-2 
          rounded-lg px-4 py-2 font-medium
          transition-colors duration-200
          ${compact ? 'text-sm' : 'text-base'}
        `}
        style={{
          backgroundColor: twitterBlack,
          color: 'white',
          border: `1px solid ${twitterBlue}`,
        }}
      >
        {/* X (Twitter) Logo */}
        <svg
          viewBox="0 0 24 24"
          className={compact ? 'h-4 w-4' : 'h-5 w-5'}
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>{compact ? 'Connect X' : 'Connect with X'}</span>
      </motion.button>

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default TwitterLoginButton;
