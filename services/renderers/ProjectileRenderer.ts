import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Bullet } from '../../types';
import { createViewportBounds, updateViewportBounds, isCircleVisible, type ViewportBounds } from './CullingUtils';
import { ThemeService } from '../system/ThemeService';
import { GAME_ENGINE } from '../../constants';
import { gradientCache } from '../../utils/GradientCache';

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
  private static instance: ProjectileRenderer | null = null;
  private bounds: ViewportBounds;

  public static getInstance(): ProjectileRenderer {
    return (ProjectileRenderer.instance ??= new ProjectileRenderer());
  }

  constructor() {
    this.bounds = createViewportBounds(0, 0, GAME_ENGINE.BULLET_CULLING_PADDING);
  }

  /**
   * Primary render loop for projectiles.
   */
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    _state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    updateViewportBounds(
      this.bounds,
      opts.width,
      opts.height,
      GAME_ENGINE.BULLET_CULLING_PADDING
    );
    const bounds = this.bounds;

    const isRetro = ThemeService.isRetro();

    // Cache common values outside loop
    const superCritColor = GAME_ENGINE.BULLET_COLOR_SUPER_CRIT;
    const critColor = GAME_ENGINE.BULLET_COLOR_CRIT;
    const normalCoreColor = GAME_ENGINE.BULLET_COLOR_CORE;

    // 2. Optimized Rendering Path
    if (isRetro) {
      // Group by tier for batching fillStyle in retro mode

      // Group by tier for batching fillStyle in retro mode
      const bullets = pool.activeBullets;
      const count = bullets.length;

      const superCrits: Bullet[] = [];
      const crits: Bullet[] = [];
      const normals: Bullet[] = [];

      for (let i = 0; i < count; i++) {
        const b = bullets[i]!;
        if (
          !isCircleVisible(
            b.x,
            b.y,
            b.radius * GAME_ENGINE.BULLET_CULLING_RADIUS_MULT,
            bounds
          )
        ) {
          continue;
        }
        if (b.isSuperCrit) superCrits.push(b);
        else if (b.isCrit) crits.push(b);
        else normals.push(b);
      }

      // Render Normal
      const normalsLen = normals.length;
      if (normalsLen > 0) {
        ctx.fillStyle = normalCoreColor; // Simplified for retro: use tier color or fallback
        for (let i = 0; i < normalsLen; i++) {
          const b = normals[i]!;
          ctx.fillStyle = b.color; // Some bullets might have unique colors
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        }
        // Actually, many normals might have DIFFERENT colors if we support multiple weapons.
        // Let's re-batch by color if needed, but for now tier is enough if they share colors.
      }

      // Render Crits (usually same color)
      const critsLen = crits.length;
      if (critsLen > 0) {
        ctx.fillStyle = critColor;
        for (let i = 0; i < critsLen; i++) {
          const b = crits[i]!;
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        }
      }

      // Render Super Crits
      const superCritsLen = superCrits.length;
      if (superCritsLen > 0) {
        ctx.fillStyle = superCritColor;
        for (let i = 0; i < superCritsLen; i++) {
          const b = superCrits[i]!;
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        }
      }
    } else {
      const activeBullets = pool.activeBullets;
      const count = activeBullets.length;
      for (let i = 0; i < count; i++) {
        const b = activeBullets[i]!;
        if (
          !isCircleVisible(
            b.x,
            b.y,
            b.radius * GAME_ENGINE.BULLET_CULLING_RADIUS_MULT,
            bounds
          )
        ) {
          continue;
        }
        this.renderCyberpunkProjectile(ctx, b, normalCoreColor, superCritColor);
      }
    }

    if (!isRetro) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Refined "energy bolt" style projectiles with tier-specific designs.
   * Now accepts cached colors to avoid property lookups.
   */
  private renderCyberpunkProjectile(
    ctx: CanvasRenderingContext2D,
    b: Bullet,
    cachedCoreColor: string,
    superCritGlow: string
  ): void {
    // 1. Base Properties
    const angle = Math.atan2(b.vy, b.vx);
    let lengthMult = GAME_ENGINE.BULLET_LASER_LENGTH_MULT_NORMAL;
    let widthMult = GAME_ENGINE.BULLET_LASER_WIDTH_MULT_NORMAL;
    let glowColor = b.color;
    const coreColor = cachedCoreColor;

    if (b.isSuperCrit) {
      lengthMult = GAME_ENGINE.BULLET_LASER_LENGTH_MULT_SUPER_CRIT;
      widthMult = GAME_ENGINE.BULLET_LASER_WIDTH_MULT_SUPER_CRIT;
      glowColor = superCritGlow;
    }

    const length = b.radius * lengthMult;
    const width = b.radius * widthMult;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);

    // 2. Sophisticated Layering
    if (b.isSuperCrit) {
      // --- SUPER CRIT: "Railgun-Pulse" Design ---
      // A slightly wider energy envelope
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.lineWidth = width * 5;
      ctx.strokeStyle = glowColor;
      ctx.stroke();

      // Triple-track energy core
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = width * 0.4;

      // Center
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();

      // Top/Bottom lines for "High Energy" look
      ctx.beginPath();
      ctx.moveTo(-length * 0.4, -width);
      ctx.lineTo(length * 0.4, -width);
      ctx.moveTo(-length * 0.4, width);
      ctx.lineTo(length * 0.4, width);
      ctx.stroke();

      // Pulse Flare at the tip
      ctx.beginPath();
      ctx.arc(length / 2, 0, width * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = coreColor;
      ctx.fill();
    } else if (b.isCrit) {
      // --- CRIT: "Shaped Charge" Design ---
      // Outer glow body
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = width * 2.5;
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();

      // Sharp Core
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = width * 0.8;
      ctx.strokeStyle = coreColor;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length * 0.4, 0); // Stops slightly before tip
      ctx.stroke();

      // Impact Flare
      ctx.beginPath();
      ctx.arc(length / 2, 0, width * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = coreColor;
      ctx.fill();
    } else {
      // --- NORMAL: "Smooth Tracer" Design ---
      // Transparent Tail
      const gradient = gradientCache.getLinearGradient(
        ctx,
        -length / 2,
        0,
        length / 2,
        0,
        [
          { offset: 0, color: 'transparent' },
          { offset: 0.5, color: `${b.color}80` },
          { offset: 1, color: b.color },
        ]
      );

      ctx.lineWidth = width * 1.5;
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();

      // Tiny bright tip
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(length / 2, 0, width * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
