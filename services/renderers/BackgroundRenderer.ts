import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { ThemeService } from '../ThemeService';

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

    // Different rendering based on theme
    if (ThemeService.isRetro()) {
      // 16-BIT RETRO STYLE
      // Simple flat color background
      const minBrightness = this.isMobileDevice ? 15 : 0;
      ctx.fillStyle = `rgb(${Math.max(r, minBrightness)}, ${Math.max(g, minBrightness)}, ${Math.max(b + 10, minBrightness + 20)})`;
      ctx.fillRect(0, 0, width, height);

      // Draw pixel grid pattern (subtle)
      ctx.strokeStyle = `rgba(${r + 20}, ${g + 20}, ${b + 30}, 0.1)`;
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw retro-style candles (larger, chunkier pixels)
      state.bgCandles.forEach(c => {
        const sizeRatio = c.w / 8;
        const baseOpacity = (this.isMobileDevice ? 0.15 : 0.08) + sizeRatio * 0.15;
        ctx.globalAlpha = baseOpacity;
        ctx.fillStyle = c.color;

        // Round to grid for pixel-perfect look
        const rx = Math.round(c.x / 4) * 4;
        const ry = Math.round(c.y / 4) * 4;
        const rw = Math.max(4, Math.round(c.w / 4) * 4);
        const rh = Math.max(8, Math.round(c.h / 4) * 4);

        // Chunky pixel candle body
        ctx.fillRect(rx, ry, rw, rh);

        // Simple wick (2px wide, centered)
        ctx.globalAlpha = baseOpacity * 0.5;
        const wickX = rx + rw / 2 - 1;
        ctx.fillRect(wickX, ry - 4, 2, 4);
        ctx.fillRect(wickX, ry + rh, 2, 4);
      });
    } else {
      // CYBERPUNK STYLE (original code)
      if (perfConfig.gradientBackground) {
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
            Math.max(width, height) * 0.8
          );
          const boost = this.isMobileDevice ? 15 : 8;
          this.cachedGradient.addColorStop(
            0,
            `rgb(${Math.min(r + boost, 45)}, ${Math.min(g + boost, 45)}, ${Math.min(b + boost, 55)})`
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

      // Draw background candles with depth-based opacity
      state.bgCandles.forEach(c => {
        const sizeRatio = c.w / 8;
        const baseOpacity = (this.isMobileDevice ? 0.1 : 0.03) + sizeRatio * 0.12;

        ctx.globalAlpha = baseOpacity;
        ctx.fillStyle = c.color;

        const rx = Math.round(c.x);
        const ry = Math.round(c.y);
        const rw = Math.round(c.w);
        const rh = Math.round(c.h);

        if (c.w > 4 && shadowsEnabled) {
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 8;
        }

        ctx.fillRect(rx, ry, rw, rh);

        if (shadowsEnabled) ctx.shadowBlur = 0;

        ctx.globalAlpha = baseOpacity * 0.6;
        const wickWidth = Math.max(1, Math.round(rw * 0.2));
        const wickX = rx + (rw - wickWidth) / 2;
        ctx.fillRect(wickX, ry - 3, wickWidth, rh + 6);
      });
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /**
   * Update background candle positions based on market trend.
   * Speed is influenced by:
   * - Base candle speed
   * - Wave multiplier (syncs with game intensity phases)
   * - PnL determines direction (profit = up, loss = down)
   */
  public updateCandles(
    state: GameState,
    pnl: number,
    waveMultiplier: number,
    _unused: number, // kept for API compatibility
    dtFactor: number,
    width: number,
    height: number
  ): void {
    // Direction based on PnL: profit = candles rise, loss = candles fall
    const trendMultiplier = pnl >= 0 ? -1 : 1;

    // Wave multiplier directly controls speed (0.4 resolution → 1.5 climax)
    // Normalize to 0.6-1.8 range for visual effect
    const waveSpeedMult = 0.6 + waveMultiplier * 0.8;

    state.bgCandles.forEach(c => {
      // Combined speed: base speed * wave intensity
      const volatilitySpeed = c.speed * waveSpeedMult;
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
