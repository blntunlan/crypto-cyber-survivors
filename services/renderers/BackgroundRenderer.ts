import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Candle } from '../../types';
import { screenService } from '../system/ScreenService';
import { DeviceBenchmarkService } from '../system/DeviceBenchmarkService';
import { ThemeService } from '../system/ThemeService';
import { GAME_ENGINE } from '../../constants';

/**
 * BackgroundRenderer - Orchestrates the dynamic background visuals.
 *
 * Responsibilities:
 * 1. Rendering background gradients (Cyberpunk) or flat colors (Retro).
 * 2. Drawing semi-transparent background "candles" that represent market movements.
 * 3. Handling theme-specific grid patterns and pixel-perfect rounding.
 * 4. Managing background animation based on PnL and wave intensity.
 */
export class BackgroundRenderer implements IRenderer {
  private isMobileDevice: boolean;

  // Cached gradient to avoid creating new gradient objects every frame
  private cachedGradient: CanvasGradient | null = null;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;
  private cachedBgColor: string = '';

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  /**
   * Primary render loop for background elements.
   *
   * @param ctx - Canvas rendering context
   * @param _pool - Entity pool manager (unused here)
   * @param state - Current game engine state
   * @param _player - Player reference (unused here)
   * @param opts - Global rendering options (width, height, graphics settings)
   */
  render(
    ctx: CanvasRenderingContext2D,
    _pool: IPoolManager,
    state: GameState,
    _player: Player,
    opts: RenderOptions
  ): void {
    const { width, height, graphics } = opts;
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const shadowsEnabled =
      graphics.showScreenShake && perfConfig.shadowsEnabled && !this.isMobileDevice;

    // Fill background color
    const { r, g, b } = state.currentBg;
    const bgColorKey = `${r}-${g}-${b}`;

    // Theme-based strategy selection
    if (ThemeService.isRetro()) {
      this.renderRetroBackground(ctx, width, height, r, g, b, state);
    } else {
      this.renderCyberpunkBackground(
        ctx,
        width,
        height,
        r,
        g,
        b,
        bgColorKey,
        perfConfig.gradientBackground,
        state,
        shadowsEnabled
      );
    }

    // Reset alpha and shadows for subsequent renderers
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /**
   * Renders the 16-bit arcade style background.
   */
  private renderRetroBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    r: number,
    g: number,
    b: number,
    state: GameState
  ): void {
    // 1. Base Flat Color
    const minBrightness = this.isMobileDevice
      ? GAME_ENGINE.BG_RETRO_MIN_BRIGHTNESS_MOBILE
      : GAME_ENGINE.BG_RETRO_MIN_BRIGHTNESS_DESKTOP;

    ctx.fillStyle = `rgb(
      ${Math.max(r, minBrightness)}, 
      ${Math.max(g, minBrightness)}, 
      ${Math.max(b + GAME_ENGINE.BG_RETRO_BLUE_BOOST, minBrightness + GAME_ENGINE.BG_RETRO_BLUE_BOOST_MIN)}
    )`;
    ctx.fillRect(0, 0, width, height);

    // 2. Pixel Grid Pattern (Optimized: Single Draw Call)
    // 2. Pixel Grid Pattern (Optimized: Single Draw Call)
    const gridColor = `rgba(${r + 20}, ${g + 20}, ${b + 30}, 0.1)`;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridSize = GAME_ENGINE.BG_RETRO_GRID_SIZE;

    ctx.beginPath();
    // Vertical grid lines
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    // Horizontal grid lines
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Retro-style candles (Chunky pixels - Optimized: Batch by Color & Alpha)
    const rounding = GAME_ENGINE.BG_RETRO_CANDLE_ROUNDING;
    const opacityBase = this.isMobileDevice
      ? GAME_ENGINE.BG_RETRO_CANDLE_OPACITY_BASE_MOBILE
      : GAME_ENGINE.BG_RETRO_CANDLE_OPACITY_BASE_DESKTOP;

    // Group candles by color to minimize fillStyle changes
    const candlesByColor: Record<string, typeof state.bgCandles> = {};
    state.bgCandles.forEach(c => {
      (candlesByColor[c.color] ??= []).push(c);
    });

    for (const color in candlesByColor) {
      ctx.fillStyle = color;
      const group = candlesByColor[color]!;

      // Batch Body
      group.forEach(c => {
        const sizeRatio = (c.w / 8) * (c.z ?? 1);
        ctx.globalAlpha =
          opacityBase + sizeRatio * GAME_ENGINE.BG_RETRO_CANDLE_OPACITY_STEP;

        const rx = Math.round(c.x / rounding) * rounding;
        const ry = Math.round(c.y / rounding) * rounding;
        const rw = Math.max(rounding, Math.round(c.w / rounding) * rounding);
        const rh = Math.max(rounding * 2, Math.round(c.h / rounding) * rounding);

        ctx.fillRect(rx, ry, rw, rh);
      });

      // Batch Wicks (drawn with 50% alpha of the body)
      group.forEach(c => {
        const sizeRatio = (c.w / 8) * (c.z ?? 1);
        ctx.globalAlpha =
          (opacityBase + sizeRatio * GAME_ENGINE.BG_RETRO_CANDLE_OPACITY_STEP) * 0.5;

        const rx = Math.round(c.x / rounding) * rounding;
        const ry = Math.round(c.y / rounding) * rounding;
        const rw = Math.max(rounding, Math.round(c.w / rounding) * rounding);
        const rh = Math.max(rounding * 2, Math.round(c.h / rounding) * rounding);

        const wickX = rx + rw / 2 - 1;
        ctx.fillRect(wickX, ry - 4, 2, 4);
        ctx.fillRect(wickX, ry + rh, 2, 4);
      });
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Renders the neon cyberpunk style background with gradients and glows.
   */
  private renderCyberpunkBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    r: number,
    g: number,
    b: number,
    bgColorKey: string,
    useGradient: boolean,
    state: GameState,
    shadowsEnabled: boolean
  ): void {
    if (useGradient) {
      const needsNewGradient =
        !this.cachedGradient ||
        width !== this.cachedWidth ||
        height !== this.cachedHeight ||
        bgColorKey !== this.cachedBgColor;

      if (needsNewGradient) {
        this.cachedGradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) * GAME_ENGINE.BG_GRADIENT_RADIUS_FACTOR
        );

        const boost = this.isMobileDevice
          ? GAME_ENGINE.BG_BRIGHTNESS_BOOST_MOBILE
          : GAME_ENGINE.BG_BRIGHTNESS_BOOST_DESKTOP;

        this.cachedGradient.addColorStop(
          0,
          `rgb(
            ${Math.min(r + boost, GAME_ENGINE.BG_GRADIENT_MAX_R)}, 
            ${Math.min(g + boost, GAME_ENGINE.BG_GRADIENT_MAX_G)}, 
            ${Math.min(b + boost, GAME_ENGINE.BG_GRADIENT_MAX_B)}
          )`
        );
        this.cachedGradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.cachedBgColor = bgColorKey;
      }

      ctx.fillStyle = this.cachedGradient!;
    } else {
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    }

    ctx.fillRect(0, 0, width, height);

    // Render smooth neon candles
    state.bgCandles.forEach(c => {
      const sizeRatio = (c.w / 8) * (c.z ?? 1); // Changed || to ??
      const baseOpacity =
        (this.isMobileDevice
          ? GAME_ENGINE.BG_CANDLE_OPACITY_BASE_MOBILE
          : GAME_ENGINE.BG_CANDLE_OPACITY_BASE_DESKTOP) +
        sizeRatio * GAME_ENGINE.BG_CANDLE_OPACITY_STEP;

      ctx.globalAlpha = baseOpacity;
      ctx.fillStyle = c.color;

      // Depth effect: Ghost Candles (Lower opacity instead of expensive blur)
      if (c.layer === 1) {
        ctx.globalAlpha = baseOpacity * 0.5; // Significantly fainter for depth
      } else if (c.layer === 2) {
        ctx.globalAlpha = baseOpacity * 0.8;
      }

      const rx = Math.round(c.x);
      const ry = Math.round(c.y);
      const rw = Math.round(c.w);
      const rh = Math.round(c.h);

      // Apply neon glow if width allows and performance profile permits
      if (c.w > 4 && shadowsEnabled) {
        ctx.shadowColor = c.color;
        ctx.shadowBlur = GAME_ENGINE.BG_CANDLE_SHADOW_BLUR;
      }

      ctx.fillRect(rx, ry, rw, rh);

      if (shadowsEnabled) {
        ctx.shadowBlur = 0;
      }

      // Draw stylized candle wick
      ctx.globalAlpha = baseOpacity * 0.6;
      const wickWidth = Math.max(
        1,
        Math.round(rw * GAME_ENGINE.BG_CANDLE_WICK_WIDTH_FACTOR)
      );
      const wickX = rx + (rw - wickWidth) / 2;
      ctx.fillRect(
        wickX,
        ry - GAME_ENGINE.BG_CANDLE_WICK_Y_OFFSET,
        wickWidth,
        rh + GAME_ENGINE.BG_CANDLE_WICK_H_EXTRA
      );
    });
  }

  /**
   * Moves background candles based on market trend and game intensity.
   *
   * @param state - Game state containing candle definitions
   * @param pnl - Current profit/loss percentage (determines direction)
   * @param waveMultiplier - Intensity multiplier from DifficultyManager
   * @param momentum - Market momentum factor for parallax drift
   * @param dtFactor - Frame time scaling factor
   * @param width - Canvas width for wrapping
   * @param height - Canvas height for wrapping
   */
  public updateCandles(
    state: GameState,
    pnl: number,
    waveMultiplier: number,
    momentum: number,
    dtFactor: number,
    width: number,
    height: number
  ): void {
    // Direction: Positive PnL -> Candles rise (negative Y), Negative PnL -> Candles fall (positive Y)
    const trendMultiplier = pnl >= 0 ? -1 : 1;

    // Intensity: Sync speed with current wave phase
    // Momentum adds extra weight to the speed
    const waveSpeedMult =
      (GAME_ENGINE.BG_WAVE_SPEED_BASE +
        waveMultiplier * GAME_ENGINE.BG_WAVE_SPEED_FACTOR) *
      (1 + Math.abs(momentum) * 0.2);

    const threshold = GAME_ENGINE.BG_CANDLE_WRAP_THRESHOLD;
    const candles = state.bgCandles;

    candles.forEach(c => {
      // Final velocity calculation
      const volatilitySpeed = c.speed * waveSpeedMult;
      c.y += volatilitySpeed * trendMultiplier * dtFactor;

      // Parallax Drift: Subtle horizontal movement based on momentum
      // Layer factor (c.z) determines parallax intensity
      c.x += momentum * (c.z ?? 0.5) * 2 * dtFactor;

      // Coordinate Wrapping
      if (c.y > height + threshold) {
        c.y = -threshold;
        c.x = this.getNonOverlappingX(c, candles, width);
      } else if (c.y < -threshold) {
        c.y = height + threshold;
        c.x = this.getNonOverlappingX(c, candles, width);
      }

      // Horizontal wrapping
      if (c.x > width + threshold) {
        c.x = -threshold;
      } else if (c.x < -threshold) {
        c.x = width + threshold;
      }
    });
  }

  /**
   * Anti-Overlap Logic: Finds an X position that minimizes overlap with active candles.
   * Uses a grid-sampling approach for efficiency.
   */
  private getNonOverlappingX(
    candle: Candle,
    allCandles: Candle[],
    width: number
  ): number {
    const minMesafe = 15; // Minimum horizontal distance between candles
    let bestX = Math.random() * width;
    let minOverlapCount = Infinity;

    // Try a few random positions and pick the one with least overlap
    for (let attempt = 0; attempt < 5; attempt++) {
      const testX = Math.random() * width;
      let overlaps = 0;

      for (let i = 0; i < allCandles.length; i++) {
        const other = allCandles[i];
        if (!other || other === candle) continue;

        const dist = Math.abs(testX - other.x);
        if (dist < minMesafe) {
          overlaps++;
        }
      }

      if (overlaps < minOverlapCount) {
        minOverlapCount = overlaps;
        bestX = testX;
      }

      if (minOverlapCount === 0) break;
    }

    return bestX;
  }
}
