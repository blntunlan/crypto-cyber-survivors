import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundRenderer } from '../../services/renderers/BackgroundRenderer';
import { GameStatus } from '../../types';

import { ThemeService } from '../../services/ThemeService';

// Mock services
vi.mock('../../services/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

vi.mock('../../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(() => ({
      shadowsEnabled: true,
      gradientBackground: true,
    })),
  },
}));

vi.mock('../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
  },
}));

describe('BackgroundRenderer', () => {
  let renderer: BackgroundRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: any;
  let mockPlayer: any;
  let mockOpts: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new BackgroundRenderer();

    const fillStyleSpy = vi.fn(val => {
      mockCtx._fillStyle = val;
    });
    const filterSpy = vi.fn(val => {
      mockCtx._filter = val;
    });
    const shadowBlurSpy = vi.fn(val => {
      mockCtx._shadowBlur = val;
    });

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      _fillStyle: '',
      get fillStyle() {
        return this._fillStyle;
      },
      set fillStyle(val) {
        fillStyleSpy(val);
      },
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      shadowColor: '',

      _shadowBlur: 0,
      get shadowBlur() {
        return this._shadowBlur;
      },
      set shadowBlur(val) {
        shadowBlurSpy(val);
        this._shadowBlur = val;
      },

      _filter: 'none',
      get filter() {
        return this._filter;
      },
      set filter(val) {
        filterSpy(val);
      },

      fillStyleSpy,
      filterSpy,
      shadowBlurSpy,
    };

    mockPool = {};

    mockState = {
      currentBg: { r: 10, g: 10, b: 20 },
      bgCandles: [
        { x: 100, y: 100, w: 10, h: 40, color: '#00ff00', speed: 1, layer: 0, z: 1 },
      ],
    };

    mockPlayer = {};

    mockOpts = {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: {
        showScreenShake: true,
      },
    };
  });

  describe('render', () => {
    it('should draw cyberpunk background by default', () => {
      const renderCyberpunkSpy = vi.spyOn(renderer as any, 'renderCyberpunkBackground');
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);
      expect(renderCyberpunkSpy).toHaveBeenCalled();
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    });

    it('should draw retro background when theme is retro', () => {
      (ThemeService.isRetro as any).mockReturnValue(true);
      const renderRetroSpy = vi.spyOn(renderer as any, 'renderRetroBackground');
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);
      expect(renderRetroSpy).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('renderRetroBackground', () => {
    it('should draw grid and candles', () => {
      (renderer as any).renderRetroBackground(mockCtx, 800, 600, 10, 10, 20, mockState);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled(); // Bg + candles + wicks
    });
  });

  describe('renderCyberpunkBackground', () => {
    it('should draw gradient and neon candles', () => {
      (renderer as any).renderCyberpunkBackground(
        mockCtx,
        800,
        600,
        10,
        10,
        20,
        '10-10-20',
        true,
        mockState,
        true
      );

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();

      // Check if shadowBlur was set to something > 0
      expect(mockCtx.shadowBlurSpy).toHaveBeenCalled();
      const calls = mockCtx.shadowBlurSpy.mock.calls;
      const wasSetGreaterThanZero = calls.some((args: any) => args[0] > 0);
      expect(wasSetGreaterThanZero).toBe(true);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should use flat color if gradient is disabled', () => {
      (renderer as any).renderCyberpunkBackground(
        mockCtx,
        800,
        600,
        10,
        10,
        20,
        '10-10-20',
        false,
        mockState,
        false
      );
      expect(mockCtx.createRadialGradient).not.toHaveBeenCalled();
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('rgb(10, 10, 20)');
    });
  });

  describe('updateCandles', () => {
    it('should move candles based on pnl and momentum', () => {
      const initialY = mockState.bgCandles[0].y;
      const initialX = mockState.bgCandles[0].x;

      renderer.updateCandles(mockState, 0.1, 1.0, 0.5, 1.0, 800, 600);

      expect(mockState.bgCandles[0].y).toBeLessThan(initialY); // Rising because PnL > 0
      expect(mockState.bgCandles[0].x).toBeGreaterThan(initialX); // Drifting because momentum > 0
    });

    it('should wrap candles when they go off screen', () => {
      mockState.bgCandles[0].y = 1000; // Far below
      renderer.updateCandles(mockState, -0.1, 1.0, 0, 1.0, 800, 600);

      expect(mockState.bgCandles[0].y).toBeLessThan(0); // Wrapped to top
    });
  });
});
