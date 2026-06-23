import { type PreviewTheme } from '../../../types/previewLab';

export interface StyledEnemyDrawParams {
  x: number;
  y: number;
  radius: number;
  color: string;
  theme: PreviewTheme;
  enemyType: string;
  hitFlash?: number;
  bobPhase?: number;
  spawnProgress?: number;
  isElite?: boolean;
  isBoss?: boolean;
  whaleTier?: number;
}

const ELITE_GLOW_COLOR = '#FFD700';
const ELITE_GLOW_RADIUS = 8;
const CROWN_OFFSET_Y = -20;

type ShapeDrawer = (
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number,
  whaleTier?: number
) => void;

function applyGlow(ctx: CanvasRenderingContext2D, color: string, r: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.min(20, r * 0.6);
}

function drawBearShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r);
  ctx.lineTo(r * 0.7, -r);
  ctx.lineTo(r * 0.7, r * 0.15);
  ctx.lineTo(r * 0.95, r * 0.15);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.95, r * 0.15);
  ctx.lineTo(-r * 0.7, r * 0.15);
  ctx.closePath();
  ctx.fill();
}

function drawBullShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.15);
  ctx.lineTo(-r * 0.7, -r * 0.15);
  ctx.lineTo(-r * 0.7, r);
  ctx.lineTo(r * 0.7, r);
  ctx.lineTo(r * 0.7, -r * 0.15);
  ctx.lineTo(r * 0.95, -r * 0.15);
  ctx.lineTo(0, -r);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.75);
  ctx.quadraticCurveTo(-r * 0.85, -r * 1.15, -r * 0.35, -r * 1.1);
  ctx.lineTo(-r * 0.3, -r * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.75);
  ctx.quadraticCurveTo(r * 0.85, -r * 1.15, r * 0.35, -r * 1.1);
  ctx.lineTo(r * 0.3, -r * 0.85);
  ctx.closePath();
  ctx.fill();
}

function drawFudShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;
  const steps = 14;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble =
      1 + Math.sin(a * 5 + phase * 3) * 0.18 + Math.sin(a * 3 - phase * 2) * 0.08;
    const px = Math.cos(a) * r * wobble;
    const py = Math.sin(a) * r * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) {
    const a = phase * 0.8 + (i / 3) * Math.PI * 2;
    const dist = r * 1.35;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWhaleShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number,
  whaleTier?: number
): void {
  const tier = whaleTier ?? 2;
  const isBaby = tier === 1;
  const isMega = tier === 3;

  if (isMega && glow) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(phase * 3) * 0.08;
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.beginPath();
  ctx.ellipse(r * 0.1, 0, r * 0.8, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const tailWag = Math.sin(phase * 2) * 0.15;
  const tailSize = isBaby ? 0.85 : isMega ? 1.2 : 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, 0);
  ctx.lineTo(-r * 1.1 * tailSize, -r * 0.45 * tailSize + tailWag * r);
  ctx.lineTo(-r * 0.9, 0);
  ctx.lineTo(-r * 1.1 * tailSize, r * 0.45 * tailSize + tailWag * r);
  ctx.closePath();
  ctx.fill();

  if (!isBaby) {
    ctx.beginPath();
    ctx.ellipse(r * 0.15, -r * 0.7, r * 0.25, r * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (glow) ctx.shadowBlur = 0;

  if (isMega && glow) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const yOff = (i - 1) * r * 0.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, yOff);
      ctx.lineTo(r * 0.5, yOff);
      ctx.stroke();
    }
    ctx.restore();
  }

  const eyeR = isBaby ? r * 0.14 : r * 0.1;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.15, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(r * 0.48, -r * 0.15, eyeR * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawLiquidatorShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.12);
  ctx.lineTo(r, -r * 0.12);
  ctx.lineTo(r * 0.9, 0);
  ctx.lineTo(r, r * 0.12);
  ctx.lineTo(-r, r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.9, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.9, 0, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-Math.PI / 4);
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.12);
  ctx.lineTo(r, -r * 0.12);
  ctx.lineTo(r * 0.9, 0);
  ctx.lineTo(r, r * 0.12);
  ctx.lineTo(-r, r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.9, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.9, 0, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPumpDumpShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  const pulse = 0.85 + Math.sin(phase * 4) * 0.15;
  ctx.fillStyle = fill;

  ctx.beginPath();
  ctx.moveTo(-r * 0.25 * pulse, r * 0.1);
  ctx.lineTo(r * 0.25 * pulse, r * 0.1);
  ctx.lineTo(r * 0.25 * pulse, -r * 0.35);
  ctx.lineTo(r * 0.6 * pulse, -r * 0.35);
  ctx.lineTo(0, -r * 0.85 * pulse);
  ctx.lineTo(-r * 0.6 * pulse, -r * 0.35);
  ctx.lineTo(-r * 0.25 * pulse, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.25 * pulse, -r * 0.1);
  ctx.lineTo(r * 0.25 * pulse, -r * 0.1);
  ctx.lineTo(r * 0.25 * pulse, r * 0.35);
  ctx.lineTo(r * 0.6 * pulse, r * 0.35);
  ctx.lineTo(0, r * 0.85 * pulse);
  ctx.lineTo(-r * 0.6 * pulse, r * 0.35);
  ctx.lineTo(-r * 0.25 * pulse, r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRsiShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.3);
  ctx.lineTo(r * 0.7, -r * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.3);
  ctx.lineTo(r * 0.7, r * 0.3);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = -r * 0.6 + t * r * 1.2;
    const y = Math.sin(t * Math.PI * 4 + phase * 3) * r * 0.18;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawMarketMakerShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.rotate(phase * 0.8);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r * 0.6;
    const py = Math.sin(a) * r * 0.6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (glow) ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGatekeeperShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.7);
  ctx.lineTo(r * 0.8, -r * 0.7);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.2, r * 0.6, r * 0.1);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.6, r * 0.1);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, -r * 0.8, -r * 0.7);
  ctx.closePath();
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.5);
  ctx.lineTo(-r * 0.35, r * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(0, r * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.5);
  ctx.lineTo(r * 0.35, r * 0.3);
  ctx.stroke();
}

function drawRugpullShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;
  const pull = Math.sin(phase * 3) * r * 0.15;

  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.6);
  ctx.lineTo(r * 0.8, -r * 0.6);
  ctx.lineTo(r * 0.8 + pull, r * 0.2);
  for (let i = 8; i >= 0; i--) {
    const t = i / 8;
    const x = -r * 0.8 + t * r * 1.6 + pull * (1 - t);
    const y = r * 0.2 + Math.sin(t * Math.PI * 4 + phase * 4) * r * 0.15;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * r * 0.3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8 + offset, -r * 0.6);
    ctx.lineTo(-r * 1.1 + pull + offset, r * 0.1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawMevBotShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.55);
  ctx.lineTo(r * 0.4, -r * 0.55);
  ctx.lineTo(r, 0);
  ctx.lineTo(r * 0.4, r * 0.55);
  ctx.lineTo(-r, r * 0.55);
  ctx.lineTo(-r * 0.65, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 1.15, -r * 0.35);
  ctx.lineTo(-r * 0.8, -r * 0.2);
  ctx.lineTo(-r * 1.15, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 1.15, r * 0.05);
  ctx.lineTo(-r * 0.8, r * 0.2);
  ctx.lineTo(-r * 1.15, r * 0.35);
  ctx.closePath();
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(r * 0.25, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlashLoanShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  const pulse = (Math.sin(phase * 5) + 1) * 0.5;

  if (glow) ctx.shadowBlur = 0;
  ctx.strokeStyle = fill;
  for (let i = 0; i < 3; i++) {
    const ringR = r * (0.5 + i * 0.25 + pulse * 0.12);
    ctx.globalAlpha = (1 - i * 0.3) * (0.5 + pulse * 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (glow) {
    applyGlow(ctx, fill, r);
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -r * 0.25);
  ctx.lineTo(r * 0.12, -r * 0.05);
  ctx.lineTo(-r * 0.02, -r * 0.05);
  ctx.lineTo(r * 0.08, r * 0.25);
  ctx.lineTo(-r * 0.12, r * 0.05);
  ctx.lineTo(r * 0.02, r * 0.05);
  ctx.closePath();
  ctx.fill();
}

function drawSandwichShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;
  const squeeze = Math.sin(phase * 2) * r * 0.08;

  ctx.beginPath();
  ctx.moveTo(-r * 1.15 + squeeze, -r * 0.55);
  ctx.lineTo(-r * 0.15 + squeeze, 0);
  ctx.lineTo(-r * 1.15 + squeeze, r * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 1.15 - squeeze, -r * 0.55);
  ctx.lineTo(r * 0.15 - squeeze, 0);
  ctx.lineTo(r * 1.15 - squeeze, r * 0.55);
  ctx.closePath();
  ctx.fill();

  if (glow) ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function draw51AttackShape(
  ctx: CanvasRenderingContext2D,
  r: number,
  fill: string,
  glow: boolean,
  phase: number
): void {
  if (glow) applyGlow(ctx, fill, r);
  ctx.fillStyle = fill;

  const satellites = 5;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2 + phase;
    const sx = Math.cos(a) * r * 0.85;
    const sy = Math.sin(a) * r * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2 + phase;
    const sx = Math.cos(a) * r * 0.85;
    const sy = Math.sin(a) * r * 0.85;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  if (glow) ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

const SHAPE_DRAWERS: Record<string, ShapeDrawer> = {
  bear: drawBearShape,
  bull: drawBullShape,
  fud: drawFudShape,
  whale: drawWhaleShape,
  liquidator: drawLiquidatorShape,
  pumpdump: drawPumpDumpShape,
  rsi: drawRsiShape,
  market_maker: drawMarketMakerShape,
  gatekeeper: drawGatekeeperShape,
  rugpull: drawRugpullShape,
  mev_bot: drawMevBotShape,
  flash_loan: drawFlashLoanShape,
  sandwich: drawSandwichShape,
  '51_attack': draw51AttackShape,
};

function drawEliteIndicators(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isRetro: boolean
): void {
  ctx.save();
  const pulseTime = performance.now() * 0.004;
  const pulseAlpha = 0.3 + Math.sin(pulseTime) * 0.1;
  const glowRadius = radius + ELITE_GLOW_RADIUS;

  ctx.globalAlpha = pulseAlpha;
  ctx.strokeStyle = ELITE_GLOW_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = pulseAlpha * 0.3;
  ctx.fillStyle = ELITE_GLOW_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.9;
  const fontSize = Math.max(10, Math.round(radius * 0.8));
  ctx.font = `${fontSize}px ${isRetro ? 'VT323' : 'Arial'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ELITE_GLOW_COLOR;
  ctx.fillText('\u2655', x, y + CROWN_OFFSET_Y);

  ctx.restore();
}

export function drawStyledEnemy(
  ctx: CanvasRenderingContext2D,
  p: StyledEnemyDrawParams
): void {
  const isRetro = p.theme === 'retro-16bit';
  const bob = p.bobPhase ? Math.sin(p.bobPhase) * 1.5 : 0;
  const x = Math.round(p.x);
  const y = Math.round(p.y + bob);
  const spawnK = p.spawnProgress ?? 1;
  const hitFlash = p.hitFlash ?? 0;
  const phase = p.bobPhase ?? 0;

  const scaleK =
    spawnK < 1 ? 0.4 + spawnK * 0.6 : 1 + Math.sin((spawnK - 1) * Math.PI) * 0.15;

  const drawer = SHAPE_DRAWERS[p.enemyType];
  const fill = hitFlash > 0.01 ? '#FFFFFF' : p.color;
  const glow = !isRetro && hitFlash < 0.01;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleK, scaleK);

  if (spawnK < 1) {
    ctx.strokeStyle = `rgba(255,255,255,${(1 - spawnK) * 0.8})`;
    ctx.lineWidth = 2 / scaleK;
    ctx.beginPath();
    ctx.arc(0, 0, (p.radius * (2 - spawnK)) / scaleK, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (drawer) {
    drawer(ctx, p.radius, fill, glow, phase, p.whaleTier);
  } else {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hitFlash > 0.01) ctx.globalAlpha = 0.85;
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  if (p.isElite) drawEliteIndicators(ctx, x, y, p.radius, isRetro);
}
