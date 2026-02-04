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
      className="pointer-events-none absolute bottom-44 left-1/2 z-[115] flex min-w-[150px] flex-col items-center bg-transparent p-3 transition-all duration-300 ease-out"
      style={{
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className={`mb-2 flex gap-3 text-[8px] font-black uppercase tracking-widest ${isRetro ? 'font-display' : 'font-cyber'}`}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 ${
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-yellow-400'
          }`}
          style={{
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.JACKPOT_YELLOW,
            boxShadow: isRetro ? 'none' : '0 0 15px rgba(255, 214, 0, 0.15)',
          }}
        >
          <span className="opacity-70">{t('hud.best')}</span>
          <span className="font-black tabular-nums">{maxStreak}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 ${
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-cyan-400'
          }`}
          style={{
            borderColor: isRetro ? COLORS.NEON_GREEN : undefined,
            color: isRetro ? COLORS.NEON_GREEN : COLORS.ELECTRIC_BLUE,
            boxShadow: isRetro ? 'none' : '0 0 15px rgba(0, 191, 255, 0.15)',
          }}
        >
          <span className="opacity-70">{t('hud.bonus')}</span>
          <span className="font-black tabular-nums">+{Math.round(totalBonusXp)}</span>
        </div>
      </div>

      <div className="w-full">
        <div
          className={`relative mb-3 h-2 w-full ${
            isRetro
              ? 'rounded-none border-2 border-[#39FF14]/40 bg-[#0a0a12]'
              : 'overflow-hidden rounded-sm border border-white/5 bg-black/20'
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
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
          )}
        </div>

        <div className="flex items-baseline justify-center gap-2">
          <span
            id="combo-streak-count"
            className={`${isRetro ? 'font-display' : 'font-cyber'} text-2xl font-black italic tabular-nums tracking-tighter ${
              isRetro
                ? 'not-italic text-[#FFD600]'
                : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'
            }`}
            style={{
              textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : undefined,
            }}
          >
            0
          </span>
          <span
            className={`font-cyber text-[8px] font-black uppercase tracking-widest ${
              isRetro ? 'text-[#39FF14]' : 'text-cyan-400'
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
          className={`mt-2 px-3 py-1 text-center text-[10px] font-black italic tracking-tighter ${
            isRetro
              ? 'rounded-none border-2 border-white bg-black not-italic'
              : 'skew-x-[-12deg] rounded-sm text-white'
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
      className="pointer-events-none absolute left-1/2 z-[115] flex flex-col items-center transition-all duration-200 ease-out"
      style={{
        bottom: rs(160),
        minWidth: rs(150),
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className={`mb-3 flex font-black uppercase tracking-tight ${isRetro ? 'font-display' : 'font-cyber'}`}
        style={{ gap: rs(8), fontSize: rfs(9) }}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-1 ${
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-yellow-400'
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
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-cyan-400'
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
          className={`relative mb-2.5 h-2.5 w-full overflow-hidden ${
            isRetro
              ? 'border-2 border-white bg-black'
              : 'rounded-sm border border-white/5 bg-black/40'
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
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
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
            className={`${isRetro ? 'font-display' : 'font-cyber'} font-black italic tabular-nums leading-none tracking-tighter text-white ${
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
          className={`mt-2 text-center font-black italic ${
            isRetro
              ? 'font-display not-italic'
              : 'skew-x-[-12deg] rounded-sm font-cyber text-white'
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
