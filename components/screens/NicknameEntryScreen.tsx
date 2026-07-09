import React, { useState, useCallback, useMemo, memo } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { Activity, AlertCircle, ChevronRight, Shield, Zap } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useUser } from '../../contexts/useUser';
import { NicknameValidator } from '../../services/auth/NicknameValidator';
import { audio } from '../../services/audio/AudioService';
import { Logger } from '../../services/system/Logger';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedInput } from '../themed/ThemedInput';
import { ThemedButton } from '../themed/ThemedButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../config/Colors';

interface NicknameEntryScreenProps {
  onComplete: (nickname: string) => void;
}

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const normalizeText = (value: unknown, fallback: string): string => {
  if (Array.isArray(value)) return normalizeText(value[0], fallback);
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
};

const SHELL_STYLE = {
  backgroundColor: COLORS.BG,
} satisfies React.CSSProperties;

const PANEL_STYLE = {
  background: `linear-gradient(145deg, ${withAlpha(COLORS.BG, 0.96)}, ${withAlpha(COLORS.SLOT_BLACK, 0.92)})`,
  borderColor: withAlpha(COLORS.SECONDARY_CYBER, 0.24),
  boxShadow: `0 28px 90px ${withAlpha(COLORS.SLOT_BLACK, 0.82)}, 0 0 0 1px ${withAlpha(COLORS.SECONDARY_CYBER, 0.16)}`,
} satisfies React.CSSProperties;

const TERMINAL_ACCENT_STYLE = {
  backgroundColor: COLORS.SECONDARY_CYBER,
  boxShadow: `0 0 24px ${withAlpha(COLORS.SECONDARY_CYBER, 0.48)}`,
} satisfies React.CSSProperties;

const BackgroundEffects = memo(function BackgroundEffects({
  isRetro,
}: {
  isRetro: boolean;
}) {
  const gridColor = isRetro ? COLORS.ACCENT_RETRO : COLORS.SECONDARY_CYBER;
  const scanColor = isRetro ? COLORS.SECONDARY_RETRO : COLORS.SECONDARY_CYBER;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {!isRetro && (
        <div
          className="absolute inset-0"
          style={{
            background: [
              `radial-gradient(circle at 50% 18%, ${withAlpha(COLORS.SECONDARY_CYBER, 0.18)}, transparent 38%)`,
              `radial-gradient(circle at 78% 72%, ${withAlpha(COLORS.PRIMARY_CYBER, 0.12)}, transparent 44%)`,
              `linear-gradient(180deg, ${withAlpha(COLORS.BG, 0.16)}, ${withAlpha(COLORS.BG, 0.94)})`,
            ].join(', '),
          }}
        />
      )}

      <div
        className={
          isRetro
            ? 'absolute inset-0 opacity-[0.06]'
            : 'absolute inset-0 opacity-[0.045]'
        }
        style={{
          backgroundImage: `linear-gradient(${withAlpha(gridColor, 0.72)} 1px, transparent 1px),
                           linear-gradient(90deg, ${withAlpha(gridColor, 0.72)} 1px, transparent 1px)`,
          backgroundSize: isRetro ? '24px 24px' : '44px 44px',
        }}
      />

      {!isRetro && (
        <m.div
          className="absolute left-0 right-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${withAlpha(scanColor, 0.56)}, transparent)`,
          }}
          animate={{ y: ['8vh', '92vh'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
});

const TerminalDivider = memo(function TerminalDivider({
  label,
  accent,
  isRetro,
}: {
  label: string;
  accent: string;
  isRetro: boolean;
}) {
  const lineStyle = {
    background: `linear-gradient(90deg, transparent, ${withAlpha(accent, 0.44)})`,
  } satisfies React.CSSProperties;

  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1" style={lineStyle} />
      <span
        className={`${isRetro ? 'font-retro-pixel text-[9px]' : 'font-cyber text-[10px]'} font-bold uppercase tracking-[0.22em]`}
        style={{ color: accent }}
      >
        {label}
      </span>
      <div
        className="h-px flex-1"
        style={{
          background: `linear-gradient(270deg, transparent, ${withAlpha(accent, 0.44)})`,
        }}
      />
    </div>
  );
});

const IdentityScanStrip = memo(function IdentityScanStrip({
  isValid,
  isRetro,
}: {
  isValid: boolean;
  isRetro: boolean;
}) {
  const accent = isValid ? COLORS.PUMP_GREEN : COLORS.SECONDARY_CYBER;

  return (
    <div
      className={`${isRetro ? 'rounded-none' : 'rounded-sm'} relative overflow-hidden border px-3 py-2.5`}
      style={{
        backgroundColor: withAlpha(COLORS.SLOT_BLACK, 0.7),
        borderColor: withAlpha(accent, 0.34),
      }}
    >
      {!isRetro && (
        <m.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, ${withAlpha(accent, 0.18)}, transparent)`,
          }}
          animate={{ x: ['-120%', '360%'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" color={accent} />
          <span
            className={`${isRetro ? 'font-retro-pixel text-[9px]' : 'font-mono text-[10px]'} uppercase tracking-[0.2em]`}
            style={{ color: COLORS.SLOT_SILVER }}
          >
            IDENTITY SCAN
          </span>
        </div>
        <span
          className={`${isRetro ? 'font-retro-pixel text-[8px]' : 'font-cyber text-[9px]'} whitespace-nowrap uppercase tracking-[0.18em]`}
          style={{ color: accent }}
        >
          {isValid ? 'SIGNAL LOCKED' : 'AWAITING CALLSIGN'}
        </span>
      </div>
    </div>
  );
});

const AuthFooter = memo(function AuthFooter({ isRetro }: { isRetro: boolean }) {
  const { t } = useLanguage();

  return (
    <footer
      className="mt-5 flex items-center justify-between border-t pt-3 text-[9px] uppercase tracking-[0.18em]"
      style={{ borderColor: withAlpha(COLORS.SECONDARY_CYBER, 0.16) }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${isRetro ? '' : 'animate-pulse rounded-full'} h-2 w-2`}
          style={{ backgroundColor: COLORS.PUMP_GREEN }}
        />
        <span style={{ color: COLORS.SLOT_SILVER }}>
          {normalizeText(t('auth.footer_systems_online'), 'Systems online')}
        </span>
      </div>
      <span
        className={isRetro ? 'font-retro-pixel' : 'font-cyber'}
        style={{ color: withAlpha(COLORS.CASINO_GOLD, 0.82) }}
      >
        {normalizeText(t('auth.footer_title'), 'Railway auth')}
      </span>
    </footer>
  );
});

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

  const copy = useMemo(
    () => ({
      identify: normalizeText(t('common.nickname_screen.title_identify'), 'Identify'),
      survivor: normalizeText(t('common.nickname_screen.title_survivor'), 'Survivor'),
      devModeHint: normalizeText(
        t('common.nickname_screen.dev_mode_hint'),
        'Anonymous Railway session'
      ),
      callsign: normalizeText(t('common.nickname_screen.callsign'), 'Callsign'),
      placeholder: normalizeText(
        t('common.nickname_screen.placeholder'),
        'Enter callsign'
      ),
      enterArena: normalizeText(t('common.nickname_screen.enter_arena'), 'Enter Arena'),
      registrationFailed: normalizeText(
        t('common.nickname_screen.registration_failed'),
        'Registration failed'
      ),
      systemError: normalizeText(
        t('common.nickname_screen.system_error'),
        'System error'
      ),
      signingIn: normalizeText(t('auth.signing_in'), 'Signing in'),
      ruleLength: normalizeText(t('auth.nickname_rules_length'), '3-16 characters'),
      ruleChars: normalizeText(
        t('auth.nickname_rules_chars'),
        'Letters, numbers, underscores, hyphens'
      ),
    }),
    [t]
  );

  const isNicknameReady = nickname.length >= 3;
  const inputAccent = error
    ? COLORS.CASINO_RED
    : isNicknameReady
      ? COLORS.PUMP_GREEN
      : COLORS.SECONDARY_CYBER;

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleNicknameSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const normalizedNickname = nickname.trim();
    const validationError = NicknameValidator.validate(normalizedNickname);
    if (validationError) {
      setError(validationError);
      audio.playHit();
      return;
    }

    setIsSubmitting(true);
    clearMessages();

    try {
      const result = await login(normalizedNickname);

      if (result.success) {
        audio.playLevelUp();
        onComplete(normalizedNickname);
      } else {
        setError(normalizeText(result.error, copy.registrationFailed));
        audio.playHit();
      }
    } catch (err) {
      Logger.error('[NicknameEntryScreen] Submission error:', err);
      setError(copy.systemError);
      audio.playHit();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearMessages,
    copy.registrationFailed,
    copy.systemError,
    isSubmitting,
    login,
    nickname,
    onComplete,
  ]);

  return (
    <LazyMotion features={domAnimation}>
      <div
        data-testid="identity-terminal-shell"
        className="allow-scroll fixed inset-0 z-[3300] flex items-start justify-center overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] font-mono sm:items-center sm:px-6"
        style={SHELL_STYLE}
      >
        <BackgroundEffects isRetro={isRetro} />

        <m.div
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="relative my-auto w-full max-w-xl py-4 sm:py-6"
        >
          <header className="relative z-10 mb-4 space-y-2 text-center sm:mb-6">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px]' : 'font-cyber text-[10px]'} font-bold uppercase tracking-[0.32em]`}
              style={{ color: COLORS.CASINO_GOLD }}
            >
              CRYPTO SURVIVORS
            </p>
            <h1
              className={`${isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber'} text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl`}
              style={{ color: COLORS.TEXT }}
            >
              <span className="sr-only">IDENTITY TERMINAL</span>
              <span aria-hidden="true">
                IDENTITY
                <br />
                <span
                  style={{
                    color: isRetro ? COLORS.ELECTRIC_BLUE : COLORS.SECONDARY_CYBER,
                  }}
                >
                  TERMINAL
                </span>
              </span>
            </h1>
            <p
              className={`${isRetro ? 'font-retro-pixel text-[9px]' : 'font-mono text-[10px]'} uppercase tracking-[0.22em]`}
              style={{ color: withAlpha(COLORS.SLOT_SILVER, 0.82) }}
            >
              {copy.identify} {copy.survivor} · Choose Your Callsign
            </p>
          </header>

          <ThemedPanel
            data-testid="identity-terminal-panel"
            className={`${isRetro ? '' : '!rounded-[1.5rem]'} relative overflow-hidden border p-4 sm:p-6`}
            style={isRetro ? undefined : PANEL_STYLE}
          >
            {!isRetro && (
              <>
                <div
                  data-testid="identity-terminal-accent"
                  className="absolute left-0 right-0 top-0 h-1"
                  style={TERMINAL_ACCENT_STYLE}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.5rem] border"
                  style={{ borderColor: withAlpha(COLORS.TEXT, 0.14) }}
                />
                <div
                  className="pointer-events-none absolute inset-2 rounded-[1.1rem] border"
                  style={{ borderColor: withAlpha(COLORS.SECONDARY_CYBER, 0.1) }}
                />
              </>
            )}

            <div className="relative z-10 space-y-4 sm:space-y-5">
              <TerminalDivider
                label="RAILWAY ACCOUNT LINK"
                accent={isRetro ? COLORS.NEON_GREEN : COLORS.CASINO_GOLD}
                isRetro={isRetro}
              />

              <IdentityScanStrip
                isValid={isNicknameReady && !error}
                isRetro={isRetro}
              />

              <AnimatePresence mode="wait">
                {error && (
                  <m.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 rounded-sm border p-3 text-sm"
                    style={{
                      backgroundColor: withAlpha(COLORS.CASINO_RED, 0.12),
                      borderColor: withAlpha(COLORS.CASINO_RED, 0.42),
                      color: COLORS.DUMP_ORANGE,
                    }}
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </m.div>
                )}
                {successMessage && (
                  <m.div
                    key="success"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 rounded-sm border p-3 text-sm"
                    style={{
                      backgroundColor: withAlpha(COLORS.PUMP_GREEN, 0.1),
                      borderColor: withAlpha(COLORS.PUMP_GREEN, 0.38),
                      color: COLORS.PUMP_GREEN,
                    }}
                  >
                    <Zap className="h-4 w-4 flex-shrink-0" />
                    <span>{successMessage}</span>
                  </m.div>
                )}
              </AnimatePresence>

              <form
                action={() => {
                  void handleNicknameSubmit();
                }}
                className="space-y-4"
              >
                <div
                  className={`${isRetro ? 'rounded-none' : 'rounded-lg'} border p-3 sm:p-4`}
                  style={{
                    backgroundColor: withAlpha(COLORS.SLOT_BLACK, 0.58),
                    borderColor: withAlpha(inputAccent, 0.26),
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label
                      htmlFor="nickname-input"
                      className={`${isRetro ? 'font-retro-pixel text-[9px]' : 'font-cyber text-[10px]'} flex items-center gap-1.5 font-bold uppercase tracking-[0.2em]`}
                      style={{ color: inputAccent }}
                    >
                      <Shield className="h-3.5 w-3.5" /> {copy.callsign}
                    </label>
                    <span
                      className={`${isRetro ? 'font-retro-pixel text-[9px]' : 'font-mono text-[10px]'} font-black`}
                      style={{ color: inputAccent }}
                    >
                      {nickname.length}/16
                    </span>
                  </div>

                  <div className="group relative">
                    {!isRetro && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-0.5 rounded-lg opacity-0 blur-sm transition-opacity duration-300 group-focus-within:opacity-100"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${withAlpha(inputAccent, 0.24)}, transparent)`,
                        }}
                      />
                    )}
                    <ThemedInput
                      id="nickname-input"
                      aria-label="Enter your nickname"
                      type="text"
                      inputMode="text"
                      enterKeyHint="go"
                      value={nickname}
                      onChange={event => {
                        setNickname(event.target.value);
                        if (error) clearMessages();
                      }}
                      onKeyDown={event => event.stopPropagation()}
                      className={`${isRetro ? '' : 'font-semibold'} relative min-h-[52px] w-full px-4 py-3 text-base tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 sm:px-5 sm:py-4`}
                      style={{
                        borderColor: withAlpha(inputAccent, error ? 0.62 : 0.42),
                        color: COLORS.TEXT,
                        boxShadow: isNicknameReady
                          ? `0 0 18px ${withAlpha(inputAccent, 0.16)}`
                          : 'none',
                      }}
                      placeholder={copy.placeholder}
                      maxLength={16}
                      disabled={isSubmitting}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <m.div
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: isNicknameReady ? 1 : 0,
                        scale: isNicknameReady ? 1 : 0.5,
                      }}
                    >
                      <Zap
                        className="h-5 w-5"
                        color={COLORS.JACKPOT_YELLOW}
                        fill={COLORS.JACKPOT_YELLOW}
                      />
                    </m.div>
                  </div>

                  <p
                    className={`${isRetro ? 'font-retro-pixel text-[8px]' : 'font-mono text-[9px]'} mt-3 uppercase tracking-[0.18em]`}
                    style={{ color: withAlpha(COLORS.SLOT_SILVER, 0.72) }}
                  >
                    {copy.devModeHint}
                  </p>
                </div>

                <ThemedButton
                  type="submit"
                  intent="primary"
                  disabled={isSubmitting || !isNicknameReady}
                  className={`${!isNicknameReady ? 'opacity-50 grayscale' : ''} group relative flex min-h-[52px] w-full items-center justify-center gap-2 overflow-hidden py-3 text-sm font-black uppercase tracking-[0.16em] sm:py-4 sm:text-base`}
                  style={{
                    background: isNicknameReady
                      ? `linear-gradient(90deg, ${COLORS.PRIMARY_CYBER}, ${COLORS.SECONDARY_CYBER})`
                      : `linear-gradient(90deg, ${withAlpha(COLORS.SLOT_BLACK, 0.9)}, ${withAlpha(COLORS.BG, 0.94)})`,
                    borderColor: withAlpha(COLORS.SECONDARY_CYBER, 0.34),
                    color: COLORS.TEXT,
                  }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                        style={{
                          borderColor: withAlpha(COLORS.TEXT, 0.55),
                          borderTopColor: 'transparent',
                        }}
                      />
                      <span>{copy.signingIn}</span>
                    </div>
                  ) : (
                    <>
                      <span>{copy.enterArena}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </ThemedButton>
              </form>

              <AuthFooter isRetro={isRetro} />
            </div>
          </ThemedPanel>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:mt-4">
            {[copy.ruleLength, copy.ruleChars].map(rule => (
              <div
                key={rule}
                className={`${isRetro ? 'rounded-none font-retro-pixel text-[8px]' : 'rounded-sm font-mono text-[9px]'} border px-2 py-2 uppercase tracking-[0.12em]`}
                style={{
                  backgroundColor: withAlpha(COLORS.SLOT_BLACK, 0.52),
                  borderColor: withAlpha(COLORS.SECONDARY_CYBER, 0.18),
                  color: withAlpha(COLORS.SLOT_SILVER, 0.78),
                }}
              >
                {rule}
              </div>
            ))}
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
};
