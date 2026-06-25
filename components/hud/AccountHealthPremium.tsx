import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { COLORS } from '../../constants';

import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

interface AccountHealthProps {
  hpPercent: number;
  hp: number;
  maxHp: number;
}

/**
 * Premium version of Account Health
 * Styled like a high-end trading terminal / Cyberpunk HUD
 *
 * NOTE: Wave phase display removed in AI Director V2
 * Difficulty now driven by market conditions
 */
const PremiumHealthInner: React.FC<AccountHealthProps & { isMobile: boolean }> = ({
  hpPercent,
  hp,
  maxHp,

  isMobile,
}) => {
  const { t } = useLanguage();
  const { rs, rfs, isSmallDevice, bottomSafeZone } = useResponsiveUI();

  const isRetro = useIsRetro();
  // Wave phase tracking removed - AI Director V2

  const getStatusConfig = () => {
    if (hpPercent > 75) {
      return {
        text: t('hud.equity_secure'),
        color: 'text-cyan-400',
        bg: `linear-gradient(90deg, ${COLORS.CASINO_GREEN}, ${COLORS.PUMP_GREEN})`,
        glow: COLORS.CASINO_GREEN,
      };
    }
    if (hpPercent > 50) {
      return {
        text: t('hud.margin_caution'),
        color: 'text-yellow-400',
        bg: `linear-gradient(90deg, ${COLORS.CASINO_GOLD}, ${COLORS.JACKPOT_YELLOW})`,
        glow: COLORS.CASINO_GOLD,
      };
    }
    if (hpPercent > 25) {
      return {
        text: t('hud.margin_pressure'),
        color: 'text-orange-500',
        bg: `linear-gradient(90deg, ${COLORS.NEON_ORANGE}, ${COLORS.DUMP_ORANGE})`,
        glow: COLORS.NEON_ORANGE,
      };
    }
    return {
      text: t('hud.liquidation_risk'),
      color: 'text-red-600',
      bg: `linear-gradient(90deg, ${COLORS.CASINO_RED}, ${COLORS.SUPER_CRIT})`,
      glow: COLORS.CASINO_RED,
    };
  };

  const status = getStatusConfig();
  const isCritical = hpPercent <= 25;

  // Mobile: Ultra-minimal HP bar only
  // Desktop: Full info bar with wave phase, status, etc.
  return (
    <div
      className={`hud-bottom-safe pointer-events-none fixed left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center transition-all duration-500 ${
        isMobile ? (isSmallDevice ? 'w-[70%]' : 'w-[75%]') : 'bottom-10 w-[450px]'
      }`}
      style={
        isMobile
          ? {
              // Move further down on mobile
              bottom: rs(8) + bottomSafeZone * 0.2, // Move significantly lower
              // Keep shadow for depth
              filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))',
            }
          : undefined
      }
    >
      {/* Top Info Bar - Combined Desktop/Mobile */}
      <div className="mb-2 flex w-full items-end justify-between px-1 font-stats tracking-tighter">
        <div className="flex flex-col">
          <span
            className="font-bold uppercase text-slate-500 opacity-60"
            style={{ fontSize: isMobile ? rfs(8) : '10px' }}
          >
            {t('hud.system_phase')}
          </span>

          {/* AI Director V2: Simplified "ACTIVE" status - Now shown on mobile too */}
          <span
            className="font-black uppercase italic text-cyan-400"
            style={{ fontSize: isMobile ? rfs(12) : '16px' }}
          >
            {t('hud.phases.active')}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div
            className={`rounded-t border-x border-t border-white/10 bg-slate-900 px-2 py-0.5 font-black ${status.color} ${isCritical ? 'animate-pulse' : ''}`}
            style={{ fontSize: isMobile ? rfs(8) : '10px' }}
          >
            {status.text}
          </div>
          <div
            className={`font-black tabular-nums leading-none text-white ${isRetro ? 'text-shadow-retro' : 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]'}`}
            style={{ fontSize: isMobile ? rfs(20) : '30px' }}
          >
            {Math.ceil(hp)}
            <span
              className={`ml-0.5 opacity-70`}
              style={{ fontSize: isMobile ? rfs(10) : '12px' }}
            >
              /{Math.ceil(maxHp)}
            </span>
          </div>
        </div>

        <div className="flex min-w-[40px] flex-col items-end md:min-w-[80px]">
          {/* Empty space for balance */}
        </div>
      </div>

      {/* Main Health Bar Container - Thinner on mobile */}
      <div
        className={`group relative w-full overflow-hidden rounded-sm border border-white/10 bg-slate-950/60 ${isMobile ? 'p-[2px]' : 'p-[3px] shadow-2xl backdrop-blur-xl'}`}
        style={{ height: isMobile ? rs(8) : '16px' }}
      >
        {/* Background Grid Pattern - Desktop only */}
        {!isMobile && (
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '10px 10px',
            }}
          />
        )}

        {/* Shimmer/Scanline Effect - Optimized frequency for mobile - Hidden in retro */}
        {!isRetro && (
          <div
            className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent ${isMobile ? 'animate-[shimmer_5s_infinite]' : 'animate-[shimmer_3s_infinite]'}`}
          />
        )}

        {/* The Actual Health Bar */}
        <div
          className={`relative h-full rounded-sm transition-all duration-500 ease-out ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${hpPercent}%`,
            background: status.bg,
            boxShadow: isRetro ? 'none' : `0 0 20px ${status.glow}66`,
          }}
        >
          {/* Inner Texture */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.2)_2px,rgba(255,255,255,0.2)_4px)] opacity-30" />
        </div>

        {/* Segments Markers */}
        <div className="pointer-events-none absolute inset-0 flex justify-between px-1">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(m => (
            <div key={m} className="h-full w-[1px] bg-white/10" />
          ))}
        </div>
      </div>

      {/* Bottom Tech Decals - Desktop Only */}
      {!isMobile && (
        <div className="mt-1 flex w-full justify-between px-1 opacity-40">
          <div className="flex gap-1">
            <div className="h-1 w-1 rounded-full bg-cyan-500"></div>
            <div className="h-1 w-1 rounded-full bg-cyan-500/50"></div>
            <div className="h-1 w-1 rounded-full bg-cyan-500/20"></div>
          </div>
          <div
            className="font-bold uppercase tracking-[0.3em] text-slate-400"
            style={{ fontSize: '7px' }}
          >
            Terminal_ID: CC-S_08.21 // Core_Integrity_Module
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`h-[2px] w-8 ${isCritical ? 'bg-red-500' : 'bg-slate-700'}`}
            ></div>
            <div className="h-1.5 w-1.5 rotate-45 border border-slate-700"></div>
          </div>
        </div>
      )}

      <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
    </div>
  );
};

// NOTE: getWaveColorText removed in AI Director V2
// Wave phase system removed - difficulty now market-driven

export const AccountHealthPremium: React.FC<AccountHealthProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return <PremiumHealthInner {...props} isMobile={isMobile} />;
});
