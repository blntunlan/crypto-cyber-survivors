import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { useUser } from '../../contexts/useUser';
import { NicknameValidator } from '../../services/auth/NicknameValidator';
import { audio } from '../../services/audio';
import {
  User,
  Shield,
  Zap,
  ChevronRight,
  AlertCircle,
  Ghost,
  Mail,
  Lock,
  ArrowLeft,
  KeyRound,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { Logger } from '../../services/system/Logger';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedInput } from '../themed/ThemedInput';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedText } from '../themed/ThemedText';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  SupabaseAuthService,
  type AuthProvider,
} from '../../services/auth/SupabaseAuthService';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';
import { UserPersistenceService } from '../../services/auth/UserPersistenceService';
import type { Session } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface NicknameEntryScreenProps {
  onComplete: (nickname: string) => void;
}

type AuthMode =
  | 'signIn'
  | 'signUp'
  | 'otpEmail'
  | 'otpVerify'
  | 'forgotPassword'
  | 'nicknameSetup';

// ============================================
// PWA Detection
// ============================================

function getIsPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// ============================================
// Memoized Background (NEVER re-renders on keystroke)
// ============================================

const BackgroundEffects = memo(function BackgroundEffects({
  isRetro,
}: {
  isRetro: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {!isRetro && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.1),transparent_50%)]" />
        </>
      )}
      <div
        className={`absolute inset-0 ${isRetro ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}
        style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
          backgroundSize: isRetro ? '25px 25px' : '50px 50px',
        }}
      />
      <motion.div
        className={`absolute left-0 right-0 h-[2px] ${isRetro ? 'bg-white/10' : 'bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent'}`}
        animate={{ top: ['0%', '100%'] }}
        transition={{
          duration: isRetro ? 4 : 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
});

// ============================================
// Memoized Corner Decorations
// ============================================

const CornerDecorations = memo(function CornerDecorations() {
  return (
    <>
      <div className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 rounded-tl-lg border-l-2 border-t-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      <div className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-tr-lg border-r-2 border-t-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      <div className="pointer-events-none absolute -bottom-3 -left-3 h-10 w-10 rounded-bl-lg border-b-2 border-l-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
      <div className="pointer-events-none absolute -bottom-3 -right-3 h-10 w-10 rounded-br-lg border-b-2 border-r-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
    </>
  );
});

// ============================================
// Memoized Panel Chrome (animated border + glow)
// ============================================

const PanelChrome = memo(function PanelChrome({ isRetro }: { isRetro: boolean }) {
  if (isRetro) return null;
  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="pointer-events-none absolute -inset-1 rounded-sm bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-cyan-500/10 opacity-50 blur-xl sm:opacity-60" />
    </>
  );
});

// ============================================
// Memoized Header Icon
// ============================================

const HeaderIcon = memo(function HeaderIcon({
  isRetro,
  children,
}: {
  isRetro: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`inline-flex p-4 ${isRetro ? 'rounded-none border-2 border-cyan-400 bg-zinc-900 shadow-[4px_4px_0px_rgba(0,0,0,0.8)]' : 'relative rounded-full border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-purple-500/10'}`}
      animate={{
        boxShadow: isRetro
          ? undefined
          : [
              '0 0 20px rgba(34,211,238,0.2)',
              '0 0 40px rgba(34,211,238,0.3)',
              '0 0 20px rgba(34,211,238,0.2)',
            ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
});

// ============================================
// Memoized Footer
// ============================================

const AuthFooter = memo(function AuthFooter() {
  const { t } = useLanguage();
  return (
    <footer className="mt-6 flex items-center justify-between border-t border-slate-700/30 pt-4 text-[9px] text-slate-500">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>{t('auth.footer_systems_online')}</span>
      </div>
      <span>{t('auth.footer_title')}</span>
    </footer>
  );
});

// ============================================
// Main Component
// ============================================

export const NicknameEntryScreen: React.FC<NicknameEntryScreenProps> = ({
  onComplete,
}) => {
  const { isRetro } = useTheme();
  const { login } = useUser();
  const { t } = useLanguage();

  const isDevelopment = import.meta.env.DEV;
  const isPWA = useMemo(() => getIsPWA(), []);

  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>(
    isDevelopment ? 'nicknameSetup' : 'signIn'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const isPhantomInstalled = PhantomAuthService.isPhantomInstalled();

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    setIsMounted(true);
    const checkSession = async () => {
      const currentSession = await SupabaseAuthService.getSession();
      if (currentSession?.user) {
        setSession(currentSession);
        const meta = currentSession.user.user_metadata;
        const suggestedName = (meta.display_name ??
          meta.name ??
          meta.preferred_username ??
          '') as string;
        if (suggestedName) setNickname(suggestedName);
        setAuthMode('nicknameSetup');
      }
    };
    void checkSession();
  }, []);

  // ============================================
  // Helpers
  // ============================================

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const switchMode = useCallback(
    (mode: AuthMode) => {
      clearMessages();
      setAuthMode(mode);
    },
    [clearMessages]
  );

  // ============================================
  // Auth Handlers
  // ============================================

  const handleSignIn = useCallback(async () => {
    if (!email.includes('@')) {
      setError((t('auth.invalid_email') as string) || 'Please enter a valid email');
      audio.playHit();
      return;
    }
    if (password.length < 6) {
      setError(
        (t('auth.password_min') as string) || 'Password must be at least 6 characters'
      );
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    const result = await SupabaseAuthService.signIn({ email, password });
    setIsSubmitting(false);
    if (result.success && result.session) {
      setSession(result.session);
      audio.playLevelUp();
      const meta = result.user?.user_metadata;
      const suggestedName = (meta?.display_name ?? meta?.name ?? '') as string;
      if (suggestedName) setNickname(suggestedName);
      setAuthMode('nicknameSetup');
    } else {
      setError(result.error ?? 'Sign in failed');
      audio.playHit();
    }
  }, [email, password, clearMessages, t]);

  const handleSignUp = useCallback(async () => {
    if (!email.includes('@')) {
      setError((t('auth.invalid_email') as string) || 'Please enter a valid email');
      audio.playHit();
      return;
    }
    if (password.length < 6) {
      setError(
        (t('auth.password_min') as string) || 'Password must be at least 6 characters'
      );
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    const result = await SupabaseAuthService.signUp({
      email,
      password,
      displayName: email.split('@')[0],
    });
    setIsSubmitting(false);
    if (result.success) {
      if (result.needsEmailConfirmation) {
        setSuccessMessage(
          (t('auth.check_email') as string) || 'Check your email for verification'
        );
        audio.playLevelUp();
      } else if (result.session) {
        setSession(result.session);
        audio.playLevelUp();
        setAuthMode('nicknameSetup');
      }
    } else {
      setError(result.error ?? 'Sign up failed');
      audio.playHit();
    }
  }, [email, password, clearMessages, t]);

  const handleSendOtp = useCallback(async () => {
    if (!email.includes('@')) {
      setError((t('auth.invalid_email') as string) || 'Please enter a valid email');
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    const result = await SupabaseAuthService.sendOtpCode(email);
    setIsSubmitting(false);
    if (result.success) {
      setSuccessMessage(
        (t('auth.otp_sent') as string) || '6-digit code sent to your email'
      );
      audio.playLevelUp();
      setAuthMode('otpVerify');
    } else {
      setError(result.error ?? 'Failed to send code');
      audio.playHit();
    }
  }, [email, clearMessages, t]);

  const handleVerifyOtp = useCallback(async () => {
    if (!email.includes('@')) {
      setError((t('auth.invalid_email') as string) || 'Please enter a valid email');
      audio.playHit();
      return;
    }
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    const result = await SupabaseAuthService.verifyOtpCode(email, otpCode);
    setIsSubmitting(false);
    if (result.success && result.session) {
      setSession(result.session);
      audio.playLevelUp();
      const meta = result.user?.user_metadata;
      const suggestedName = (meta?.display_name ?? meta?.name ?? '') as string;
      if (suggestedName) setNickname(suggestedName);
      setAuthMode('nicknameSetup');
    } else {
      setError(result.error ?? 'Invalid or expired code');
      audio.playHit();
    }
  }, [email, otpCode, clearMessages, t]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.includes('@')) {
      setError((t('auth.invalid_email') as string) || 'Please enter a valid email');
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    const result = await SupabaseAuthService.resetPassword(email);
    setIsSubmitting(false);
    if (result.success) {
      setSuccessMessage('Password reset link sent to your email');
      audio.playLevelUp();
    } else {
      setError(result.error ?? 'Failed to send reset email');
      audio.playHit();
    }
  }, [email, clearMessages, t]);

  const handleOAuthSignIn = useCallback(
    async (provider: AuthProvider) => {
      setAuthLoading(provider);
      clearMessages();
      const result = await SupabaseAuthService.signInWithOAuth({ provider });
      if (!result.success) {
        setAuthLoading(null);
        setError(result.error ?? `${provider} sign in failed`);
        audio.playHit();
      }
    },
    [clearMessages]
  );

  const handleWalletConnect = useCallback(async () => {
    setAuthLoading('phantom');
    clearMessages();
    const result = await PhantomAuthService.authenticate();
    setAuthLoading(null);
    if (result.success && result.walletAddress) {
      audio.playLevelUp();
      onComplete(`Wallet_${result.walletAddress.slice(0, 6)}`);
    } else {
      setError(result.error ?? 'Wallet connection failed');
      audio.playHit();
    }
  }, [onComplete, clearMessages]);

  const handleNicknameSubmit = useCallback(async () => {
    if (isSubmitting) return;
    const validationError = NicknameValidator.validate(nickname);
    if (validationError) {
      setError(validationError);
      audio.playHit();
      return;
    }
    setIsSubmitting(true);
    clearMessages();
    try {
      let success = false;
      let errorMsg = '';
      if (session?.user) {
        const { ProfileService } = await import('../../services/auth/ProfileService');
        const profileResult = await ProfileService.getInstance().createProfile({
          userId: session.user.id,
          displayName: nickname,
          avatarUrl: session.user.user_metadata.avatar_url as string,
          email: session.user.email,
          emailVerified: !!session.user.email_confirmed_at,
          authProvider: session.user.app_metadata.provider ?? 'email',
        });
        if (profileResult.isValid && profileResult.profile) {
          UserPersistenceService.saveUser({
            profileId: profileResult.profile.id,
            nickname: profileResult.profile.displayName,
            createdAt: new Date(profileResult.profile.createdAt).getTime(),
            lastSeenAt: Date.now(),
          });
          success = true;
        } else {
          errorMsg = profileResult.error ?? 'Failed to create profile';
        }
      } else {
        const result = await login(nickname);
        success = result.success;
        const msg = result.error ?? t('common.nickname_screen.registration_failed');
        errorMsg = Array.isArray(msg) ? (msg[0] ?? 'Error') : msg;
      }
      if (success) {
        audio.playLevelUp();
        onComplete(nickname);
      } else {
        setError(Array.isArray(errorMsg) ? (errorMsg[0] ?? 'Error') : errorMsg);
        audio.playHit();
      }
    } catch (err) {
      Logger.error('[NicknameEntryScreen] Submission error:', err);
      const sysError = t('common.nickname_screen.system_error');
      setError(Array.isArray(sysError) ? (sysError[0] ?? 'System error') : sysError);
      audio.playHit();
    } finally {
      setIsSubmitting(false);
    }
  }, [nickname, session, isSubmitting, login, onComplete, clearMessages, t]);

  // ============================================
  // OAuth Providers (stable reference)
  // ============================================

  const oauthProviders: {
    id: AuthProvider;
    name: string;
    icon: React.ReactNode;
    color: string;
  }[] = useMemo(
    () => [
      {
        id: 'twitter' as AuthProvider,
        name: 'Twitter/X',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
          </svg>
        ),
        color: '#000000',
      },
      {
        id: 'google' as AuthProvider,
        name: 'Google',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        ),
        color: '#4285F4',
      },
      {
        id: 'discord' as AuthProvider,
        name: 'Discord',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        ),
        color: '#5865F2',
      },
      {
        id: 'github' as AuthProvider,
        name: 'GitHub',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        ),
        color: '#333333',
      },
    ],
    []
  );

  // ============================================
  // Mode config (stable)
  // ============================================

  const modeConfig = useMemo(
    () => ({
      signIn: {
        title: (t('auth.sign_in') as string) || 'Sign In',
        subtitle: 'Secure Authentication Required',
        icon: <LogIn className="h-7 w-7 text-cyan-400" />,
      },
      signUp: {
        title: (t('auth.sign_up') as string) || 'Create Account',
        subtitle: 'Join the Arena',
        icon: <UserPlus className="h-7 w-7 text-cyan-400" />,
      },
      otpEmail: {
        title: (t('auth.email_otp') as string) || 'Email Code',
        subtitle: 'PWA-Safe Authentication',
        icon: <KeyRound className="h-7 w-7 text-cyan-400" />,
      },
      otpVerify: {
        title: (t('auth.verify_otp') as string) || 'Verify Code',
        subtitle: 'Enter the 6-digit code',
        icon: <KeyRound className="h-7 w-7 text-cyan-400" />,
      },
      forgotPassword: {
        title: (t('auth.forgot_password') as string) || 'Reset Password',
        subtitle: 'Enter your email to reset',
        icon: <Lock className="h-7 w-7 text-cyan-400" />,
      },
      nicknameSetup: {
        title: `${(t('common.nickname_screen.title_identify') as string) || 'Identify'} `,
        titleHighlight:
          (t('common.nickname_screen.title_survivor') as string) || 'Survivor',
        subtitle: isDevelopment
          ? 'Beta Access Protocol v1.0'
          : 'Secure Authentication Required',
        icon: <User className="h-7 w-7 text-cyan-400" />,
      },
    }),
    [t, isDevelopment]
  );

  const currentMode = modeConfig[authMode];

  // ============================================
  // Input class (shared, stable)
  // ============================================

  const inputCls =
    'min-h-[48px] w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40';

  // ============================================
  // Render
  // ============================================

  if (!isMounted) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-mono sm:items-center sm:px-6"
      style={{ zIndex: 3300 }}
    >
      {/* Background — memo'd, never re-renders on input */}
      <BackgroundEffects isRetro={isRetro} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative my-auto w-full max-w-md py-6 sm:py-0"
      >
        {/* Corner decorations — memo'd */}
        {!isRetro && <CornerDecorations />}

        <ThemedPanel className="relative overflow-hidden p-5 transition-all sm:p-8">
          {/* Panel chrome — memo'd */}
          <PanelChrome isRetro={isRetro} />

          <div className="relative z-10">
            {/* Header */}
            <header className="mb-6 space-y-2 text-center sm:mb-8 sm:space-y-3">
              {authMode !== 'signIn' && authMode !== 'nicknameSetup' && (
                <button
                  onClick={() =>
                    switchMode(authMode === 'otpVerify' ? 'otpEmail' : 'signIn')
                  }
                  className="absolute left-5 top-5 flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 sm:left-8 sm:top-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{(t('auth.back_to_signin') as string) || 'Back'}</span>
                </button>
              )}

              <HeaderIcon isRetro={isRetro}>{currentMode.icon}</HeaderIcon>

              <ThemedText
                variant="h1"
                className={`text-2xl font-black uppercase tracking-tight ${isRetro ? 'text-white' : 'italic text-white'}`}
              >
                {currentMode.title}
                {'titleHighlight' in currentMode && (
                  <span
                    className={
                      isRetro
                        ? 'text-cyan-400'
                        : 'bg-gradient-to-r from-[var(--color-primary)] to-white bg-clip-text text-transparent'
                    }
                  >
                    {(currentMode as typeof modeConfig.nicknameSetup).titleHighlight}
                  </span>
                )}
              </ThemedText>

              <ThemedText
                variant="mono"
                className="text-[8px] uppercase tracking-[0.3em] text-slate-500"
              >
                {isPWA && authMode === 'signIn'
                  ? 'PWA Mode • No redirects needed'
                  : currentMode.subtitle}
              </ThemedText>
            </header>

            {/* Error / Success */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400"
                >
                  <Zap className="h-4 w-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========== FORMS ========== */}

            {/* ===== SIGN IN ===== */}
            {authMode === 'signIn' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="signin-email"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Mail className="h-3 w-3" /> {t('auth.email')}
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signin-password')?.focus();
                      }
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signin-password"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Lock className="h-3 w-3" /> {t('auth.password')}
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSignIn();
                      }
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </div>

                <ThemedButton
                  type="button"
                  intent="primary"
                  disabled={isSubmitting || !email || password.length < 6}
                  onClick={() => void handleSignIn()}
                  className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.signing_in')}</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>{(t('auth.sign_in') as string) || 'Sign In'}</span>
                    </>
                  )}
                </ThemedButton>

                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => switchMode('forgotPassword')}
                    className="text-xs text-slate-400 hover:text-cyan-400"
                  >
                    {(t('auth.forgot_password') as string) || 'Forgot Password?'}
                  </button>
                  <button
                    onClick={() => switchMode('otpEmail')}
                    className="text-xs text-slate-400 hover:text-cyan-400"
                  >
                    {(t('auth.email_otp') as string) || 'Use Email Code'}
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-xs text-slate-500">
                    {(t('auth.no_account') as string) || "Don't have an account?"}{' '}
                  </span>
                  <button
                    onClick={() => switchMode('signUp')}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    {(t('auth.sign_up') as string) || 'Create Account'}
                  </button>
                </div>

                {/* Divider */}
                <div className="my-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    {(t('auth.or_continue_with') as string) || 'Or continue with'}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                </div>

                {/* OAuth Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {oauthProviders.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => void handleOAuthSignIn(provider.id)}
                      disabled={authLoading !== null || isSubmitting}
                      className={`flex items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm text-white hover:border-cyan-500/50 ${authLoading === provider.id ? 'opacity-50' : ''}`}
                    >
                      {provider.icon}
                      <span className="hidden sm:inline">{provider.name}</span>
                    </button>
                  ))}
                </div>

                {/* Phantom Wallet */}
                <button
                  onClick={() =>
                    isPhantomInstalled
                      ? void handleWalletConnect()
                      : PhantomAuthService.openPhantomDownload()
                  }
                  disabled={authLoading !== null || isSubmitting}
                  className="mt-1 flex w-full items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 text-sm font-semibold text-white hover:shadow-lg disabled:opacity-50"
                >
                  <Ghost className="h-5 w-5" />
                  <span>
                    {isPhantomInstalled
                      ? t('auth.connect_phantom')
                      : t('auth.install_phantom')}
                  </span>
                </button>
              </div>
            )}

            {/* ===== SIGN UP ===== */}
            {authMode === 'signUp' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-email"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Mail className="h-3 w-3" /> {t('auth.email')}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('signup-password')?.focus();
                      }
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-password"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Lock className="h-3 w-3" /> {t('auth.password')}
                    <span className="text-[8px] font-normal text-slate-500">
                      (min 6 chars)
                    </span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSignUp();
                      }
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>

                <ThemedButton
                  type="button"
                  intent="primary"
                  disabled={isSubmitting || !email || password.length < 6}
                  onClick={() => void handleSignUp()}
                  className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.creating_account')}</span>
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>{(t('auth.sign_up') as string) || 'Create Account'}</span>
                    </>
                  )}
                </ThemedButton>

                <div className="text-center">
                  <span className="text-xs text-slate-500">
                    {(t('auth.has_account') as string) ||
                      'Already have an account?'}{' '}
                  </span>
                  <button
                    onClick={() => switchMode('signIn')}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    {(t('auth.sign_in') as string) || 'Sign In'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== OTP EMAIL ===== */}
            {authMode === 'otpEmail' && (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">
                  {isPWA
                    ? 'A 6-digit code will be sent to your email. No redirects needed.'
                    : 'A 6-digit code will be sent to your email for verification.'}
                </p>
                <div className="space-y-1.5">
                  <label
                    htmlFor="otp-email"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <input
                    id="otp-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSendOtp();
                      }
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <ThemedButton
                  type="button"
                  intent="primary"
                  disabled={isSubmitting || !email.includes('@')}
                  onClick={() => void handleSendOtp()}
                  className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>{(t('auth.send_otp') as string) || 'Send Code'}</span>
                    </>
                  )}
                </ThemedButton>
              </div>
            )}

            {/* ===== OTP VERIFY ===== */}
            {authMode === 'otpVerify' && (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">
                  {t('auth.otp_verify_desc')}{' '}
                  <span className="font-bold text-cyan-400">{email}</span>
                </p>
                <div className="space-y-1.5">
                  <label
                    htmlFor="otp-verify-email"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Mail className="h-3 w-3" /> {t('auth.email')}
                  </label>
                  <input
                    id="otp-verify-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => e.stopPropagation()}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="otp-code"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <KeyRound className="h-3 w-3" /> {t('auth.verification_code')}
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleVerifyOtp();
                      }
                    }}
                    placeholder="000000"
                    autoFocus
                    autoComplete="one-time-code"
                    className={`${inputCls} text-center text-2xl font-black tracking-[0.4em] placeholder:text-slate-600`}
                  />
                </div>
                <ThemedButton
                  type="button"
                  intent="primary"
                  disabled={isSubmitting || otpCode.length !== 6}
                  onClick={() => void handleVerifyOtp()}
                  className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.verifying')}</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>{(t('auth.verify_otp') as string) || 'Verify Code'}</span>
                    </>
                  )}
                </ThemedButton>
                <div className="text-center">
                  <button
                    onClick={() => {
                      setOtpCode('');
                      clearMessages();
                      void handleSendOtp();
                    }}
                    disabled={isSubmitting}
                    className="text-xs text-slate-400 hover:text-cyan-400"
                  >
                    {(t('auth.resend_code') as string) || "Didn't receive code? Resend"}
                  </button>
                </div>
              </div>
            )}

            {/* ===== FORGOT PASSWORD ===== */}
            {authMode === 'forgotPassword' && (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">
                  {t('auth.forgot_password_desc')}
                </p>
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-email"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Mail className="h-3 w-3" /> {t('auth.email')}
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) clearMessages();
                    }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleForgotPassword();
                      }
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <ThemedButton
                  type="button"
                  intent="primary"
                  disabled={isSubmitting || !email.includes('@')}
                  onClick={() => void handleForgotPassword()}
                  className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.sending')}</span>
                    </div>
                  ) : (
                    <span>{t('auth.send_reset_link')}</span>
                  )}
                </ThemedButton>
              </div>
            )}

            {/* ===== NICKNAME SETUP ===== */}
            {authMode === 'nicknameSetup' && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void handleNicknameSubmit();
                }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label
                      htmlFor="nickname-input"
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                    >
                      <Shield className="h-3 w-3" />{' '}
                      {(t('common.nickname_screen.callsign') as string) || 'Callsign'}
                    </label>
                    <span
                      className={`text-[10px] font-black tracking-tighter transition-colors ${nickname.length >= 3 ? 'text-cyan-400' : 'text-slate-600'}`}
                    >
                      {nickname.length}/16
                    </span>
                  </div>

                  <div className="group relative">
                    {!isRetro && (
                      <div className="pointer-events-none absolute -inset-0.5 hidden rounded-lg bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 opacity-0 blur-sm transition-opacity duration-300 group-focus-within:opacity-100 sm:block" />
                    )}
                    <ThemedInput
                      id="nickname-input"
                      aria-label="Enter your nickname"
                      autoFocus
                      type="text"
                      inputMode="text"
                      enterKeyHint="go"
                      value={nickname}
                      onChange={e => {
                        setNickname(e.target.value);
                        if (error) clearMessages();
                      }}
                      onKeyDown={e => e.stopPropagation()}
                      className={`min-h-[48px] w-full px-4 py-3 text-base tracking-wide transition-all duration-200 placeholder:font-normal focus:outline-none focus:ring-2 sm:px-5 sm:py-4 ${
                        error
                          ? 'border-red-500/50 text-red-400 focus:ring-red-500/30'
                          : `text-white focus:border-cyan-500/60 focus:ring-cyan-500/40 ${!isRetro ? 'sm:hover:border-cyan-500/30 sm:hover:bg-slate-800/70' : 'group-hover:border-slate-600'}`
                      } ${!isRetro ? 'font-semibold' : ''}`}
                      placeholder={(() => {
                        const p = t('common.nickname_screen.placeholder');
                        return Array.isArray(p) ? p[0] : p;
                      })()}
                      maxLength={16}
                      disabled={isSubmitting}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <motion.div
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: nickname.length >= 3 ? 1 : 0,
                        scale: nickname.length >= 3 ? 1 : 0.5,
                      }}
                    >
                      <Zap
                        className={`h-5 w-5 fill-yellow-400 text-yellow-400 ${isRetro ? '' : 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'}`}
                      />
                    </motion.div>
                  </div>
                </div>

                <ThemedButton
                  type="submit"
                  intent="primary"
                  disabled={isSubmitting || nickname.length < 3}
                  className={`group relative flex min-h-[48px] w-full items-center justify-center gap-2 py-3 text-sm font-bold sm:py-4 sm:text-base ${
                    nickname.length < 3 ? 'opacity-50 grayscale' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.signing_in')}</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {(t('common.nickname_screen.enter_arena') as string) ||
                          'Enter Arena'}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </ThemedButton>
              </form>
            )}

            {/* Footer — memo'd */}
            <AuthFooter />
          </div>
        </ThemedPanel>

        {/* Info hints */}
        {authMode === 'nicknameSetup' && (
          <div className="mt-4 flex justify-center gap-2">
            <div className="rounded-full border border-slate-700/30 bg-slate-900/60 px-3 py-1.5 text-[9px] text-slate-400">
              {t('auth.nickname_rules_length')}
            </div>
            <div className="rounded-full border border-slate-700/30 bg-slate-900/60 px-3 py-1.5 text-[9px] text-slate-400">
              {t('auth.nickname_rules_chars')}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
