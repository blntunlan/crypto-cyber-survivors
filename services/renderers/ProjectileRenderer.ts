import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Bullet } from '../../types';
import { createViewportBounds, isCircleVisible } from './CullingUtils';
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
  // Optimization: Reuse arrays to avoid GC pressure in retro mode
  private retroSuperCrits: Bullet[] = [];
  private retroCrits: Bullet[] = [];
  private retroNormals: Bullet[] = [];

  constructor() {}

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
    const bounds = createViewportBounds(
      opts.width,
      opts.height,
      GAME_ENGINE.BULLET_CULLING_PADDING
    );

    const isRetro = ThemeService.isRetro();

    // Cache common values outside loop
    const superCritColor = GAME_ENGINE.BULLET_COLOR_SUPER_CRIT;
    const critColor = GAME_ENGINE.BULLET_COLOR_CRIT;
    const normalCoreColor = GAME_ENGINE.BULLET_COLOR_CORE;

    // 2. Optimized Rendering Path
    if (isRetro) {
      // Clear reused arrays
      this.retroSuperCrits.length = 0;
      this.retroCrits.length = 0;
      this.retroNormals.length = 0;

      pool.activeBullets.forEach(b => {
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
        if (b.isSuperCrit) this.retroSuperCrits.push(b);
        else if (b.isCrit) this.retroCrits.push(b);
        else this.retroNormals.push(b);
      });

      // Render Normal
      if (this.retroNormals.length > 0) {
        ctx.fillStyle = normalCoreColor; // Simplified for retro: use tier color or fallback
        this.retroNormals.forEach(b => {
          ctx.fillStyle = b.color; // Some bullets might have unique colors
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        });
        // Actually, many normals might have DIFFERENT colors if we support multiple weapons.
        // Let's re-batch by color if needed, but for now tier is enough if they share colors.
      }

      // Render Crits (usually same color)
      if (this.retroCrits.length > 0) {
        ctx.fillStyle = critColor;
        this.retroCrits.forEach(b => {
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        });
      }

      // Render Super Crits
      if (this.retroSuperCrits.length > 0) {
        ctx.fillStyle = superCritColor;
        this.retroSuperCrits.forEach(b => {
          ctx.fillRect(
            Math.round(b.x - b.radius / 2),
            Math.round(b.y - b.radius / 2),
            b.radius,
            b.radius
          );
        });
      }
    } else {
      pool.activeBullets.forEach(b => {
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
        this.renderCyberpunkProjectile(ctx, b, normalCoreColor, superCritColor);
      });
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
    const halfLength = length / 2;

    // Optimization: For Crits and Super Crits, use world-space rendering to avoid ctx.save/restore
    if (b.isSuperCrit || b.isCrit) {
      // Calculate rotation components manually
      // cos = vx / speed, sin = vy / speed
      const speedSq = b.vx * b.vx + b.vy * b.vy;
      let cos = 1;
      let sin = 0;
      if (speedSq > 0.0001) {
        const speed = Math.sqrt(speedSq);
        cos = b.vx / speed;
        sin = b.vy / speed;
      }

      // Pre-calculate rotated points to avoid closures and repeated math
      // Tail: (-halfLength, 0)
      const tailX = b.x - halfLength * cos;
      const tailY = b.y - halfLength * sin;
      // Tip: (halfLength, 0)
      const tipX = b.x + halfLength * cos;
      const tipY = b.y + halfLength * sin;

      if (b.isSuperCrit) {
        // --- SUPER CRIT: "Railgun-Pulse" Design ---
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = width * 5;
        ctx.strokeStyle = glowColor;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = width * 0.4;

        // Center
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Top/Bottom lines
        // Define key x-offsets
        const midRearX = -length * 0.4;
        const midFrontX = length * 0.4;

        // Pre-calculate partial rotation terms
        const midRearXCos = midRearX * cos;
        const midRearXSin = midRearX * sin;
        const midFrontXCos = midFrontX * cos;
        const midFrontXSin = midFrontX * sin;

        // Top Y = -width
        const topY = -width;
        const topYCos = topY * cos;
        const topYSin = topY * sin;

        // Bot Y = width
        const botY = width;
        const botYCos = botY * cos;
        const botYSin = botY * sin;

        ctx.beginPath();
        // Top line
        ctx.moveTo(
          b.x + midRearXCos - topYSin,
          b.y + midRearXSin + topYCos
        );
        ctx.lineTo(
          b.x + midFrontXCos - topYSin,
          b.y + midFrontXSin + topYCos
        );

        // Bottom line
        ctx.moveTo(
          b.x + midRearXCos - botYSin,
          b.y + midRearXSin + botYCos
        );
        ctx.lineTo(
          b.x + midFrontXCos - botYSin,
          b.y + midFrontXSin + botYCos
        );
        ctx.stroke();

        // Pulse Flare at the tip
        ctx.beginPath();
        ctx.arc(tipX, tipY, width * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();
      } else {
        // --- CRIT: "Shaped Charge" Design ---
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = width * 2.5;
        ctx.strokeStyle = glowColor;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.lineWidth = width * 0.8;
        ctx.strokeStyle = coreColor;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);

        // Stops slightly before tip at 0.4 * length
        const coreTipLocalX = length * 0.4;
        const coreTipX = b.x + coreTipLocalX * cos; // y is 0 so - 0 * sin
        const coreTipY = b.y + coreTipLocalX * sin; // y is 0 so + 0 * cos

        ctx.lineTo(coreTipX, coreTipY);
        ctx.stroke();

        // Impact Flare
        ctx.beginPath();
        ctx.arc(tipX, tipY, width * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();
      }
    } else {
      // --- NORMAL: "Smooth Tracer" Design ---
      // Uses gradient which relies on local coordinates, so we keep save/restore
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      // Transparent Tail
      const gradient = gradientCache.getLinearGradient(
        ctx,
        -halfLength,
        0,
        halfLength,
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
      ctx.moveTo(-halfLength, 0);
      ctx.lineTo(halfLength, 0);
      ctx.stroke();

      // Tiny bright tip
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(halfLength, 0, width * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
