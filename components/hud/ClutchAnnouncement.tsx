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
    <div className="pointer-events-none absolute left-1/2 top-[20%] z-[130] -translate-x-1/2">
      <div className="animate-bounce-short">
        <div
          className={`relative skew-x-[-15deg] px-10 py-4 text-6xl font-black italic tracking-tighter text-white ${
            isRetro
              ? 'rounded-none border-4 shadow-[8px_8px_0_#000]'
              : 'rounded-sm border-4 border-yellow-400 bg-gradient-to-r from-red-600 to-orange-600 shadow-[0_0_20px_rgba(255,0,0,0.6)]'
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
              <div className="absolute -left-2 -top-2 h-4 w-4 border-2 border-black bg-white" />
              <div className="absolute -bottom-2 -right-2 h-4 w-4 border-2 border-black bg-white" />
            </>
          ) : (
            <>
              <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-black bg-yellow-400" />
              <div className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-black bg-yellow-400" />
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
      className="pointer-events-none absolute left-1/2 z-[130] flex -translate-x-1/2 flex-col items-center gap-1"
      style={{ top: '25%' }}
    >
      <div
        className={`skew-x-[-12deg] animate-pulse font-black italic tracking-tight text-white transition-all ${
          isRetro
            ? 'rounded-none border-white'
            : 'rounded-lg border-yellow-300 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-[0_0_15px_rgba(255,100,0,0.5)]'
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
        className={`${isRetro ? 'bg-black text-white' : 'bg-black/80 text-yellow-300'} skew-x-[-12deg] px-2 font-bold uppercase tracking-widest shadow-[2px_2px_0_#000]`}
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
