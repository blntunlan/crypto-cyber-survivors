import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import {
  createViewportBounds,
  isCircleVisible,
  type ViewportBounds,
} from './CullingUtils';

export class EffectRenderer implements IRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    const { width, height, graphics } = opts;

    // Create viewport bounds for culling
    const bounds = createViewportBounds(width, height, 30);

    this.drawCritFlash(ctx, width, height, state);

    // Only draw particles if enabled
    if (graphics.showParticles) {
      this.drawParticles(ctx, pool, bounds);
    }

    // Only draw damage/floating texts if enabled
    if (graphics.showDamageNumbers) {
      this.drawFloatingTexts(ctx, pool, bounds);
    }

    if (graphics.showParticles) {
      this.drawSpeedLines(ctx, pool);
    }
  }

  private drawCritFlash(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState
  ) {
    if (state.critFlash <= 0) return;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.4,
      width / 2,
      height / 2,
      Math.max(width, height)
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, state.critFlashColor);
    ctx.globalAlpha = state.critFlash;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Batch render particles by color for better performance.
   * Groups particles by color and draws them in single path operations.
   * Includes off-screen culling for additional performance gains.
   */
  private drawParticles(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ) {
    if (pool.activeParticles.length === 0) return;

    // Group particles by color and approximate life (for alpha batching)
    // Also filter out off-screen particles during grouping
    const groups = new Map<string, typeof pool.activeParticles>();

    pool.activeParticles.forEach(part => {
      // Off-screen culling
      if (!isCircleVisible(part.x, part.y, part.radius || 2, bounds)) return;

      // Round life to nearest 0.1 for batching
      const alphaKey = Math.round(part.life * 10);
      const pixelKey = part.isPixel ? 'px' : 'std';
      const key = `${part.color}-${alphaKey}-${pixelKey}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(part);
    });

    // Draw each group
    groups.forEach(particles => {
      if (particles.length === 0) return;

      const firstParticle = particles[0]!;
      ctx.globalAlpha = firstParticle.life;
      ctx.fillStyle = firstParticle.color;

      if (firstParticle.isPixel) {
        // Pixelated particles: squares
        particles.forEach(part => {
          const radius = part.radius || 2;
          const size = radius * 2;
          ctx.fillRect(
            Math.round(part.x - radius),
            Math.round(part.y - radius),
            size,
            size
          );
        });
      } else {
        // Standard particles: circles
        ctx.beginPath();
        particles.forEach(part => {
          const x = Math.round(part.x);
          const y = Math.round(part.y);
          const radius = part.radius || 2;
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        });
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ) {
    pool.activeFloatingTexts.forEach(t => {
      // Off-screen culling (approximate text size)
      if (!isCircleVisible(t.x, t.y, t.size * 2, bounds)) return;

      ctx.save();
      ctx.globalAlpha = t.life;
      const floatOffset = (1 - t.life) * 30;
      const displayY = Math.round(t.y - floatOffset);
      const displayX = Math.round(t.x);
      const scale = 1 + (t.size > 20 ? 0.2 : 0);

      ctx.font = `bold ${Math.floor(t.size * scale)}px 'VT323', 'VCR OSD Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, displayX, displayY);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, displayX, displayY);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D, pool: IPoolManager) {
    if (pool.activeSpeedLines.length === 0) return;

    ctx.save();

    pool.activeSpeedLines.forEach(line => {
      const tailX = line.x - Math.cos(line.angle) * line.length;
      const tailY = line.y - Math.sin(line.angle) * line.length;

      // Create gradient from head (bright) to tail (fade)
      const gradient = ctx.createLinearGradient(line.x, line.y, tailX, tailY);

      // Dynamic color based on opacity for more visual interest
      // Slightly cyan/blue tint for cyberpunk feel
      const r = 200 + Math.floor(55 * line.opacity);
      const g = 230 + Math.floor(25 * line.opacity);
      const b = 255;

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${line.opacity * 0.9})`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${line.opacity * 0.6})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      // Main line with gradient
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Glow effect (thicker, more transparent line behind)
      if (line.opacity > 0.3) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(150, 220, 255, ${line.opacity * 0.2})`;
        ctx.lineWidth = line.width * 3;
        ctx.lineCap = 'round';
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      // Bright head point (the leading edge)
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${line.opacity})`;
      ctx.arc(line.x, line.y, line.width * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
