import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gradientCache } from '../../../utils/GradientCache';

function createMockContext() {
  const linearGradient = {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;

  const radialGradient = {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;

  const ctx = {
    createLinearGradient: vi.fn(() => linearGradient),
    createRadialGradient: vi.fn(() => radialGradient),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, linearGradient, radialGradient };
}

describe('gradientCache', () => {
  let originalMaxEntries: number;

  beforeEach(() => {
    gradientCache.clear();
    originalMaxEntries = (gradientCache as unknown as { maxEntries: number }).maxEntries;
  });

  afterEach(() => {
    gradientCache.clear();
    (gradientCache as unknown as { maxEntries: number }).maxEntries = originalMaxEntries;
  });

  it('caches linear gradients with same key', () => {
    const { ctx, linearGradient } = createMockContext();
    const stops = [
      { offset: 0, color: '#000' },
      { offset: 1, color: '#fff' },
    ];

    const a = gradientCache.getLinearGradient(ctx, 0, 0, 100, 0, stops);
    const b = gradientCache.getLinearGradient(ctx, 0, 0, 100, 0, stops);

    expect(a).toBe(linearGradient);
    expect(b).toBe(linearGradient);
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
  });

  it('creates distinct radial gradients for distinct keys', () => {
    const { ctx } = createMockContext();
    const stops = [
      { offset: 0, color: '#111' },
      { offset: 1, color: '#eee' },
    ];

    gradientCache.getRadialGradient(ctx, 0, 0, 1, 10, 10, 20, stops);
    gradientCache.getRadialGradient(ctx, 1, 0, 1, 10, 10, 20, stops);

    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(2);
  });

  it('clears cache automatically when maxEntries is reached', () => {
    const { ctx } = createMockContext();
    (gradientCache as unknown as { maxEntries: number }).maxEntries = 1;

    gradientCache.getLinearGradient(ctx, 0, 0, 10, 0, [{ offset: 0, color: '#0f0' }]);
    gradientCache.getLinearGradient(ctx, 2, 0, 10, 0, [{ offset: 0, color: '#0f0' }]);

    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(2);
  });
});
