import React from 'react';
import { motion } from 'framer-motion';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome, OverlaySectionRail } from '../ui/OverlayChrome';

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
    <OverlayChrome
      zIndex={2200}
      maxWidthClassName="max-w-2xl"
      title={
        <>
          {t('market.disconnected_title')}{' '}
          <span style={{ color: COLORS.JACKPOT_YELLOW }}>
            {t('market.disconnected_status')}
          </span>
        </>
      }
      subtitle={t('market.waiting_signal') as string}
      accentColor={COLORS.JACKPOT_YELLOW}
    >
      <div className="space-y-6 text-center">
        <motion.div
          className="mx-auto"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center ${
              isRetro ? 'border-4' : 'rounded-sm border-2'
            }`}
            style={{
              borderColor: COLORS.JACKPOT_YELLOW,
              backgroundColor: isRetro ? 'transparent' : `${COLORS.JACKPOT_YELLOW}15`,
              boxShadow: isRetro ? 'none' : `0 0 30px ${COLORS.JACKPOT_YELLOW}40`,
            }}
          >
            <span
              className={`text-4xl font-black ${isRetro ? '' : 'cyber-glitch-text'}`}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              !
            </span>
          </div>
        </motion.div>

        <OverlaySectionRail label="Market Feed" color={COLORS.JACKPOT_YELLOW} />

        <p className={`${sizes.body} mx-auto max-w-xl leading-relaxed text-slate-400`}>
          {t('market.disconnected_desc')}
        </p>

        <div className="flex justify-center gap-3">
          {[0, 0.2, 0.4].map((delay, index) => (
            <motion.div
              key={index}
              className={isRetro ? 'h-2 w-2' : 'h-2 w-2 rounded-full'}
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

        <ThemedButton
          intent="secondary"
          onClick={onBackToMenu}
          className="mx-auto min-h-[48px] w-full max-w-xs text-xs font-black uppercase tracking-[0.24em]"
        >
          {t('market.exit_terminal')}
        </ThemedButton>
      </div>
    </OverlayChrome>
  );
};
