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
      className={`fixed inset-0 flex flex-col items-center justify-center text-center p-4 overflow-y-auto ${
        isRetro ? 'bg-black/95' : 'bg-slate-950/90 backdrop-blur-md'
      }`}
      style={{ zIndex: 2200 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`max-w-2xl w-full p-8 md:p-12 transition-all relative overflow-hidden ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none shadow-[8px_8px_0_rgba(0,0,0,0.5)]'
            : 'bg-slate-900/60 border border-[var(--color-primary)]/30 rounded-3xl shadow-[0_0_80px_rgba(0,255,255,0.15)] cyber-glass'
        }`}
      >
        {!isRetro && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />
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
            className={`w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto ${
              isRetro ? 'border-4 rounded-none' : 'border-2 rounded-2xl md:rounded-3xl'
            }`}
            style={{
              borderColor: COLORS.JACKPOT_YELLOW,
              backgroundColor: isRetro ? 'transparent' : `${COLORS.JACKPOT_YELLOW}15`,
              boxShadow: isRetro ? 'none' : `0 0 30px ${COLORS.JACKPOT_YELLOW}40`,
            }}
          >
            <span
              className={`text-4xl md:text-5xl font-black ${isRetro ? '' : 'cyber-glitch-text'}`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              !
            </span>
          </div>
        </motion.div>

        {/* Disconnected Title */}
        <motion.h2
          className={`font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white italic tracking-tighter mb-6 uppercase leading-[0.9] flex flex-wrap justify-center items-center gap-x-2 md:gap-x-4 ${
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
          className="max-w-md mx-auto space-y-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p
            className={`${sizes.body} ${
              isRetro ? 'text-zinc-400' : 'text-slate-400'
            } font-mono tracking-wider leading-relaxed opacity-80`}
          >
            {t('market.disconnected_desc')}
          </p>

          <div className="flex flex-col items-center space-y-6 pt-4">
            <div className="flex space-x-4">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
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
              className={`font-display ${sizes.tiny} uppercase font-black tracking-[0.3em]`}
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
            className={`mt-10 px-10 py-4 font-display ${sizes.tiny} font-black uppercase tracking-[0.25em] transition-all relative group overflow-hidden ${
              isRetro
                ? 'bg-zinc-800 border-4 border-zinc-700 text-zinc-500 hover:text-white hover:border-white rounded-none'
                : 'bg-slate-900/80 border border-white/10 text-white/40 hover:text-white hover:border-[var(--color-primary)]/50 rounded-xl md:rounded-2xl'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {!isRetro && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-primary)]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
            <span className="relative z-10">{t('market.exit_terminal')}</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};
