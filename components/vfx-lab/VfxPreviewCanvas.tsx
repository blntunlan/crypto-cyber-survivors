import React, { useEffect, useRef } from 'react';
import { type VfxPreviewModule, type VfxPreviewSimContext } from '../../types/vfxLab';

interface Props {
  module: VfxPreviewModule;
  width: number;
  height: number;
  paused: boolean;
  /** Monotonic counter — increment to reset the sim */
  resetKey: number;
}

const MOCK_ENEMY_COUNT = 3;

function buildMockEnemies(
  width: number,
  height: number,
  elapsedMs: number
): VfxPreviewSimContext['enemies'] {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.35;
  const enemies: Array<{ x: number; y: number; radius: number; id: number }> = [];
  for (let i = 0; i < MOCK_ENEMY_COUNT; i++) {
    const angle = (i / MOCK_ENEMY_COUNT) * Math.PI * 2 + elapsedMs * 0.0003;
    enemies.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      radius: 10,
      id: i,
    });
  }
  return enemies;
}

export const VfxPreviewCanvas: React.FC<Props> = ({
  module,
  width,
  height,
  paused,
  resetKey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sim: VfxPreviewSimContext = {
      width,
      height,
      elapsedMs: 0,
      playerX: width / 2,
      playerY: height / 2,
      enemies: buildMockEnemies(width, height, 0),
    };

    let state = module.init(sim);
    lastTsRef.current = null;

    const loop = (ts: number): void => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dtMs = last === null ? 0 : Math.min(50, ts - last);

      if (!paused) {
        sim.elapsedMs += dtMs;
        (sim as { enemies: VfxPreviewSimContext['enemies'] }).enemies =
          buildMockEnemies(width, height, sim.elapsedMs);
        module.tick(state, sim, dtMs);
      }

      // Background
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Mock enemies (skipped when the module manages its own scene)
      if (!module.manageOwnScene) {
        ctx.fillStyle = 'rgba(239,68,68,0.8)';
        for (const e of sim.enemies) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Effect
      module.render(ctx, state, sim);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // Re-init on next mount
      state = module.init(sim);
    };
  }, [module, width, height, paused, resetKey]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: 6,
      }}
    />
  );
};
