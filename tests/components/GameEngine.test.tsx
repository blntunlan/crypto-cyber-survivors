import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { GameStatus, MarketPosition, type LeverageOption } from '../../types';

// Mock Services
vi.mock('../../services/PoolManager', () => ({
  PoolManager: class {
    activeEnemies = [];
    cleanup = vi.fn();
    preWarm = vi.fn();
    initialize = vi.fn();
  },
}));

vi.mock('../../services/GameRenderer', () => ({
  GameRenderer: class {
    render = vi.fn();
    updateBackgroundCandles = vi.fn();
  },
}));

vi.mock('../../services/CombatSystem', () => ({
  CombatSystem: class {
    processAutoFire = vi.fn();
  },
}));

vi.mock('../../services/PhysicsSystem', () => ({
  PhysicsSystem: class {
    updateEntities = vi.fn();
    handleCollisions = vi.fn();
  },
}));

vi.mock('../../services/SpawnSystem', () => ({
  SpawnSystem: class {
    update = vi.fn();
  },
}));

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
vi.mock('../../services/AudioService', () => ({
  audio: {
    playHeartbeat: vi.fn(),
    playDash: vi.fn(),
    playWhoosh: vi.fn(),
  },
}));
vi.mock('../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    subscribe: vi.fn(() => vi.fn()), // Alias or preferred method
    emit: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock('../../services/MetricsService', () => ({
  MetricsService: {
    update: vi.fn(),
  },
}));
vi.mock('../../services/DifficultyManager', () => ({
  DifficultyManager: {
    getWaveMultiplier: vi.fn(() => 1),
    updateWaveTimer: vi.fn(),
    getWavePhase: vi.fn(() => 'calm'),
  },
}));
vi.mock('../../services/ComboSystem', () => ({
  ComboSystem: {
    update: vi.fn(),
  },
}));
vi.mock('../../services/TimeService', () => ({
  TimeService: {
    update: vi.fn(() => 16.67),
  },
}));
vi.mock('../../services/FPSMonitor', () => ({
  FPSMonitor: {
    tick: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));
vi.mock('../../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(() => ({ maxEnemies: 100 })),
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
vi.mock('../../services/MarketStateService', () => ({
  MarketStateService: {
    init: vi.fn().mockResolvedValue({}),
    cleanup: vi.fn(),
  },
}));
vi.mock('../../services/EngineRegistry', () => ({
  EngineRegistry: {
    setPoolManager: vi.fn(),
    setCombatSystem: vi.fn(),
    setPhysicsSystem: vi.fn(),
    setSpawnSystem: vi.fn(),
    setAudioService: vi.fn(),
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
vi.mock('../../hooks/useDevice', () => ({
  useDevice: () => ({
    isMobile: false, // Default to desktop for most tests
    platform: 'desktop',
  }),
}));
vi.mock('../../stores/gameStore', () => ({
  useGameStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
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
  });

  it('renders canvas and HUD', () => {
    render(<GameEngine {...mockProps} />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(screen.getByTestId('game-hud')).toBeInTheDocument();
  });

  it('does not render mobile controls on desktop', () => {
    render(<GameEngine {...mockProps} />);
    expect(screen.queryByTestId('mobile-controls')).not.toBeInTheDocument();
  });
});
