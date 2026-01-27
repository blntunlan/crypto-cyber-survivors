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
import { TimeService } from '../core/TimeService';

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
      GAME_ENGINE.EFFECT_CULLING_PADDING
    );

    // 1. Combat Feedback (Bottom layer of effects)
    this.drawCritFlash(ctx, width, height, state);

    // 2. Particle Effects (Environmental detail)
    if (graphics.showParticles) {
      this.drawParticles(ctx, pool, bounds);
    }

    // 3. UI Overlays (Damage numbers)
    if (graphics.showDamageNumbers) {
      this.drawFloatingTexts(ctx, pool, bounds);
    }

    // 4. Momentum Feedback (Top layer)
    if (graphics.showParticles) {
      this.drawSpeedLines(ctx, pool, player);
    }

    // 5. Market Ambiance Overlays (RSI/Whale)
    this.drawMarketAmbiance(ctx, width, height, state);
  }

  /**
   * Renders visual effects for market events (RSI, Whale).
   */
  private drawMarketAmbiance(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState
  ): void {
    ctx.save();
    const isRetro = ThemeService.isRetro();

    // RSI Tints - Position Aware
    if (state.rsiVisualState !== 'NEUTRAL') {
      // Optimization: Default blending is much faster than 'overlay'

      // Determine favorability
      const isLong = state.marketPosition === 'LONG';
      const isOversold = state.rsiVisualState === 'OVERSOLD';

      const isFavorable = (isLong && isOversold) || (!isLong && !isOversold);

      // Session Fade-in: Prevent harsh flashes on start
      const timeInGame = TimeService.getGameTimeSeconds();
      const sessionFadeIn = Math.min(1, timeInGame / 2.0); // 2 second fade

      // Retro uses subtle overlays; Modern uses a soft monitor glow / vignette
      const baseOpacity = isRetro ? 0.08 : 0.12;
      const opacity = baseOpacity * sessionFadeIn;

      ctx.globalAlpha = opacity;

      if (isRetro) {
        // Simple fill for retro but with lower opacity
        ctx.fillStyle = isFavorable ? '#10b981' : '#ef4444';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Cyberpunk: Use a radial vignette for a "monitor glow" feel
        // This keeps the center clear while coloring the edges
        const gradient = gradientCache.getRadialGradient(
          ctx,
          width / 2,
          height / 2,
          height * 0.3,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.8,
          [
            { offset: 0, color: 'rgba(0,0,0,0)' },
            {
              offset: 1,
              color: isFavorable ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
            },
          ]
        );
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Volatility Pulse (ATR)
    // Pulse the vignette opacity based on ATR and time
    // RETRO OPTIMIZATION: Use sharp rectangular vignette instead of radial gradient
    if (state.atrPercent > 0.5) {
      const timeInGame = TimeService.getGameTimeSeconds();
      const sessionFadeIn = Math.min(1, timeInGame / 3.0); // 3 second slow fade for volatility

      const pulse = (Math.sin(state.lastFireTime * 0.005) + 1) * 0.5; // 0 to 1 oscillating
      // Higher ATR = Stronger pulse base
      const intensity = Math.min(0.3, (state.atrPercent / 5) * pulse) * sessionFadeIn;

      if (intensity > 0.05) {
        ctx.globalAlpha = intensity;

        if (isRetro) {
          // Retro: Simple border pulse (looks like 16-bit warning)
          ctx.strokeStyle = `rgba(0, 0, 0, ${intensity})`;
          ctx.lineWidth = 40;
          ctx.strokeRect(0, 0, width, height);
        } else {
          // Cyberpunk: Smooth radial gradient
          const gradient = gradientCache.getRadialGradient(
            ctx,
            width / 2,
            height / 2,
            height * 0.4,
            width / 2,
            height / 2,
            height * 0.9,
            [
              { offset: 0, color: 'rgba(0,0,0,0)' },
              { offset: 1, color: 'rgba(0,0,0,1)' },
            ]
          );
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }
      }
    }

    // Whale Splash Effect
    if (state.whaleEventTimer > 0) {
      const intensity = Math.min(1, state.whaleEventTimer / 1000); // Fade out last second
      ctx.globalAlpha = intensity * 0.2;

      if (isRetro) {
        // Retro: Solid full-screen flash then fade
        ctx.fillStyle = 'rgba(56, 189, 248, 1)';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Cyberpunk: Blue Ripple (Radial Gradient)
        const gradient = gradientCache.getRadialGradient(
          ctx,
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height),
          [
            { offset: 0, color: 'rgba(56, 189, 248, 0)' },
            { offset: 0.5, color: 'rgba(56, 189, 248, 0.5)' },
            { offset: 1, color: 'rgba(56, 189, 248, 0)' },
          ]
        );
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.globalAlpha = 1; // Reset globalAlpha before restoring
    ctx.restore();
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

  /**
   * Renders rising text for damage and status indicators.
   */
  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ): void {
    pool.activeFloatingTexts.forEach(t => {
      // Culling (approximate based on size)
      if (!isCircleVisible(t.x, t.y, t.size * 2, bounds)) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = t.life;

      // Floating animation logic
      const floatOffset = (1 - t.life) * GAME_ENGINE.FLOATING_TEXT_FLOAT_DISTANCE;
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
    });

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
