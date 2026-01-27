import React, { memo } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants';

interface ClutchAnnouncementProps {
  active: boolean;
}

const DesktopClutch: React.FC<{ isRetro: boolean }> = ({ isRetro }) => {
  const { t } = useLanguage();
  return (
    <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
      <div className="animate-bounce-short">
        <div
          className={`relative text-white font-black italic text-6xl skew-x-[-15deg] tracking-tighter px-10 py-4 ${
            isRetro
              ? 'border-4 rounded-none shadow-[8px_8px_0_#000]'
              : 'bg-gradient-to-r from-red-600 to-orange-600 shadow-[0_0_20px_rgba(255,0,0,0.6)] border-4 border-yellow-400 rounded-xl'
          }`}
          style={{
            backgroundColor: isRetro ? COLORS.CASINO_RED : undefined,
            borderColor: isRetro ? 'white' : undefined,
          }}
        >
          <span
            style={{ textShadow: isRetro ? '4px 4px 0 #000' : 'none' }}
            className={!isRetro ? 'drop-shadow-[4px_4px_0_#000]' : ''}
          >
            {t('hud.clutch')}
          </span>

          {/* Decorative elements */}
          {isRetro ? (
            <>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black" />
            </>
          ) : (
            <>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 border-2 border-black rounded-full" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 border-2 border-black rounded-full" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MobileClutch: React.FC<{ isRetro: boolean }> = ({ isRetro }) => {
  const { rs, rfs } = useResponsiveUI();
  const { t } = useLanguage();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[130] pointer-events-none flex flex-col items-center gap-1"
      style={{ top: '25%' }}
    >
      <div
        className={`text-white font-black italic skew-x-[-12deg] tracking-tight animate-pulse transition-all ${
          isRetro
            ? 'border-white rounded-none'
            : 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-[0_0_15px_rgba(255,100,0,0.5)] border-yellow-300 rounded-lg'
        }`}
        style={{
          backgroundColor: isRetro ? COLORS.CASINO_RED : undefined,
          fontSize: rfs(32),
          padding: `${rs(8)}px ${rs(24)}px`,
          borderWidth: rs(4),
          boxShadow: isRetro
            ? `${rs(6)}px ${rs(6)}px 0 #000`
            : `${rs(4)}px ${rs(4)}px 0 #000`,
        }}
      >
        <span style={{ textShadow: isRetro ? '2px 2px 0 #000' : 'none' }}>
          {t('hud.clutch')}
        </span>
      </div>

      <div
        className={`${isRetro ? 'bg-black text-white' : 'bg-black/80 text-yellow-300'} font-bold uppercase tracking-widest skew-x-[-12deg] px-2 shadow-[2px_2px_0_#000]`}
        style={{
          fontSize: rfs(10),
          color: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
        }}
      >
        {t('hud.recovered')}
      </div>
    </div>
  );
};

export const ClutchAnnouncement: React.FC<ClutchAnnouncementProps> = memo(
  ({ active }) => {
    const isMobile = screenService.isMobile();
    const isRetro = useIsRetro();

    if (!active) return null;

    return isMobile ? (
      <MobileClutch isRetro={isRetro} />
    ) : (
      <DesktopClutch isRetro={isRetro} />
    );
  }
);
