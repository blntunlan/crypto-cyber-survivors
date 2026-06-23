import { type VfxPreviewModule } from '../../../types/vfxLab';

interface Particle {
  angle: number;
  radius: number;
  angularDrift: number;
  outwardSpeed: number;
  age: number;
  life: number;
}

interface State {
  cycleMs: number;
  rotation: number;
  particles: Particle[];
  peakFired: boolean;
  flash: number;
  lastBreathe: number;
}

const CYCLE_MS = 1500;
const BASE_RADIUS = 52;
const BAND_MIN = 12;
const BAND_MAX = 46;
const SMA_RADIUS = BASE_RADIUS;

const COOL: ReadonlyArray<number> = [34, 211, 238];
const HOT: ReadonlyArray<number> = [244, 114, 182];

function lerpColor(k: number): string {
  const r = Math.round(COOL[0]! + (HOT[0]! - COOL[0]!) * k);
  const g = Math.round(COOL[1]! + (HOT[1]! - COOL[1]!) * k);
  const b = Math.round(COOL[2]! + (HOT[2]! - COOL[2]!) * k);
  return `${r},${g},${b}`;
}

export const BollingerPulsePreview: VfxPreviewModule<State> = {
  id: 'weapon-bollinger-pulse-v1',
  category: 'weapon',
  label: 'Bollinger Pulse',
  description:
    'Breathing bands around the player. Squeeze (cool) then expand (hot) — pulses damage at peak expansion.',
  init: () => ({
    cycleMs: 0,
    rotation: 0,
    particles: [],
    peakFired: false,
    flash: 0,
    lastBreathe: 0,
  }),
  tick: (state, sim, dtMs) => {
    state.cycleMs += dtMs;
    state.rotation += dtMs * 0.0008;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dtMs / 320);

    if (state.cycleMs >= CYCLE_MS) {
      state.cycleMs -= CYCLE_MS;
      state.peakFired = false;
    }

    const breathe = 0.5 - 0.5 * Math.cos((state.cycleMs / CYCLE_MS) * Math.PI * 2);
    const rising = breathe > state.lastBreathe;
    state.lastBreathe = breathe;

    if (breathe > 0.86 && !state.peakFired && rising) {
      state.peakFired = true;
      state.flash = 1;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.15;
        state.particles.push({
          angle: a,
          radius: BASE_RADIUS + BAND_MAX * 0.5,
          angularDrift: (Math.random() - 0.5) * 0.002,
          outwardSpeed: 0.08 + Math.random() * 0.08,
          age: 0,
          life: 420 + Math.random() * 220,
        });
      }
    }

    for (const p of state.particles) {
      p.age += dtMs;
      p.radius += p.outwardSpeed * dtMs;
      p.angle += p.angularDrift * dtMs;
    }
    state.particles = state.particles.filter(
      p => p.age < p.life && p.radius < sim.width
    );
  },
  render: (ctx, state, sim) => {
    const px = sim.playerX;
    const py = sim.playerY;

    const breathe = 0.5 - 0.5 * Math.cos((state.cycleMs / CYCLE_MS) * Math.PI * 2);
    const bandWidth = BAND_MIN + (BAND_MAX - BAND_MIN) * breathe;
    const innerR = BASE_RADIUS - bandWidth / 2;
    const outerR = BASE_RADIUS + bandWidth / 2;
    const colorRgb = lerpColor(breathe);

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();

    const bandAlpha = 0.12 + breathe * 0.22;
    const bandGrad = ctx.createRadialGradient(px, py, innerR, px, py, outerR);
    bandGrad.addColorStop(0, `rgba(${colorRgb},${bandAlpha * 0.5})`);
    bandGrad.addColorStop(0.5, `rgba(${colorRgb},${bandAlpha})`);
    bandGrad.addColorStop(1, `rgba(${colorRgb},${bandAlpha * 0.5})`);
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.arc(px, py, outerR, 0, Math.PI * 2);
    ctx.arc(px, py, innerR, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -state.rotation * 60;
    ctx.strokeStyle = `rgba(${colorRgb},${0.3 + breathe * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, SMA_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(${colorRgb},${0.4 + breathe * 0.2})`;
    ctx.lineWidth = 2 + breathe * 1.5;
    ctx.shadowColor = `rgb(${colorRgb})`;
    ctx.shadowBlur = 6 + breathe * 10;
    ctx.beginPath();
    ctx.arc(px, py, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(${colorRgb},${0.7 + breathe * 0.3})`;
    ctx.lineWidth = 3 + breathe * 2.5;
    ctx.shadowColor = `rgb(${colorRgb})`;
    ctx.shadowBlur = 10 + breathe * 14;
    ctx.beginPath();
    ctx.arc(px, py, outerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const leadingAlpha = 0.6 + breathe * 0.4;
    ctx.strokeStyle = `rgba(255,255,255,${leadingAlpha * 0.8})`;
    ctx.lineWidth = 1 + breathe * 1.5;
    ctx.beginPath();
    ctx.arc(px, py, outerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (const p of state.particles) {
      const x = px + Math.cos(p.angle) * p.radius;
      const y = py + Math.sin(p.angle) * p.radius;
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${colorRgb},${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, 4 * alpha + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.12})`;
      ctx.fillRect(0, 0, sim.width, sim.height);
    }

    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(
      `BAND ${Math.round(bandWidth)}px  ${breathe > 0.7 ? 'EXPAND' : breathe < 0.3 ? 'SQUEEZE' : 'MID'}`,
      6,
      sim.height - 6
    );
  },
};
