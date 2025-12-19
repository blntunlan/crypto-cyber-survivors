import React from 'react';

interface AchievementPopupProps {
    achievement: { name: string; icon: string; color: string } | null;
}

/**
 * AchievementPopup - Slide-in notification for achievements
 */
export const AchievementPopup: React.FC<AchievementPopupProps> = ({ achievement }) => {
    if (!achievement) return null;

    return (
        <div
            className="absolute top-20 right-4 z-[140] pointer-events-none"
            style={{ animation: 'achievementSlideIn 3.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
            <div
                className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-2xl"
                style={{
                    background: `linear-gradient(135deg, ${achievement.color}22 0%, ${achievement.color}44 100%)`,
                    borderColor: achievement.color,
                    boxShadow: `0 0 30px ${achievement.color}66, inset 0 0 20px ${achievement.color}22`
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
