import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { useUser } from '../../contexts/useUser';
import { NicknameValidator } from '../../services/auth/NicknameValidator';
import { audio } from '../../services/audio';
import { User, Shield, Zap, ChevronRight, AlertCircle } from 'lucide-react';
import { Logger } from '../../services/system/Logger';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedInput } from '../themed/ThemedInput';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedText } from '../themed/ThemedText';
import { useLanguage } from '../../contexts/LanguageContext';

// ============================================
// Types
// ============================================

interface NicknameEntryScreenProps {
  onComplete: (nickname: string) => void;
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

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ============================================
  // Helpers
  // ============================================

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // ============================================
  // Nickname Submit Handler (auth-free)
  // ============================================

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
      const result = await login(nickname);
      const success = result.success;
      const msg = result.error ?? t('common.nickname_screen.registration_failed');
      const errorMsg = Array.isArray(msg) ? (msg[0] ?? 'Error') : msg;

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
  }, [nickname, isSubmitting, login, onComplete, clearMessages, t]);

  // ============================================
  // Mode config (stable)
  // ============================================

  const modeConfig = useMemo(
    () => ({
      nicknameSetup: {
        title: `${(t('common.nickname_screen.title_identify') as string) || 'Identify'} `,
        titleHighlight:
          (t('common.nickname_screen.title_survivor') as string) || 'Survivor',
        subtitle: 'Choose Your Callsign',
        icon: <User className="h-7 w-7 text-cyan-400" />,
      },
    }),
    [t]
  );

  const currentMode = modeConfig.nicknameSetup;

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
              <HeaderIcon isRetro={isRetro}>{currentMode.icon}</HeaderIcon>

              <ThemedText
                variant="h1"
                className={`text-2xl font-black uppercase tracking-tight ${isRetro ? 'text-white' : 'italic text-white'}`}
              >
                {currentMode.title}
                <span
                  className={
                    isRetro
                      ? 'text-cyan-400'
                      : 'bg-gradient-to-r from-[var(--color-primary)] to-white bg-clip-text text-transparent'
                  }
                >
                  {currentMode.titleHighlight}
                </span>
              </ThemedText>

              <div className="space-y-1">
                <ThemedText
                  variant="mono"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
                >
                  {currentMode.subtitle}
                </ThemedText>
                <ThemedText
                  variant="mono"
                  className="text-[7px] uppercase tracking-[0.4em] text-cyan-500/50"
                >
                  {t('common.nickname_screen.dev_mode_hint')}
                </ThemedText>
              </div>
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

            {/* ===== NICKNAME SETUP (auth hidden) ===== */}
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

            {/* Footer — memo'd */}
            <AuthFooter />
          </div>
        </ThemedPanel>

        {/* Info hints */}
        <div className="mt-4 flex justify-center gap-2">
          <div className="rounded-full border border-slate-700/30 bg-slate-900/60 px-3 py-1.5 text-[9px] text-slate-400">
            {t('auth.nickname_rules_length')}
          </div>
          <div className="rounded-full border border-slate-700/30 bg-slate-900/60 px-3 py-1.5 text-[9px] text-slate-400">
            {t('auth.nickname_rules_chars')}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
