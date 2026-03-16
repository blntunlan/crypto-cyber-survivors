import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock Services
vi.mock('../services/audio', () => ({
  audio: {
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(),
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
  },
}));

vi.mock('../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../services/core/MetricsService', () => ({
  MetricsService: {
    trackLevelUp: vi.fn(),
    endSession: vi.fn(),
  },
}));

vi.mock('../services/gameplay/CoinService', () => ({
  CoinService: {
    resetSession: vi.fn(),
    calculateCycleReward: vi.fn(),
    creditCoins: vi.fn(),
    setProvider: vi.fn(),
  },
}));

vi.mock('../services/core/GameStateManager', () => ({
  GameStateManager: {
    resetAll: vi.fn(),
    initializeNewGame: vi.fn(),
  },
}));

vi.mock('../services/gameplay/MilestoneService', () => ({
  MilestoneService: {
    startSession: vi.fn(),
  },
}));

vi.mock('../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    getTotalElapsedSeconds: vi.fn(() => 0),
  },
}));

vi.mock('../services/core/GameStateMachine', () => ({
  GameStateMachine: {
    transition: vi.fn(),
    forceState: vi.fn(),
  },
}));

vi.mock('../services/system/ImagePreloader', () => ({
  ImagePreloader: {
    preloadAll: vi.fn(),
  },
}));

vi.mock('../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    onError: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(() => 'TestUser'),
    getProfileId: vi.fn(() => 'test-profile-id'),
  },
}));

vi.mock('../services/gameplay/WalletService', () => ({
  WalletService: {
    getInstance: vi.fn(() => ({
      getBalance: vi.fn().mockResolvedValue(100),
    })),
  },
}));

// Mock Hooks
vi.mock('../hooks/useDevice', () => ({
  useDevice: () => ({ isMobile: false }),
}));

vi.mock('../hooks/useWindowDimensions', () => ({
  useWindowDimensions: () => ({
    width: 1000,
    height: 800,
    hudInsets: { top: 100, bottom: 80, left: 0, right: 0 },
  }),
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
    isInitialized: true,
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

vi.mock('../hooks/useTutorial', () => ({
  useTutorial: () => ({
    showTutorial: false,
    currentStep: { id: 'test' },
    nextStep: vi.fn(),
    skipTutorial: vi.fn(),
    completeTutorial: vi.fn(),
    startTutorial: vi.fn(),
    resetTutorial: vi.fn(),
  }),
}));

vi.mock('../hooks/usePauseBudget', () => ({
  usePauseBudget: () => ({
    pauseBudget: 100,
    isOutOfPauseBudget: false,
    consumePauseBudget: vi.fn(),
  }),
}));

vi.mock('../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

vi.mock('../contexts/useTheme', () => ({
  useTheme: () => ({
    isRetro: false,
    theme: { name: 'cyberpunk' },
    toggleTheme: vi.fn(),
  }),
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

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    authStage: 'COMPLETE', // Default to COMPLETE for this test to reach HubMenu
    setStage: vi.fn(),
  })),
}));

// Mock Lazy Components
vi.mock('../components/screens/NicknameEntryScreen', () => ({
  NicknameEntryScreen: () => <div>NicknameEntryScreen</div>,
}));

vi.mock('../components/GameEngine', () => ({
  __esModule: true,
  GameEngine: () => <div>GameEngine</div>,
  default: () => <div>GameEngine</div>,
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

vi.mock('../components/screens/LandingPage', () => ({
  LandingPage: ({ onLaunch }: { onLaunch: () => void }) => (
    <div>
      <h1>HIGH STAKES</h1>
      <button onClick={onLaunch}>EXECUTE ENGINE</button>
    </div>
  ),
}));

// Mock SEO component to avoid <html> nesting issues
vi.mock('../components/SEO', () => ({
  SEO: () => null,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('exports root app component', () => {
    expect(App).toBeDefined();
  });

  it('renders without crashing and shows LandingPage initially', async () => {
    render(<App />);

    // Should show LandingPage initially
    expect(await screen.findByText(/HIGH STAKES/i)).toBeInTheDocument();

    const launchBtn = screen.getByText(/EXECUTE ENGINE/i);
    fireEvent.click(launchBtn);

    // Should show HubMenu since status is MENU and not needsNickname
    await waitFor(() => {
      expect(screen.getByText('HubMenu')).toBeInTheDocument();
    });
  });

  it('restores last menu screen from sessionStorage on refresh', async () => {
    localStorage.setItem('has_seen_landing', 'true');
    sessionStorage.setItem('ui_hub_screen', 'play');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('MainMenu')).toBeInTheDocument();
    });
  });
});
