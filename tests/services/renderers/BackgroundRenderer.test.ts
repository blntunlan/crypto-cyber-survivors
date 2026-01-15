import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundRenderer } from '../../../services/renderers/BackgroundRenderer';
import { ThemeService } from '../../../services/ThemeService';

// Mock dependencies
vi.mock('../../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(),
  },
}));

vi.mock('../../../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn().mockReturnValue({
      shadowsEnabled: false,
      gradientBackground: false,
    }),
  },
}));

vi.mock('../../../services/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn().mockReturnValue(false),
  },
}));

describe('BackgroundRenderer', () => {
  let renderer: BackgroundRenderer;
  let ctx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new BackgroundRenderer();
    ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
    };
  });

  it('should batch grid draw calls in retro mode', () => {
    // Setup Retro mode
    (ThemeService.isRetro as any).mockReturnValue(true);

    const width = 800;
    const height = 600;
    const state: any = {
        currentBg: { r: 0, g: 0, b: 0 },
        bgCandles: [], // No candles for this test
    };
    const opts: any = {
        width,
        height,
        graphics: { showScreenShake: false },
    };

    renderer.render(ctx, {} as any, state, {} as any, opts);

    // We expect exactly 1 call to stroke() now.
    expect(ctx.stroke.mock.calls.length).toBe(1);
  });
});
