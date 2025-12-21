import { type IRenderer, type RenderOptions } from './types';
import { type PoolManager } from '../poolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';

export class BackgroundRenderer implements IRenderer {
  private isMobileDevice: boolean;

  // Cached gradient to avoid creating new gradient every frame
  private cachedGradient: CanvasGradient | null = null;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;
  private cachedBgColor: string = '';

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  render(
    ctx: CanvasRenderingContext2D,
    _pool: PoolManager,
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

    if (perfConfig.gradientBackground) {
      // Use cached gradient if dimensions and color haven't changed
      const needsNewGradient =
        !this.cachedGradient ||
        width !== this.cachedWidth ||
        height !== this.cachedHeight ||
        bgColorKey !== this.cachedBgColor;

      if (needsNewGradient) {
        // Create and cache new gradient
        this.cachedGradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.8
        );
        this.cachedGradient.addColorStop(
          0,
          `rgb(${Math.min(r + 8, 30)}, ${Math.min(g + 8, 30)}, ${Math.min(b + 8, 40)})`
        );
        this.cachedGradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.cachedBgColor = bgColorKey;
      }

      ctx.fillStyle = this.cachedGradient!;
    } else {
      // Simple solid color for low/medium
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    }

    ctx.fillRect(0, 0, width, height);

    // Draw background candles with depth-based opacity
    state.bgCandles.forEach(c => {
      // Calculate opacity based on candle size (smaller = further = more transparent)
      const sizeRatio = c.w / 8; // Max width is ~8
      const baseOpacity = 0.03 + sizeRatio * 0.12; // Range: 0.03 to 0.15

      ctx.globalAlpha = baseOpacity;
      ctx.fillStyle = c.color;

      const rx = Math.round(c.x);
      const ry = Math.round(c.y);
      const rw = Math.round(c.w);
      const rh = Math.round(c.h);

      // Subtle glow effect for larger candles (skip on mobile/disabled for performance)
      if (c.w > 4 && shadowsEnabled) {
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
      }

      // Candle Body
      ctx.fillRect(rx, ry, rw, rh);

      // Reset shadow
      if (shadowsEnabled) ctx.shadowBlur = 0;

      // Candle Wick (thinner, more subtle)
      ctx.globalAlpha = baseOpacity * 0.6;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = Math.max(1, c.w * 0.3);
      ctx.beginPath();
      ctx.moveTo(rx + rw / 2, ry - 3);
      ctx.lineTo(rx + rw / 2, ry + rh + 3);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /**
   * Update background candle positions based on market trend.
   */
  public updateCandles(
    state: GameState,
    pnl: number,
    difficulty: number,
    dtFactor: number,
    width: number,
    height: number
  ): void {
    const trendMultiplier = pnl >= 0 ? -1 : 1;

    state.bgCandles.forEach(c => {
      const volatilitySpeed = c.speed * (1 + difficulty / 1.5);
      c.y += volatilitySpeed * trendMultiplier * dtFactor;

      // Wrap around screen edges
      if (c.y > height + 100) {
        c.y = -100;
        c.x = Math.random() * width;
      }
      if (c.y < -100) {
        c.y = height + 100;
        c.x = Math.random() * width;
      }
    });
  }
}
