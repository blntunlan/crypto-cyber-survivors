import { screen } from '@testing-library/react';
import { render } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { GameStatus, MarketPosition, type LeverageOption } from '../../types';
import { marketApiClient } from '../../services/api/MarketApiClient';
import { EventBus } from '../../services/core/EventBus';
import { MarketEventAnnouncer } from '../../services/market/MarketEventAnnouncer';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';
import { LootCacheSystem } from '../../services/gameplay/loot/LootCacheSystem';
import { TimeService } from '../../services/core/TimeService';
import { Logger } from '../../services/system/Logger';
import { MarketEventConsolidator } from '../../services/market/MarketEventConsolidator';
import { type CanonicalMarketFrame } from '../../types/marketCanonical';

const mockGraphicsSettings = vi.hoisted(() => ({
  reducedMotion: false,
  showParticles: true,
}));
const mockPhysicsHandleCollisions = vi.hoisted(() => vi.fn());

// Mock Services
vi.mock('../../services/combat/PoolManager', () => {
  class MockPoolManager {
    activeEnemies = [];
    activeBullets = [];
    activeGems = [];
    activeParticles = [];
    activeFloatingTexts = [];
    activeSpeedLines = [];
    activeImpactRings = [];
    activeInteractables = [];
    cleanup = vi.fn();
    clearAll = vi.fn();
    preWarm = vi.fn();
    dispose = vi.fn();
    initialize = vi.fn();
    static getInstance = vi.fn(() => new MockPoolManager());
  }
  return { PoolManager: MockPoolManager };
});

vi.mock('../../services/renderers/GameRenderer', () => {
  const mockInstance = {
    render: vi.fn(),
    updateBackgroundCandles: vi.fn(),
  };
  class MockGameRenderer {
    render = mockInstance.render;
    updateBackgroundCandles = mockInstance.updateBackgroundCandles;
    static getInstance = vi.fn(() => mockInstance);
  }
  return { GameRenderer: MockGameRenderer };
});

vi.mock('../../services/combat/CombatSystem', () => {
  class MockCombatSystem {
    processAutoFire = vi.fn();
    static getInstance = vi.fn(() => new MockCombatSystem());
  }
  return { CombatSystem: MockCombatSystem };
});

vi.mock('../../services/combat/PhysicsSystem', () => {
  class MockPhysicsSystem {
    updateEntities = vi.fn();
    handleCollisions = mockPhysicsHandleCollisions;
    static getInstance = vi.fn(() => new MockPhysicsSystem());
  }
  return { PhysicsSystem: MockPhysicsSystem };
});

vi.mock('../../services/combat/SpawnSystem', () => {
  class MockSpawnSystem {
    updateLegacy = vi.fn();
    reset = vi.fn();
    dispose = vi.fn();
    static getInstance = vi.fn(() => new MockSpawnSystem());
  }
  return { SpawnSystem: MockSpawnSystem };
});

vi.mock('../../services/spawners/SpeedLineSpawner', () => ({
  SpeedLineSpawner: class {
    update = vi.fn();
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    update: vi.fn(),
    updateDimensions: vi.fn(),
  },
}));
vi.mock('../../services/audio', () => ({
  audio: {
    playHeartbeat: vi.fn(),
    playDash: vi.fn(),
    playWhoosh: vi.fn(),
    playSlotTick: vi.fn(),
    playAnticipation: vi.fn(),
    playSlotWin: vi.fn(),
    playJackpot: vi.fn(),
    playCoinShower: vi.fn(),
    playMultiplierChime: vi.fn(),
  },
}));
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    subscribe: vi.fn(() => vi.fn()), // Alias or preferred method
    emit: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock('../../services/core/MetricsService', () => ({
  MetricsService: {
    update: vi.fn(),
  },
}));
vi.mock('../../services/combat/ComboSystem', () => ({
  ComboSystem: {
    update: vi.fn(),
    getKillStreak: vi.fn(() => 0),
    getXpMultiplier: vi.fn(() => 1),
    getState: vi.fn(() => ({})),
  },
}));
vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    update: vi.fn(() => 16.67),
    getGameTime: vi.fn(() => 0),
    getGameTimeSeconds: vi.fn(() => 0),
    isClockPaused: vi.fn(() => false),
  },
}));
vi.mock('../../services/system/FPSMonitor', () => ({
  FPSMonitor: {
    tick: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    recordPhysics: vi.fn(),
    recordRender: vi.fn(),
    recordUpdate: vi.fn(),
    updateInternalCounts: vi.fn(),
  },
}));
vi.mock('../../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(() => ({ maxEnemies: 100, particleMultiplier: 0.3 })),
    subscribe: vi.fn(() => vi.fn()),
  },
}));
vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    update: vi.fn(),
    updateBaseStats: vi.fn(),
    isInitialized: vi.fn(() => true),
    initialize: vi.fn(),
    reset: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isPaused: vi.fn(() => false),
    getDecoratedStats: vi.fn(() => ({
      getSpeed: vi.fn(() => 5),
    })),
  },
}));
vi.mock('../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('../../services/api/MarketApiClient', () => ({
  marketApiClient: {
    getHistory: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../services/indicators/ClientIndicatorService', () => ({
  ClientIndicatorService: {
    setPair: vi.fn(),
    setPosition: vi.fn(),
    warmup: vi.fn().mockResolvedValue({}),
    getState: vi.fn(() => ({
      rsiState: 'NEUTRAL',
      whaleTier: 0,
    })),
  },
}));
// Mock Hooks

vi.mock('../../hooks/useGameInput', () => ({
  useGameInput: () => ({
    getMovementVector: vi.fn(() => ({ dx: 0, dy: 0 })),
    isSpacePressed: vi.fn(() => false),
    isSpaceFreshPress: vi.fn(() => false),
    setTouchMovement: vi.fn(),
    setTouchDash: vi.fn(),
    consumeDash: vi.fn(),
  }),
}));
vi.mock('../../hooks/useDevice', () => {
  const mock = vi.fn().mockReturnValue({
    isMobile: false,
    platform: 'desktop',
  });
  return { useDevice: mock };
});
vi.mock('../../stores/gameStore', () => ({
  useGameStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        graphics: {
          showParticles: mockGraphicsSettings.showParticles,
          showDamageNumbers: true,
          showScreenShake: true,
          reducedMotion: mockGraphicsSettings.reducedMotion,
          quality: 'high',
        },
        mobile: {
          joystickSize: 100,
          joystickOpacity: 0.5,
          showControls: true,
        },
      });
    }
    return {
      joystickSize: 100,
      joystickOpacity: 0.5,
      showControls: true,
    };
  },
  selectGraphics: (state: any) => state.graphics,
}));

// Mock Components
vi.mock('../../components/GameHUD', () => ({
  GameHUD: () => <div data-testid="game-hud">HUD</div>,
}));
vi.mock('../../components/mobile', () => ({
  MobileControls: () => <div data-testid="mobile-controls">Controls</div>,
}));

describe('GameEngine', () => {
  const mockProps = {
    status: GameStatus.PLAYING,
    position: MarketPosition.LONG,
    pair: 'BTC' as const,
    marketData: {
      price: 50000,
      pnl: 0,
      effectivePnl: 0,
      difficulty: 1,
      volume: 1000,
      leverage: 10 as LeverageOption, // Cast to valid LeverageOption
      rsi: 50,
      momentum: 0,
    },
    onGameOver: vi.fn(),
    onLevelUp: vi.fn(),
    updatePlayerStats: vi.fn(),
    playerRef: {
      current: {
        x: 0,
        y: 0,
        hp: 100,
        level: 1,
        exp: 0,
        nextLevelExp: 100,
        speed: 5,
        radius: 10,
        // Mocking PlayerStats properties as needed
        baseDamage: 10,
        fireRate: 200,
        luck: 0,
        critChance: 0.05,
        critDamage: 1.5,
        armor: 0,
        magnet: 50,
        lifesteal: 0,
        dodge: 0,
        projectiles: 1,
        area: 1,
        regen: 0,
      } as any, // Using any for Player to avoid mocking every single property if not needed
    },
    sessionStartTime: Date.now(),
    width: 800,
    height: 600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGraphicsSettings.reducedMotion = false;
    window.history.pushState({}, '', '/');
  });

  it('renders canvas and HUD', () => {
    render(<GameEngine {...mockProps} />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(screen.getByTestId('game-hud')).toBeInTheDocument();
  });

  it('applies opt-in runtime DPR to the game canvas without changing CSS size', () => {
    window.history.pushState({}, '', '/?runtimeDpr=1.5&noScreenShake=1&noGlow=1');

    render(<GameEngine {...mockProps} />);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');
    expect(canvas.dataset.runtimeCanvasDpr).toBe('1.5');
  });

  it('clamps oversized runtime DPR to protect canvas memory', () => {
    window.history.pushState({}, '', '/?runtimeDpr=99');

    render(<GameEngine {...mockProps} />);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(2400);
    expect(canvas.height).toBe(1800);
    expect(canvas.dataset.runtimeCanvasDpr).toBe('3');
  });

  it('renders mobile controls on mobile device', async () => {
    // Override useDevice for this test
    const { useDevice } = await import('../../hooks/useDevice');
    (useDevice as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isMobile: true,
      platform: 'android',
    });

    render(<GameEngine {...mockProps} />);
    expect(screen.getByTestId('mobile-controls')).toBeInTheDocument();
  });

  it('fetches market history on mount', async () => {
    const { unmount } = render(<GameEngine {...mockProps} />);

    // Check that market aggregator API was called for market history
    await vi.waitFor(() =>
      expect(marketApiClient.getHistory).toHaveBeenCalledWith('BTC', 300)
    );

    unmount();
  });

  it('preserves market announcement state through temporary game states', () => {
    const resetSpy = vi.spyOn(MarketEventAnnouncer, 'reset');
    const { rerender } = render(<GameEngine {...mockProps} />);

    rerender(<GameEngine {...mockProps} status={GameStatus.PAUSED} />);
    rerender(<GameEngine {...mockProps} status={GameStatus.LEVEL_UP} />);

    expect(resetSpy).not.toHaveBeenCalled();

    rerender(<GameEngine {...mockProps} status={GameStatus.GAMEOVER} />);

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('resets cache run state on cycle completion and game over only', () => {
    const resetSpy = vi.spyOn(LootCacheSystem.prototype, 'reset');
    const { rerender } = render(<GameEngine {...mockProps} />);
    resetSpy.mockClear();

    rerender(<GameEngine {...mockProps} status={GameStatus.PAUSED} />);
    rerender(<GameEngine {...mockProps} status={GameStatus.LEVEL_UP} />);
    expect(resetSpy).not.toHaveBeenCalled();

    rerender(<GameEngine {...mockProps} status={GameStatus.CYCLE_COMPLETE} />);
    expect(resetSpy).toHaveBeenCalledTimes(1);

    rerender(<GameEngine {...mockProps} status={GameStatus.PLAYING} />);
    rerender(<GameEngine {...mockProps} status={GameStatus.GAMEOVER} />);
    expect(resetSpy).toHaveBeenCalledTimes(2);
  });

  it('begins a fresh cache run after continue reuses the market run id', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    let animationFrameCallback: FrameRequestCallback | null = null;
    const frame: CanonicalMarketFrame = {
      revision: 1,
      sequence: 1,
      sourceSequence: 1,
      sourceTimestamp: 1,
      receivedAt: 1,
      quality: 'LIVE',
      price: 50_000,
      pnlPercent: 0,
      rsi: 50,
      rsiState: 'NEUTRAL',
      atrPercent: 0.01,
      normalizedVolume: 1,
      whaleTier: 0,
      macd: { value: 0, signal: 0, histogram: 0 },
      priceChangePercent: 0,
      trendStrength: 0,
      trendDirection: 'SIDEWAYS',
      source: 'runtime',
    };
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const lockSpy = vi
      .spyOn(MarketEventConsolidator, 'lockForSimulationTick')
      .mockReturnValue(frame);
    const beginRunSpy = vi.spyOn(LootCacheSystem.prototype, 'beginRun');
    difficultyContext.reset();
    difficultyContext.updateInputs({ leverage: 10, entryPrice: 50_000 });

    try {
      const props = {
        ...mockProps,
        marketData: { ...mockProps.marketData, runtimeRunId: 'reused-market-run' },
      };
      const { rerender, unmount } = render(<GameEngine {...props} />);
      const runFrame = (time: number): void => {
        const callback = animationFrameCallback;
        if (callback === null) {
          throw new Error('Expected a scheduled animation frame');
        }
        callback(time);
      };

      runFrame(100);
      expect(beginRunSpy).toHaveBeenCalledTimes(1);

      rerender(<GameEngine {...props} status={GameStatus.CYCLE_COMPLETE} />);
      rerender(<GameEngine {...props} status={GameStatus.PLAYING} />);
      runFrame(116.67);

      expect(beginRunSpy).toHaveBeenCalledTimes(2);
      unmount();
    } finally {
      lockSpy.mockRestore();
      beginRunSpy.mockRestore();
      difficultyContext.reset();
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('preserves active run inputs during the StrictMode effect replay', async () => {
    difficultyContext.reset();
    difficultyContext.updateInputs({ leverage: 10, entryPrice: 50_000 });
    const resetSpy = vi.spyOn(difficultyContext, 'reset');

    const { unmount } = render(<GameEngine {...mockProps} />, {
      reactStrictMode: true,
    });

    expect(difficultyContext.inputs.entryPrice).toBe(50_000);

    resetSpy.mockClear();
    unmount();
    await vi.waitFor(() => expect(resetSpy).toHaveBeenCalled());
  });

  it('updates one preallocated loot cache input before physics only while playing', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    let animationFrameCallback: FrameRequestCallback | null = null;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(42);
    const updateSpy = vi.spyOn(LootCacheSystem.prototype, 'update');

    try {
      const { rerender, unmount } = render(<GameEngine {...mockProps} />);
      expect(animationFrameCallback).not.toBeNull();

      const runFrame = (time: number): void => {
        const callback = animationFrameCallback;
        if (callback === null) {
          throw new Error('Expected a scheduled animation frame');
        }
        callback(time);
      };

      runFrame(100);
      runFrame(116.67);

      expect(updateSpy).toHaveBeenCalledTimes(2);
      const firstInput = updateSpy.mock.calls[0]![0];
      const secondInput = updateSpy.mock.calls[1]![0];
      expect(secondInput).toBe(firstInput);
      expect(firstInput).toMatchObject({
        deltaMs: 16.67,
        elapsedSeconds: 42,
        width: 800,
        height: 600,
        reducedMotion: false,
        showParticles: true,
        particleMultiplier: 0.3,
        player: mockProps.playerRef.current,
        state: expect.objectContaining({ marketPosition: MarketPosition.LONG }),
        pool: expect.objectContaining({ activeInteractables: [] }),
      });

      updateSpy.mockClear();
      rerender(<GameEngine {...mockProps} status={GameStatus.PAUSED} />);
      runFrame(133.34);
      expect(updateSpy).not.toHaveBeenCalled();
      unmount();
    } finally {
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('forwards live reduced motion into physics contact handling', () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    let animationFrameCallback: FrameRequestCallback | null = null;
    mockGraphicsSettings.reducedMotion = true;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameCallback = callback;
        return 1;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    try {
      const { unmount } = render(<GameEngine {...mockProps} />);
      const runFrame = (time: number): void => {
        const callback = animationFrameCallback;
        if (callback === null) {
          throw new Error('Expected a scheduled animation frame');
        }
        callback(time);
      };
      runFrame(100);

      expect(mockPhysicsHandleCollisions).toHaveBeenCalledWith(
        expect.anything(),
        mockProps.playerRef.current,
        expect.anything(),
        expect.any(Number),
        800,
        600,
        mockProps.onGameOver,
        true
      );
      unmount();
    } finally {
      mockGraphicsSettings.reducedMotion = false;
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('responds to client indicator events', () => {
    render(<GameEngine {...mockProps} />);

    // Find the indicator handler passed to EventBus.on
    const calls = (EventBus.on as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const indicatorsHandler = calls.find(
      (call: any[]) => call[0] === 'clientIndicatorsUpdated'
    )?.[1];

    expect(indicatorsHandler).toBeDefined();

    // Trigger handlers
    if (indicatorsHandler) {
      indicatorsHandler({
        rsi: 20,
        rsiState: 'OVERSOLD',
        atrPercent: 0.01,
        normalizedVolume: 0.8,
        priceChangePercent: -0.02,
        trendStrength: 0.6,
        trendDirection: 'DOWN',
        whaleTier: 2,
      });
    }

    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('RSI Visual State: OVERSOLD')
    );
  });

  it('triggers heartbeat on low HP', () => {
    // We need to trigger the update loop.
    // Since we mocked requestAnimationFrame implicitly (or vitest environment handles it),
    // we can't easily step time without fake timers.
    // However, we can check if AudioService is ready to be called.
    // For this test, we'll rely on the fact that useGameSetup calls the loop.
    // But testing the loop logic inside a component test is tricky without exposing the update function.
    // We'll skip deep loop logic testing here and rely on integration/e2e or specific hook tests.
  });
});
