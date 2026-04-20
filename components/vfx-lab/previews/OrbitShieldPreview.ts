import { type VfxPreviewModule } from '../../../types/vfxLab';

interface Orbiter {
  angle: number;
  radius: number;
  spinSpeed: number;
  /** 0 = no flash, 1 = just hit */
  flash: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  flash: number;
  alive: boolean;
  respawnTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
}

interface State {
  orbiters: Orbiter[];
  enemies: Enemy[];
  particles: Particle[];
  level: number;
}

const ORBIT_RADIUS = 55;
const ORBIT_BODY_RADIUS = 12;
const PUSH_STRENGTH = 0.25;
const DAMAGE_PER_HIT = 25;

function spawnEnemy(w: number, h: number): Enemy {
  // Spawn at edge, drift toward center
  const side = Math.floor(Math.random() * 4);
  const margin = 10;
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = Math.random() * w;
    y = -margin;
  } else if (side === 1) {
    x = w + margin;
    y = Math.random() * h;
  } else if (side === 2) {
    x = Math.random() * w;
    y = h + margin;
  } else {
    x = -margin;
    y = Math.random() * h;
  }
  const cx = w / 2;
  const cy = h / 2;
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 0.03;
  return {
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    hp: 50,
    maxHp: 50,
    flash: 0,
    alive: true,
    respawnTimer: 0,
  };
}

export const OrbitShieldPreview: VfxPreviewModule<State> = {
  id: 'weapon-orbit-shield-v1',
  category: 'weapon',
  label: 'Orbit Shield',
  description:
    'Persistent orbiters circle the player, pushing and damaging enemies on contact.',
  manageOwnScene: true,
  init: sim => {
    const level = 2;
    const count = 2 + level;
    const orbiters: Orbiter[] = [];
    for (let i = 0; i < count; i++) {
      orbiters.push({
        angle: (i / count) * Math.PI * 2,
        radius: ORBIT_RADIUS,
        spinSpeed: 0.0035,
        flash: 0,
      });
    }
    const enemies: Enemy[] = [];
    for (let i = 0; i < 3; i++) {
      enemies.push(spawnEnemy(sim.width, sim.height));
    }
    return { orbiters, enemies, particles: [], level };
  },
  tick: (state, sim, dtMs) => {
    // Orbiters
    for (const o of state.orbiters) {
      o.angle = (o.angle + o.spinSpeed * dtMs) % (Math.PI * 2);
      if (o.flash > 0) o.flash = Math.max(0, o.flash - dtMs / 250);
    }

    // Enemies
    for (const e of state.enemies) {
      if (!e.alive) {
        e.respawnTimer -= dtMs;
        if (e.respawnTimer <= 0) {
          Object.assign(e, spawnEnemy(sim.width, sim.height));
        }
        continue;
      }
      e.x += e.vx * dtMs;
      e.y += e.vy * dtMs;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dtMs / 200);

      // Collision with orbiters
      for (const o of state.orbiters) {
        const ox = sim.playerX + Math.cos(o.angle) * o.radius;
        const oy = sim.playerY + Math.sin(o.angle) * o.radius;
        const dx = e.x - ox;
        const dy = e.y - oy;
        const dist = Math.hypot(dx, dy);
        if (dist < ORBIT_BODY_RADIUS + 10) {
          // Damage
          e.hp -= DAMAGE_PER_HIT;
          e.flash = 1;
          o.flash = 1;

          // Push away from orbiter
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          e.vx += nx * PUSH_STRENGTH;
          e.vy += ny * PUSH_STRENGTH;

          // Impact particles
          for (let k = 0; k < 6; k++) {
            const a = Math.random() * Math.PI * 2;
            const s = 0.05 + Math.random() * 0.1;
            state.particles.push({
              x: ox,
              y: oy,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              age: 0,
              life: 300 + Math.random() * 200,
              color: '#44ddff',
            });
          }

          if (e.hp <= 0) {
            e.alive = false;
            e.respawnTimer = 700;
            // Death burst
            for (let k = 0; k < 12; k++) {
              const a = Math.random() * Math.PI * 2;
              const s = 0.08 + Math.random() * 0.12;
              state.particles.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                age: 0,
                life: 400 + Math.random() * 300,
                color: '#ef4444',
              });
            }
          }
          break;
        }
      }

      // Dampen pushed velocity
      e.vx *= 0.96;
      e.vy *= 0.96;

      // Keep cruising toward center if slowed too much
      const cx = sim.width / 2;
      const cy = sim.height / 2;
      const toCx = cx - e.x;
      const toCy = cy - e.y;
      const d = Math.hypot(toCx, toCy) || 1;
      e.vx += (toCx / d) * 0.00008 * dtMs;
      e.vy += (toCy / d) * 0.00008 * dtMs;
    }

    // Particles
    for (const p of state.particles) {
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.age += dtMs;
    }
    state.particles = state.particles.filter(p => p.age < p.life);
  },
  render: (ctx, state, sim) => {
    // Particles
    for (const p of state.particles) {
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5 * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemies (overriding the canvas's mock enemies — those are hidden because
    // we don't use sim.enemies; the preview canvas still draws them though.
    // We draw our own on top.)
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const hpFrac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = e.flash > 0.01 ? '#ffffff' : '#ef4444';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
      // HP bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 10, e.y - 16, 20, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(e.x - 10, e.y - 16, 20 * hpFrac, 3);
    }

    // Orbit path (subtle)
    ctx.strokeStyle = 'rgba(68,221,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Orbiters
    for (const o of state.orbiters) {
      const x = sim.playerX + Math.cos(o.angle) * o.radius;
      const y = sim.playerY + Math.sin(o.angle) * o.radius;
      const flashBoost = o.flash;
      const glowR = 14 + flashBoost * 10;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      grad.addColorStop(0, flashBoost > 0.1 ? '#ffffff' : '#88eeff');
      grad.addColorStop(0.4, 'rgba(68,221,255,0.8)');
      grad.addColorStop(1, 'rgba(68,221,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
