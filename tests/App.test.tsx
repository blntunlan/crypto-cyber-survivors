import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock Services
vi.mock('../services/AudioService', () => ({
  audio: {
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(),
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
  },
}));

vi.mock('../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../services/MetricsService', () => ({
  MetricsService: {
    trackLevelUp: vi.fn(),
    endSession: vi.fn(),
  },
}));

vi.mock('../services/CoinService', () => ({
  CoinService: {
    resetSession: vi.fn(),
    calculateCycleReward: vi.fn(),
    creditCoins: vi.fn(),
  },
}));

vi.mock('../services/GameStateManager', () => ({
  GameStateManager: {
    resetAll: vi.fn(),
    initializeNewGame: vi.fn(),
  },
}));

vi.mock('../services/MilestoneService', () => ({
  MilestoneService: {
    startSession: vi.fn(),
  },
}));

vi.mock('../services/DifficultyManager', () => ({
  DifficultyManager: {
    getTotalElapsedSeconds: vi.fn(() => 0),
  },
}));

vi.mock('../services/GameStateMachine', () => ({
  GameStateMachine: {
    transition: vi.fn(),
    forceState: vi.fn(),
  },
}));

vi.mock('../services/ImagePreloader', () => ({
  ImagePreloader: {
    preloadAll: vi.fn(),
  },
}));

vi.mock('../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(() => 'TestUser'),
    getPlayerId: vi.fn(() => 'test-player-id'),
  },
}));

// Mock Hooks
vi.mock('../hooks/useDevice', () => ({
  useDevice: () => ({ isMobile: false }),
}));

vi.mock('../hooks/useWindowDimensions', () => ({
  useWindowDimensions: () => ({ width: 1000, height: 800 }),
}));

vi.mock('../hooks/useGameStatus', () => ({
  useGameStatus: () => ({ gameStatus: 'MENU', handlePauseToggle: vi.fn() }),
}));

vi.mock('../hooks/useRunStats', () => ({
  useRunStats: () => ({
    runStats: { totalKills: 0 },
    resetRunStats: vi.fn(),
  }),
}));

vi.mock('../hooks/useSessionTiming', () => ({
  useSessionTiming: () => ({ sessionStartTime: 0 }),
}));

vi.mock('../hooks/useCloudflareSession', () => ({
  useCloudflareSession: () => ({
    isEnabled: false,
    sessionId: null,
    lastValidation: null,
    validateSession: vi.fn(),
  }),
}));

vi.mock('../hooks/useCheatManager', () => ({
  useCheatManager: vi.fn(),
}));

vi.mock('../hooks/useAppInitialization', () => ({
  useAppInitialization: () => ({
    needsNickname: false,
    setNeedsNickname: vi.fn(),
  }),
}));

vi.mock('../hooks/useBeforeUnload', () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock('../hooks/useDevShortcuts', () => ({
  useDevShortcuts: () => ({
    showAnalytics: false,
    showAdminDashboard: false,
    closeAnalytics: vi.fn(),
    closeAdminDashboard: vi.fn(),
  }),
}));

vi.mock('../hooks/useMarketTimeout', () => ({
  useMarketTimeout: vi.fn(),
}));

vi.mock('../hooks/useMarketData', () => ({
  useMarketData: () => ({
    marketData: {
      price: 50000,
      pnl: 0,
      effectivePnl: 0,
      difficulty: 1,
    },
  }),
}));

vi.mock('../hooks/usePlayerState', () => ({
  usePlayerState: () => ({
    playerRef: { current: { level: 1, exp: 0 } },
    uiStats: { level: 1, hp: 100 },
    setUiStats: vi.fn(),
    resetPlayer: vi.fn(),
    healFull: vi.fn(),
    setPositionColor: vi.fn(),
  }),
}));

// Mock Lazy Components
vi.mock('../components/screens/NicknameEntryScreen', () => ({
  NicknameEntryScreen: () => <div>NicknameEntryScreen</div>,
}));

vi.mock('../components/GameEngine', () => ({
  GameEngine: () => <div>GameEngine</div>,
}));

vi.mock('../components/GameUI', () => ({
  GameUI: () => <div>GameUI</div>,
}));

vi.mock('../components/hub', () => ({
  HubMenu: () => <div>HubMenu</div>,
}));

vi.mock('../components/screens/MainMenu', () => ({
  MainMenu: () => <div>MainMenu</div>,
}));

vi.mock('../components/screens/PauseMenu', () => ({
  PauseMenu: () => <div>PauseMenu</div>,
}));

vi.mock('../components/screens/GameOverScreen', () => ({
  GameOverScreen: () => <div>GameOverScreen</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows HubMenu initially', async () => {
    // We need to use 'render' from testing-library, NOT custom render because App has its own Providers
    render(<App />);

    // Fallback might show up first
    await waitFor(() => {
      expect(screen.queryByText(/LOADING ENGINE/i)).not.toBeInTheDocument();
    });

    // Should show HubMenu since status is MENU and not needsNickname
    expect(screen.getByText('HubMenu')).toBeInTheDocument();
  });
});
