import { type IRenderer, type RenderOptions } from './types';
import { type PoolManager } from '../poolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';

export class ProjectileRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  render(
    ctx: CanvasRenderingContext2D,
    pool: PoolManager,
    _state: GameState,
    _player: Player,
    _opts: RenderOptions
  ): void {
    pool.activeBullets.forEach(b => {
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

      // 3. Draw Laser Bolt (Line instead of Circle)
      const angle = Math.atan2(b.vy, b.vx);
      const length = b.radius * (isSuperCrit ? 4.0 : 3.0);
      const width = b.radius * (isSuperCrit ? 0.8 : 0.6);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      // Draw Glowy Trail/Beam Body
      // We draw a line from slightly behind center to front
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);

      ctx.lineCap = 'round';
      ctx.lineWidth = width * 2; // Outer glow width
      ctx.strokeStyle = isSuperCrit ? glowColor : b.color;
      ctx.stroke();

      // 4. Draw Inner Bright Core (White Hot Center)
      ctx.beginPath();
      ctx.moveTo(-length / 2 + 2, 0);
      ctx.lineTo(length / 2 - 1, 0);

      ctx.lineWidth = width; // Inner core width
      ctx.strokeStyle = coreColor;
      ctx.stroke();

      ctx.restore();

      // 5. (Removed separate trail code because the laser itself IS the trail basically)
      // But we can add a faint extra trail for super speed effect if needed,
      // but usually elongated laser is enough.

      // Clean up shadow for next draw calls
      if (!this.isMobileDevice) {
        ctx.shadowBlur = 0;
      }
    });
  }
}
