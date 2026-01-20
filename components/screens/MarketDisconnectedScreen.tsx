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
      className={`fixed inset-0 flex flex-col items-center justify-center text-center p-4 ${isRetro ? 'bg-black/95' : 'bg-slate-950/95 backdrop-blur-sm'}`}
      style={{ zIndex: 2200 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`max-w-xl w-full p-8 md:p-12 transition-all ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'bg-slate-900/40 border border-[var(--color-primary)]/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Warning Icon */}
        <motion.div
          className="mb-8"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="w-20 h-20 border-4 rounded-full flex items-center justify-center mx-auto"
            style={{ borderColor: COLORS.JACKPOT_YELLOW }}
          >
            <span
              className="text-4xl font-display"
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              !
            </span>
          </div>
        </motion.div>

        {/* Disconnected Title */}
        <motion.h2
          className="font-display text-2xl sm:text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-4 uppercase leading-none break-words"
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {t('market.disconnected_title')}{' '}
          <span style={{ color: COLORS.JACKPOT_YELLOW }}>
            {t('market.disconnected_status')}
          </span>
        </motion.h2>

        <motion.div
          className="max-w-md mx-auto space-y-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p
            className={`${sizes.body} text-slate-400 font-mono tracking-wider text-xs`}
          >
            {t('market.disconnected_desc')}
          </p>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-3">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: COLORS.JACKPOT_YELLOW }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay }}
                />
              ))}
            </div>
            <p
              className={`font-display ${sizes.tiny} uppercase font-black tracking-widest`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              {t('market.waiting_signal')}
            </p>
          </div>

          {/* Fallback Action */}
          <motion.button
            onClick={onBackToMenu}
            className={`mt-8 px-8 py-3 bg-slate-900 border border-white/10 text-white/50 font-display ${sizes.tiny} font-black uppercase tracking-[0.2em] rounded-lg hover:bg-slate-800 hover:text-white transition-all`}
            style={{
              borderColor: isRetro ? COLORS.SLOT_BLACK : 'rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('market.exit_terminal')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};
