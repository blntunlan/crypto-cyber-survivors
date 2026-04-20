import { type VfxPreviewModule } from '../../../types/vfxLab';

type Phase = 'flight' | 'detonation' | 'cooldown';

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
}

interface State {
  phase: Phase;
  phaseMs: number;
  projectile: { x: number; y: number; vx: number; vy: number } | null;
  target: { x: number; y: number } | null;
  shockwaves: Shockwave[];
  particles: Particle[];
  flash: number;
}

const SPEED = 0.15;
const FLIGHT_MAX_MS = 2500;
const DETONATION_MS = 900;
const COOLDOWN_MS = 400;
const EXPLOSION_RADIUS = 60;

export const AoeNukePreview: VfxPreviewModule<State> = {
  id: 'weapon-aoe-nuke-v1',
  category: 'weapon',
  label: 'AOE Nuke',
  description:
    'Slow, heavy projectile detonates into an expanding shockwave with massive splash damage.',
  init: () => ({
    phase: 'flight',
    phaseMs: 0,
    projectile: null,
    target: null,
    shockwaves: [],
    particles: [],
    flash: 0,
  }),
  tick: (state, sim, dtMs) => {
    state.phaseMs += dtMs;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dtMs / 250);

    if (state.phase === 'flight') {
      if (!state.projectile) {
        const target = sim.enemies[0];
        if (target) {
          const dx = target.x - sim.playerX;
          const dy = target.y - sim.playerY;
          const d = Math.hypot(dx, dy) || 1;
          state.projectile = {
            x: sim.playerX,
            y: sim.playerY,
            vx: (dx / d) * SPEED,
            vy: (dy / d) * SPEED,
          };
          state.target = { x: target.x, y: target.y };
        }
      }

      if (state.projectile && state.target) {
        state.projectile.x += state.projectile.vx * dtMs;
        state.projectile.y += state.projectile.vy * dtMs;
        const dx = state.target.x - state.projectile.x;
        const dy = state.target.y - state.projectile.y;
        // Detonate when near target or after flight timeout
        if (Math.hypot(dx, dy) < 12 || state.phaseMs > FLIGHT_MAX_MS) {
          state.phase = 'detonation';
          state.phaseMs = 0;
          state.flash = 1;
          const ex = state.projectile.x;
          const ey = state.projectile.y;

          // Primary shockwave
          state.shockwaves.push({
            x: ex,
            y: ey,
            radius: 5,
            maxRadius: EXPLOSION_RADIUS,
            age: 0,
            life: 700,
          });
          // Secondary ring (delayed visual — we fake by shorter life)
          state.shockwaves.push({
            x: ex,
            y: ey,
            radius: 2,
            maxRadius: EXPLOSION_RADIUS * 0.65,
            age: -150,
            life: 500,
          });

          // Debris particles
          for (let i = 0; i < 26; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 0.08 + Math.random() * 0.25;
            state.particles.push({
              x: ex,
              y: ey,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              age: 0,
              life: 500 + Math.random() * 400,
              color: Math.random() < 0.5 ? '#ff8833' : '#ffcc44',
              size: 2 + Math.random() * 2.5,
            });
          }
          // Smoke particles (slower, darker)
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 0.02 + Math.random() * 0.06;
            state.particles.push({
              x: ex,
              y: ey,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s - 0.04,
              age: 0,
              life: 800 + Math.random() * 400,
              color: '#662211',
              size: 4 + Math.random() * 3,
            });
          }
        }
      }
    } else if (state.phase === 'detonation') {
      if (state.phaseMs >= DETONATION_MS) {
        state.phase = 'cooldown';
        state.phaseMs = 0;
      }
    } else {
      if (state.phaseMs >= COOLDOWN_MS) {
        state.phase = 'flight';
        state.phaseMs = 0;
        state.projectile = null;
        state.target = null;
      }
    }

    // Shockwaves
    for (const s of state.shockwaves) {
      s.age += dtMs;
      if (s.age > 0) {
        const k = s.age / s.life;
        s.radius = 5 + (s.maxRadius - 5) * Math.min(1, k);
      }
    }
    state.shockwaves = state.shockwaves.filter(s => s.age < s.life);

    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.age += dtMs;
      p.vx *= 0.97;
      p.vy *= 0.97;
      // Gravity on debris
      if (p.color !== '#662211') p.vy += 0.0002 * dtMs;
    }
    state.particles = state.particles.filter(p => p.age < p.life);
  },
  render: (ctx, state, sim) => {
    // Flash overlay
    if (state.flash > 0.01) {
      ctx.fillStyle = `rgba(255,220,150,${state.flash * 0.25})`;
      ctx.fillRect(0, 0, sim.width, sim.height);
    }

    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Smoke first (behind)
    for (const p of state.particles) {
      if (p.color !== '#662211') continue;
      const alpha = Math.max(0, 1 - p.age / p.life) * 0.5;
      ctx.fillStyle = `rgba(50,30,20,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + p.age / p.life), 0, Math.PI * 2);
      ctx.fill();
    }

    // Shockwaves
    for (const s of state.shockwaves) {
      if (s.age <= 0) continue;
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.strokeStyle = `rgba(255,160,60,${alpha * 0.9})`;
      ctx.lineWidth = 4 * alpha + 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      const grad = ctx.createRadialGradient(
        s.x,
        s.y,
        Math.max(0, s.radius - 10),
        s.x,
        s.y,
        s.radius
      );
      grad.addColorStop(0, 'rgba(255,200,120,0)');
      grad.addColorStop(1, `rgba(255,180,80,${alpha * 0.35})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Debris particles
    for (const p of state.particles) {
      if (p.color === '#662211') continue;
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Projectile (during flight)
    if (state.phase === 'flight' && state.projectile) {
      const p = state.projectile;
      // Pulse
      const pulse = 0.7 + 0.3 * Math.sin((state.phaseMs / 150) * Math.PI * 2);

      // Outer glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22 * pulse);
      glow.addColorStop(0, '#ffdd66');
      glow.addColorStop(0.5, 'rgba(255,140,50,0.6)');
      glow.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Warhead core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Smoke trail behind
      const tx = p.x - p.vx * 30;
      const ty = p.y - p.vy * 30;
      const trailGrad = ctx.createLinearGradient(p.x, p.y, tx, ty);
      trailGrad.addColorStop(0, 'rgba(255,150,60,0.5)');
      trailGrad.addColorStop(1, 'rgba(100,60,40,0)');
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  },
};
