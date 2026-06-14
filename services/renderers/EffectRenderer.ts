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
import { PriceMomentumEngine } from '../market/PriceMomentumEngine';

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
      this.drawImpactRings(ctx, pool, bounds);
    }

    // 3. UI Overlays (Damage numbers)
    if (graphics.showDamageNumbers) {
      this.drawFloatingTexts(ctx, pool, bounds);
    }

    // 5. Momentum Feedback (Top layer)
    if (graphics.showParticles && !graphics.reducedMotion) {
      this.drawSpeedLines(ctx, pool, player);
    }

    // 6. Market Intensity Overlay (Phase 3C)
    if (!graphics.reducedMotion) {
      this.drawMomentumOverlay(ctx, width, height);
    }

    // 7. Market Ambiance Overlays (RSI/Whale)
    this.drawMarketAmbiance(ctx, width, height, state, graphics.reducedMotion === true);
  }

  /**
   * Renders visual effects for market events (RSI, Whale).
   */
  private drawMarketAmbiance(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState,
    reducedMotion: boolean
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
      // Reduced from 0.12 to 0.07 for cyberpunk to prevent green screen wash
      const baseOpacity = (isRetro ? 0.06 : 0.07) * (reducedMotion ? 0.45 : 1);
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
              color: isFavorable
                ? 'rgba(16, 185, 129, 0.45)'
                : 'rgba(239, 68, 68, 0.45)',
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
    if (state.atrPercent > 0.5 && !reducedMotion) {
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

    if (!reducedMotion) {
      this.drawFlowPulse(ctx, width, height, state, isRetro);
    }

    // Whale Splash Effect
    if (state.whaleEventTimer > 0) {
      const intensity = Math.min(1, state.whaleEventTimer / 1000); // Fade out last second
      ctx.globalAlpha = intensity * (reducedMotion ? 0.06 : 0.2);

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
   * Rhythmic pulse overlay driven by core-loop spawn pressure.
   * Positive spawn deltas feel like "build-up", negatives feel like "release".
   */
  private drawFlowPulse(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState,
    isRetro: boolean
  ): void {
    const spawnDelta = state.spawnRateMultiplier - 1;
    const pressure = Math.min(1, Math.abs(spawnDelta) / 0.5);
    if (pressure < 0.08) return;

    // Keep pulse phase stable while remaining test-friendly with second-based time mocks.
    const pulse = (Math.sin(TimeService.getGameTimeSeconds() * 6) + 1) * 0.5;
    const alpha = Math.min(0.16, (0.04 + pressure * 0.12) * (0.6 + pulse * 0.4));
    if (alpha <= 0.01) return;

    ctx.globalAlpha = alpha;
    const buildPhase = spawnDelta >= 0;

    if (isRetro) {
      ctx.strokeStyle = buildPhase ? 'rgba(214, 184, 92, 1)' : 'rgba(45, 212, 191, 1)';
      ctx.lineWidth = 24;
      ctx.strokeRect(0, 0, width, height);
      return;
    }

    const gradient = gradientCache.getRadialGradient(
      ctx,
      width / 2,
      height / 2,
      height * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.85,
      [
        { offset: 0, color: 'rgba(0,0,0,0)' },
        {
          offset: 1,
          color: buildPhase ? 'rgba(214, 184, 92, 0.95)' : 'rgba(45, 212, 191, 0.95)',
        },
      ]
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
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

  /**
   * Visualizes high-frequency market momentum (Intensity).
   * Adds a dynamic energy vibe when the market moves fast.
   */
  private drawMomentumOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const mom = PriceMomentumEngine.getLatest();
    // Only visible when things heat up
    if (mom.intensity < 0.25) return;

    ctx.save();
    const isRetro = ThemeService.isRetro();

    // Base alpha scales with intensity
    // Reduced cap from 0.2 to 0.10 to prevent overly intense green/red screen wash
    const alpha = Math.min(0.1, (mom.intensity - 0.25) * 0.25);

    // Pulse alpha slightly with BPM to sync with audio
    const pulseTime = TimeService.getGameTimeSeconds();
    const bpm = mom.suggestedBPM / 60; // beats per second
    const pulse = Math.sin(pulseTime * bpm * Math.PI * 2) * 0.5 + 0.5; // 0-1
    const finalAlpha = alpha * (0.8 + pulse * 0.4);

    ctx.globalAlpha = finalAlpha;

    // Favorable = Cyber Green, Unfavorable = Alarm Red
    const color = mom.isFavorable
      ? isRetro
        ? '#10b981'
        : '#34d399'
      : isRetro
        ? '#ef4444'
        : '#f87171';

    if (isRetro) {
      // Retro: Thick border that grows with intensity
      const borderWidth = 10 + mom.intensity * 40;
      ctx.strokeStyle = color;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, 0, width, height);
    } else {
      // Cyberpunk: Energy vignette
      const gradient = gradientCache.getRadialGradient(
        ctx,
        width / 2,
        height / 2,
        height * 0.4,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9,
        [
          { offset: 0, color: 'transparent' },
          { offset: 1, color },
        ]
      );
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // High Intensity Scanline Glitch (CRASHING/SURGING generally > 0.8)
    if (mom.intensity > 0.85) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      // Random-ish scanline that scrolls
      const scanHeight = height * 0.05;
      const scanY =
        (TimeService.getGameTimeSeconds() * 1000 * (1 + mom.intensity)) % height;
      ctx.fillRect(0, scanY, width, scanHeight);

      // Occasional second glitch line
      if (Math.random() > 0.7) {
        ctx.fillRect(0, (scanY + height / 2) % height, width, scanHeight * 0.5);
      }
    }

    ctx.restore();
  }
}
