import { type VfxPreviewModule } from '../../../types/vfxLab';

type Phase = 'charge' | 'fire' | 'cooldown';

interface Bolt {
  points: Array<{ x: number; y: number }>;
  age: number;
  life: number;
}

interface NodeFlash {
  x: number;
  y: number;
  age: number;
  life: number;
  radius: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface ChargeSpark {
  angle: number;
  radius: number;
  speed: number;
  life: number;
  maxLife: number;
}

interface State {
  phase: Phase;
  phaseMs: number;
  charge: number;
  chainTargets: Array<{ x: number; y: number }>;
  currentHop: number;
  hopTimer: number;
  bolts: Bolt[];
  nodeFlashes: NodeFlash[];
  sparks: Spark[];
  chargeSparks: ChargeSpark[];
}

const CHARGE_MS = 700;
const HOP_INTERVAL = 90;
const BOLT_LIFE = 180;
const COOLDOWN_MS = 320;
const MAX_HOPS = 4;
const SEGMENTS = 6;
const JITTER = 14;

function buildBoltPath(
  ax: number,
  ay: number,
  bx: number,
  by: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [{ x: ax, y: ay }];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const baseX = ax + dx * t;
    const baseY = ay + dy * t;
    const taper = Math.sin(t * Math.PI);
    const offset = (Math.random() - 0.5) * JITTER * 2 * taper;
    points.push({ x: baseX + nx * offset, y: baseY + ny * offset });
  }
  points.push({ x: bx, y: by });
  return points;
}

export const LightningNetworkPreview: VfxPreviewModule<State> = {
  id: 'weapon-lightning-network-v1',
  category: 'weapon',
  label: 'Lightning Network',
  description:
    'Charges at the player, then a jagged bolt chains through 3 enemies and closes back. Multi-hop crowd clear.',
  init: () => ({
    phase: 'charge',
    phaseMs: 0,
    charge: 0,
    chainTargets: [],
    currentHop: 0,
    hopTimer: 0,
    bolts: [],
    nodeFlashes: [],
    sparks: [],
    chargeSparks: [],
  }),
  tick: (state, sim, dtMs) => {
    state.phaseMs += dtMs;

    if (state.phase === 'charge') {
      state.charge = Math.min(1, state.phaseMs / CHARGE_MS);

      if (Math.random() < 0.3 + state.charge * 0.6) {
        state.chargeSparks.push({
          angle: Math.random() * Math.PI * 2,
          radius: 36 + Math.random() * 26,
          speed: 0.09 + state.charge * 0.14,
          life: 0,
          maxLife: 320 + Math.random() * 180,
        });
      }

      if (state.phaseMs >= CHARGE_MS) {
        const enemies = [...sim.enemies].sort((a, b) => {
          const da = Math.hypot(a.x - sim.playerX, a.y - sim.playerY);
          const db = Math.hypot(b.x - sim.playerX, b.y - sim.playerY);
          return da - db;
        });
        const targets: Array<{ x: number; y: number }> = [
          { x: sim.playerX, y: sim.playerY },
        ];
        for (let i = 0; i < Math.min(enemies.length, MAX_HOPS - 1); i++) {
          const e = enemies[i]!;
          targets.push({ x: e.x, y: e.y });
        }
        if (targets.length < MAX_HOPS) {
          const last = targets[targets.length - 1]!;
          const baseAngle = Math.atan2(last.y - sim.playerY, last.x - sim.playerX);
          for (let i = targets.length; i < MAX_HOPS - 1; i++) {
            const a = baseAngle + (Math.random() - 0.5) * 1.2;
            const r = 70 + Math.random() * 30;
            targets.push({
              x: sim.playerX + Math.cos(a) * r,
              y: sim.playerY + Math.sin(a) * r,
            });
          }
        }
        targets.push({ x: sim.playerX, y: sim.playerY });
        state.chainTargets = targets;
        state.currentHop = 0;
        state.hopTimer = 0;
        state.phase = 'fire';
        state.phaseMs = 0;
        state.chargeSparks = [];
      }
    } else if (state.phase === 'fire') {
      state.hopTimer += dtMs;
      while (
        state.currentHop < state.chainTargets.length - 1 &&
        state.hopTimer >= HOP_INTERVAL
      ) {
        state.hopTimer -= HOP_INTERVAL;
        const from = state.chainTargets[state.currentHop]!;
        const to = state.chainTargets[state.currentHop + 1]!;
        state.bolts.push({
          points: buildBoltPath(from.x, from.y, to.x, to.y),
          age: 0,
          life: BOLT_LIFE,
        });
        state.nodeFlashes.push({
          x: to.x,
          y: to.y,
          age: 0,
          life: 280,
          radius: 18,
        });
        const sparkCount = state.currentHop === 0 ? 10 : 7;
        for (let k = 0; k < sparkCount; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 0.05 + Math.random() * 0.14;
          state.sparks.push({
            x: to.x,
            y: to.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            age: 0,
            life: 280 + Math.random() * 180,
          });
        }
        state.currentHop++;
      }

      const lastBoltDone =
        state.bolts.length === 0 ||
        state.bolts[state.bolts.length - 1]!.age >= BOLT_LIFE;
      if (state.currentHop >= state.chainTargets.length - 1 && lastBoltDone) {
        state.phase = 'cooldown';
        state.phaseMs = 0;
      }
    } else {
      if (state.phaseMs >= COOLDOWN_MS) {
        state.phase = 'charge';
        state.phaseMs = 0;
        state.charge = 0;
        state.chainTargets = [];
        state.currentHop = 0;
        state.hopTimer = 0;
      }
    }

    for (const s of state.chargeSparks) {
      s.life += dtMs;
      s.radius = Math.max(0, s.radius - s.speed * dtMs);
      s.angle += 0.005 * dtMs;
    }
    state.chargeSparks = state.chargeSparks.filter(
      s => s.life < s.maxLife && s.radius > 2
    );

    for (const b of state.bolts) b.age += dtMs;
    state.bolts = state.bolts.filter(b => b.age < b.life);

    for (const f of state.nodeFlashes) f.age += dtMs;
    state.nodeFlashes = state.nodeFlashes.filter(f => f.age < f.life);

    for (const s of state.sparks) {
      s.x += s.vx * dtMs;
      s.y += s.vy * dtMs;
      s.age += dtMs;
      s.vx *= 0.94;
      s.vy *= 0.94;
    }
    state.sparks = state.sparks.filter(s => s.age < s.life);
  },
  render: (ctx, state, sim) => {
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    if (state.phase === 'charge' || state.phase === 'fire') {
      for (const s of state.chargeSparks) {
        const x = sim.playerX + Math.cos(s.angle) * s.radius;
        const y = sim.playerY + Math.sin(s.angle) * s.radius;
        const a = Math.max(0, 1 - s.life / s.maxLife);
        ctx.fillStyle = `rgba(165,243,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const charge = state.phase === 'fire' ? 1 : state.charge;
      const coreR = 4 + charge * 10;
      const glowR = 14 + charge * 22;
      const glow = ctx.createRadialGradient(
        sim.playerX,
        sim.playerY,
        0,
        sim.playerX,
        sim.playerY,
        glowR
      );
      glow.addColorStop(0, `rgba(165,243,255,${0.6 * charge})`);
      glow.addColorStop(0.5, `rgba(34,211,238,${0.3 * charge})`);
      glow.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sim.playerX, sim.playerY, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${0.4 + charge * 0.6})`;
      ctx.beginPath();
      ctx.arc(sim.playerX, sim.playerY, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of state.bolts) {
      const fade = Math.max(0, 1 - b.age / b.life);
      if (b.points.length < 2) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = `rgba(34,211,238,${0.3 * fade})`;
      ctx.lineWidth = 12 * fade + 4;
      ctx.beginPath();
      ctx.moveTo(b.points[0]!.x, b.points[0]!.y);
      for (let i = 1; i < b.points.length; i++) {
        ctx.lineTo(b.points[i]!.x, b.points[i]!.y);
      }
      ctx.stroke();

      ctx.strokeStyle = `rgba(165,243,255,${0.8 * fade})`;
      ctx.lineWidth = 5 * fade + 1.5;
      ctx.beginPath();
      ctx.moveTo(b.points[0]!.x, b.points[0]!.y);
      for (let i = 1; i < b.points.length; i++) {
        ctx.lineTo(b.points[i]!.x, b.points[i]!.y);
      }
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${fade})`;
      ctx.lineWidth = 2 * fade + 0.6;
      ctx.beginPath();
      ctx.moveTo(b.points[0]!.x, b.points[0]!.y);
      for (let i = 1; i < b.points.length; i++) {
        ctx.lineTo(b.points[i]!.x, b.points[i]!.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const f of state.nodeFlashes) {
      const fade = Math.max(0, 1 - f.age / f.life);
      const r = f.radius * (1 + (1 - fade) * 0.6);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, `rgba(255,255,255,${fade})`);
      grad.addColorStop(0.4, `rgba(165,243,255,${0.7 * fade})`);
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of state.sparks) {
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.fillStyle = `rgba(165,243,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6 * alpha + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(
      `${state.phase.toUpperCase()}  HOP ${state.currentHop}/${Math.max(0, state.chainTargets.length - 1)}`,
      6,
      sim.height - 6
    );
  },
};
