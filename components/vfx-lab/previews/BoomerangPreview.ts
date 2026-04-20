import { type VfxPreviewModule } from '../../../types/vfxLab';

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface State {
  /** 0..1 progress through a full outbound+inbound cycle */
  t: number;
  rotation: number;
  trail: TrailPoint[];
  sparks: Spark[];
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  /** Lateral curve offset direction (flips each cycle for variety) */
  curveSign: number;
  /** Triggered once per cycle at apex */
  apexBurst: boolean;
}

const CYCLE_MS = 1700;
const TRAIL_LIFE_MS = 380;
const CURVE_AMOUNT = 40;

function ease(k: number): number {
  // Ease-in-out sine
  return 0.5 - 0.5 * Math.cos(k * Math.PI);
}

function drawBoomerang(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rotation: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // Wing shape — two tapered blades meeting at center
  const drawBlade = (angle: number): void => {
    ctx.save();
    ctx.rotate(angle);
    // Outer neon glow
    ctx.shadowColor = '#c026d3';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.quadraticCurveTo(10, -5, 16, -1);
    ctx.quadraticCurveTo(18, 0, 16, 1);
    ctx.quadraticCurveTo(10, 5, -2, 2);
    ctx.closePath();
    ctx.fill();

    // Inner bright highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(8, -2.5, 13, -0.5);
    ctx.quadraticCurveTo(14, 0, 13, 0.5);
    ctx.quadraticCurveTo(8, 2.5, 0, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Two blades 90° apart makes a V-shape boomerang
  drawBlade(-Math.PI / 4);
  drawBlade(Math.PI / 4);

  // Center rivet
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const BoomerangPreview: VfxPreviewModule<State> = {
  id: 'weapon-boomerang-v1',
  category: 'weapon',
  label: 'RSI Boomerang',
  description:
    'Curved flight to the target and back. Hits on both the outbound and inbound paths.',
  init: sim => {
    const target = sim.enemies[0] ?? { x: sim.playerX + 120, y: sim.playerY };
    return {
      t: 0,
      rotation: 0,
      trail: [],
      sparks: [],
      originX: sim.playerX,
      originY: sim.playerY,
      targetX: target.x,
      targetY: target.y,
      curveSign: 1,
      apexBurst: false,
    };
  },
  tick: (state, sim, dtMs) => {
    const prevT = state.t;
    state.t = (state.t + dtMs / CYCLE_MS) % 1;
    state.rotation += dtMs * 0.022;

    // New cycle — re-anchor and flip curve
    if (state.t < prevT) {
      state.originX = sim.playerX;
      state.originY = sim.playerY;
      const target = sim.enemies[0];
      if (target) {
        state.targetX = target.x;
        state.targetY = target.y;
      }
      state.curveSign *= -1;
      state.apexBurst = false;
    }

    // Compute position with lateral curve (bezier-like offset)
    const computePos = (t: number): { x: number; y: number } => {
      let x: number;
      let y: number;
      let segT: number;
      let a: { x: number; y: number };
      let b: { x: number; y: number };
      if (t < 0.5) {
        segT = ease(t / 0.5);
        a = { x: state.originX, y: state.originY };
        b = { x: state.targetX, y: state.targetY };
      } else {
        segT = ease((t - 0.5) / 0.5);
        a = { x: state.targetX, y: state.targetY };
        b = { x: sim.playerX, y: sim.playerY };
      }
      x = a.x + (b.x - a.x) * segT;
      y = a.y + (b.y - a.y) * segT;

      // Perpendicular curve offset
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = Math.sin(segT * Math.PI) * CURVE_AMOUNT * state.curveSign;
      x += nx * offset;
      y += ny * offset;
      return { x, y };
    };

    const pos = computePos(state.t);

    // Trail point
    state.trail.push({ x: pos.x, y: pos.y, age: 0 });
    for (const p of state.trail) p.age += dtMs;
    while (state.trail.length > 0 && state.trail[0]!.age > TRAIL_LIFE_MS) {
      state.trail.shift();
    }

    // Apex burst (when reaching the target)
    if (!state.apexBurst && state.t >= 0.47 && state.t <= 0.53) {
      state.apexBurst = true;
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.06 + Math.random() * 0.12;
        state.sparks.push({
          x: state.targetX,
          y: state.targetY,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          age: 0,
          life: 350 + Math.random() * 200,
        });
      }
    }

    // Update sparks
    for (const s of state.sparks) {
      s.x += s.vx * dtMs;
      s.y += s.vy * dtMs;
      s.age += dtMs;
      s.vx *= 0.96;
      s.vy *= 0.96;
    }
    state.sparks = state.sparks.filter(s => s.age < s.life);
  },
  render: (ctx, state, sim) => {
    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Trail — stroked ribbon from tail to head
    if (state.trail.length >= 2) {
      // Outer glow pass
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(192,38,211,0.2)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(state.trail[0]!.x, state.trail[0]!.y);
      for (let i = 1; i < state.trail.length; i++) {
        ctx.lineTo(state.trail[i]!.x, state.trail[i]!.y);
      }
      ctx.stroke();
      ctx.restore();

      // Inner colored segments with age-based alpha (neon purple)
      for (let i = 1; i < state.trail.length; i++) {
        const p0 = state.trail[i - 1]!;
        const p1 = state.trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / TRAIL_LIFE_MS);
        ctx.strokeStyle = `rgba(168,85,247,${alpha * 0.9})`;
        ctx.lineWidth = 3 * alpha + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Bright magenta core
      for (let i = 1; i < state.trail.length; i++) {
        const p0 = state.trail[i - 1]!;
        const p1 = state.trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / TRAIL_LIFE_MS);
        ctx.strokeStyle = `rgba(240,171,252,${alpha * 0.8})`;
        ctx.lineWidth = Math.max(0.5, alpha * 1.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // Sparks (fuchsia)
    for (const s of state.sparks) {
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.fillStyle = `rgba(217,70,239,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8 * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boomerang at current head
    const head = state.trail[state.trail.length - 1];
    if (head) {
      // Wobble scale slightly based on phase (outbound slightly bigger)
      const scale = 1 + Math.sin(state.t * Math.PI) * 0.12;
      drawBoomerang(ctx, head.x, head.y, state.rotation, scale);
    }
  },
};
