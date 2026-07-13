import { Logger } from '../services/system/Logger';

/**
 * GradientCache - Singleton utility for caching CanvasGradient objects.
 * Prevents redundant GC pressure and CPU cycles spent on creating gradients every frame.
 */
class GradientCache {
  private cache: Map<string, CanvasGradient> = new Map();
  private maxEntries: number = 200;

  /**
   * Gets or creates a linear gradient.
   */
  public getLinearGradient(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: ReadonlyArray<{ offset: number; color: string }>,
    cacheKey?: string
  ): CanvasGradient {
    const key =
      cacheKey ??
      `lin-${x0.toFixed(1)}-${y0.toFixed(1)}-${x1.toFixed(1)}-${y1.toFixed(1)}-${stops.map(s => `${s.offset}:${s.color}`).join('|')}`;

    let grad = this.cache.get(key);
    if (!grad) {
      if (this.cache.size >= this.maxEntries) {
        this.clear();
      }

      grad = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const stop of stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      this.cache.set(key, grad);

      Logger.debug(`[GradientCache] New linear gradient cached: ${key}`);
    }

    return grad;
  }

  /**
   * Gets or creates a radial gradient.
   */
  public getRadialGradient(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    stops: ReadonlyArray<{ offset: number; color: string }>,
    cacheKey?: string
  ): CanvasGradient {
    const key =
      cacheKey ??
      `rad-${x0.toFixed(0)}-${y0.toFixed(0)}-${r0.toFixed(0)}-${x1.toFixed(0)}-${y1.toFixed(0)}-${r1.toFixed(0)}-${stops.map(s => `${s.offset}:${s.color}`).join('|')}`;

    let grad = this.cache.get(key);
    if (!grad) {
      if (this.cache.size >= this.maxEntries) {
        this.clear();
      }

      grad = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
      for (const stop of stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      this.cache.set(key, grad);
    }

    return grad;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const gradientCache = new GradientCache();
