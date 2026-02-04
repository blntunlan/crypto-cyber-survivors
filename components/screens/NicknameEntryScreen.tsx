import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { useUser } from '../../contexts/useUser';
import { NicknameValidator } from '../../services/auth/NicknameValidator';
import { audio } from '../../services/audio';
import { User, Shield, Zap, ChevronRight, AlertCircle, Ghost } from 'lucide-react';
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

interface NicknameEntryScreenProps {
  onComplete: (nickname: string) => void;
}

export const NicknameEntryScreen: React.FC<NicknameEntryScreenProps> = ({
  onComplete,
}) => {
  const { isRetro } = useTheme();
  const { login } = useUser();
  const { t } = useLanguage();

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  // Environment check - nickname login only available in development
  const isDevelopment = import.meta.env.DEV;

  // Magic Link state
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if Phantom is installed
  const isPhantomInstalled = PhantomAuthService.isPhantomInstalled();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle Magic Link
  const handleMagicLink = useCallback(async () => {
    if (!magicLinkEmail?.includes('@')) {
      setError('Please enter a valid email address');
      audio.playHit();
      return;
    }

    setAuthLoading('magiclink');
    setError(null);
    audio.playKeystroke();

    const result = await SupabaseAuthService.sendMagicLink(magicLinkEmail);

    setAuthLoading(null);

    if (result.success) {
      setMagicLinkSent(true);
      audio.playLevelUp();
    } else {
      setError(result.error ?? 'Failed to send magic link');
      audio.playHit();
    }
  }, [magicLinkEmail]);

  // OAuth providers config with Lucide icons
  const oauthProviders: {
    id: AuthProvider;
    name: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      ),
      color: '#000000',
    },
    {
      id: 'google',
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
      id: 'discord',
      name: 'Discord',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      color: '#5865F2',
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
      ),
      color: '#333333',
    },
  ];

  // Handle OAuth sign in
  const handleOAuthSignIn = useCallback(async (provider: AuthProvider) => {
    setAuthLoading(provider);
    setError(null);
    audio.playKeystroke();

    const result = await SupabaseAuthService.signInWithOAuth({ provider });

    if (!result.success) {
      setAuthLoading(null);
      setError(result.error ?? `${provider} girişi başarısız`);
      audio.playHit();
    }
    // Success will redirect to callback URL
  }, []);

  // Handle Phantom wallet connect
  const handleWalletConnect = useCallback(async () => {
    setAuthLoading('phantom');
    setError(null);
    audio.playKeystroke();

    const result = await PhantomAuthService.authenticate();

    setAuthLoading(null);

    if (result.success && result.walletAddress) {
      audio.playLevelUp();
      onComplete(`Wallet_${result.walletAddress.slice(0, 6)}`);
    } else {
      setError(result.error ?? 'Wallet bağlantısı başarısız');
      audio.playHit();
    }
  }, [onComplete]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // 1. Validate
    const validationError = NicknameValidator.validate(nickname);
    if (validationError) {
      setError(validationError);
      audio.playHit();
      return;
    }

    // 2. Submit
    setIsSubmitting(true);
    setError(null);
    audio.playLevelUp();

    try {
      const result = await login(nickname);

      if (result.success) {
        audio.playLevelUp();
        onComplete(nickname);
      } else {
        const errorMsg =
          result.error ?? t('common.nickname_screen.registration_failed');
        setError(Array.isArray(errorMsg) ? (errorMsg[0] ?? 'Error') : errorMsg);
        audio.playHit();
      }
    } catch (_err) {
      const sysError = t('common.nickname_screen.system_error');
      setError(Array.isArray(sysError) ? (sysError[0] ?? 'System error') : sysError);
      audio.playHit();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-mono sm:items-center sm:px-6"
      style={{ zIndex: 3300 }}
    >
      {/* Background Effects - Cyan/Neon Theme */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial gradient glow */}
        {!isRetro && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.1),transparent_50%)]" />
          </>
        )}

        {/* Grid pattern */}
        <div
          className={`absolute inset-0 ${isRetro ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
            backgroundSize: isRetro ? '25px 25px' : '50px 50px',
          }}
        />

        {/* Animated scanline */}
        <motion.div
          className={`absolute left-0 right-0 h-[2px] ${isRetro ? 'bg-white/10' : 'bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent'}`}
          animate={{
            top: ['0%', '100%'],
          }}
          transition={{
            duration: isRetro ? 4 : 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative my-auto w-full max-w-md py-6 sm:py-0"
      >
        {/* Decorative corner elements - Cyan theme, enhanced for desktop */}
        {!isRetro && (
          <>
            <div className="absolute -left-3 -top-3 h-10 w-10 rounded-tl-lg border-l-2 border-t-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
            <div className="absolute -right-3 -top-3 h-10 w-10 rounded-tr-lg border-r-2 border-t-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
            <div className="absolute -bottom-3 -left-3 h-10 w-10 rounded-bl-lg border-b-2 border-l-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
            <div className="absolute -bottom-3 -right-3 h-10 w-10 rounded-br-lg border-b-2 border-r-2 border-cyan-500/60 sm:h-12 sm:w-12 sm:border-cyan-400/70 sm:shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
          </>
        )}

        <ThemedPanel className="relative overflow-hidden p-5 transition-all sm:p-8">
          {/* Animated top border - pulsing on desktop */}
          {!isRetro && (
            <motion.div
              className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Glow effect behind - enhanced on desktop */}
          {!isRetro && (
            <div className="absolute -inset-1 rounded-sm bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-cyan-500/10 opacity-50 blur-xl sm:opacity-60" />
          )}

          <header className="relative mb-6 space-y-2 text-center sm:mb-8 sm:space-y-3">
            {/* Icon with glow */}
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
              <User className="h-7 w-7 text-cyan-400" />
            </motion.div>

            <ThemedText
              variant="h1"
              className={`text-2xl font-black uppercase tracking-tight ${isRetro ? 'text-white' : 'italic text-white'}`}
            >
              {t('common.nickname_screen.title_identify')}{' '}
              <span
                className={
                  isRetro
                    ? 'text-cyan-400'
                    : 'bg-gradient-to-r from-[var(--color-primary)] to-white bg-clip-text text-transparent'
                }
              >
                {t('common.nickname_screen.title_survivor')}
              </span>
            </ThemedText>

            <ThemedText
              variant="mono"
              className="text-[8px] uppercase tracking-[0.3em] text-slate-500"
            >
              {isDevelopment
                ? 'Beta Access Protocol v1.0'
                : 'Secure Authentication Required'}
            </ThemedText>
          </header>

          {/* Error Display */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nickname Form - Only in Development */}
          {isDevelopment && (
            <form
              onSubmit={event => {
                void handleSubmit(event);
              }}
              className="relative space-y-4 sm:space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label
                    htmlFor="nickname-input"
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                  >
                    <Shield className="h-3 w-3" />{' '}
                    {t('common.nickname_screen.callsign')}
                  </label>

                  <span
                    className={`text-[10px] font-black tracking-tighter transition-colors ${
                      nickname.length >= 3 ? 'text-cyan-400' : 'text-slate-600'
                    }`}
                  >
                    {nickname.length}/16
                  </span>
                </div>

                <div className="group relative">
                  {/* Desktop cyberpunk focus glow */}
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
                      if (error) setError(null);
                      audio.playKeystroke();
                    }}
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

                  {/* Valid indicator */}
                  <motion.div
                    className={`absolute right-4 top-1/2 -translate-y-1/2`}
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

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 pl-1 text-xs font-medium text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <ThemedButton
                type="submit"
                intent="primary"
                disabled={isSubmitting || nickname.length < 3}
                className={`group relative flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 overflow-hidden py-3 text-sm font-bold tracking-wide transition-all duration-200 sm:py-4 sm:text-base ${
                  nickname.length < 3
                    ? 'cursor-not-allowed border-slate-700/50 bg-slate-800/50 !text-slate-500'
                    : !isRetro
                      ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:hover:scale-[1.02] sm:hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] sm:active:scale-[0.98]'
                      : ''
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 animate-spin border-2 border-white/30 border-t-white ${isRetro ? 'rounded-none' : 'rounded-full'}`}
                    />
                    <span>{t('common.nickname_screen.connecting')}</span>
                  </div>
                ) : (
                  <>
                    <span>{t('common.nickname_screen.enter_arena')}</span>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-200 ${!isRetro ? 'group-hover:translate-x-1' : ''}`}
                    />
                  </>
                )}

                {/* Shine effect */}
                {nickname.length >= 3 && !isRetro && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </ThemedButton>
            </form>
          )}

          {/* Social Login Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
              {isDevelopment ? 'or sign in with' : 'sign in method'}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
          </div>

          {/* Magic Link Email - Production Only */}
          {!isDevelopment && !magicLinkSent && (
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <label
                  htmlFor="email-input"
                  className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80"
                >
                  📧 Email Magic Link
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  id="email-input"
                  type="email"
                  value={magicLinkEmail}
                  onChange={e => setMagicLinkEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
                <button
                  onClick={() => void handleMagicLink()}
                  disabled={authLoading === 'magiclink'}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {authLoading === 'magiclink' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Magic Link Success */}
          {magicLinkSent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center"
            >
              <div className="mb-2 text-2xl">✉️</div>
              <p className="text-sm font-medium text-green-400">Check your email!</p>
              <p className="mt-1 text-xs text-slate-400">
                Click the link in the email to sign in
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="mt-3 text-xs text-cyan-400 underline hover:text-cyan-300"
              >
                Try different email
              </button>
            </motion.div>
          )}

          {/* OAuth Divider */}
          {!isDevelopment && !magicLinkSent && (
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700/30" />
              <span className="text-[9px] uppercase tracking-wider text-slate-600">
                or
              </span>
              <div className="h-px flex-1 bg-slate-700/30" />
            </div>
          )}

          {/* OAuth Buttons Grid */}
          {!magicLinkSent && (
            <div className="grid grid-cols-2 gap-2">
              {oauthProviders.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => void handleOAuthSignIn(provider.id)}
                  disabled={authLoading !== null}
                  aria-label={provider.name}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    authLoading === provider.id
                      ? 'cursor-wait opacity-70'
                      : authLoading !== null
                        ? 'cursor-not-allowed opacity-40'
                        : 'hover:scale-[1.02] hover:border-cyan-500/50 active:scale-[0.98]'
                  } ${isRetro ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-slate-700/50 bg-slate-800/60 text-white/90 backdrop-blur-sm'}`}
                >
                  {provider.icon}
                  <span className="hidden sm:inline">{provider.name}</span>
                  {authLoading === provider.id && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Phantom Wallet Button */}
          {!magicLinkSent && (
            <button
              onClick={() => {
                if (isPhantomInstalled) {
                  void handleWalletConnect();
                } else {
                  PhantomAuthService.openPhantomDownload();
                }
              }}
              disabled={authLoading !== null}
              className={`mt-3 flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                authLoading === 'phantom'
                  ? 'cursor-wait opacity-70'
                  : authLoading !== null
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(153,69,255,0.3)] active:scale-[0.98]'
              } ${isRetro ? 'border-2 border-purple-600 bg-purple-800 text-white' : 'border border-purple-400/30 bg-gradient-to-r from-purple-600 to-purple-500 text-white'}`}
            >
              <Ghost className="h-5 w-5" />
              <span>
                {isPhantomInstalled
                  ? 'Connect Phantom Wallet'
                  : 'Install Phantom Wallet'}
              </span>
              {authLoading === 'phantom' && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
            </button>
          )}

          <footer className="mt-6 flex items-center justify-between border-t border-slate-700/30 pt-4 text-[9px] font-medium text-slate-500 sm:mt-8 sm:pt-6">
            <div className="flex items-center gap-2">
              <motion.div
                className={`h-2 w-2 bg-green-500 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <ThemedText variant="body" className="text-[9px]">
                {t('common.nickname_screen.systems_online')}
              </ThemedText>
            </div>

            <ThemedText variant="body" className="text-[9px] text-slate-600">
              Crypto Survivors
            </ThemedText>
          </footer>
        </ThemedPanel>

        {/* Info hints - enhanced hover on desktop */}
        <div className="mt-4 flex flex-wrap justify-center gap-2 px-2 sm:mt-6 sm:gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 transition-all duration-200 ${isRetro ? 'rounded-none border-2 border-zinc-700 bg-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]' : 'rounded-full border border-slate-700/30 bg-slate-900/60 backdrop-blur-sm sm:hover:border-cyan-500/40 sm:hover:bg-slate-900/80'}`}
          >
            <div
              className={`h-1.5 w-1.5 bg-cyan-400 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
            />
            <ThemedText
              variant="body"
              className={`text-[9px] font-medium ${isRetro ? 'text-zinc-300' : 'text-slate-400'}`}
            >
              {t('common.nickname_screen.char_limit')}
            </ThemedText>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 transition-all duration-200 ${isRetro ? 'rounded-none border-2 border-zinc-700 bg-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]' : 'rounded-full border border-slate-700/30 bg-slate-900/60 backdrop-blur-sm sm:hover:border-cyan-500/40 sm:hover:bg-slate-900/80'}`}
          >
            <div
              className={`h-1.5 w-1.5 bg-cyan-400 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
            />
            <ThemedText
              variant="body"
              className={`text-[9px] font-medium ${isRetro ? 'text-zinc-300' : 'text-slate-400'}`}
            >
              {t('common.nickname_screen.chars_allowed')}
            </ThemedText>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
