import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { GameStatus } from '../../types';

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
    })),
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    getActiveGems: vi.fn(() => []),
    getGemLifetimeRatio: vi.fn(() => 1.0),
  },
}));

vi.mock('../../services/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
    getConfig: vi.fn(() => ({
      colors: {
        health: '#ff0000',
      },
    })),
  },
}));

describe('EntityRenderer Optimization', () => {
  let renderer: EntityRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: any;
  let mockPlayer: any;
  let mockOpts: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new EntityRenderer();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      _fillStyle: '',
      _strokeStyle: '',
      get fillStyle() { return this._fillStyle; },
      set fillStyle(val) { this._fillStyle = val; },
      get strokeStyle() { return this._strokeStyle; },
      set strokeStyle(val) { this._strokeStyle = val; },
      lineWidth: 0,
      globalAlpha: 1,
      _shadowBlur: 0,
      get shadowBlur() { return this._shadowBlur; },
      set shadowBlur(val) { this._shadowBlur = val; },
      shadowColor: '',
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    mockPool = {
      activeEnemies: [],
      activeGems: [],
      activeInteractables: [],
    };

    mockState = {
      dashTrail: [],
      dashHaloOpacity: 0,
      playerScaleX: 1,
      playerScaleY: 1,
      playerRotation: 0,
    };

    mockPlayer = {
      x: 100,
      y: 100,
      radius: 10,
      color: '#00ff00',
    };

    mockOpts = {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: {
        shadowsEnabled: true,
      },
    };
  });

  it('should call save/restore once for all gems (OPTIMIZED)', () => {
    // Setup 4 gems: 3 normal, 1 rare
    mockPool.activeGems = [
      { x: 100, y: 100, radius: 5, color: '#00ff00', active: true, isRare: false },
      { x: 120, y: 100, radius: 5, color: '#00ff00', active: true, isRare: false },
      { x: 140, y: 100, radius: 5, color: '#00ff00', active: true, isRare: false },
      { x: 160, y: 100, radius: 5, color: '#ffff00', active: true, isRare: true },
    ];

    // Invoke drawGems directly via casting to any to isolate testing
    (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0, right: 800, top: 0, bottom: 600
    });

    // Optimized: 1 save/restore pair for the whole batch
    expect(mockCtx.save).toHaveBeenCalledTimes(1);
    expect(mockCtx.restore).toHaveBeenCalledTimes(1);
  });

  it('should reset shadowBlur correctly between gems', () => {
    mockPool.activeGems = [
      { x: 100, y: 100, radius: 5, color: '#ffff00', active: true, isRare: true },
      { x: 120, y: 100, radius: 5, color: '#00ff00', active: true, isRare: false },
    ];

    const shadowSpy = vi.spyOn(mockCtx, 'shadowBlur', 'set');

    (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0, right: 800, top: 0, bottom: 600
    });

    // First gem is rare: sets shadowBlur > 0
    // Second gem is normal: sets shadowBlur = 0
    // We expect calls with non-zero then zero
    expect(shadowSpy).toHaveBeenCalledTimes(2);

    // First call argument should be > 0 (checking constant indirectly)
    const firstCallArg = shadowSpy.mock.calls[0][0];
    expect(firstCallArg).toBeGreaterThan(0);

    // Second call argument should be 0
    expect(shadowSpy.mock.calls[1][0]).toBe(0);
  });
});
