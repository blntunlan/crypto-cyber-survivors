import React, { memo, useEffect, useRef, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/classnames';
import { EventBus } from '../../services/core/EventBus';
import { ComboSystem } from '../../services/combat/ComboSystem';
import { type ComboUpdateEvent, type ComboEndEvent } from '../../types/events';

import { COLORS } from '../../config/Colors';

interface ComboPanelProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  maxStreak: number;
  totalBonusXp: number;
}

// Proximity fade: cursor/touch within this range fades the panel
const PROXIMITY_FADE_START = 200;
const PROXIMITY_FADE_END = 100;

// Combo level fade: at 25+ kills the counter starts fading (projectile tail takes over)
const COMBO_FADE_START = 25;
const COMBO_FADE_END = 50;

/**
 * useComboDOM - Internal hook for driving ComboPanel via EventBus + RAF
 *
 * Handles:
 * 1. Show/hide the container (opacity + transform)
 * 2. Update #combo-streak-count with current kill streak
 * 3. Update #combo-multiplier-badge inner text with current multiplier
 * 4. Animate #combo-timer-bar width based on ComboSystem.getComboTimeRemaining()
 * 5. Proximity fade: cursor/touch near panel → fade out (desktop + mobile)
 * 6. Combo level fade: at high combos the counter fades, projectile tail color takes over
 * 7. Hide and reset everything on comboEnd / gameReset
 */
function useComboDOM(containerRef: React.RefObject<HTMLDivElement | null>) {
  const isActiveRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const calcComboOpacity = (): number => {
      const streak = ComboSystem.getKillStreak();
      if (streak >= COMBO_FADE_END) return 0;
      if (streak <= COMBO_FADE_START) return 1;
      return 1 - (streak - COMBO_FADE_START) / (COMBO_FADE_END - COMBO_FADE_START);
    };

    const showPanel = () => {
      if (containerRef.current) {
        containerRef.current.style.opacity = String(calcComboOpacity());
        containerRef.current.style.transform = 'translateX(-50%) translateY(0)';
      }
      if (!isActiveRef.current) {
        isActiveRef.current = true;
        startTimerLoop();
      }
    };

    const hidePanel = () => {
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
        containerRef.current.style.transform = 'translateX(-50%) translateY(20px)';
      }
      isActiveRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const resetDOMElements = () => {
      const streakEl = document.getElementById('combo-streak-count');
      if (streakEl) streakEl.textContent = '0';

      const timerBar = document.getElementById('combo-timer-bar');
      if (timerBar) timerBar.style.width = '100%';

      const multEl = document.getElementById('combo-multiplier-badge');
      if (multEl) {
        const inner = multEl.firstElementChild as HTMLElement | null;
        if (inner) inner.textContent = '1.0x XP';
      }
    };

    // RAF loop for smooth timer bar countdown + proximity/combo-level fade
    const startTimerLoop = () => {
      const animate = () => {
        if (!isActiveRef.current) return;

        // 1. Update timer bar
        const timerBar = document.getElementById('combo-timer-bar');
        if (timerBar) {
          const timeRemaining = ComboSystem.getComboTimeRemaining();
          timerBar.style.width = `${(timeRemaining * 100).toFixed(1)}%`;
        }

        // 2. Proximity fade (mouse/touch near panel)
        let proximityOpacity = 1;
        if (cursorPosRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = cursorPosRef.current.x - cx;
            const dy = cursorPosRef.current.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= PROXIMITY_FADE_END) {
              proximityOpacity = 0;
            } else if (dist < PROXIMITY_FADE_START) {
              proximityOpacity =
                (dist - PROXIMITY_FADE_END) /
                (PROXIMITY_FADE_START - PROXIMITY_FADE_END);
            }
          }
        }

        // 3. Combo level fade (high combos → projectile tail takes over)
        const comboOpacity = calcComboOpacity();

        // 4. Apply final opacity
        if (containerRef.current) {
          containerRef.current.style.opacity = String(
            Math.min(proximityOpacity, comboOpacity)
          );
        }

        rafIdRef.current = requestAnimationFrame(animate);
      };
      rafIdRef.current = requestAnimationFrame(animate);
    };

    // Cursor/touch tracking for proximity fade
    const handleMouseMove = (e: MouseEvent) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        cursorPosRef.current = {
          x: e.touches[0]!.clientX,
          y: e.touches[0]!.clientY,
        };
      }
    };
    const handleMouseLeave = () => {
      cursorPosRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // EventBus subscriptions
    const unsubUpdate = EventBus.on('comboUpdate', (data: ComboUpdateEvent) => {
      // Update streak count
      const streakEl = document.getElementById('combo-streak-count');
      if (streakEl) streakEl.textContent = String(data.killStreak);

      // Update multiplier badge
      const multEl = document.getElementById('combo-multiplier-badge');
      if (multEl) {
        const inner = multEl.firstElementChild as HTMLElement | null;
        if (inner) inner.textContent = `${data.multiplier.toFixed(1)}x XP`;
      }

      // Show panel if not already visible
      showPanel();
    });

    const unsubEnd = EventBus.on('comboEnd', (_data: ComboEndEvent) => {
      hidePanel();
    });

    const unsubReset = EventBus.on('gameReset', () => {
      hidePanel();
      resetDOMElements();
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      unsubUpdate();
      unsubEnd();
      unsubReset();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [containerRef]);
}

// =============================================================================
// DESKTOP COMBO PANEL
// =============================================================================

const DesktopComboPanel: React.FC<ComboPanelProps> = ({
  containerRef,
  maxStreak,
  totalBonusXp,
}) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  // Wire up EventBus → DOM updates
  useComboDOM(containerRef);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute bottom-44 left-1/2 z-[115] flex min-w-[150px] flex-col items-center bg-transparent p-3 transition-all duration-300 ease-out"
      style={{
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
      }}
    >
      <div
        className={cn(
          'mb-2 flex gap-3 text-[8px] font-black uppercase tracking-widest',
          isRetro ? 'font-display' : 'font-cyber'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1',
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-yellow-400'
          )}
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
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1',
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-cyan-400'
          )}
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
          className={cn(
            'relative mb-3 h-2 w-full',
            isRetro
              ? 'rounded-none border-2 border-[#39FF14]/40 bg-[#0a0a12]'
              : 'overflow-hidden rounded-sm border border-white/5 bg-black/20'
          )}
        >
          <div
            id="combo-timer-bar"
            className={cn(
              'h-full',
              !isRetro &&
                'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]'
            )}
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
            className={cn(
              isRetro ? 'font-display' : 'font-cyber',
              'text-2xl font-black italic tabular-nums tracking-tighter',
              isRetro
                ? 'not-italic text-[#FFD600]'
                : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'
            )}
            style={{
              textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : undefined,
            }}
          >
            0
          </span>
          <span
            className={cn(
              'font-cyber text-[8px] font-black uppercase tracking-widest',
              isRetro ? 'text-[#39FF14]' : 'text-cyan-400'
            )}
            style={{
              textShadow: isRetro ? 'none' : '0 0 8px rgba(34, 211, 238, 0.5)',
            }}
          >
            {t('hud.combo')}
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={cn(
            'mt-2 px-3 py-1 text-center text-[10px] font-black italic tracking-tighter',
            isRetro
              ? 'rounded-none border-2 border-white bg-black not-italic'
              : 'skew-x-[-12deg] rounded-sm text-white'
          )}
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

// =============================================================================
// MOBILE COMBO PANEL
// =============================================================================

const MobileComboPanel: React.FC<ComboPanelProps> = ({
  containerRef,
  maxStreak,
  totalBonusXp,
}) => {
  const { rs, rfs } = useResponsiveUI();
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  // Wire up EventBus → DOM updates
  useComboDOM(containerRef);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute left-1/2 z-[115] flex flex-col items-center transition-all duration-200 ease-out"
      style={{
        top: `calc(${rs(85)}px + env(safe-area-inset-top, 0px))`,
        minWidth: rs(150),
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
      }}
    >
      <div
        className={cn(
          'mb-3 flex font-black uppercase tracking-tight',
          isRetro ? 'font-display' : 'font-cyber'
        )}
        style={{ gap: rs(8), fontSize: rfs(9) }}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1',
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-yellow-400'
          )}
          style={{
            borderColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
            color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.JACKPOT_YELLOW,
          }}
        >
          <span className="opacity-70">{t('hud.best')}</span>
          <span className="tabular-nums">{maxStreak}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1',
            isRetro
              ? 'rounded-none border-2 bg-black'
              : 'rounded-sm border-l-2 border-l-cyan-400'
          )}
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
          className={cn(
            'relative mb-2.5 h-2.5 w-full overflow-hidden',
            isRetro
              ? 'border-2 border-white bg-black'
              : 'rounded-sm border border-white/5 bg-black/40'
          )}
        >
          <div
            id="combo-timer-bar"
            className={cn(
              'h-full',
              !isRetro &&
                'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.5)]'
            )}
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
          className={cn(
            'flex items-baseline justify-center',
            !isRetro && 'drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]'
          )}
          style={{ gap: rs(6) }}
        >
          <span
            id="combo-streak-count"
            className={cn(
              isRetro ? 'font-display' : 'font-cyber',
              'font-black italic tabular-nums leading-none tracking-tighter text-white',
              isRetro && 'not-italic'
            )}
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
            className={cn(
              'font-cyber font-black uppercase tracking-widest',
              isRetro ? 'text-white' : 'text-cyan-400'
            )}
            style={{ fontSize: rfs(12) }}
          >
            {t('hud.combo')}
          </span>
        </div>

        <div
          id="combo-multiplier-badge"
          className={cn(
            'mt-2 text-center font-black italic',
            isRetro
              ? 'font-display not-italic'
              : 'skew-x-[-12deg] rounded-sm font-cyber text-white'
          )}
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

// =============================================================================
// MAIN EXPORT
// =============================================================================

export const ComboPanel: React.FC<ComboPanelProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileComboPanel {...props} /> : <DesktopComboPanel {...props} />;
});

ComboPanel.displayName = 'ComboPanel';
