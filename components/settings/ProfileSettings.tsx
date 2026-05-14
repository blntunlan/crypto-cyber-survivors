/**
 * ProfileSettings - User profile management component
 *
 * Features:
 * - Display name editing
 * - Avatar display (OAuth providers)
 */

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import {
  User,
  Edit2,
  Save,
  X,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
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

type ProfileSettingsUiState = {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  isEditingName: boolean;
  newDisplayName: string;
  isSaving: boolean;
};

type ProfileSettingsUiAction =
  | { type: 'loadStart' }
  | { type: 'loadSuccess'; payload: { newDisplayName: string } }
  | { type: 'loadEnd' }
  | { type: 'setError'; payload: string | null }
  | { type: 'setSuccessMessage'; payload: string | null }
  | { type: 'setEditingName'; payload: boolean }
  | { type: 'setNewDisplayName'; payload: string }
  | { type: 'saveStart' }
  | { type: 'saveEnd' };

const INITIAL_PROFILE_SETTINGS_UI_STATE: ProfileSettingsUiState = {
  isLoading: true,
  error: null,
  successMessage: null,
  isEditingName: false,
  newDisplayName: '',
  isSaving: false,
};

function profileSettingsUiReducer(
  state: ProfileSettingsUiState,
  action: ProfileSettingsUiAction
): ProfileSettingsUiState {
  switch (action.type) {
    case 'loadStart':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'loadSuccess':
      return {
        ...state,
        error: null,
        newDisplayName: action.payload.newDisplayName,
      };
    case 'loadEnd':
      return {
        ...state,
        isLoading: false,
      };
    case 'setError':
      return {
        ...state,
        error: action.payload,
      };
    case 'setSuccessMessage':
      return {
        ...state,
        successMessage: action.payload,
      };
    case 'setEditingName':
      return {
        ...state,
        isEditingName: action.payload,
      };
    case 'setNewDisplayName':
      return {
        ...state,
        newDisplayName: action.payload,
      };
    case 'saveStart':
      return {
        ...state,
        isSaving: true,
        error: null,
      };
    case 'saveEnd':
      return {
        ...state,
        isSaving: false,
      };
    default:
      return state;
  }
}

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
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        <m.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
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
          </m.div>
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
};

const ProfileHeader: React.FC<{
  profile: ProfileData;
  isEditingName: boolean;
  newDisplayName: string;
  isSaving: boolean;
  isRetro: boolean;
  onDisplayNameChange: (value: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
}> = ({
  profile,
  isEditingName,
  newDisplayName,
  isSaving,
  isRetro,
  onDisplayNameChange,
  onSaveName,
  onCancelEdit,
  onStartEdit,
}) => (
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
            onChange={e => onDisplayNameChange(e.target.value)}
            maxLength={16}
            className={`flex-1 rounded-lg border bg-black/30 px-3 py-2 text-white transition-colors ${
              isRetro ? 'border-yellow-500/50 font-mono' : 'border-cyan-500/50'
            } focus:border-cyan-400 focus:outline-none`}
          />
          <button
            onClick={onSaveName}
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
            onClick={onCancelEdit}
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
            onClick={onStartEdit}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-400"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      )}

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
);

const ProfileMessages: React.FC<{
  error: string | null;
  successMessage: string | null;
}> = ({ error, successMessage }) => (
  <AnimatePresence>
    {error && (
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 rounded-lg bg-red-500/20 p-3 text-red-400"
      >
        <AlertCircle className="h-4 w-4" />
        {error}
      </m.div>
    )}

    {successMessage && (
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 rounded-lg bg-green-500/20 p-3 text-green-400"
      >
        <CheckCircle className="h-4 w-4" />
        {successMessage}
      </m.div>
    )}
  </AnimatePresence>
);

export const ProfileSettingsContent: React.FC<{
  onProfileUpdate?: (profile: ProfileData) => void;
}> = ({ onProfileUpdate }) => {
  const { isRetro } = useTheme();

  // State
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [uiState, dispatch] = useReducer(
    profileSettingsUiReducer,
    INITIAL_PROFILE_SETTINGS_UI_STATE
  );
  const { isLoading, error, successMessage, isEditingName, newDisplayName, isSaving } =
    uiState;

  // Track success message timers for cleanup
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Load profile on mount
  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    dispatch({ type: 'loadStart' });

    try {
      const result = await SupabaseAuthService.getCurrentProfile();

      if (result) {
        setProfile(result);
        dispatch({
          type: 'loadSuccess',
          payload: {
            newDisplayName: result.displayName,
          },
        });
      } else {
        dispatch({ type: 'setError', payload: 'Failed to load profile' });
      }
    } catch (err) {
      Logger.error('[ProfileSettings] Load error:', err);
      dispatch({ type: 'setError', payload: 'An error occurred' });
    } finally {
      dispatch({ type: 'loadEnd' });
    }
  };

  const handleSaveName = async () => {
    if (!profile || !newDisplayName.trim()) return;

    dispatch({ type: 'saveStart' });

    try {
      const result = await SupabaseAuthService.updateProfileWithAuth({
        displayName: newDisplayName.trim(),
      });

      if (result.success && result.profile) {
        setProfile(result.profile);
        dispatch({ type: 'setEditingName', payload: false });
        dispatch({ type: 'setSuccessMessage', payload: 'Display name updated!' });
        onProfileUpdate?.(result.profile);

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(
          () => dispatch({ type: 'setSuccessMessage', payload: null }),
          3000
        );
      } else {
        dispatch({ type: 'setError', payload: result.error ?? 'Failed to update' });
      }
    } catch (err) {
      Logger.error('[ProfileSettings] Save name error:', err);
      dispatch({ type: 'setError', payload: 'An error occurred' });
    } finally {
      dispatch({ type: 'saveEnd' });
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
          <ProfileHeader
            profile={profile}
            isEditingName={isEditingName}
            newDisplayName={newDisplayName}
            isSaving={isSaving}
            isRetro={isRetro}
            onDisplayNameChange={value =>
              dispatch({ type: 'setNewDisplayName', payload: value })
            }
            onSaveName={() => void handleSaveName()}
            onCancelEdit={() => {
              dispatch({ type: 'setEditingName', payload: false });
              dispatch({
                type: 'setNewDisplayName',
                payload: profile.displayName,
              });
            }}
            onStartEdit={() => dispatch({ type: 'setEditingName', payload: true })}
          />

          <ProfileMessages error={error} successMessage={successMessage} />
        </>
      ) : (
        <div className="py-8 text-center text-slate-400">Failed to load profile</div>
      )}
    </div>
  );
};

export default ProfileSettings;
