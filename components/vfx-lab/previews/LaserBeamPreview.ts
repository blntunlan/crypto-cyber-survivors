import { type VfxPreviewModule } from '../../../types/vfxLab';

type Phase = 'charge' | 'fire' | 'cooldown';

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
  charge: number; // 0..1 charge level
  /** Cached target when firing starts (so the shot doesn't bend mid-fire) */
  firedTarget: { x: number; y: number } | null;
  sparks: ChargeSpark[];
  /** 0..1 fade for the fired beam */
  fireFade: number;
}

const CHARGE_MS = 900;
const FIRE_MS = 450;
const COOLDOWN_MS = 350;

export const LaserBeamPreview: VfxPreviewModule<State> = {
  id: 'weapon-laser-beam-v1',
  category: 'weapon',
  label: 'Volatility Laser',
  description:
    'Charges energy at the player, then unleashes a thick beam toward the nearest enemy.',
  init: () => ({
    phase: 'charge',
    phaseMs: 0,
    charge: 0,
    firedTarget: null,
    sparks: [],
    fireFade: 0,
  }),
  tick: (state, sim, dtMs) => {
    state.phaseMs += dtMs;

    if (state.phase === 'charge') {
      state.charge = Math.min(1, state.phaseMs / CHARGE_MS);

      // Spawn inward-spiraling sparks
      if (Math.random() < 0.3 + state.charge * 0.5) {
        state.sparks.push({
          angle: Math.random() * Math.PI * 2,
          radius: 40 + Math.random() * 30,
          speed: 0.08 + state.charge * 0.12,
          life: 0,
          maxLife: 350 + Math.random() * 200,
        });
      }

      if (state.phaseMs >= CHARGE_MS) {
        state.phase = 'fire';
        state.phaseMs = 0;
        state.fireFade = 1;
        const target = sim.enemies[0];
        state.firedTarget = target
          ? { x: target.x, y: target.y }
          : { x: sim.playerX + 120, y: sim.playerY };
      }
    } else if (state.phase === 'fire') {
      state.fireFade = Math.max(0, 1 - state.phaseMs / FIRE_MS);
      if (state.phaseMs >= FIRE_MS) {
        state.phase = 'cooldown';
        state.phaseMs = 0;
        state.charge = 0;
        state.sparks = [];
      }
    } else {
      if (state.phaseMs >= COOLDOWN_MS) {
        state.phase = 'charge';
        state.phaseMs = 0;
        state.firedTarget = null;
      }
    }

    // Update sparks (spiral inward toward player)
    for (const s of state.sparks) {
      s.life += dtMs;
      s.radius = Math.max(0, s.radius - s.speed * dtMs);
      s.angle += 0.004 * dtMs;
    }
    state.sparks = state.sparks.filter(s => s.life < s.maxLife && s.radius > 2);
  },
  render: (ctx, state, sim) => {
    // Player
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(sim.playerX, sim.playerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Charge phase visuals
    if (state.phase === 'charge' || state.phase === 'fire') {
      // Inward sparks
      for (const s of state.sparks) {
        const x = sim.playerX + Math.cos(s.angle) * s.radius;
        const y = sim.playerY + Math.sin(s.angle) * s.radius;
        const a = Math.max(0, 1 - s.life / s.maxLife);
        ctx.fillStyle = `rgba(255,120,200,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Charging core
      const charge = state.phase === 'fire' ? 1 : state.charge;
      const coreR = 4 + charge * 12;
      const glowR = 14 + charge * 24;

      const glow = ctx.createRadialGradient(
        sim.playerX,
        sim.playerY,
        0,
        sim.playerX,
        sim.playerY,
        glowR
      );
      glow.addColorStop(0, `rgba(255,180,230,${0.6 * charge})`);
      glow.addColorStop(0.5, `rgba(255,100,180,${0.3 * charge})`);
      glow.addColorStop(1, 'rgba(255,100,180,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sim.playerX, sim.playerY, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${0.4 + charge * 0.6})`;
      ctx.beginPath();
      ctx.arc(sim.playerX, sim.playerY, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire phase — big beam
    if (state.phase === 'fire' && state.firedTarget) {
      const fade = state.fireFade;

      // Re-aim live so the beam stays locked to the enemy even if it moves
      const live = sim.enemies[0];
      const aimX = live ? live.x : state.firedTarget.x;
      const aimY = live ? live.y : state.firedTarget.y;
      const enemyRadius = live ? live.radius : 10;

      // Beam endpoint lands just at the enemy's surface (no overshoot)
      const dx = aimX - sim.playerX;
      const dy = aimY - sim.playerY;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const endX = aimX - nx * enemyRadius * 0.2;
      const endY = aimY - ny * enemyRadius * 0.2;

      ctx.lineCap = 'round';

      // Outer massive glow
      ctx.save();
      ctx.strokeStyle = `rgba(255,100,180,${0.35 * fade})`;
      ctx.lineWidth = 30 * fade + 10;
      ctx.beginPath();
      ctx.moveTo(sim.playerX, sim.playerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // Mid beam
      ctx.save();
      ctx.strokeStyle = `rgba(255,180,230,${0.9 * fade})`;
      ctx.lineWidth = 14 * fade + 4;
      ctx.beginPath();
      ctx.moveTo(sim.playerX, sim.playerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // Bright core
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${fade})`;
      ctx.lineWidth = 5 * fade + 1.5;
      ctx.beginPath();
      ctx.moveTo(sim.playerX, sim.playerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // Impact flash centered on the enemy
      const impactR = 16 + (1 - fade) * 20;
      const impactGrad = ctx.createRadialGradient(aimX, aimY, 0, aimX, aimY, impactR);
      impactGrad.addColorStop(0, `rgba(255,255,255,${fade})`);
      impactGrad.addColorStop(0.4, `rgba(255,150,210,${0.7 * fade})`);
      impactGrad.addColorStop(1, 'rgba(255,100,180,0)');
      ctx.fillStyle = impactGrad;
      ctx.beginPath();
      ctx.arc(aimX, aimY, impactR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Phase label (debug, tiny, bottom-left)
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(
      `${state.phase.toUpperCase()}  ${Math.round(state.charge * 100)}%`,
      6,
      sim.height - 6
    );
  },
};
