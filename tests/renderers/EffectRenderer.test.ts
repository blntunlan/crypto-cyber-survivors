import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectRenderer } from '../../services/renderers/EffectRenderer';
import { GameStatus } from '../../types';
import { ThemeService } from '../../services/ThemeService';

// Mock services
vi.mock('../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
  },
}));

describe('EffectRenderer', () => {
  let renderer: EffectRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: any;
  let mockPlayer: any;
  let mockOpts: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new EffectRenderer();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      lineCap: '',
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    mockPool = {
      activeParticles: [],
      activeFloatingTexts: [],
      activeSpeedLines: [],
    };

    mockState = {
      critFlash: 0,
      critFlashColor: '#ffffff',
      rsiVisualState: 'NEUTRAL',
      atrPercent: 0,
      whaleEventTimer: 0,
      lastFireTime: 0,
    };

    mockPlayer = {
      x: 400,
      y: 300,
      color: '#00ff00',
    };

    mockOpts = {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: {
        showParticles: true,
        showDamageNumbers: true,
      },
    };
  });

  describe('render', () => {
    it('should call all drawing layers', () => {
      const drawCritFlashSpy = vi.spyOn(renderer as any, 'drawCritFlash');
      const drawParticlesSpy = vi.spyOn(renderer as any, 'drawParticles');
      const drawFloatingTextsSpy = vi.spyOn(renderer as any, 'drawFloatingTexts');
      const drawSpeedLinesSpy = vi.spyOn(renderer as any, 'drawSpeedLines');
      const drawMarketAmbianceSpy = vi.spyOn(renderer as any, 'drawMarketAmbiance');

      renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);

      expect(drawCritFlashSpy).toHaveBeenCalled();
      expect(drawParticlesSpy).toHaveBeenCalled();
      expect(drawFloatingTextsSpy).toHaveBeenCalled();
      expect(drawSpeedLinesSpy).toHaveBeenCalled();
      expect(drawMarketAmbianceSpy).toHaveBeenCalled();
    });

    it('should skip particles and damage numbers if disabled in graphics config', () => {
      mockOpts.graphics.showParticles = false;
      mockOpts.graphics.showDamageNumbers = false;

      const drawParticlesSpy = vi.spyOn(renderer as any, 'drawParticles');
      const drawFloatingTextsSpy = vi.spyOn(renderer as any, 'drawFloatingTexts');
      const drawSpeedLinesSpy = vi.spyOn(renderer as any, 'drawSpeedLines');

      renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);

      expect(drawParticlesSpy).not.toHaveBeenCalled();
      expect(drawFloatingTextsSpy).not.toHaveBeenCalled();
      expect(drawSpeedLinesSpy).not.toHaveBeenCalled();
    });
  });

  describe('drawCritFlash', () => {
    it('should draw crit flash when active', () => {
      mockState.critFlash = 0.5;
      mockState.critFlashColor = '#ff0000';

      (renderer as any).drawCritFlash(mockCtx, 800, 600, mockState);

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockCtx.globalAlpha).toBe(0.5);
    });

    it('should skip crit flash when inactive', () => {
      mockState.critFlash = 0;
      (renderer as any).drawCritFlash(mockCtx, 800, 600, mockState);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('drawParticles', () => {
    it('should batch render particles', () => {
      mockPool.activeParticles = [
        { x: 100, y: 100, radius: 2, color: '#ffffff', life: 1, isPixel: false },
        { x: 110, y: 110, radius: 2, color: '#ffffff', life: 1, isPixel: false },
        { x: 200, y: 200, radius: 3, color: '#ff0000', life: 0.5, isPixel: true },
      ];

      (renderer as any).drawParticles(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      // Should have 2 batches (1 standard white, 1 pixel red)
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.fill).toHaveBeenCalledTimes(1); // Standard batch
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(1); // Pixel batch
    });

    it('should skip culling particles', () => {
      mockPool.activeParticles = [
        { x: 1000, y: 1000, radius: 2, color: '#ffffff', life: 1, isPixel: false },
      ];

      (renderer as any).drawParticles(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });
  });

  describe('drawFloatingTexts', () => {
    it('should draw active floating texts', () => {
      mockPool.activeFloatingTexts = [
        { x: 400, y: 300, text: 'CRIT!', color: '#ff0000', size: 24, life: 1 },
      ];

      (renderer as any).drawFloatingTexts(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.fillText).toHaveBeenCalledWith('CRIT!', 400, 300);
      expect(mockCtx.strokeText).toHaveBeenCalledWith('CRIT!', 400, 300);
    });
  });

  describe('drawSpeedLines', () => {
    it('should draw speed lines', () => {
      mockPool.activeSpeedLines = [
        { x: 400, y: 300, angle: 0, length: 20, width: 2, opacity: 1 },
      ];

      (renderer as any).drawSpeedLines(mockCtx, mockPool, mockPlayer);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    });

    it('should draw retro speed lines', () => {
      (ThemeService.isRetro as any).mockReturnValue(true);
      mockPool.activeSpeedLines = [
        { x: 400, y: 300, angle: 0, length: 20, width: 2, opacity: 1 },
      ];

      (renderer as any).drawSpeedLines(mockCtx, mockPool, mockPlayer);

      expect(mockCtx.fillRect).toHaveBeenCalled(); // Retro tip
    });
  });

  describe('drawMarketAmbiance', () => {
    it('should draw RSI tint', () => {
      mockState.rsiVisualState = 'OVERSOLD';
      mockState.marketPosition = 'LONG'; // Favorable

      (renderer as any).drawMarketAmbiance(mockCtx, 800, 600, mockState);

      expect(mockCtx.fillStyle).toBe('#10b981');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should draw unfavorable RSI tint', () => {
      mockState.rsiVisualState = 'OVERSOLD';
      mockState.marketPosition = 'SHORT'; // Unfavorable

      (renderer as any).drawMarketAmbiance(mockCtx, 800, 600, mockState);

      expect(mockCtx.fillStyle).toBe('#ef4444');
    });

    it('should draw volatility pulse', () => {
      mockState.atrPercent = 5.0; // High ATR
      mockState.lastFireTime = 314; // sin(314 * 0.005) approx sin(1.57) approx 1

      (renderer as any).drawMarketAmbiance(mockCtx, 800, 600, mockState);

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    });

    it('should draw whale event splash', () => {
      mockState.whaleEventTimer = 500;

      (renderer as any).drawMarketAmbiance(mockCtx, 800, 600, mockState);

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    });
  });
});
