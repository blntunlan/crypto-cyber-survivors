import { type PreviewTheme } from '../../../types/previewLab';

export interface EnemyDrawParams {
  x: number;
  y: number;
  radius: number;
  color: string;
  theme: PreviewTheme;
  isElite?: boolean;
  isBoss?: boolean;
  spawnProgress?: number;
  hitFlash?: number;
  bobPhase?: number;
}

export interface PlayerDrawParams {
  x: number;
  y: number;
  radius: number;
  color: string;
  theme: PreviewTheme;
  dashActive?: boolean;
  hurtFlash?: boolean;
  bobPhase?: number;
}

const ELITE_GLOW_COLOR = '#FFD700';
const ELITE_GLOW_RADIUS = 8;
const CROWN_OFFSET_Y = -20;

export function drawEnemy(ctx: CanvasRenderingContext2D, p: EnemyDrawParams): void {
  const isRetro = p.theme === 'retro-16bit';
  const bob = p.bobPhase ? Math.sin(p.bobPhase) * 1.5 : 0;
  const x = Math.round(p.x);
  const y = Math.round(p.y + bob);
  const spawnK = p.spawnProgress ?? 1;
  const hitFlash = p.hitFlash ?? 0;

  const scaleK =
    spawnK < 1 ? 0.4 + spawnK * 0.6 : 1 + Math.sin((spawnK - 1) * Math.PI) * 0.15;

  if (isRetro) {
    const sizeRect = p.radius * scaleK;
    ctx.save();
    ctx.translate(x, y);

    if (spawnK < 1) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - spawnK) * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * (2 - spawnK), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (hitFlash > 0.01) {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
    } else {
      ctx.fillStyle = p.color;
    }
    ctx.fillRect(-sizeRect / 2, -sizeRect / 2, sizeRect, sizeRect);
    ctx.restore();
  } else {
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

    if (hitFlash > 0.01) {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
    } else {
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 1.6);
      glowGrad.addColorStop(0, p.color);
      glowGrad.addColorStop(0.6, `${p.color}cc`);
      glowGrad.addColorStop(1, `${p.color}00`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
    }

    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (p.isElite) drawEliteIndicators(ctx, x, y, p.radius, isRetro);
}

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

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerDrawParams): void {
  const isRetro = p.theme === 'retro-16bit';
  const bob = p.bobPhase ? Math.sin(p.bobPhase) * 1.2 : 0;
  const x = Math.round(p.x);
  const y = Math.round(p.y + bob);

  if (isRetro) {
    const size = p.radius * 2;
    const px = x - size / 2;
    const py = y - size / 2;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(px, py, size, size);

    if (p.hurtFlash) {
      const isVisible = Math.floor(Date.now() / 50) % 2 === 0;
      if (!isVisible) return;
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = p.color;
    }
    ctx.fillRect(px, py, size, size);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 6, y - 2, 4, 4);
    ctx.fillRect(x + 2, y - 2, 4, 4);
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  const pulseTime = performance.now() * 0.003;
  const pulseScale = 1 + Math.sin(pulseTime) * 0.1;
  const outerRingRadius = p.radius * 1.8 * pulseScale;

  ctx.save();
  ctx.globalAlpha = 0.4 + Math.sin(pulseTime) * 0.1;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, outerRingRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const glowRadius = p.radius * 1.8;
  const gradient = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, glowRadius);
  gradient.addColorStop(0, `${p.color}25`);
  gradient.addColorStop(0.5, `${p.color}10`);
  gradient.addColorStop(1, `${p.color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.arc(0, 0, p.radius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  if (p.hurtFlash) {
    ctx.fillStyle = '#FFFFFF';
  } else {
    ctx.fillStyle = p.color;
  }
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-p.radius * 0.2, -p.radius * 0.2, p.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
