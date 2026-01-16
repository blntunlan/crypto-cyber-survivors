import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { DifficultyManager } from '../../services/DifficultyManager';
import { COLORS } from '../../constants';
import { EventBus } from '../../services/EventBus';
import { type WavePhase } from '../../types/metrics';
import { useIsRetro } from '../../contexts/useTheme';

interface AccountHealthProps {
  hpPercent: number;
  hp: number;
  maxHp: number;
}

/**
 * Premium version of Account Health
 * Styled like a high-end trading terminal / Cyberpunk HUD
 */
const PremiumHealthInner: React.FC<AccountHealthProps & { isMobile: boolean }> = ({
  hpPercent,
  hp,
  maxHp,
  isMobile,
}) => {
  const { rs, rfs, isSmallDevice, bottomSafeZone } = useResponsiveUI();
  const isRetro = useIsRetro();
  const [wavePhase, setWavePhase] = useState(DifficultyManager.getWavePhase());

  useEffect(() => {
    // Sync on mount
    setWavePhase(DifficultyManager.getWavePhase());

    const unsubscribe = EventBus.on('wavePhaseChange', (data: { phase: WavePhase }) => {
      setWavePhase(data.phase);
    });
    return unsubscribe;
  }, []);
  const getStatusConfig = () => {
    if (hpPercent > 75) {
      return {
        text: 'EQUITY SECURE',
        color: 'text-cyan-400',
        bg: `linear-gradient(90deg, ${COLORS.CASINO_GREEN}, ${COLORS.PUMP_GREEN})`,
        glow: COLORS.CASINO_GREEN,
      };
    }
    if (hpPercent > 50) {
      return {
        text: 'MARGIN CAUTION',
        color: 'text-yellow-400',
        bg: `linear-gradient(90deg, ${COLORS.CASINO_GOLD}, ${COLORS.JACKPOT_YELLOW})`,
        glow: COLORS.CASINO_GOLD,
      };
    }
    if (hpPercent > 25) {
      return {
        text: 'MARGIN PRESSURE',
        color: 'text-orange-500',
        bg: `linear-gradient(90deg, ${COLORS.NEON_ORANGE}, ${COLORS.DUMP_ORANGE})`,
        glow: COLORS.NEON_ORANGE,
      };
    }
    return {
      text: 'LIQUIDATION RISK',
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
      className={`fixed left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center transition-all duration-500 hud-bottom-safe ${
        isMobile ? (isSmallDevice ? 'w-[92%]' : 'w-[88%]') : 'w-[450px] bottom-10'
      }`}
      style={
        isMobile
          ? {
              // Use bottomSafeZone for mobile controls spacing
              bottom: rs(16) + bottomSafeZone,
              // iOS safe area fallback
              marginBottom: 'env(safe-area-inset-bottom, 0px)',
            }
          : undefined
      }
    >
      {/* Top Info Bar - Desktop Only */}
      {!isMobile && (
        <div className="w-full flex justify-between items-end mb-2 px-1 font-stats tracking-tighter">
          <div className="flex flex-col">
            <span
              className="text-slate-500 font-bold uppercase opacity-60"
              style={{ fontSize: '10px' }}
            >
              System Phase
            </span>
            <span
              className={`font-black uppercase italic ${getWaveColorText(wavePhase)}`}
              style={{ fontSize: '16px' }}
            >
              {wavePhase}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`font-black px-2 py-0.5 rounded-t bg-slate-900 border-x border-t border-white/10 ${status.color} ${isCritical ? 'animate-pulse' : ''}`}
              style={{ fontSize: '10px' }}
            >
              {status.text}
            </div>
            <div
              className={`font-black text-white leading-none tabular-nums ${isRetro ? 'text-shadow-retro' : 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]'}`}
              style={{ fontSize: '30px' }}
            >
              {Math.ceil(hp)}
              <span className="text-xs opacity-50 ml-0.5">/{Math.ceil(maxHp)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end min-w-[80px]">
            {/* Empty space for balance */}
          </div>
        </div>
      )}

      {/* Mobile: Compact HP indicator above bar */}
      {isMobile && (
        <div className="flex items-center justify-center gap-2 mb-1">
          <span
            className={`font-black tabular-nums ${status.color} ${isCritical ? 'animate-pulse' : ''}`}
            style={{ fontSize: rfs(14) }}
          >
            {Math.ceil(hp)}
          </span>
          <span className="text-slate-500" style={{ fontSize: rfs(10) }}>
            /
          </span>
          <span className="text-slate-400" style={{ fontSize: rfs(12) }}>
            {Math.ceil(maxHp)}
          </span>
        </div>
      )}

      {/* Main Health Bar Container - Thinner on mobile */}
      <div
        className={`relative w-full bg-slate-950/60 border border-white/10 rounded-sm overflow-hidden group ${isMobile ? 'p-[2px]' : 'p-[3px] backdrop-blur-xl shadow-2xl'}`}
        style={{ height: isMobile ? rs(8) : '16px' }}
      >
        {/* Background Grid Pattern - Desktop only */}
        {!isMobile && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '10px 10px',
            }}
          />
        )}

        {/* Shimmer/Scanline Effect - Optimized frequency for mobile - Hidden in retro */}
        {!isRetro && (
          <div
            className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full pointer-events-none ${isMobile ? 'animate-[shimmer_5s_infinite]' : 'animate-[shimmer_3s_infinite]'}`}
          />
        )}

        {/* The Actual Health Bar */}
        <div
          className={`h-full relative transition-all duration-500 ease-out rounded-sm ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${hpPercent}%`,
            background: status.bg,
            boxShadow: isRetro ? 'none' : `0 0 20px ${status.glow}66`,
          }}
        >
          {/* Inner Texture */}
          <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.2)_2px,rgba(255,255,255,0.2)_4px)]" />
        </div>

        {/* Segments Markers */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(m => (
            <div key={m} className="w-[1px] h-full bg-white/10" />
          ))}
        </div>
      </div>

      {/* Bottom Tech Decals - Desktop Only */}
      {!isMobile && (
        <div className="w-full flex justify-between mt-1 px-1 opacity-40">
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500/50"></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500/20"></div>
          </div>
          <div
            className="text-slate-400 font-bold tracking-[0.3em] uppercase"
            style={{ fontSize: '7px' }}
          >
            Terminal_ID: CC-S_08.21 // Core_Integrity_Module
          </div>
          <div className="flex gap-1 items-center">
            <div
              className={`w-8 h-[2px] ${isCritical ? 'bg-red-500' : 'bg-slate-700'}`}
            ></div>
            <div className="w-1.5 h-1.5 border border-slate-700 rotate-45"></div>
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

const getWaveColorText = (phase: string) => {
  switch (phase) {
    case 'warmup':
      return 'text-cyan-400';
    case 'buildup':
      return 'text-amber-300';
    case 'firstPeak':
      return 'text-orange-500';
    case 'breather':
      return 'text-green-400';
    case 'escalation':
      return 'text-yellow-500';
    case 'climax':
      return 'text-red-500';
    case 'resolution':
      return 'text-purple-400';
    // Legacy phases (backwards compat)
    case 'calm':
      return 'text-cyan-400';
    case 'building':
      return 'text-amber-300';
    case 'intense':
      return 'text-orange-500';
    case 'peak':
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
};

export const AccountHealthPremium: React.FC<AccountHealthProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return <PremiumHealthInner {...props} isMobile={isMobile} />;
});
