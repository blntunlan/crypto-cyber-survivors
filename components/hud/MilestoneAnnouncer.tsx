import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '../../constants';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

interface MilestoneAnnouncerProps {
  show: boolean;
  text: string;
  color: string;
}

/**
 * DesktopAnnouncer - Uses CSS animations for a grand, stable feel on larger screens.
 */
const DesktopAnnouncer: React.FC<MilestoneAnnouncerProps & { isRetro: boolean }> = ({
  show,
  text,
  color,
  isRetro,
}) => {
  const { t } = useLanguage();
  if (!show || !text) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[125] flex flex-col items-center pointer-events-none"
      style={{
        top: 'calc(14rem + env(safe-area-inset-top, 0px))',
        animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <div
        className="text-6xl font-black italic uppercase tracking-tighter text-center whitespace-nowrap"
        style={{
          color: 'white',
          textShadow: isRetro ? '6px 6px 0 #000' : `3px 3px 0 #000, 0 0 15px ${color}`,
        }}
      >
        {text}
      </div>

      <div className="relative mt-3 flex items-center justify-center">
        <div
          className={`relative px-8 py-2 border-4 font-black italic flex items-center justify-center overflow-visible ${
            isRetro
              ? 'rounded-none border-white border-double shadow-[4px_4px_0_#000]'
              : 'rounded-xl border-yellow-500/50 backdrop-blur-md'
          }`}
          style={{
            color: COLORS.JACKPOT_YELLOW,
            borderColor: isRetro ? '#FFFFFF' : COLORS.CASINO_GOLD,
            backgroundColor: isRetro ? COLORS.SLOT_BLACK : `${COLORS.SLOT_BLACK}CC`,
            boxShadow: isRetro ? '8px 8px 0 #000' : `0 0 25px ${color}50`,
          }}
        >
          {/* Retro Corner Accents */}
          {isRetro && (
            <>
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400" />
            </>
          )}

          <span
            className={`relative z-10 tracking-widest text-xl ${isRetro ? '' : ''}`}
          >
            {t('hud.xp_multiplier_up')}
          </span>

          {!isRetro && (
            <div
              className="absolute top-1/2 left-1/2 -z-10"
              style={{
                width: '130%',
                height: '240%',
                transform: 'translate(-50%, -50%)',
                filter: 'blur(30px)',
                opacity: 0.5,
                backgroundColor: color,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MobileAnnouncer - Optimized for touch, using Framer Motion for buttery smooth
 * performance and responsive positioning.
 */
const MobileAnnouncer: React.FC<MilestoneAnnouncerProps & { isRetro: boolean }> = ({
  show,
  text,
  color,
  isRetro,
}) => {
  const { t } = useLanguage();
  const { rs, rfs } = useResponsiveUI();

  return (
    <AnimatePresence>
      {show && text && (
        <motion.div
          className="fixed left-1/2 -translate-x-1/2 z-[125] flex flex-col items-center pointer-events-none"
          initial={{ opacity: 0, y: -20, scale: 0.8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            top: '45%',
            width: '100vw',
          }}
        >
          <motion.div
            className="font-black italic uppercase tracking-tighter text-center"
            style={{
              color: 'white',
              textShadow: isRetro
                ? '2px 2px 0 #000'
                : `2px 2px 0 #000, 0 0 10px ${color}`,
              fontSize: rfs(24),
            }}
          >
            {text}
          </motion.div>

          <motion.div
            className="relative mt-2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div
              className={`relative font-black italic flex items-center justify-center ${
                isRetro
                  ? 'rounded-none border-4 border-white shadow-[4px_4px_0_#000]'
                  : 'border-2 rounded-lg backdrop-blur-sm'
              }`}
              style={{
                color: COLORS.JACKPOT_YELLOW,
                borderColor: isRetro ? 'white' : COLORS.CASINO_GOLD,
                backgroundColor: isRetro ? COLORS.SLOT_BLACK : `${COLORS.SLOT_BLACK}E6`,
                boxShadow: isRetro ? '4px 4px 0 #000' : `0 0 15px ${color}40`,
                fontSize: rfs(12),
                padding: `${rs(6)}px ${rs(20)}px`,
              }}
            >
              <span className="relative z-10 tracking-tight">
                {t('hud.xp_multiplier_up')}
              </span>

              {/* Decorative elements for retro */}
              {isRetro && (
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400" />
              )}

              {/* Simplified glow for mobile perf - hidden in retro */}
              {!isRetro && (
                <div
                  className="absolute inset-0 -z-10 opacity-30 blur-lg"
                  style={{ backgroundColor: color }}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * MilestoneAnnouncer - Adaptive entry point that decides which announcer to show.
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());
  const isRetro = useIsRetro();

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  if (isMobile) {
    return <MobileAnnouncer {...props} isRetro={isRetro} />;
  }

  return <DesktopAnnouncer {...props} isRetro={isRetro} />;
});
