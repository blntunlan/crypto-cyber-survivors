import { type VfxPreviewModule } from '../../../types/vfxLab';

type Phase = 'spawn' | 'active' | 'collapse' | 'cooldown';

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
  angle: number;
  radius: number;
  angularSpeed: number;
  inwardSpeed: number;
  age: number;
  life: number;
  color: string;
}

interface Blade {
  angleOffset: number;
  arcSpan: number;
  radius: number;
}

interface ShockRing {
  radius: number;
  maxRadius: number;
  age: number;
  life: number;
  inward: boolean;
}

interface State {
  phase: Phase;
  phaseMs: number;
  vortexX: number;
  vortexY: number;
  rotation: number;
  pullRadius: number;
  enemies: Enemy[];
  particles: Particle[];
  blades: Blade[];
  shockRings: ShockRing[];
  collapseFlash: number;
  spawnProgress: number;
}

const SPAWN_MS = 300;
const ACTIVE_MS = 1800;
const COLLAPSE_MS = 500;
const COOLDOWN_MS = 450;
const PULL_RADIUS = 62;
const DAMAGE_PER_HIT = 22;
const CORE_RADIUS = 14;
const BLADE_COUNT = 3;

function spawnEnemy(w: number, h: number, vx: number, vy: number): Enemy {
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
  const dx = vx - x;
  const dy = vy - y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 0.028;
  return {
    x,
    y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    hp: 45,
    maxHp: 45,
    flash: 0,
    alive: true,
    respawnTimer: 0,
  };
}

export const LiquidityVortexPreview: VfxPreviewModule<State> = {
  id: 'weapon-liquidity-vortex-v1',
  category: 'weapon',
  label: 'Liquidity Vortex',
  description:
    'Spawns a pulling vortex at the target. Enemies spiral inward and take damage, then it implodes.',
  manageOwnScene: true,
  init: sim => {
    const target = sim.enemies[0];
    const vx = target ? target.x : sim.playerX + 90;
    const vy = target ? target.y : sim.playerY - 30;
    const blades: Blade[] = [];
    for (let i = 0; i < BLADE_COUNT; i++) {
      blades.push({
        angleOffset: (i / BLADE_COUNT) * Math.PI * 2,
        arcSpan: 0.7,
        radius: PULL_RADIUS * 0.78,
      });
    }
    const enemies: Enemy[] = [];
    for (let i = 0; i < 4; i++) {
      enemies.push(spawnEnemy(sim.width, sim.height, vx, vy));
    }
    return {
      phase: 'spawn',
      phaseMs: 0,
      vortexX: vx,
      vortexY: vy,
      rotation: 0,
      pullRadius: PULL_RADIUS,
      enemies,
      particles: [],
      blades,
      shockRings: [],
      collapseFlash: 0,
      spawnProgress: 0,
    };
  },
  tick: (state, sim, dtMs) => {
    state.phaseMs += dtMs;
    state.rotation += dtMs * 0.006;
    if (state.collapseFlash > 0) {
      state.collapseFlash = Math.max(0, state.collapseFlash - dtMs / 280);
    }

    if (state.phase === 'spawn') {
      state.spawnProgress = Math.min(1, state.phaseMs / SPAWN_MS);
      if (state.phaseMs >= SPAWN_MS) {
        state.phase = 'active';
        state.phaseMs = 0;
      }
    } else if (state.phase === 'active') {
      if (state.phaseMs >= ACTIVE_MS) {
        state.phase = 'collapse';
        state.phaseMs = 0;
        state.collapseFlash = 1;
        for (let i = 0; i < 22; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = PULL_RADIUS * (0.5 + Math.random() * 0.6);
          state.particles.push({
            angle: a,
            radius: r,
            angularSpeed: 0.008 + Math.random() * 0.006,
            inwardSpeed: 0.12 + Math.random() * 0.1,
            age: 0,
            life: 380 + Math.random() * 200,
            color: Math.random() < 0.5 ? '#c084fc' : '#e9d5ff',
          });
        }
        state.shockRings.push({
          radius: PULL_RADIUS,
          maxRadius: PULL_RADIUS * 1.4,
          age: 0,
          life: 400,
          inward: false,
        });
        state.shockRings.push({
          radius: PULL_RADIUS,
          maxRadius: 8,
          age: 0,
          life: 360,
          inward: true,
        });
      }
    } else if (state.phase === 'collapse') {
      if (state.phaseMs >= COLLAPSE_MS) {
        state.phase = 'cooldown';
        state.phaseMs = 0;
      }
    } else {
      if (state.phaseMs >= COOLDOWN_MS) {
        const target = sim.enemies[0];
        state.vortexX = target ? target.x : sim.playerX + 90;
        state.vortexY = target ? target.y : sim.playerY - 30;
        state.phase = 'spawn';
        state.phaseMs = 0;
        state.spawnProgress = 0;
        state.particles = [];
        state.shockRings = [];
      }
    }

    const pullActive = state.phase === 'active' || state.phase === 'collapse';

    for (const e of state.enemies) {
      if (!e.alive) {
        e.respawnTimer -= dtMs;
        if (e.respawnTimer <= 0) {
          Object.assign(
            e,
            spawnEnemy(sim.width, sim.height, state.vortexX, state.vortexY)
          );
        }
        continue;
      }
      e.x += e.vx * dtMs;
      e.y += e.vy * dtMs;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dtMs / 200);

      if (pullActive) {
        const dx = state.vortexX - e.x;
        const dy = state.vortexY - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < state.pullRadius) {
          const pull = 0.0009 * dtMs;
          e.vx += (dx / (dist || 1)) * pull;
          e.vy += (dy / (dist || 1)) * pull;
          e.vx += Math.cos(state.rotation * 2) * 0.0003 * dtMs;
          e.vy += Math.sin(state.rotation * 2) * 0.0003 * dtMs;

          if (dist < CORE_RADIUS + 10) {
            e.hp -= DAMAGE_PER_HIT;
            e.flash = 1;
            for (let k = 0; k < 5; k++) {
              const a = Math.random() * Math.PI * 2;
              state.particles.push({
                angle: a,
                radius: 8 + Math.random() * 6,
                angularSpeed: 0.01 + Math.random() * 0.008,
                inwardSpeed: 0.02 + Math.random() * 0.04,
                age: 0,
                life: 300 + Math.random() * 200,
                color: '#ef4444',
              });
            }
            if (e.hp <= 0) {
              e.alive = false;
              e.respawnTimer = 600;
              for (let k = 0; k < 10; k++) {
                const a = Math.random() * Math.PI * 2;
                state.particles.push({
                  angle: a,
                  radius: 12 + Math.random() * 10,
                  angularSpeed: 0.012 + Math.random() * 0.01,
                  inwardSpeed: 0.03 + Math.random() * 0.05,
                  age: 0,
                  life: 420 + Math.random() * 260,
                  color: '#ef4444',
                });
              }
            }
          }
        }
      }

      e.vx *= 0.97;
      e.vy *= 0.97;
    }

    for (const p of state.particles) {
      p.age += dtMs;
      p.angle += p.angularSpeed * dtMs;
      p.radius = Math.max(0, p.radius - p.inwardSpeed * dtMs);
    }
    state.particles = state.particles.filter(p => p.age < p.life && p.radius > 1);

    for (const s of state.shockRings) {
      s.age += dtMs;
      const k = Math.min(1, s.age / s.life);
      s.radius = s.inward
        ? PULL_RADIUS * (1 - k) + 4 * k
        : PULL_RADIUS + (s.maxRadius - PULL_RADIUS) * k;
    }
    state.shockRings = state.shockRings.filter(s => s.age < s.life);
  },
  render: (ctx, state, sim) => {
    const vx = state.vortexX;
    const vy = state.vortexY;
    const spawnK = state.phase === 'spawn' ? state.spawnProgress : 1;
    const activeK = state.phase === 'active' || state.phase === 'collapse' ? 1 : 0;

    for (const p of state.particles) {
      const px = vx + Math.cos(p.angle) * p.radius;
      const py = vy + Math.sin(p.angle) * p.radius;
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(px, py, 2 * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (state.phase !== 'cooldown') {
      const pullAlpha = (0.06 + 0.04 * Math.sin(state.rotation * 3)) * spawnK;
      const pullGrad = ctx.createRadialGradient(
        vx,
        vy,
        CORE_RADIUS,
        vx,
        vy,
        state.pullRadius * spawnK
      );
      pullGrad.addColorStop(0, `rgba(168,85,247,${pullAlpha * 2})`);
      pullGrad.addColorStop(0.6, `rgba(124,58,237,${pullAlpha})`);
      pullGrad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = pullGrad;
      ctx.beginPath();
      ctx.arc(vx, vy, state.pullRadius * spawnK, 0, Math.PI * 2);
      ctx.fill();
    }

    if (activeK > 0 || state.phase === 'spawn') {
      const armCount = 4;
      const maxR = state.pullRadius * 0.95 * spawnK;
      for (let arm = 0; arm < armCount; arm++) {
        const baseAngle = (arm / armCount) * Math.PI * 2 + state.rotation;
        ctx.beginPath();
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const r = maxR * (1 - t);
          const a = baseAngle + t * Math.PI * 1.6;
          const x = vx + Math.cos(a) * r;
          const y = vy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const armAlpha = 0.5 * spawnK;
        ctx.strokeStyle = `rgba(192,132,252,${armAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = `rgba(233,213,255,${armAlpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (activeK > 0) {
      for (const blade of state.blades) {
        const a0 = blade.angleOffset + state.rotation * 1.4;
        ctx.save();
        ctx.strokeStyle = 'rgba(217,70,239,0.85)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(vx, vy, blade.radius, a0, a0 + blade.arcSpan);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (state.phase !== 'cooldown') {
      const horizonR = CORE_RADIUS * spawnK;
      const horizonGrad = ctx.createRadialGradient(vx, vy, 0, vx, vy, horizonR * 1.8);
      horizonGrad.addColorStop(0, 'rgba(10,4,20,0.95)');
      horizonGrad.addColorStop(0.6, 'rgba(40,15,70,0.7)');
      horizonGrad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = horizonGrad;
      ctx.beginPath();
      ctx.arc(vx, vy, horizonR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      const ringPulse = 0.7 + 0.3 * Math.sin(state.rotation * 4);
      ctx.strokeStyle = `rgba(192,132,252,${0.9 * ringPulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vx, vy, horizonR * ringPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(vx, vy, 2.5 * spawnK, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of state.enemies) {
      if (!e.alive) continue;
      const hpFrac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = e.flash > 0.01 ? '#ffffff' : '#ef4444';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 10, e.y - 16, 20, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(e.x - 10, e.y - 16, 20 * hpFrac, 3);
    }

    for (const s of state.shockRings) {
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.strokeStyle = `rgba(217,70,239,${alpha * 0.9})`;
      ctx.lineWidth = 3 * alpha + 1;
      ctx.beginPath();
      ctx.arc(vx, vy, s.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.collapseFlash > 0.01) {
      const fr = CORE_RADIUS * 3 * (1 - state.collapseFlash);
      const fgrad = ctx.createRadialGradient(vx, vy, 0, vx, vy, fr + 6);
      fgrad.addColorStop(0, `rgba(255,255,255,${state.collapseFlash})`);
      fgrad.addColorStop(0.5, `rgba(233,213,255,${state.collapseFlash * 0.7})`);
      fgrad.addColorStop(1, 'rgba(192,132,252,0)');
      ctx.fillStyle = fgrad;
      ctx.beginPath();
      ctx.arc(vx, vy, fr + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`${state.phase.toUpperCase()}`, 6, sim.height - 6);
  },
};
