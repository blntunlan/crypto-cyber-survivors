import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';

interface AchievementPopupProps {
  achievement: { name: string; icon: string; color: string } | null;
}

const DesktopAchievement: React.FC<AchievementPopupProps> = ({ achievement }) => {
  if (!achievement) return null;
  return (
    <div
      className="absolute top-64 right-4 z-[140] pointer-events-none"
      style={{ animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-lg"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: achievement.color,
          boxShadow: `0 0 15px ${achievement.color}44`,
          willChange: 'transform',
        }}
      >
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            Achievement!
          </span>
          <span
            className="text-xl font-black italic tracking-tight"
            style={{ color: achievement.color }}
          >
            {achievement.name}
          </span>
        </div>
      </div>
    </div>
  );
};

const MobileAchievement: React.FC<AchievementPopupProps> = ({ achievement }) => {
  if (!achievement) return null;
  return (
    <div
      className="absolute top-44 right-4 z-[140] pointer-events-none w-[140px]"
      style={{
        animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        top: 'calc(11rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-xl backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: achievement.color,
          boxShadow: `0 0 10px ${achievement.color}33`,
        }}
      >
        <div className="text-xl">{achievement.icon}</div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[7px] font-black uppercase tracking-widest text-blue-400 opacity-80 whitespace-nowrap">
            ACHIEVEMENT!
          </span>
          <span className="text-xs font-black italic tracking-tight text-white leading-none mt-0.5 truncate">
            {achievement.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AchievementPopup: React.FC<AchievementPopupProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileAchievement {...props} /> : <DesktopAchievement {...props} />;
});
