import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { HudEventRail } from './HudGhostRail';

interface AchievementPopupProps {
  achievement: { name: string; icon: string; color: string } | null;
}

const text = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(' ') : value;

const DesktopAchievement: React.FC<AchievementPopupProps & { isRetro: boolean }> = ({
  achievement,
  isRetro,
}) => {
  const { t } = useLanguage();
  if (!achievement) return null;

  return (
    <div
      className="pointer-events-none absolute right-4 top-80 z-[140]"
      style={{
        animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      {isRetro ? (
        <div
          className="flex items-center gap-3 rounded-none border-4 px-5 py-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: achievement.color,
          }}
        >
          <AchievementContent
            achievement={achievement}
            label={text(t('hud.achievement'))}
          />
        </div>
      ) : (
        <HudEventRail tone="gold" className="flex items-center gap-3 px-3 py-2">
          <AchievementContent
            achievement={achievement}
            label={text(t('hud.achievement'))}
          />
        </HudEventRail>
      )}
    </div>
  );
};

const AchievementContent: React.FC<{
  achievement: NonNullable<AchievementPopupProps['achievement']>;
  label: string;
}> = ({ achievement, label }) => (
  <>
    <div className="text-4xl">{achievement.icon}</div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
        {label}
      </span>

      <span
        className="text-xl font-black italic tracking-tight"
        style={{ color: achievement.color }}
      >
        {achievement.name}
      </span>
    </div>
  </>
);

const MobileAchievement: React.FC<AchievementPopupProps & { isRetro: boolean }> = ({
  achievement,
  isRetro,
}) => {
  const { t } = useLanguage();
  const { rs, rfs } = useResponsiveUI();
  if (!achievement) return null;

  return (
    <div
      className="pointer-events-none absolute right-4 z-[140]"
      style={{
        animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        top: `calc(${rs(70)}px + env(safe-area-inset-top, 0px))`,
        width: rs(140),
      }}
    >
      {isRetro ? (
        <div
          className="flex items-center rounded-none border-2"
          style={{
            backgroundColor: 'black',
            borderColor: achievement.color,
            padding: `${rs(6)}px ${rs(10)}px`,
            gap: rs(8),
          }}
        >
          <div style={{ fontSize: rfs(20) }}>{achievement.icon}</div>
          <div className="flex flex-col overflow-hidden">
            <span
              className="whitespace-nowrap font-black uppercase tracking-widest text-white"
              style={{ fontSize: rfs(7) }}
            >
              {text(t('hud.achievement')).toUpperCase()}
            </span>

            <span
              className="mt-0.5 truncate font-black italic leading-none tracking-tight text-white"
              style={{ fontSize: rfs(12) }}
            >
              {achievement.name}
            </span>
          </div>
        </div>
      ) : (
        <HudEventRail tone="gold" className="flex items-center gap-2 px-2 py-1">
          <div style={{ fontSize: rfs(20) }}>{achievement.icon}</div>
          <div className="flex flex-col overflow-hidden">
            <span
              className="whitespace-nowrap font-black uppercase tracking-widest text-white/80"
              style={{ fontSize: rfs(7) }}
            >
              {text(t('hud.achievement')).toUpperCase()}
            </span>
            <span
              className="mt-0.5 truncate font-black italic leading-none tracking-tight text-white"
              style={{ fontSize: rfs(12) }}
            >
              {achievement.name}
            </span>
          </div>
        </HudEventRail>
      )}
    </div>
  );
};

export const AchievementPopup: React.FC<AchievementPopupProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());
  const isRetro = useIsRetro();

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? (
    <MobileAchievement {...props} isRetro={isRetro} />
  ) : (
    <DesktopAchievement {...props} isRetro={isRetro} />
  );
});
