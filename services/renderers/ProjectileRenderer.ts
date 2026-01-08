import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';
import { createViewportBounds, isCircleVisible } from './CullingUtils';
import { ThemeService } from '../ThemeService';

export class ProjectileRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    _state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    // Create viewport bounds for culling (larger padding for fast-moving bullets)
    const bounds = createViewportBounds(opts.width, opts.height, 100);

    pool.activeBullets.forEach(b => {
      // Off-screen culling
      if (!isCircleVisible(b.x, b.y, b.radius * 4, bounds)) return;

      const isSuperCrit = b.isSuperCrit;
      const isCrit = b.isCrit;

      // 1. Determine Style based on Crit Type
      let glowColor = b.color; // Default color
      let coreColor = '#ffffff';
      let glowSize = 10;

      if (isSuperCrit) {
        glowColor = '#ff4500'; // Red/Orange for Super Crit
        coreColor = '#ffecec';
        glowSize = 20;
      } else if (isCrit) {
        glowColor = '#ffd700'; // Gold for Crit
        glowSize = 15;
      }

      // 2. Setup Glow
      if (!this.isMobileDevice) {
        ctx.shadowBlur = glowSize;
        ctx.shadowColor = glowColor;
      } else {
        ctx.shadowBlur = 0;
      }

      // Pixel mode draws simple squares, normal mode draws laser bolts
      // Pixel mode draws simple squares, normal mode draws laser bolts
      if (ThemeService.isRetro()) {
        // 16-bit pixel style - simple small square bullets (optimized for high count)
        ctx.shadowBlur = 0; // No glow in retro for clarity

        ctx.save();
        ctx.translate(b.x, b.y);

        // Reduced size for retro look & less clutter
        const size = b.radius;
        ctx.fillStyle = isSuperCrit ? '#ff4500' : isCrit ? '#ffd700' : b.color;

        // Draw centered square
        ctx.fillRect(-size / 2, -size / 2, size, size);

        ctx.restore();
      } else {
        // Cyberpunk style - laser bolt
        const angle = Math.atan2(b.vy, b.vx);
        const length = b.radius * (isSuperCrit ? 4.0 : 3.0);
        const width = b.radius * (isSuperCrit ? 0.8 : 0.6);

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);

        // Draw Glowy Trail/Beam Body
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);

        ctx.lineCap = 'round';
        ctx.lineWidth = width * 2;
        ctx.strokeStyle = isSuperCrit ? glowColor : b.color;
        ctx.stroke();

        // Draw Inner Bright Core
        ctx.beginPath();
        ctx.moveTo(-length / 2 + 2, 0);
        ctx.lineTo(length / 2 - 1, 0);

        ctx.lineWidth = width;
        ctx.strokeStyle = coreColor;
        ctx.stroke();

        ctx.restore();
      }

      // Clean up shadow for next draw calls
      if (!this.isMobileDevice) {
        ctx.shadowBlur = 0;
      }
    });
  }
}
