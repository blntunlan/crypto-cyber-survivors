import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';

interface ComboPanelProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxStreak: number;
  totalBonusXp: number;
}

const DesktopComboPanel: React.FC<ComboPanelProps> = ({
  containerRef,
  maxStreak,
  totalBonusXp,
}) => (
  <div
    ref={containerRef}
    className="absolute bottom-40 left-1/2 z-[115] bg-transparent p-3 min-w-[150px] transition-all duration-300 ease-out flex flex-col items-center pointer-events-none"
    style={{
      opacity: 0,
      transform: 'translateX(-50%) translateY(20px)',
      willChange: 'transform, opacity',
    }}
  >
    <div className="flex gap-3 mb-2 text-[9px] font-black uppercase tracking-widest">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
        <span>BEST</span>
        <span className="tabular-nums">{maxStreak}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
        <span>BONUS</span>
        <span className="tabular-nums">+{Math.round(totalBonusXp)}</span>
      </div>
    </div>

    <div className="w-full">
      <div className="w-full h-1.5 bg-white/10 mb-3 rounded-full overflow-hidden p-[1px]">
        <div
          id="combo-timer-bar"
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_orange]"
          style={{ width: '100%' }}
        />
      </div>

      <div className="flex items-baseline justify-center gap-2">
        <span
          id="combo-streak-count"
          className="text-4xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        >
          0
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
          COMBO
        </span>
      </div>

      <div
        id="combo-multiplier-badge"
        className="mt-2 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-black italic tracking-tighter text-center text-xs shadow-xl"
      >
        1.0x XP
      </div>
    </div>
  </div>
);

const MobileComboPanel: React.FC<ComboPanelProps> = ({ containerRef, maxStreak, totalBonusXp }) => {
  const { rs, rfs } = useResponsiveUI();

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 z-[115] bg-transparent transition-all duration-300 ease-out flex flex-col items-center pointer-events-none"
      style={{
        bottom: rs(110),
        padding: rs(6),
        minWidth: rs(80),
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Compact Stats with contrast shadows */}
      <div
        className="flex mb-1 font-black uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        style={{ gap: rs(5), fontSize: rfs(6) }}
      >
        <span className="text-yellow-400">BEST {maxStreak}</span>
        <span className="text-cyan-400">+{Math.round(totalBonusXp)} XP</span>
      </div>

      <div className="w-full" style={{ paddingLeft: rs(3), paddingRight: rs(3) }}>
        {/* Minimal Timer Bar */}
        <div className="w-full h-1 bg-white/20 mb-1.5 rounded-full overflow-hidden shadow-[0_0_5px_rgba(0,0,0,0.5)]">
          <div
            id="combo-timer-bar"
            className="h-full bg-cyan-400 shadow-[0_0_8px_cyan]"
            style={{ width: '100%' }}
          />
        </div>

        <div
          className="flex items-center justify-center drop-shadow-[0_0_10px_rgba(0,0,0,1)]"
          style={{ gap: rs(4) }}
        >
          <span
            id="combo-streak-count"
            className="font-black italic tracking-tighter text-white tabular-nums"
            style={{
              textShadow: '0 0 20px rgba(0,0,0,1), 0 0 10px rgba(255,255,255,0.3)',
              fontSize: rfs(20),
            }}
          >
            0
          </span>
          <span
            className="font-black uppercase tracking-tighter text-white/60"
            style={{ fontSize: rfs(7) }}
          >
            COMBO
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className="mt-1 text-cyan-400 font-black italic text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{ fontSize: rfs(8) }}
        >
          1.0x XP
        </div>
      </div>
    </div>
  );
};

export const ComboPanel: React.FC<ComboPanelProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileComboPanel {...props} /> : <DesktopComboPanel {...props} />;
});
