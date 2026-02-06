import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { GameStatus } from '../../types';

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

// Mock Constants/Config if needed, but they are likely just values
// We might need to mock ECONOMY_CONFIG if we want to control fading exactly
vi.mock('../../config', () => ({
  ECONOMY_CONFIG: {
    GEMS: {
      LIFETIME_MS: 10000,
    },
  },
}));

vi.mock('../../constants', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        GAME_ENGINE: {
            ...actual.GAME_ENGINE,
            ENTITY_CULLING_PADDING: 50,
            GEM_RARE_GLOW_BLUR: 10,
        }
    }
});


describe('EntityRenderer Batching', () => {
  let renderer: EntityRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockBounds: any;

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
      moveTo: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      set fillStyle(val) {},
      set strokeStyle(val) {},
      set globalAlpha(val) {},
      set shadowBlur(val) {},
      set shadowColor(val) {},
    };

    mockPool = {
      activeEnemies: [],
      activeGems: [],
      activeInteractables: [],
    };

    mockBounds = {
      left: 0,
      right: 800,
      top: 0,
      bottom: 600,
    };
  });

  it('should batch standard gems by color', () => {
    // Setup 20 gems: 10 Green, 10 Blue. All standard, full life.
    const gems = [];
    for (let i = 0; i < 10; i++) {
      gems.push({
        x: 100 + i * 10,
        y: 100,
        radius: 5,
        color: '#00ff00', // Green
        active: true,
        isRare: false,
        elapsedLifetime: 0, // Fresh
      });
    }
    for (let i = 0; i < 10; i++) {
      gems.push({
        x: 100 + i * 10,
        y: 200,
        radius: 5,
        color: '#0000ff', // Blue
        active: true,
        isRare: false,
        elapsedLifetime: 0, // Fresh
      });
    }

    mockPool.activeGems = gems;

    // We can call drawGems directly by casting to any, as it's private
    (renderer as any).drawGems(mockCtx, mockPool, true, mockBounds);

    // Optimized behavior:
    // 0 saves (standard gems don't use save/restore anymore).
    // 2 fills (one per color batch).
    expect(mockCtx.save).toHaveBeenCalledTimes(0);
    expect(mockCtx.fill).toHaveBeenCalledTimes(2);

    // Verify correct drawing calls
    // 20 gems -> 20 moves + 20 arcs
    expect(mockCtx.moveTo).toHaveBeenCalledTimes(20);
    expect(mockCtx.arc).toHaveBeenCalledTimes(20);

    // Verify colors were set
    // Note: implementation iteration order of keys is not guaranteed in JS,
    // but usually stable for strings inserted in order.
    // However, checking if fillStyle was set to both is safer.
    // Since mockCtx.fillStyle is a setter that does nothing in our mock unless we spy on it.
    // But we verified logic with fill calls.
  });

  it('should still use individual rendering for rare/fading gems', () => {
    const gems = [
      {
        x: 100,
        y: 100,
        radius: 5,
        color: '#ffff00',
        active: true,
        isRare: true, // Rare -> Complex path
        elapsedLifetime: 0,
      },
      {
        x: 150,
        y: 150,
        radius: 5,
        color: '#ff0000',
        active: true,
        isRare: false,
        elapsedLifetime: 9500, // Fading -> Complex path
      }
    ];

    mockPool.activeGems = gems;

    (renderer as any).drawGems(mockCtx, mockPool, true, mockBounds);

    // 2 complex gems -> 2 saves, 2 restores, 2 fills
    expect(mockCtx.save).toHaveBeenCalledTimes(2);
    expect(mockCtx.fill).toHaveBeenCalledTimes(2);
  });
});
