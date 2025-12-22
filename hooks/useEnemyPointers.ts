/**
 * useEnemyPointers - Enemy Pointer Update Hook
 *
 * Handles off-screen enemy indicator positioning.
 * Updates pointer positions via direct DOM manipulation for performance.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { GameStatus } from '../types';
import { type GameEnemy } from '../factories/EnemyFactory';

interface UseEnemyPointersParams {
  status: GameStatus;
  enemies: GameEnemy[];
  width: number;
  height: number;
  globalScale: number;
  pointerContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hook for updating off-screen enemy pointers
 */
export function useEnemyPointers({
  status,
  enemies,
  width,
  height,
  globalScale,
  pointerContainerRef,
}: UseEnemyPointersParams): void {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const updatePointers = (currentTime: number) => {
      if (pointerContainerRef.current && status === GameStatus.PLAYING && width > 0 && height > 0) {
        const logicalWidth = width / globalScale;
        const logicalHeight = height / globalScale;

        const offScreenEnemies = enemies
          .filter(e => e.active && (e.x < 0 || e.x > width || e.y < 0 || e.y > height))
          .slice(0, 10);

        const pointerElements = pointerContainerRef.current.children;

        for (let i = 0; i < 10; i++) {
          const el = pointerElements[i] as HTMLElement | undefined;
          if (el === undefined) continue;

          const enemy = offScreenEnemies[i];
          if (enemy) {
            const padding = 20;
            const cx = width / 2;
            const cy = height / 2;
            const dx = enemy.x - cx;
            const dy = enemy.y - cy;
            const slope = dy / dx;
            let px = 0,
              py = 0;

            if (dx > 0) {
              px = logicalWidth - padding;
              py = logicalHeight / 2 + (logicalWidth / 2 - padding) * slope;
            } else {
              px = padding;
              py = logicalHeight / 2 - (logicalWidth / 2 - padding) * slope;
            }

            if (py < padding) {
              py = padding;
              px = logicalWidth / 2 + (padding - logicalHeight / 2) / slope;
            } else if (py > logicalHeight - padding) {
              py = logicalHeight - padding;
              px = logicalWidth / 2 + (logicalHeight - padding - logicalHeight / 2) / slope;
            }

            px = Math.max(padding, Math.min(logicalWidth - padding, px));
            py = Math.max(padding, Math.min(logicalHeight - padding, py));

            const angle = (Math.atan2(enemy.y - cy, enemy.x - cx) * 180) / Math.PI + 90;

            el.style.opacity = '1';
            el.style.transform = `translate(${px - 10}px, ${py - 10}px) rotate(${angle}deg)`;
            el.style.color = enemy.color;

            if (enemy.type === 'whale') {
              el.style.scale = (1.2 + Math.sin(currentTime / 150) * 0.2).toString();
            } else {
              el.style.scale = '1';
            }
          } else {
            el.style.opacity = '0';
            el.style.transform = 'translate(-100px, -100px)';
          }
        }
      } else if (pointerContainerRef.current) {
        const pointerElements = pointerContainerRef.current.children;
        for (let i = 0; i < pointerElements.length; i++) {
          (pointerElements[i] as HTMLElement).style.opacity = '0';
        }
      }

      requestRef.current = requestAnimationFrame(updatePointers);
    };

    requestRef.current = requestAnimationFrame(updatePointers);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, enemies, width, height, globalScale, pointerContainerRef]);
}
