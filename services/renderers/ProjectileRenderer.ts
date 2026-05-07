import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Bullet } from '../../types';
import { createViewportBounds, isCircleVisible } from './CullingUtils';
import { ThemeService } from '../system/ThemeService';
import { GAME_ENGINE } from '../../constants';
import { gradientCache } from '../../utils/GradientCache';
import { WEAPON_REGISTRY } from '../../config/WeaponRegistry';
import { type WeaponRenderKind } from '../../types/weapons';
import { difficultyContext } from '../difficulty/DifficultyContext';

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

  public static getInstance(): ProjectileRenderer {
    return (ProjectileRenderer.instance ??= new ProjectileRenderer());
  }

  constructor() {}

  /**
   * Primary render loop for projectiles.
   */
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    _state: GameState,
    player: Player,
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
      // Read market heat once per frame (singleton, zero-alloc). Used by
      // volume-reactive weapon visuals (e.g. spread_shot). `normalizedVolume`
      // is already 0..1 from the market aggregator.
      const heat = difficultyContext.inputs.normalizedVolume;
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
        // Phase 0 VFX dispatch: route to per-kind renderer. All kinds
        // currently fall through to the default path so visuals are
        // unchanged. Later phases will swap individual kinds over.
        this.dispatchCyberpunkRender(
          ctx,
          b,
          normalCoreColor,
          superCritColor,
          heat,
          player
        );
      }
    }

    if (!isRetro) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Phase 0 VFX dispatch. Reads `bullet.weaponId` -> WeaponRegistry visual
   * config -> renderKind, then routes to the per-kind renderer. All kinds
   * fall through to the default path until later phases port in the VFX
   * Lab preview implementations.
   *
   * Zero-allocation: this is a plain switch with no object creation.
   */
  private dispatchCyberpunkRender(
    ctx: CanvasRenderingContext2D,
    b: Bullet,
    cachedCoreColor: string,
    superCritGlow: string,
    heat: number,
    player: Player
  ): void {
    const kind = this.resolveRenderKind(b);
    switch (kind) {
      case 'quantum':
        this.renderQuantum(ctx, b);
        return;
      case 'spread':
        this.renderSpread(ctx, b, heat);
        return;
      case 'boomerang':
        this.renderBoomerang(ctx, b);
        return;
      case 'laser':
        this.renderLaser(ctx, b);
        return;
      case 'nuke':
        this.renderNuke(ctx, b);
        return;
      case 'orbit':
        this.renderOrbit(ctx, b, player);
        return;
      case 'default':
      default:
        this.renderCyberpunkProjectile(ctx, b, cachedCoreColor, superCritGlow);
        return;
    }
  }

  /**
   * Resolves the visual kind for a bullet via its owning weapon config.
   * Falls back to `'default'` when `weaponId` is unknown or unset.
   */
  private resolveRenderKind(b: Bullet): WeaponRenderKind {
    const wid = b.weaponId;
    if (wid === undefined) return 'default';
    // `WEAPON_REGISTRY` is keyed by `WeaponId`, but `bullet.weaponId` is a
    // plain string. Index through `Partial<...>` so the runtime lookup can
    // safely return `undefined` for stale/unknown IDs without a lint warning.
    const cfg = (
      WEAPON_REGISTRY as Partial<
        Record<string, { visual?: { renderKind: WeaponRenderKind } }>
      >
    )[wid];
    if (cfg === undefined) return 'default';
    return cfg.visual?.renderKind ?? 'default';
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

  /**
   * Phase 1 VFX — QuantumBullet: cyan trail polyline + radial glow + bright core.
   *
   * Ported from `components/vfx-lab/previews/QuantumBulletPreview.ts`. The
   * trail is populated and aged by `MovementSystem.updateBullets`; this
   * method is read-only on the bullet. No allocations beyond the radial
   * gradient (unavoidable for the glow — the gradient cache doesn't cover
   * per-bullet origins at this revision).
   */
  private renderQuantum(ctx: CanvasRenderingContext2D, b: Bullet): void {
    const trail = b.trail;
    // 1. Trail polyline (drawn first so it sits behind the glow/core).
    if (trail !== undefined && trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1]!;
        const p1 = trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / QUANTUM_TRAIL_LIFE_MS);
        if (alpha <= 0) continue;
        ctx.strokeStyle = `rgba(34,211,238,${alpha * 0.7})`;
        ctx.lineWidth = 2 * alpha + 0.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // 2. Radial glow.
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, 'rgba(34,211,238,0.8)');
    grad.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bright white core.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Phase 2 VFX — SpreadShot pellet: volume-reactive trail + radial gradient.
   *
   * Ported from `components/vfx-lab/previews/SpreadShotPreview.ts`. The
   * per-pellet trail is populated and aged by `MovementSystem.updateBullets`;
   * this method is read-only on the bullet. `heat` is the market
   * `normalizedVolume` (0..1) captured once per frame in `render()`.
   *
   * When heat crosses `SPREAD_HEAT_THRESHOLD` (0.7) the pellet swaps to
   * a brighter yellow core + trail tint, matching the volume-surge feedback
   * loop from the preview.
   */
  private renderSpread(ctx: CanvasRenderingContext2D, b: Bullet, heat: number): void {
    const isHot = heat > SPREAD_HEAT_THRESHOLD;
    const coreColor = isHot ? SPREAD_HOT_COLOR : SPREAD_COOL_COLOR;
    const trailRgb = isHot ? SPREAD_HOT_TRAIL_RGB : SPREAD_COOL_TRAIL_RGB;
    const trailAlphaScale = 0.5 + heat * 0.5;

    // 1. Trail polyline (drawn first so it sits behind the pellet).
    const trail = b.trail;
    if (trail !== undefined && trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1]!;
        const p1 = trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / SPREAD_TRAIL_LIFE_MS);
        if (alpha <= 0) continue;
        ctx.strokeStyle = `rgba(${trailRgb},${alpha * trailAlphaScale})`;
        ctx.lineWidth = 2.2 * alpha + 0.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // 2. Radial-gradient pellet (white center -> coreColor -> fading trailRgb).
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, coreColor);
    grad.addColorStop(1, `rgba(${trailRgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // 3. Tiny bright white core dot.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBoomerang(ctx: CanvasRenderingContext2D, b: Bullet): void {
    const trail = b.trail;
    if (trail !== undefined && trail.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(192,38,211,0.2)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(trail[0]!.x, trail[0]!.y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i]!.x, trail[i]!.y);
      }
      ctx.stroke();
      ctx.restore();

      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1]!;
        const p1 = trail[i]!;
        const alpha = Math.max(0, 1 - p1.age / BOOMERANG_TRAIL_LIFE_MS);
        ctx.strokeStyle = `rgba(168,85,247,${alpha * 0.9})`;
        ctx.lineWidth = 3 * alpha + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    const rotation = (b.age ?? 0) * 0.022;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(rotation);
    this.drawBoomerangBlade(ctx, -Math.PI / 4);
    this.drawBoomerangBlade(ctx, Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBoomerangBlade(ctx: CanvasRenderingContext2D, angle: number): void {
    ctx.save();
    ctx.rotate(angle);
    ctx.shadowColor = '#c026d3';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.quadraticCurveTo(10, -5, 16, -1);
    ctx.quadraticCurveTo(18, 0, 16, 1);
    ctx.quadraticCurveTo(10, 5, -2, 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(8, -2.5, 13, -0.5);
    ctx.quadraticCurveTo(14, 0, 13, 0.5);
    ctx.quadraticCurveTo(8, 2.5, 0, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderLaser(ctx: CanvasRenderingContext2D, b: Bullet): void {
    const angle = b.beamAngle ?? Math.atan2(b.vy, b.vx);
    const length = b.beamLength ?? 44;
    const lifeFrac =
      b.maxAge !== undefined && b.maxAge > 0
        ? Math.max(0, 1 - (b.age ?? 0) / b.maxAge)
        : 1;
    const fade = Math.max(0.2, lifeFrac);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.lineCap = 'round';

    ctx.strokeStyle = `rgba(255,100,180,${0.35 * fade})`;
    ctx.lineWidth = 22 * fade + 8;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,180,230,${0.85 * fade})`;
    ctx.lineWidth = 8 * fade + 3;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${fade})`;
    ctx.lineWidth = 3 * fade + 1;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  private renderNuke(ctx: CanvasRenderingContext2D, b: Bullet): void {
    if (b.phase === 'shockwave') {
      const radius = b.shockwaveRadius ?? b.radius;
      const alpha = Math.max(0, 1 - (b.age ?? 0) / NUKE_SHOCKWAVE_LIFE_MS);

      ctx.strokeStyle = `rgba(255,160,60,${alpha * 0.9})`;
      ctx.lineWidth = 4 * alpha + 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createRadialGradient(
        b.x,
        b.y,
        Math.max(0, radius - 10),
        b.x,
        b.y,
        radius
      );
      grad.addColorStop(0, 'rgba(255,200,120,0)');
      grad.addColorStop(1, `rgba(255,180,80,${alpha * 0.35})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const pulse = 0.7 + 0.3 * Math.sin(((b.age ?? 0) / 150) * Math.PI * 2);
    const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 22 * pulse);
    glow.addColorStop(0, '#ffdd66');
    glow.addColorStop(0.5, 'rgba(255,140,50,0.6)');
    glow.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
    ctx.fill();

    const tx = b.x - b.vx * 8;
    const ty = b.y - b.vy * 8;
    const trailGrad = ctx.createLinearGradient(b.x, b.y, tx, ty);
    trailGrad.addColorStop(0, 'rgba(255,150,60,0.5)');
    trailGrad.addColorStop(1, 'rgba(100,60,40,0)');
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  private renderOrbit(ctx: CanvasRenderingContext2D, b: Bullet, player: Player): void {
    const orbitRadius = b.orbitRadius;
    if (orbitRadius !== undefined && b.orbitAngle !== undefined) {
      ctx.strokeStyle = 'rgba(68,221,255,0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const glowR = b.radius + 8;
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, 'rgba(68,221,255,0.8)');
    grad.addColorStop(1, 'rgba(68,221,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Matches `MovementSystem` tunable of the same name. */
const QUANTUM_TRAIL_LIFE_MS = 180;
/** Matches `MovementSystem` SPREAD_TRAIL_LIFE_MS and WeaponRegistry params. */
const SPREAD_TRAIL_LIFE_MS = 200;
const SPREAD_HEAT_THRESHOLD = 0.7;
const SPREAD_COOL_COLOR = '#ffd060';
const SPREAD_HOT_COLOR = '#ffff88';
const SPREAD_COOL_TRAIL_RGB = '255,180,80';
const SPREAD_HOT_TRAIL_RGB = '255,220,120';
const BOOMERANG_TRAIL_LIFE_MS = 380;
const NUKE_SHOCKWAVE_LIFE_MS = 650;
