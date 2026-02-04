import React from 'react';
import { motion } from 'framer-motion';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

interface MarketDisconnectedScreenProps {
  onBackToMenu: () => void;
}

export const MarketDisconnectedScreen: React.FC<MarketDisconnectedScreenProps> = ({
  onBackToMenu,
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  return (
    <motion.div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-y-auto p-4 text-center ${
        isRetro ? 'bg-black/95' : 'bg-slate-950/90 backdrop-blur-md'
      }`}
      style={{ zIndex: 2200 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`relative w-full max-w-2xl overflow-hidden p-8 transition-all md:p-12 ${
          isRetro
            ? 'rounded-none border-4 border-[var(--color-primary)] bg-zinc-900 shadow-[8px_8px_0_rgba(0,0,0,0.5)]'
            : 'border-[var(--color-primary)]/30 cyber-glass rounded-sm border bg-slate-900/60 shadow-[0_0_80px_rgba(0,255,255,0.15)]'
        }`}
      >
        {!isRetro && (
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />
        )}

        {/* Warning Icon */}
        <motion.div
          className="mb-6 md:mb-10"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center md:h-24 md:w-24 ${
              isRetro ? 'rounded-none border-4' : 'rounded-sm border-2 md:rounded-sm'
            }`}
            style={{
              borderColor: COLORS.JACKPOT_YELLOW,
              backgroundColor: isRetro ? 'transparent' : `${COLORS.JACKPOT_YELLOW}15`,
              boxShadow: isRetro ? 'none' : `0 0 30px ${COLORS.JACKPOT_YELLOW}40`,
            }}
          >
            <span
              className={`text-4xl font-black md:text-5xl ${isRetro ? '' : 'cyber-glitch-text'}`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              !
            </span>
          </div>
        </motion.div>

        {/* Disconnected Title */}
        <motion.h2
          className={`mb-6 flex flex-wrap items-center justify-center gap-x-2 font-display text-2xl font-black uppercase italic leading-[0.9] tracking-tighter text-white sm:text-4xl md:gap-x-4 md:text-5xl lg:text-6xl ${
            !isRetro ? 'cyber-glitch-text' : ''
          }`}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="whitespace-nowrap">{t('market.disconnected_title')}</span>
          <span
            className="whitespace-nowrap"
            style={{
              color: COLORS.JACKPOT_YELLOW,
              textShadow: isRetro ? 'none' : `0 0 20px ${COLORS.JACKPOT_YELLOW}60`,
            }}
          >
            {t('market.disconnected_status')}
          </span>
        </motion.h2>

        <motion.div
          className="mx-auto max-w-md space-y-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p
            className={`${sizes.body} ${
              isRetro ? 'text-zinc-400' : 'text-slate-400'
            } font-mono leading-relaxed tracking-wider opacity-80`}
          >
            {t('market.disconnected_desc')}
          </p>

          <div className="flex flex-col items-center space-y-6 pt-4">
            <div className="flex space-x-4">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  className={`h-2 w-2 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
                  style={{
                    backgroundColor: COLORS.JACKPOT_YELLOW,
                    boxShadow: isRetro ? 'none' : `0 0 10px ${COLORS.JACKPOT_YELLOW}`,
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay }}
                />
              ))}
            </div>
            <p
              className={`font-display ${sizes.tiny} font-black uppercase tracking-[0.3em]`}
              style={{
                color: COLORS.JACKPOT_YELLOW,
                textShadow: isRetro ? 'none' : `0 0 10px ${COLORS.JACKPOT_YELLOW}40`,
              }}
            >
              {t('market.waiting_signal')}
            </p>
          </div>

          {/* Fallback Action */}
          <motion.button
            onClick={onBackToMenu}
            className={`mt-10 px-10 py-4 font-display ${sizes.tiny} group relative overflow-hidden font-black uppercase tracking-[0.25em] transition-all ${
              isRetro
                ? 'rounded-none border-4 border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-white hover:text-white'
                : 'hover:border-[var(--color-primary)]/50 rounded-sm border border-white/10 bg-slate-900/80 text-white/40 hover:text-white md:rounded-sm'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {!isRetro && (
              <div className="via-[var(--color-primary)]/5 absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
            )}
            <span className="relative z-10">{t('market.exit_terminal')}</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};
