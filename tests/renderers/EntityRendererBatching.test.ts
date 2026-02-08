import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { Gem } from '../../types';

// Mock services
vi.mock('../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

vi.mock('../../services/system/DeviceBenchmarkService', () => ({
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

vi.mock('../../services/system/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
    getConfig: vi.fn(() => ({
      colors: {
        health: '#ff0000',
      },
    })),
  },
}));

describe('EntityRenderer Batching', () => {
  let renderer: EntityRenderer;
  let mockCtx: any;
  let mockPool: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new EntityRenderer();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      // Other methods to prevent crashes if called
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      ellipse: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      _fillStyle: '',
      get fillStyle() { return this._fillStyle; },
      set fillStyle(val) { this._fillStyle = val; },
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
    };

    mockPool = {
      activeEnemies: [],
      activeGems: [],
      activeInteractables: [],
    };
  });

  it('should batch standard gems into a single draw call', () => {
    // Setup 3 standard gems
    const standardGem: Gem = {
      x: 100, y: 100, radius: 5, color: '#FFD700', active: true,
      isRare: false, elapsedLifetime: 0, value: 1
    };

    mockPool.activeGems = [
      { ...standardGem, x: 100 },
      { ...standardGem, x: 120 },
      { ...standardGem, x: 140 },
    ];

    (renderer as any).drawGems(mockCtx, mockPool, true, {
      left: 0, right: 800, top: 0, bottom: 600,
    });

    // Expecting batching:
    // 1. One save/restore pair for the batch
    // 2. One beginPath/fill pair for the batch
    // 3. Three moveTo/arc calls

    // NOTE: This test will fail before optimization is implemented because currently it does one draw per gem.
    // Current behavior: 3 saves, 3 restores, 3 beginPaths, 3 fills.

    // We assert the optimized behavior we want to see.
    expect(mockCtx.save).toHaveBeenCalledTimes(1);
    expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(mockCtx.fill).toHaveBeenCalledTimes(1);
    expect(mockCtx.restore).toHaveBeenCalledTimes(1);

    expect(mockCtx.moveTo).toHaveBeenCalledTimes(3);
    expect(mockCtx.arc).toHaveBeenCalledTimes(3);
  });

  it('should handle mixed batch and special gems', () => {
    const standardGem: Gem = {
      x: 100, y: 100, radius: 5, color: '#FFD700', active: true,
      isRare: false, elapsedLifetime: 0, value: 1
    };
    const rareGem: Gem = {
      x: 200, y: 200, radius: 8, color: '#FF10F0', active: true,
      isRare: true, elapsedLifetime: 0, value: 5
    };

    mockPool.activeGems = [standardGem, rareGem, standardGem];

    (renderer as any).drawGems(mockCtx, mockPool, true, {
      left: 0, right: 800, top: 0, bottom: 600,
    });

    // Optimized behavior:
    // 1. Batch for 2 standard gems -> 1 save/restore/beginPath/fill
    // 2. Individual draw for rare gem -> 1 save/restore/beginPath/fill
    // Total: 2 saves, 2 restores, 2 beginPaths, 2 fills.

    expect(mockCtx.save).toHaveBeenCalledTimes(2);
    expect(mockCtx.beginPath).toHaveBeenCalledTimes(2);
    expect(mockCtx.fill).toHaveBeenCalledTimes(2);
    expect(mockCtx.restore).toHaveBeenCalledTimes(2);

    // Check specific calls if needed, but counts are good indicators.
  });
});
