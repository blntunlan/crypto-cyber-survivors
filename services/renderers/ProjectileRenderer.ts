import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Bullet } from '../../types';
import { screenService } from '../ScreenService';
import { createViewportBounds, isCircleVisible } from './CullingUtils';
import { ThemeService } from '../ThemeService';
import { GAME_ENGINE } from '../../constants';

/**
 * ProjectileRenderer - Visualizes player bullets and projectiles.
 *
 * Features:
 * 1. Efficient culling for high-count projectile scenarios.
 * 2. Theme-switching: Cyberpunk laser bolts vs Retro pixel squares.
 * 3. Tiered visual feedback for critical and super-critical hits.
 * 4. Device-aware performance scaling (toggles shadows on mobile).
 */
export class ProjectileRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  /**
   * Primary render loop for projectiles.
   *
   * @param ctx - Canvas rendering context
   * @param pool - Pool manager containing active bullets
   * @param _state - Global game engine state
   * @param _player - Player reference
   * @param opts - Global rendering options
   */
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    _state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    // Optimization: Create viewport bounds once per frame
    // Large padding used because bullets travel fast and we want to avoid popping at edges.
    const bounds = createViewportBounds(
      opts.width,
      opts.height,
      GAME_ENGINE.BULLET_CULLING_PADDING
    );

    pool.activeBullets.forEach(b => {
      // 1. Frustum Culling
      if (
        !isCircleVisible(
          b.x,
          b.y,
          b.radius * GAME_ENGINE.BULLET_CULLING_RADIUS_MULT,
          bounds
        )
      ) {
        return;
      }

      // 2. Select Rendering Strategy
      if (ThemeService.isRetro()) {
        this.renderRetroProjectile(ctx, b);
      } else {
        this.renderCyberpunkProjectile(ctx, b);
      }
    });

    // Final shadow cleanup
    ctx.shadowBlur = 0;
  }

  /**
   * Renders 16-bit style pixel projectiles.
   * Focuses on performance and visual clarity in high-bullet scenarios.
   */
  private renderRetroProjectile(ctx: CanvasRenderingContext2D, b: Bullet): void {
    ctx.save();
    ctx.translate(b.x, b.y);

    // No glow in retro for clarity and "sharp" pixel look
    ctx.shadowBlur = 0;

    const size = b.radius;

    // Tiered coloring for retro squares
    if (b.isSuperCrit) {
      ctx.fillStyle = GAME_ENGINE.BULLET_COLOR_SUPER_CRIT;
    } else if (b.isCrit) {
      ctx.fillStyle = GAME_ENGINE.BULLET_COLOR_CRIT;
    } else {
      ctx.fillStyle = b.color;
    }

    // Draw centered pixel square
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.restore();
  }

  /**
   * Renders high-fidelity "laser bolt" style projectiles with neon glows.
   */
  private renderCyberpunkProjectile(ctx: CanvasRenderingContext2D, b: Bullet): void {
    // 1. Determine Visual Tier Properties
    let glowColor = b.color;
    let coreColor = GAME_ENGINE.BULLET_COLOR_CORE;
    let lengthMult = GAME_ENGINE.BULLET_LASER_LENGTH_MULT_NORMAL;
    let widthMult = GAME_ENGINE.BULLET_LASER_WIDTH_MULT_NORMAL;

    if (b.isSuperCrit) {
      glowColor = GAME_ENGINE.BULLET_COLOR_SUPER_CRIT;
      coreColor = GAME_ENGINE.BULLET_COLOR_SUPER_CRIT_CORE;
      lengthMult = GAME_ENGINE.BULLET_LASER_LENGTH_MULT_SUPER_CRIT;
      widthMult = GAME_ENGINE.BULLET_LASER_WIDTH_MULT_SUPER_CRIT;
    } else if (b.isCrit) {
      glowColor = GAME_ENGINE.BULLET_COLOR_CRIT;
    }

    // 2. Setup Neon Glow (Desktop Only) - Optimized
    // We disable expensive ctx.shadowBlur and simulate glow with a wider, transparent stroke.
    // This is much faster for hundreds of projectiles.
    if (!this.isMobileDevice) {
      ctx.shadowBlur = 0;
    }

    // 3. Draw Laser Bolt
    const angle = Math.atan2(b.vy, b.vx);
    const length = b.radius * lengthMult;
    const width = b.radius * widthMult;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);

    // A. Fake Glow (Wide, very transparent) - The "Blur" replacement
    if (!this.isMobileDevice) {
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.lineCap = 'round';
      ctx.lineWidth = width * 4; // Wide glow
      ctx.strokeStyle = b.isSuperCrit || b.isCrit ? glowColor : `${b.color}40`; // 25% opacity
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // B. Outer Beam Body
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);

    ctx.lineCap = 'round';
    ctx.lineWidth = width * 1.5;
    ctx.strokeStyle = b.isSuperCrit || b.isCrit ? glowColor : b.color;
    ctx.stroke();

    // B. Inner Bright Core (The "hot" part of the laser)
    ctx.beginPath();
    ctx.moveTo(-length / 2 + GAME_ENGINE.BULLET_LASER_CORE_OFFSET_START, 0);
    ctx.lineTo(length / 2 - GAME_ENGINE.BULLET_LASER_CORE_OFFSET_END, 0);

    ctx.lineWidth = width;
    ctx.strokeStyle = coreColor;
    ctx.stroke();

    ctx.restore();
  }
}
