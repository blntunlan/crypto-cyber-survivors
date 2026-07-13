import { describe, expect, it, vi } from 'vitest';
import { gradientCache } from '../../utils/GradientCache';

describe('GradientCache', () => {
  it('does not rebuild stop keys for keyed cache hits', () => {
    const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
    const ctx = {
      createRadialGradient: vi.fn(() => gradient),
    } as unknown as CanvasRenderingContext2D;
    let reads = 0;
    const stops = [
      {
        get offset() {
          reads++;
          return 0;
        },
        get color() {
          reads++;
          return '#fff';
        },
      },
    ];

    gradientCache.clear();
    gradientCache.getRadialGradient(ctx, 0, 0, 0, 0, 0, 9, stops, 'quantum');
    reads = 0;
    gradientCache.getRadialGradient(ctx, 0, 0, 0, 0, 0, 9, stops, 'quantum');

    expect(reads).toBe(0);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(1);
  });
});
