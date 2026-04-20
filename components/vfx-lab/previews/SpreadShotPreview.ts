import { type VfxPreviewModule } from '../../../types/vfxLab';

interface Pellet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

interface State {
  pellets: Pellet[];
  fireTimer: number;
  /** Oscillates 0..1 — simulates volume surge bonus visual */
  volume: number;
}

const FIRE_INTERVAL = 500;
const SPEED = 0.3;
const SPREAD = 0.28;
const PELLET_COUNT = 3;
const TRAIL_LIFE = 200;

export const SpreadShotPreview: VfxPreviewModule<State> = {
  id: 'weapon-spread-shot-v1',
  category: 'weapon',
  label: 'Spread Shot',
  description:
    '3-way fan fire. Volume surge brightens the trail and widens the spread.',
  init: () => ({ pellets: [], fireTimer: 0, volume: 0.5 }),
  tick: (state, sim, dtMs) => {
    state.volume = 0.5 + 0.5 * Math.sin(sim.elapsedMs * 0.0005);
    state.fireTimer += dtMs;
    if (state.fireTimer >= FIRE_INTERVAL) {
      state.fireTimer = 0;
      const target = sim.enemies[0];
      if (target) {
        const baseAngle = Math.atan2(target.y - sim.playerY, target.x - sim.playerX);
        const spread = SPREAD * (0.8 + state.volume * 0.6);
        for (let i = 0; i < PELLET_COUNT; i++) {
          const offset = (i - (PELLET_COUNT - 1) / 2) * spread;
          const a = baseAngle + offset;
          state.pellets.push({
            x: sim.playerX,
            y: sim.playerY,
            vx: Math.cos(a) * SPEED,
            vy: Math.sin(a) * SPEED,
            age: 0,
            trail: [],
          });
        }
      }
    }

    for (const p of state.pellets) {
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.age += dtMs;
      p.trail.push({ x: p.x, y: p.y, age: 0 });
      for (const t of p.trail) t.age += dtMs;
      while (p.trail.length > 0 && p.trail[0]!.age > TRAIL_LIFE) p.trail.shift();
    }

    state.pellets = state.pellets.filter(
      p => p.x > -30 && p.x < sim.width + 30 && p.y > -30 && p.y < sim.height + 30
    );
  },
  render: (ctx, state, sim) => {
    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Volume-driven color
    const heat = state.volume;
    const coreColor = heat > 0.7 ? '#ffff88' : '#ffd060';
    const trailColor = heat > 0.7 ? '255,220,120' : '255,180,80';

    for (const p of state.pellets) {
      // Trail
      for (let i = 1; i < p.trail.length; i++) {
        const p0 = p.trail[i - 1]!;
        const p1 = p.trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / TRAIL_LIFE);
        ctx.strokeStyle = `rgba(${trailColor},${alpha * (0.5 + heat * 0.5)})`;
        ctx.lineWidth = 2.2 * alpha + 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Pellet
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, coreColor);
      grad.addColorStop(1, `rgba(${trailColor},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Volume indicator
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(
      `VOL ${Math.round(state.volume * 100)}%${heat > 0.7 ? ' 🔥' : ''}`,
      6,
      sim.height - 6
    );
  },
};
