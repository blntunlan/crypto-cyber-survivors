import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import {
  createViewportBounds,
  isCircleVisible,
  type ViewportBounds,
} from './CullingUtils';
import { ThemeService } from '../ThemeService';
import { GAME_ENGINE } from '../../constants';

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
    // RSI Tints
    if (state.rsiVisualState !== 'NEUTRAL') {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.15; // Subtle tint
      ctx.fillStyle = state.rsiVisualState === 'OVERSOLD' ? '#22c55e' : '#ef4444';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Whale Splash Effect
    if (state.whaleEventTimer > 0) {
      const intensity = Math.min(1, state.whaleEventTimer / 1000); // Fade out last second
      ctx.save();
      ctx.globalCompositeOperation = 'color-dodge';
      ctx.globalAlpha = intensity * 0.2;

      // Blue Ripple
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0)');
      gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.5)'); // Cyan-400
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
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
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      minDim * GAME_ENGINE.CRIT_FLASH_RADIUS_FACTOR,
      width / 2,
      height / 2,
      maxDim
    );

    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, state.critFlashColor);

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
   * Optimized particle rendering using Sort-and-Sweep.
   * Eliminates Map/Array allocations by sorting the active pool in-place.
   * Batches draw calls by state (Pixel -> Color -> Alpha) for maximum performance.
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

    // Sort a shallow copy to prevent mutating PoolManager's active list
    // This ensures PoolManager limits (FIFO) still target the oldest particles,
    // not just the ones that sorted to index 0.
    const sortedParticles = particles.slice().sort((a, b) => {
      // 1. Pixel vs Standard (boolean)
      if (a.isPixel !== b.isPixel) {
        return a.isPixel ? 1 : -1;
      }
      // 2. Color (string)
      if (a.color !== b.color) {
        return a.color < b.color ? -1 : 1;
      }
      // 3. Alpha Bucket (int) - high life first
      const aBucket = (a.life * 10) | 0;
      const bBucket = (b.life * 10) | 0;
      return bBucket - aBucket;
    });

    // Initialize State from first particle
    let configIsPixel = sortedParticles[0]!.isPixel;
    let configColor = sortedParticles[0]!.color;
    let configAlphaBucket = (sortedParticles[0]!.life * 10) | 0;

    // Apply initial context state
    ctx.globalAlpha = Math.max(0, configAlphaBucket / 10);
    ctx.fillStyle = configColor;

    if (!configIsPixel) {
      ctx.beginPath();
    }

    const defaultRadius = GAME_ENGINE.PARTICLE_DEFAULT_RADIUS;

    for (let i = 0; i < count; i++) {
      const p = sortedParticles[i]!;
      const radius = p.radius || defaultRadius;

      // Culling
      if (!isCircleVisible(p.x, p.y, radius, bounds)) {
        continue;
      }

      const pAlphaBucket = (p.life * 10) | 0;

      // Check for state change
      const stateChanged =
        p.isPixel !== configIsPixel ||
        p.color !== configColor ||
        pAlphaBucket !== configAlphaBucket;

      if (stateChanged) {
        // Flux render batch
        if (!configIsPixel) {
          ctx.fill();
        }

        // Update Config
        configIsPixel = p.isPixel;
        configColor = p.color;
        configAlphaBucket = pAlphaBucket;

        // Update Context
        ctx.globalAlpha = Math.max(0, configAlphaBucket / 10);
        ctx.fillStyle = configColor;

        if (!configIsPixel) {
          ctx.beginPath();
        }
      }

      // Add to batch
      if (configIsPixel) {
        // Pixels: Draw immediately (rects don't need component paths)
        const size = radius * 2;
        const px = (p.x - radius) | 0; // fast floor
        const py = (p.y - radius) | 0;
        ctx.fillRect(px, py, size, size);
      } else {
        // Standard: Add to path
        const x = (p.x + 0.5) | 0; // fast round
        const y = (p.y + 0.5) | 0;
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
    }

    // Flush final batch
    if (!configIsPixel) {
      ctx.fill();
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
   */
  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    player: Player
  ): void {
    if (pool.activeSpeedLines.length === 0) {
      return;
    }

    const isRetro = ThemeService.isRetro();
    const color = player.color; // Use sentiment-aware color

    ctx.save();

    pool.activeSpeedLines.forEach(line => {
      const tailX = line.x - Math.cos(line.angle) * line.length;
      const tailY = line.y - Math.sin(line.angle) * line.length;

      // Vertical/Horizontal Gradients for "tail" fade
      const gradient = ctx.createLinearGradient(line.x, line.y, tailX, tailY);

      if (isRetro) {
        // Retro: Solid pixelated lines
        gradient.addColorStop(0, `${color}CC`); // 80% opacity
        gradient.addColorStop(1, `${color}00`); // 0% opacity
      } else {
        // Cyberpunk: Multi-stop neon gradient
        gradient.addColorStop(0, `${color}F2`); // 95% opacity
        gradient.addColorStop(0.3, `${color}99`); // 60% opacity
        gradient.addColorStop(1, `${color}00`); // 0% opacity
      }

      // 1. Primary Vector Line
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = line.width;
      ctx.lineCap = isRetro ? 'butt' : 'round';
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // 2. Halo Glow (Cyberpunk only)
      if (!isRetro && line.opacity > GAME_ENGINE.SPEED_LINE_GLOW_THRESHOLD) {
        ctx.beginPath();
        ctx.strokeStyle = `${color}4D`; // 30% alpha theme color
        ctx.lineWidth = line.width * GAME_ENGINE.SPEED_LINE_GLOW_WIDTH_MULT;
        ctx.lineCap = 'round';
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }

      // 3. Vector Tip (High energy point)
      if (!isRetro) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${line.opacity})`;
        ctx.arc(line.x, line.y, line.width * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Retro Tip: Square pixel
        ctx.fillStyle = '#FFFFFF';
        const tipSize = line.width;
        ctx.fillRect(line.x - tipSize / 2, line.y - tipSize / 2, tipSize, tipSize);
      }
    });

    ctx.restore();
  }
}
