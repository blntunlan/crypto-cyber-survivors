import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';

interface AchievementPopupProps {
  achievement: { name: string; icon: string; color: string } | null;
}

const DesktopAchievement: React.FC<AchievementPopupProps & { isRetro: boolean }> = ({
  achievement,
  isRetro,
}) => {
  if (!achievement) return null;
  return (
    <div
      className="absolute top-80 right-4 z-[140] pointer-events-none"
      style={{ animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 ${isRetro ? 'border-4 rounded-none' : 'border-2 rounded-xl shadow-lg'}`}
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: achievement.color,
          boxShadow: isRetro ? '6px 6px 0 #000' : `0 0 15px ${achievement.color}44`,
          willChange: 'transform',
        }}
      >
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex flex-col">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${isRetro ? 'text-white' : 'text-white/70'}`}
          >
            Achievement!
          </span>
          <span
            className={`text-xl font-black italic tracking-tight ${isRetro ? 'text-shadow-retro' : ''}`}
            style={{ color: achievement.color }}
          >
            {achievement.name}
          </span>
        </div>
      </div>
    </div>
  );
};

const MobileAchievement: React.FC<AchievementPopupProps & { isRetro: boolean }> = ({
  achievement,
  isRetro,
}) => {
  const { rs, rfs } = useResponsiveUI();

  if (!achievement) return null;
  return (
    <div
      className="absolute right-4 z-[140] pointer-events-none"
      style={{
        animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        top: `calc(${rs(220)}px + env(safe-area-inset-top, 0px))`,
        width: rs(140),
      }}
    >
      <div
        className={`flex items-center border shadow-xl ${isRetro ? 'rounded-none border-2' : 'rounded-lg backdrop-blur-md'}`}
        style={{
          backgroundColor: isRetro ? 'black' : 'rgba(15, 23, 42, 0.95)',
          borderColor: achievement.color,
          boxShadow: isRetro ? `${rs(4)}px ${rs(4)}px 0 #000` : `0 0 10px ${achievement.color}33`,
          padding: `${rs(6)}px ${rs(10)}px`,
          gap: rs(8),
        }}
      >
        <div style={{ fontSize: rfs(20) }}>{achievement.icon}</div>
        <div className="flex flex-col overflow-hidden">
          <span
            className={`font-black uppercase tracking-widest ${isRetro ? 'text-white' : 'text-blue-400 opacity-80'} whitespace-nowrap`}
            style={{ fontSize: rfs(7) }}
          >
            ACHIEVEMENT!
          </span>
          <span
            className="font-black italic tracking-tight text-white leading-none mt-0.5 truncate"
            style={{ fontSize: rfs(12) }}
          >
            {achievement.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AchievementPopup: React.FC<AchievementPopupProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());
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
