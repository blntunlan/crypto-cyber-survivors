import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();

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
        className={`flex gap-3 mb-2 text-[8px] font-black uppercase tracking-widest ${isRetro ? 'font-display' : 'font-cyber'}`}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 ${
            isRetro
              ? 'border-2 rounded-none bg-black'
              : 'border-l-2 border-l-yellow-400 rounded-sm'
          }`}
          style={{
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.JACKPOT_YELLOW,
            boxShadow: isRetro ? 'none' : '0 0 15px rgba(255, 214, 0, 0.15)',
          }}
        >
          <span className="opacity-70">{t('hud.best')}</span>
          <span className="tabular-nums font-black">{maxStreak}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 ${
            isRetro
              ? 'border-2 rounded-none bg-black'
              : 'border-l-2 border-l-cyan-400 rounded-sm'
          }`}
          style={{
            borderColor: isRetro ? COLORS.NEON_GREEN : undefined,
            color: isRetro ? COLORS.NEON_GREEN : COLORS.ELECTRIC_BLUE,
            boxShadow: isRetro ? 'none' : '0 0 15px rgba(0, 191, 255, 0.15)',
          }}
        >
          <span className="opacity-70">{t('hud.bonus')}</span>
          <span className="tabular-nums font-black">+{Math.round(totalBonusXp)}</span>
        </div>
      </div>

      <div className="w-full">
        <div
          className={`w-full h-2 mb-3 relative ${
            isRetro
              ? 'bg-zinc-800 rounded-none border-2 border-black'
              : 'bg-black/20 rounded-sm border border-white/5 overflow-hidden'
          }`}
        >
          <div
            id="combo-timer-bar"
            className={`h-full ${
              isRetro
                ? ''
                : 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]'
            }`}
            style={{
              width: '100%',
              backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            }}
          />
          {!isRetro && (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)] pointer-events-none" />
          )}
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span
            id="combo-streak-count"
            className={`${isRetro ? 'font-display' : 'font-cyber'} text-2xl font-black italic tracking-tighter text-white tabular-nums ${
              isRetro ? 'not-italic' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'
            }`}
            style={{
              textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : undefined,
            }}
          >
            0
          </span>
          <span
            className={`font-cyber text-[8px] font-black uppercase tracking-widest ${
              isRetro ? 'text-white' : 'text-cyan-400'
            }`}
            style={{
              textShadow: isRetro ? 'none' : '0 0 8px rgba(34, 211, 238, 0.5)',
            }}
          >
            {t('hud.combo')}
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={`mt-2 px-3 py-1 font-black italic tracking-tighter text-center text-[10px] ${
            isRetro
              ? 'rounded-none border-2 border-white bg-black not-italic'
              : 'text-white rounded-sm skew-x-[-12deg]'
          }`}
          style={{
            color: isRetro ? COLORS.JACKPOT_YELLOW : '#ffffff',
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            textShadow: isRetro ? 'none' : '0 0 10px rgba(0, 255, 255, 0.5)',
          }}
        >
          <div className={isRetro ? '' : 'skew-x-[12deg]'}>1.0x XP</div>
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
  const { t } = useLanguage();

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 z-[115] transition-all duration-200 ease-out flex flex-col items-center pointer-events-none"
      style={{
        bottom: rs(160),
        minWidth: rs(150),
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className={`flex mb-3 font-black uppercase tracking-tight ${isRetro ? 'font-display' : 'font-cyber'}`}
        style={{ gap: rs(8), fontSize: rfs(9) }}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-1 ${
            isRetro
              ? 'border-2 rounded-none bg-black'
              : 'border-l-2 border-l-yellow-400 rounded-sm'
          }`}
          style={{
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.JACKPOT_YELLOW,
          }}
        >
          <span className="opacity-70">{t('hud.best')}</span>
          <span className="tabular-nums">{maxStreak}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2 py-1 ${
            isRetro
              ? 'border-2 rounded-none bg-black'
              : 'border-l-2 border-l-cyan-400 rounded-sm'
          }`}
          style={{
            borderColor: isRetro ? COLORS.NEON_GREEN : undefined,
            color: isRetro ? COLORS.NEON_GREEN : COLORS.ELECTRIC_BLUE,
          }}
        >
          <span className="opacity-70">{t('hud.bonus')}</span>
          <span className="tabular-nums">+{Math.round(totalBonusXp)}</span>
        </div>
      </div>

      <div className="w-full" style={{ paddingLeft: rs(4), paddingRight: rs(4) }}>
        <div
          className={`w-full h-2.5 mb-2.5 relative overflow-hidden ${
            isRetro
              ? 'bg-black border-2 border-white'
              : 'bg-black/40 border border-white/5 rounded-sm'
          }`}
        >
          <div
            id="combo-timer-bar"
            className={`h-full ${
              isRetro
                ? ''
                : 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]'
            }`}
            style={{
              width: '100%',
              backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            }}
          />
          {!isRetro && (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)] pointer-events-none" />
          )}
        </div>

        <div
          className={`flex items-baseline justify-center ${
            isRetro ? '' : 'drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]'
          }`}
          style={{ gap: rs(6) }}
        >
          <span
            id="combo-streak-count"
            className={`${isRetro ? 'font-display' : 'font-cyber'} font-black italic tracking-tighter text-white tabular-nums leading-none ${
              isRetro ? 'not-italic' : ''
            }`}
            style={{
              textShadow: isRetro
                ? `3px 3px 0px ${COLORS.SLOT_BLACK}`
                : '0 0 30px rgba(255,255,255,0.8)',
              fontSize: rfs(40),
            }}
          >
            0
          </span>
          <span
            className={`font-cyber font-black uppercase tracking-widest ${
              isRetro ? 'text-white' : 'text-cyan-400'
            }`}
            style={{ fontSize: rfs(12) }}
          >
            {t('hud.combo')}
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={`mt-2 font-black italic text-center ${
            isRetro
              ? 'font-display not-italic'
              : 'font-cyber text-white rounded-sm skew-x-[-12deg]'
          }`}
          style={{
            fontSize: rfs(14),
            color: isRetro ? COLORS.JACKPOT_YELLOW : '#ffffff',
            textShadow: isRetro ? 'none' : '0 0 10px rgba(0,255,255,0.5)',
          }}
        >
          <div className={isRetro ? '' : 'skew-x-[12deg]'}>1.0x XP</div>
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
