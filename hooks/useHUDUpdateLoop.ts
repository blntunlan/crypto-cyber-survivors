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
import { ComboSystem, COMBO_MILESTONES } from '../services/ComboSystem';
import { MilestoneService } from '../services/MilestoneService';
import { DifficultyManager } from '../services/DifficultyManager';

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
  const requestRef = useRef<number | null>(null);
  const streakValueRef = useRef(0);
  const multiplierValueRef = useRef(1.0);
  const fpsFramesRef = useRef<number[]>([]);

  useEffect(() => {
    let lastTime = performance.now();
    const fpsElement = document.getElementById('fps-counter');
    const healthGlowElement = document.getElementById('near-death-glow');

    const updateLoop = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      // FPS Counter
      if (deltaMs > 0 && fpsElement) {
        const currentFps = 1000 / deltaMs;
        fpsFramesRef.current.push(currentFps);
        if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
        if (fpsFramesRef.current.length % 15 === 0) {
          const avgFps =
            fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
          fpsElement.textContent = `${Math.round(avgFps)} FPS`;
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
        if (el) el.textContent = `${multiplierValueRef.current.toFixed(1)}x XP`;
      }

      // Combo Panel Visibility
      if (containerRef.current) {
        const isVisible = streakTarget >= 5;
        const targetOpacity = isVisible ? '1' : '0';
        const targetTransform = isVisible
          ? `translateX(calc(-50% + ${comboPanelOffset.x}px)) translateY(${comboPanelOffset.y}px) scale(1)`
          : `translateX(calc(-50% + ${comboPanelOffset.x}px)) translateY(${comboPanelOffset.y + 20}px) scale(0.95)`;

        if (containerRef.current.style.opacity !== targetOpacity) {
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
  }, [status, player, containerRef, comboPanelOffset]);
}
