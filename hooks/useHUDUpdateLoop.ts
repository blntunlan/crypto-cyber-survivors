/**
 * useHUDUpdateLoop - Performance-optimized HUD Update Hook
 *
 * Handles direct DOM manipulation for high-frequency updates:
 * - FPS counter
 * - Wave timer
 * - Near death glow
 * - Combo streak lerping
 * - Combo panel visibility
 *
 * Uses requestAnimationFrame for smooth updates without React re-renders.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { GameStatus, type Player } from '../types';
import { ComboSystem, COMBO_MILESTONES } from '../services/combat/ComboSystem';
import { MilestoneService } from '../services/gameplay/MilestoneService';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { useLanguage } from '../contexts/LanguageContext';

interface HUDLayoutOffset {
  x: number;
  y: number;
}

interface UseHUDUpdateLoopParams {
  status: GameStatus;
  player?: Player;
  containerRef: RefObject<HTMLDivElement | null>;
  comboPanelOffset?: HUDLayoutOffset;
}

/**
 * Hook for high-frequency HUD updates using direct DOM manipulation
 */
export function useHUDUpdateLoop({
  status,
  player,
  containerRef,
  comboPanelOffset = { x: 0, y: 0 },
}: UseHUDUpdateLoopParams): void {
  const { t } = useLanguage();
  const requestRef = useRef<number | null>(null);

  const streakValueRef = useRef(0);
  const multiplierValueRef = useRef(1.0);
  const fpsFramesRef = useRef<number[]>([]);

  useEffect(() => {
    let lastTime = performance.now();
    const healthGlowElement = document.getElementById('near-death-glow');

    const updateLoop = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      // FPS Counter (update both desktop and mobile elements)
      if (deltaMs > 0) {
        const currentFps = 1000 / deltaMs;
        fpsFramesRef.current.push(currentFps);
        if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
        if (fpsFramesRef.current.length % 15 === 0) {
          const avgFps =
            fpsFramesRef.current.reduce((a, b) => a + b, 0) /
            fpsFramesRef.current.length;
          const fpsText = t('hud.fps_formatted', { val: Math.round(avgFps) });
          // Update desktop FPS element

          const fpsElement = document.getElementById('fps-counter');
          if (fpsElement) fpsElement.textContent = fpsText;
          // Update mobile FPS element
          const fpsMobileElement = document.getElementById('fps-counter-mobile');
          if (fpsMobileElement) fpsMobileElement.textContent = fpsText;
        }
      }

      // Wave Timer / Survival Time
      const timerElement = document.getElementById('wave-timer-text');
      if (timerElement && status === GameStatus.PLAYING) {
        const totalSeconds = DifficultyManager.getTotalElapsedSeconds();
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        MilestoneService.checkTimeMilestones(totalSeconds);
      }

      // Near Death Glow
      if (healthGlowElement && player) {
        const hpPercent = player.hp / player.maxHp;
        if (hpPercent < 0.25) {
          const pulse = 0.5 + Math.sin(currentTime / 200) * 0.3;
          const intensity = (1 - hpPercent / 0.25) * pulse;
          healthGlowElement.style.opacity = intensity.toString();
        } else {
          healthGlowElement.style.opacity = '0';
        }
      }

      // Combo Streak Lerping
      const liveState = ComboSystem.getState();
      const streakTarget = liveState.killStreak;
      const multTarget = liveState.comboMultiplier;

      if (Math.abs(streakValueRef.current - streakTarget) > 0.01) {
        streakValueRef.current += (streakTarget - streakValueRef.current) * 0.2;
        const el = document.getElementById('combo-streak-count');
        if (el) {
          el.textContent = Math.round(streakValueRef.current).toString();
          // Update color based on milestone tier
          let color = '#ffffff';
          for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
            const milestone = COMBO_MILESTONES[i];
            if (milestone && streakTarget >= milestone.kills) {
              color = milestone.color;
              break;
            }
          }
          el.style.color = color;
          el.style.textShadow = `0 0 15px ${color}80`;
        }
      }

      if (Math.abs(multiplierValueRef.current - multTarget) > 0.001) {
        multiplierValueRef.current += (multTarget - multiplierValueRef.current) * 0.1;
        const el = document.getElementById('combo-multiplier-badge');
        if (el) {
          el.textContent = t('hud.xp_multiplier_formatted', {
            val: multiplierValueRef.current.toFixed(1),
          });
        }
      }

      // Combo Panel Visibility
      // On mobile: Reduce opacity based on enemy count for better visibility
      if (containerRef.current) {
        const isVisible = streakTarget >= 5;

        // Calculate opacity - on mobile, reduce based on screen clutter
        let baseOpacity = 1;
        const isMobileDevice = window.innerWidth < 768;

        if (isMobileDevice && isVisible) {
          // Get enemy count from DOM (updated by GameHUD's enemy pointers)
          // Using a simple heuristic: check active enemies via data attribute if available
          const enemyPointerContainer = document.getElementById(
            'enemy-pointer-container'
          );
          const enemyCount = enemyPointerContainer?.children.length ?? 0;

          // Progressive opacity reduction based on enemy density
          if (enemyCount >= 15) {
            baseOpacity = 0.45; // Increased from 0.25
          } else if (enemyCount >= 10) {
            baseOpacity = 0.6; // Increased from 0.4
          } else if (enemyCount >= 5) {
            baseOpacity = 0.8; // Increased from 0.6
          }
        }

        const targetOpacity = isVisible ? baseOpacity.toString() : '0';
        const targetTransform = isVisible
          ? `translateX(calc(-50% + ${comboPanelOffset.x}px)) translateY(${comboPanelOffset.y}px) scale(1)`
          : `translateX(calc(-50% + ${comboPanelOffset.x}px)) translateY(${comboPanelOffset.y + 20}px) scale(0.95)`;

        // Only update if changed (prevents layout thrashing)
        const currentOpacity = containerRef.current.style.opacity;
        if (currentOpacity !== targetOpacity || !isVisible) {
          containerRef.current.style.opacity = targetOpacity;
          containerRef.current.style.transform = targetTransform;
          containerRef.current.style.pointerEvents = 'none';
        }

        if (isVisible) {
          const timerBar = document.getElementById('combo-timer-bar');
          if (timerBar) {
            timerBar.style.width = `${ComboSystem.getComboTimeRemaining() * 100}%`;
          }
        }
      }

      requestRef.current = requestAnimationFrame(updateLoop);
    };

    requestRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, player, containerRef, comboPanelOffset, t]);
}
