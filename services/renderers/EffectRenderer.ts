import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import {
  createViewportBounds,
  isCircleVisible,
  type ViewportBounds,
} from './CullingUtils';
import { ThemeService } from '../system/ThemeService';
import { GAME_ENGINE } from '../../constants';
import { gradientCache } from '../../utils/GradientCache';

/**
 * EffectRenderer - Handles transient visual overlays and particle systems.
 *
 * Responsibilities:
 * 1. Rendering full-screen "Crit Flashes" for high-impact combat events.
 * 2. Optimized batch-rendering of particle systems (explosions, trails).
 * 3. Animating floating combat text (damage numbers, status effects).
 * 4. Drawing dynamic speed lines to visualize player velocity/momentum.
 */
export class EffectRenderer implements IRenderer {
  private static readonly VIEWPORT_BOUNDS: ViewportBounds = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  /**
   * Primary render loop for cumulative visual effects.
   */
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    state: GameState,
    player: Player,
    opts: RenderOptions
  ): void {
    const { width, height, graphics } = opts;

    // Boundary Check: 30px padding sufficient for transient effects
    const bounds = createViewportBounds(
      width,
      height,
      GAME_ENGINE.EFFECT_CULLING_PADDING,
      EffectRenderer.VIEWPORT_BOUNDS
    );

    // 1. Combat Feedback (Bottom layer of effects)
    this.drawCritFlash(ctx, width, height, state);

    // 2. Particle Effects (Environmental detail)
    if (graphics.showParticles) {
      this.drawParticles(ctx, pool, bounds);
      this.drawImpactRings(ctx, pool, bounds);
    }

    // 3. UI Overlays (Damage numbers)
    this.drawFloatingTexts(ctx, pool, bounds, graphics.showDamageNumbers);

    // 5. Momentum Feedback (Top layer)
    if (graphics.showParticles && !graphics.reducedMotion) {
      this.drawSpeedLines(ctx, pool, player);
    }
  }

  /**
   * Renders a radial pulse at the screen edges on critical hits.
   */
  private drawCritFlash(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState
  ): void {
    if (state.critFlash <= 0) {
      return;
    }

    ctx.save();
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);

    // Gradient from transparent center to colored edges
    const gradient = gradientCache.getRadialGradient(
      ctx,
      width / 2,
      height / 2,
      minDim * GAME_ENGINE.CRIT_FLASH_RADIUS_FACTOR,
      width / 2,
      height / 2,
      maxDim,
      [
        { offset: 0, color: 'transparent' },
        { offset: 1, color: state.critFlashColor },
      ]
    );

    ctx.globalAlpha = state.critFlash;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Batch renders particles by color and alpha for massive performance gains.
   * Groups particles by shared context states to minimize expensive fill color changes.
   */
  /**
   * Optimized particle rendering - Zero allocation per frame.
   * Renders particles directly without sorting to avoid GC pressure.
   * Visual difference is negligible since particles are short-lived and overlapping.
   */
  private drawParticles(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ): void {
    const particles = pool.activeParticles;
    const count = particles.length;
    if (count === 0) {
      return;
    }

    const defaultRadius = GAME_ENGINE.PARTICLE_DEFAULT_RADIUS;

    // Separate pixel particles from standard ones (single pass)
    // Draw standard particles first, then pixels on top
    ctx.beginPath();
    let currentColor = '';
    let currentAlpha = -1;

    // Pass 1: Standard (circle) particles
    for (let i = 0; i < count; i++) {
      const p = particles[i]!;
      if (p.isPixel) continue;

      const radius = p.radius || defaultRadius;
      if (!isCircleVisible(p.x, p.y, radius, bounds)) continue;

      const alpha = Math.max(0, p.life);
      const alphaBucket = (alpha * 10) | 0;

      // Batch by color and alpha bucket
      if (p.color !== currentColor || alphaBucket !== currentAlpha) {
        if (currentColor) ctx.fill();
        ctx.beginPath();
        currentColor = p.color;
        currentAlpha = alphaBucket;
        ctx.fillStyle = currentColor;
        ctx.globalAlpha = alphaBucket / 10;
      }

      const x = (p.x + 0.5) | 0;
      const y = (p.y + 0.5) | 0;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    if (currentColor) ctx.fill();

    // Pass 2: Pixel particles (drawn as rects, no path needed)
    for (let i = 0; i < count; i++) {
      const p = particles[i]!;
      if (!p.isPixel) continue;

      const radius = p.radius || defaultRadius;
      if (!isCircleVisible(p.x, p.y, radius, bounds)) continue;

      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      const size = radius * 2;
      const px = (p.x - radius) | 0;
      const py = (p.y - radius) | 0;
      ctx.fillRect(px, py, size, size);
    }

    ctx.globalAlpha = 1;
  }

  private drawImpactRings(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ): void {
    const rings = pool.activeImpactRings;
    if (rings.length === 0) {
      return;
    }

    ctx.save();
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i]!;
      if (!isCircleVisible(ring.x, ring.y, ring.maxRadius, bounds)) continue;

      ctx.globalAlpha = Math.max(0, ring.life);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.lineWidth;
      ctx.beginPath();
      ctx.arc(Math.round(ring.x), Math.round(ring.y), ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * Renders rising text for damage and status indicators.
   */
  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds,
    showOrdinaryText = true
  ): void {
    // ⚡ Bolt Performance Optimization: Replaced .forEach with standard for loop to avoid closure allocations
    for (let i = 0, len = pool.activeFloatingTexts.length; i < len; i++) {
      const t = pool.activeFloatingTexts[i];
      if (t === undefined) continue;

      if (!showOrdinaryText && t.alwaysVisible !== true) {
        continue;
      }

      // Culling (approximate based on size)
      if (!isCircleVisible(t.x, t.y, t.size * 2, bounds)) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = t.life;

      // Floating animation logic
      const floatOffset =
        t.stationary === true || t.velocityOnly === true
          ? 0
          : (1 - t.life) * GAME_ENGINE.FLOATING_TEXT_FLOAT_DISTANCE;
      const displayX = Math.round(t.x);
      const displayY = Math.round(t.y - floatOffset);

      // Scale pop for large numbers (crits)
      const scale =
        1 +
        (t.size > GAME_ENGINE.FLOATING_TEXT_LARGE_THRESHOLD
          ? GAME_ENGINE.FLOATING_TEXT_LARGE_SCALE
          : 0);

      ctx.font = `bold ${Math.floor(t.size * scale)}px 'VT323', 'VCR OSD Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // High-contrast outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = GAME_ENGINE.FLOATING_TEXT_OUTLINE_WIDTH;
      ctx.strokeText(t.text, displayX, displayY);

      // Primary text fill
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, displayX, displayY);

      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Renders motion vectors to indicate high-speed movement.
   * Optimized to avoid gradient creation per line.
   */
  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    player: Player
  ): void {
    const lines = pool.activeSpeedLines;
    if (lines.length === 0) {
      return;
    }

    const isRetro = ThemeService.isRetro();
    const color = player.color;

    ctx.save();
    ctx.lineCap = isRetro ? 'butt' : 'round';
    ctx.strokeStyle = color;

    // Optimized: Sort/Group by opacity to minimize globalAlpha changes
    // But since there are few lines (<50), we can just batch groups of similar opacity

    // Batch 1: Main Vector Lines
    ctx.beginPath();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const tailX = line.x - Math.cos(line.angle) * line.length;
      const tailY = line.y - Math.sin(line.angle) * line.length;

      // Grouping by alpha bucket (0.1 precision) to minimize state changes
      const alpha = line.opacity * (isRetro ? 0.8 : 0.95);
      const alphaBucket = Math.round(alpha * 10) / 10;

      // If alpha changes significantly, flush and restart
      if (ctx.globalAlpha !== alphaBucket) {
        ctx.stroke();
        ctx.beginPath();
        ctx.globalAlpha = alphaBucket;
      }

      ctx.lineWidth = line.width;
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(tailX, tailY);
    }
    ctx.stroke();

    // Batch 2: Halo Glow (Cyberpunk only)
    if (!isRetro) {
      ctx.beginPath();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.opacity <= GAME_ENGINE.SPEED_LINE_GLOW_THRESHOLD) continue;

        const tailX = line.x - Math.cos(line.angle) * line.length;
        const tailY = line.y - Math.sin(line.angle) * line.length;

        const alpha = line.opacity * 0.3;
        const alphaBucket = Math.round(alpha * 10) / 10;

        if (ctx.globalAlpha !== alphaBucket) {
          ctx.stroke();
          ctx.beginPath();
          ctx.globalAlpha = alphaBucket;
        }

        ctx.lineWidth = line.width * GAME_ENGINE.SPEED_LINE_GLOW_WIDTH_MULT;
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(tailX, tailY);
      }
      ctx.stroke();
    }

    // Batch 3: Tips
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      ctx.globalAlpha = line.opacity;

      if (!isRetro) {
        ctx.beginPath();
        ctx.arc(line.x, line.y, line.width * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const tipSize = line.width;
        ctx.fillRect(line.x - tipSize / 2, line.y - tipSize / 2, tipSize, tipSize);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
