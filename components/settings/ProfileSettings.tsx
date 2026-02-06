/**
 * ProfileSettings - User profile management component
 *
 * Features:
 * - Display name editing
 * - Avatar display (OAuth providers)
 * - Linked providers management
 * - Account upgrade (nickname → OAuth)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Edit2,
  Save,
  X,
  Link,
  Unlink,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedText } from '../themed/ThemedText';
import { UserAvatar } from '../ui/UserAvatar';
import {
  SupabaseAuthService,
  type AuthProvider,
  type ProfileData,
} from '../../services/auth/SupabaseAuthService';
import { Logger } from '../../services/system/Logger';

// ============================================
// Types
// ============================================

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (profile: ProfileData) => void;
}

const OAUTH_PROVIDERS: {
  id: AuthProvider;
  name: string;
  icon: string;
  color: string;
}[] = [
  { id: 'google', name: 'Google', icon: '🔍', color: '#4285F4' },
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: '#000000' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2' },
  { id: 'github', name: 'GitHub', icon: '🐙', color: '#333333' },
];

// ============================================
// Component
// ============================================

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  isOpen,
  onClose,
  onProfileUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <ThemedPanel className="relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-cyan-400" />
                <ThemedText variant="h2" className="text-lg font-bold">
                  Profile Settings
                </ThemedText>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ProfileSettingsContent onProfileUpdate={onProfileUpdate} />
          </ThemedPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ProfileSettingsContent: React.FC<{
  onProfileUpdate?: (profile: ProfileData) => void;
}> = ({ onProfileUpdate }) => {
  const { isRetro } = useTheme();
  const { t } = useLanguage();

  // State
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Linked providers
  const [linkedProviders, setLinkedProviders] = useState<AuthProvider[]>([]);
  const [linkingProvider, setLinkingProvider] = useState<AuthProvider | null>(null);

  // Load profile on mount
  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await SupabaseAuthService.getCurrentProfile();

      if (result) {
        setProfile(result);
        setNewDisplayName(result.displayName);

        // Get linked providers
        const providers = await SupabaseAuthService.getLinkedProviders();
        setLinkedProviders(providers);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      Logger.error('[ProfileSettings] Load error:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!profile || !newDisplayName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await SupabaseAuthService.updateProfileWithAuth({
        displayName: newDisplayName.trim(),
      });

      if (result.success && result.profile) {
        setProfile(result.profile);
        setIsEditingName(false);
        setSuccessMessage('Display name updated!');
        onProfileUpdate?.(result.profile);

        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error ?? 'Failed to update');
      }
    } catch (err) {
      Logger.error('[ProfileSettings] Save name error:', err);
      setError('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkProvider = async (provider: AuthProvider) => {
    setLinkingProvider(provider);
    setError(null);

    try {
      const result = await SupabaseAuthService.linkOAuthProvider(provider);

      if (!result.success) {
        setError(result.error ?? 'Failed to link provider');
      }
      // OAuth will redirect, so no need to update state here
    } catch (err) {
      Logger.error('[ProfileSettings] Link provider error:', err);
      setError('An error occurred');
      setLinkingProvider(null);
    }
  };

  const handleUnlinkProvider = async (provider: AuthProvider) => {
    if (linkedProviders.length <= 1) {
      setError('Cannot unlink your only login method');
      return;
    }

    setLinkingProvider(provider);
    setError(null);

    try {
      const result = await SupabaseAuthService.unlinkProvider(provider);

      if (result.success) {
        setLinkedProviders(prev => prev.filter(p => p !== provider));
        setSuccessMessage(`${provider} unlinked`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error ?? 'Failed to unlink provider');
      }
    } catch (err) {
      Logger.error('[ProfileSettings] Unlink provider error:', err);
      setError('An error occurred');
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : profile ? (
        <>
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              size="xl"
              provider={profile.primaryAuthProvider as AuthProvider}
              showProviderBadge
            />
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    maxLength={16}
                    className={`flex-1 rounded-lg border bg-black/30 px-3 py-2 text-white transition-colors ${
                      isRetro ? 'border-yellow-500/50 font-mono' : 'border-cyan-500/50'
                    } focus:border-cyan-400 focus:outline-none`}
                    autoFocus
                  />
                  <button
                    onClick={() => void handleSaveName()}
                    disabled={isSaving || !newDisplayName.trim()}
                    className="rounded-lg bg-cyan-500 p-2 text-white transition-colors hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setNewDisplayName(profile.displayName);
                    }}
                    className="rounded-lg bg-slate-700 p-2 text-white transition-colors hover:bg-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ThemedText variant="h1" className="text-xl font-bold">
                    {profile.displayName}
                  </ThemedText>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-400"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Email & verification status */}
              {profile.email && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-400">{profile.email}</span>
                  {profile.emailVerified ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      Not verified
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>Level {profile.level}</span>
                <span>•</span>
                <span>{profile.xp.toLocaleString()} XP</span>
                {profile.isTester && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400">Tester</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Linked Providers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              <ThemedText
                variant="h2"
                className="text-sm font-semibold uppercase tracking-wide"
              >
                {t('settings.linked_accounts') ?? 'Linked Accounts'}
              </ThemedText>
            </div>

            <div className="grid gap-2">
              {OAUTH_PROVIDERS.map(provider => {
                const isLinked = linkedProviders.includes(provider.id);
                const isLinking = linkingProvider === provider.id;

                return (
                  <div
                    key={provider.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      isLinked
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{provider.icon}</span>
                      <span className="font-medium text-white">{provider.name}</span>
                      {isLinked && <CheckCircle className="h-4 w-4 text-green-400" />}
                    </div>

                    <button
                      onClick={() => {
                        if (isLinked) {
                          void handleUnlinkProvider(provider.id);
                        } else {
                          void handleLinkProvider(provider.id);
                        }
                      }}
                      disabled={isLinking}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isLinked
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                      } disabled:opacity-50`}
                    >
                      {isLinking ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : isLinked ? (
                        <>
                          <Unlink className="h-4 w-4" />
                          Unlink
                        </>
                      ) : (
                        <>
                          <Link className="h-4 w-4" />
                          Link
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 rounded-lg bg-red-500/20 p-3 text-red-400"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 rounded-lg bg-green-500/20 p-3 text-green-400"
              >
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="py-8 text-center text-slate-400">Failed to load profile</div>
      )}
    </div>
  );
};

export default ProfileSettings;
