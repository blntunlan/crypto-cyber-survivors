import React, { memo } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants';
import { HudEventRail } from './HudGhostRail';

interface ClutchAnnouncementProps {
  active: boolean;
}

const DesktopClutch: React.FC<{ isRetro: boolean }> = ({ isRetro }) => {
  const { t } = useLanguage();

  if (!isRetro) {
    return (
      <div className="pointer-events-none absolute left-1/2 top-[20%] z-[130] -translate-x-1/2">
        <div className="motion-safe:animate-pulse">
          <HudEventRail tone="danger" className="px-5 py-2 text-center">
            <span className="text-4xl font-black italic tracking-tighter text-white">
              {t('hud.clutch')}
            </span>
          </HudEventRail>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-[20%] z-[130] -translate-x-1/2">
      <div className="motion-safe:animate-pulse">
        <div
          className="relative skew-x-[-15deg] rounded-none border-4 px-10 py-4 text-6xl font-black italic tracking-tighter text-white shadow-[8px_8px_0_#000]"
          style={{
            backgroundColor: COLORS.CASINO_RED,
            borderColor: 'white',
          }}
        >
          <span style={{ textShadow: '4px 4px 0 #000' }}>{t('hud.clutch')}</span>

          {/* Decorative elements */}
          <div className="absolute -left-2 -top-2 h-4 w-4 border-2 border-black bg-white" />
          <div className="absolute -bottom-2 -right-2 h-4 w-4 border-2 border-black bg-white" />
        </div>
      </div>
    </div>
  );
};

const MobileClutch: React.FC<{ isRetro: boolean }> = ({ isRetro }) => {
  const { rs, rfs } = useResponsiveUI();
  const { t } = useLanguage();

  if (!isRetro) {
    return (
      <div className="pointer-events-none absolute left-1/2 top-1/4 z-[130] flex -translate-x-1/2 flex-col items-center gap-1">
        <HudEventRail tone="danger" className="px-4 py-2 text-center">
          <span
            className="font-black italic tracking-tight text-white"
            style={{ fontSize: rfs(28) }}
          >
            {t('hud.clutch')}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D6B85C]">
            {t('hud.recovered')}
          </span>
        </HudEventRail>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-[130] flex -translate-x-1/2 flex-col items-center gap-1"
      style={{ top: '25%' }}
    >
      <div
        className="skew-x-[-12deg] animate-pulse rounded-none border-white font-black italic tracking-tight text-white transition-all"
        style={{
          backgroundColor: COLORS.CASINO_RED,
          fontSize: rfs(32),
          padding: `${rs(8)}px ${rs(24)}px`,
          borderWidth: rs(4),
          boxShadow: `${rs(6)}px ${rs(6)}px 0 #000`,
        }}
      >
        <span style={{ textShadow: '2px 2px 0 #000' }}>{t('hud.clutch')}</span>
      </div>

      <div
        className="skew-x-[-12deg] bg-black px-2 font-bold uppercase tracking-widest text-white shadow-[2px_2px_0_#000]"
        style={{
          fontSize: rfs(10),
          color: COLORS.JACKPOT_YELLOW,
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
