import { type VfxPreviewModule } from '../../../types/vfxLab';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

interface State {
  bullets: Bullet[];
  fireTimer: number;
}

const FIRE_INTERVAL = 220;
const BULLET_SPEED = 0.35;
const TRAIL_LIFE = 180;

export const QuantumBulletPreview: VfxPreviewModule<State> = {
  id: 'weapon-quantum-bullet-v1',
  category: 'weapon',
  label: 'Quantum Bullet',
  description: 'Default rapid-fire projectile. Cyan bolts with trailing streak.',
  init: () => ({ bullets: [], fireTimer: 0 }),
  tick: (state, sim, dtMs) => {
    state.fireTimer += dtMs;
    if (state.fireTimer >= FIRE_INTERVAL) {
      state.fireTimer = 0;
      const target = sim.enemies[0];
      if (target) {
        const dx = target.x - sim.playerX;
        const dy = target.y - sim.playerY;
        const d = Math.hypot(dx, dy) || 1;
        state.bullets.push({
          x: sim.playerX,
          y: sim.playerY,
          vx: (dx / d) * BULLET_SPEED,
          vy: (dy / d) * BULLET_SPEED,
          age: 0,
          trail: [],
        });
      }
    }

    for (const b of state.bullets) {
      b.x += b.vx * dtMs;
      b.y += b.vy * dtMs;
      b.age += dtMs;
      b.trail.push({ x: b.x, y: b.y, age: 0 });
      for (const t of b.trail) t.age += dtMs;
      while (b.trail.length > 0 && b.trail[0]!.age > TRAIL_LIFE) b.trail.shift();
    }

    state.bullets = state.bullets.filter(
      b => b.x > -30 && b.x < sim.width + 30 && b.y > -30 && b.y < sim.height + 30
    );
  },
  render: (ctx, state, sim) => {
    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    for (const b of state.bullets) {
      // Trail
      for (let i = 1; i < b.trail.length; i++) {
        const p0 = b.trail[i - 1]!;
        const p1 = b.trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / TRAIL_LIFE);
        ctx.strokeStyle = `rgba(0,255,255,${alpha * 0.7})`;
        ctx.lineWidth = 2 * alpha + 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Bullet glow
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, 'rgba(0,255,255,0.8)');
      grad.addColorStop(1, 'rgba(0,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
