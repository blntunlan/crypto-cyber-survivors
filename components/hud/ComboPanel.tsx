import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';

interface ComboPanelProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxStreak: number;
  totalBonusXp: number;
}

const DesktopComboPanel: React.FC<ComboPanelProps> = ({
  containerRef,
  maxStreak,
  totalBonusXp,
}) => {
  const isRetro = useIsRetro();

  return (
    <div
      ref={containerRef}
      className="absolute bottom-44 left-1/2 z-[115] bg-transparent p-3 min-w-[150px] transition-all duration-300 ease-out flex flex-col items-center pointer-events-none"
      style={{
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className={`flex gap-3 mb-2 text-[6px] font-black uppercase tracking-widest ${isRetro ? 'font-display' : ''}`}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 ${isRetro ? 'border-2 rounded-none bg-black' : 'rounded-full bg-yellow-500/10 border border-yellow-500/20'}`}
          style={{
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            color: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
          }}
        >
          <span>BEST</span>
          <span className="tabular-nums">{maxStreak}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 ${isRetro ? 'border-2 rounded-none bg-black' : 'rounded-full bg-green-500/10 border border-green-500/20'}`}
          style={{
            borderColor: isRetro ? COLORS.NEON_GREEN : undefined,
            color: isRetro ? COLORS.NEON_GREEN : undefined,
          }}
        >
          <span>BONUS</span>
          <span className="tabular-nums">+{Math.round(totalBonusXp)}</span>
        </div>
      </div>

      <div className="w-full">
        <div
          className={`w-full h-2 mb-3 ${isRetro ? 'bg-zinc-800 rounded-none border-2 border-black' : 'bg-white/10 rounded-full overflow-hidden p-[1px]'}`}
        >
          <div
            id="combo-timer-bar"
            className={`h-full ${isRetro ? '' : 'rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_orange]'}`}
            style={{
              width: '100%',
              backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            }}
          />
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span
            id="combo-streak-count"
            className={`text-2xl font-black italic tracking-tighter text-white tabular-nums ${isRetro ? 'font-display not-italic' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]'}`}
            style={{
              textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : undefined,
            }}
          >
            0
          </span>
          <span
            className={`text-[8px] font-black uppercase tracking-widest ${isRetro ? 'font-display text-white' : 'text-white/60'}`}
          >
            COMBO
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={`mt-2 px-2 py-0.5 font-black italic tracking-tighter text-center text-[9px] ${isRetro ? 'rounded-none border-2 border-white bg-black not-italic' : 'rounded-lg bg-white/10 border border-white/20 text-white shadow-xl'}`}
          style={{
            color: isRetro ? COLORS.JACKPOT_YELLOW : '#ffffff',
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
          }}
        >
          1.0x XP
        </div>
      </div>
    </div>
  );
};

const MobileComboPanel: React.FC<ComboPanelProps> = ({
  containerRef,
  maxStreak,
  totalBonusXp,
}) => {
  const { rs, rfs } = useResponsiveUI();
  const isRetro = useIsRetro();

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 z-[115] bg-transparent transition-all duration-300 ease-out flex flex-col items-center pointer-events-none"
      style={{
        bottom: rs(140),
        padding: rs(6),
        minWidth: rs(80),
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Compact Stats with contrast shadows */}
      <div
        className={`flex mb-1 font-black uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isRetro ? 'font-display' : ''}`}
        style={{ gap: rs(5), fontSize: rfs(6) }}
      >
        <span style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : '#fbbf24' }}>
          BEST {maxStreak}
        </span>
        <span style={{ color: isRetro ? COLORS.NEON_GREEN : '#22d3ee' }}>
          +{Math.round(totalBonusXp)} XP
        </span>
      </div>

      <div className="w-full" style={{ paddingLeft: rs(3), paddingRight: rs(3) }}>
        {/* Minimal Timer Bar */}
        <div
          className={`w-full h-1.5 mb-1.5 overflow-hidden ${isRetro ? 'bg-black border border-white' : 'bg-white/20 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]'}`}
        >
          <div
            id="combo-timer-bar"
            className={`h-full ${isRetro ? '' : 'bg-cyan-400 shadow-[0_0_8px_cyan]'}`}
            style={{
              width: '100%',
              backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            }}
          />
        </div>

        <div
          className={`flex items-center justify-center ${isRetro ? '' : 'drop-shadow-[0_0_10px_rgba(0,0,0,1)]'}`}
          style={{ gap: rs(4) }}
        >
          <span
            id="combo-streak-count"
            className={`font-black italic tracking-tighter text-white tabular-nums ${isRetro ? 'font-display not-italic' : ''}`}
            style={{
              textShadow: isRetro
                ? `2px 2px 0px ${COLORS.SLOT_BLACK}`
                : '0 0 20px rgba(0,0,0,1), 0 0 10px rgba(255,255,255,0.3)',
              fontSize: rfs(20),
            }}
          >
            0
          </span>
          <span
            className={`font-black uppercase tracking-tighter ${isRetro ? 'font-display text-white' : 'text-white/60'}`}
            style={{ fontSize: rfs(7) }}
          >
            COMBO
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={`mt-1 font-black italic text-center ${isRetro ? 'font-display not-italic' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}`}
          style={{
            fontSize: rfs(8),
            color: isRetro ? COLORS.JACKPOT_YELLOW : '#22d3ee',
          }}
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
