import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

const {
  transitionMock,
  forceStateMock,
  useGameStatusMock,
  usePauseBudgetMock,
  autoResumeCallbackRef,
  loadReplayFromServerMock,
  resetReplayPlayerMock,
} = vi.hoisted(() => ({
  transitionMock: vi.fn(),
  forceStateMock: vi.fn(),
  useGameStatusMock: vi.fn(() => ({
    gameStatus: 'MENU',
    handlePauseToggle: vi.fn(),
  })),
  usePauseBudgetMock: vi.fn((_mode, _status, onAutoResume?: () => void) => {
    autoResumeCallbackRef.current = onAutoResume ?? null;
    return {
      pauseBudget: 100,
      isOutOfPauseBudget: false,
      consumePauseBudget: vi.fn(),
      remainingSeconds: 30,
      maxSeconds: 30,
    };
  }),
  autoResumeCallbackRef: {
    current: null as null | (() => void),
  },
  loadReplayFromServerMock: vi.fn(),
  resetReplayPlayerMock: vi.fn(),
}));

// Mock Services
vi.mock('../services/audio', () => ({
  audio: {
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setCategoryVolume: vi.fn(),
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(),
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
  },
  applyAudioSettings: vi.fn(),
}));

vi.mock('../services/audio/AudioService', () => ({
  audio: {
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setCategoryVolume: vi.fn(),
    getMuted: vi.fn(() => false),
    toggleMute: vi.fn(),
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
    playSelectionTick: vi.fn(),
  },
}));

vi.mock('../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    subscribe: vi.fn(() => vi.fn()),
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
    creditVerifiedCoins: vi.fn(),
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
    transition: transitionMock,
    forceState: forceStateMock,
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

vi.mock('../services/replay/ReplayPlayerService', () => ({
  ReplayPlayerService: {
    loadReplayFromServer: loadReplayFromServerMock,
    reset: resetReplayPlayerMock,
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
  useGameStatus: useGameStatusMock,
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
    showVfxLab: false,
    closeAnalytics: vi.fn(),
    closeAdminDashboard: vi.fn(),
    closeVfxLab: vi.fn(),
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
  usePauseBudget: usePauseBudgetMock,
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

vi.mock('../components/LazyMotionProvider', () => ({
  LazyMotionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/GameUI', () => ({
  GameUI: () => <div>GameUI</div>,
}));

vi.mock('../components/GameAppShell', () => ({
  GameAppShell: ({
    gameStatus,
    hubScreen,
    showSettings,
    setShowSettings,
    onOpenReplays,
  }: {
    gameStatus: string;
    hubScreen: string;
    showSettings: boolean;
    setShowSettings: (showSettings: boolean) => void;
    onOpenReplays: () => void;
  }) => {
    usePauseBudgetMock('COMPETITIVE', gameStatus, () => {
      setShowSettings(false);
      transitionMock('PLAYING');
    });

    return (
      <div>
        <button onClick={onOpenReplays}>Open Replays</button>
        {gameStatus === 'PAUSED' ? (
          <button onClick={() => setShowSettings(true)}>Open Settings</button>
        ) : hubScreen === 'play' ? (
          'MainMenu'
        ) : (
          'HubMenu'
        )}
        {showSettings && <div>SettingsPanel</div>}
      </div>
    );
  },
}));

vi.mock('../components/hub', () => ({
  HubMenu: () => <div>HubMenu</div>,
}));

vi.mock('../components/hub/HubMenu', () => ({
  HubMenu: () => <div>HubMenu</div>,
}));

vi.mock('../components/hub/HubMenuV2', () => ({
  HubMenuV2: () => <div>HubMenuV2</div>,
}));

vi.mock('../components/screens/MainMenu', () => ({
  MainMenu: () => <div>MainMenu</div>,
}));

vi.mock('../components/screens/PauseMenu', () => ({
  PauseMenu: ({ onOpenSettings }: { onOpenSettings: () => void }) => (
    <div>
      <div>PauseMenu</div>
      <button onClick={onOpenSettings}>Open Settings</button>
    </div>
  ),
}));

vi.mock('../components/settings/SettingsPanel', () => ({
  SettingsPanel: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div>SettingsPanel</div>
      <button onClick={onClose}>Close Settings</button>
    </div>
  ),
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

vi.mock('../components/screens/ReplayListScreen', () => ({
  ReplayListScreen: ({
    onBack,
    onWatch,
  }: {
    onBack: () => void;
    onWatch: (replayId: string) => void;
  }) => (
    <div>
      <div>ReplayListScreen</div>
      <button onClick={() => onWatch('replay-1')}>Watch Replay</button>
      <button onClick={onBack}>Back Replays</button>
    </div>
  ),
}));

vi.mock('../components/screens/ReplayPlaybackScreen', () => ({
  ReplayPlaybackScreen: ({ onExit }: { onExit: () => void }) => (
    <div>
      <div>ReplayPlaybackScreen</div>
      <button onClick={onExit}>Exit Replay</button>
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
    autoResumeCallbackRef.current = null;
    loadReplayFromServerMock.mockResolvedValue(true);
    resetReplayPlayerMock.mockReturnValue(undefined);
    useGameStatusMock.mockReturnValue({
      gameStatus: 'MENU',
      handlePauseToggle: vi.fn(),
    });
  });

  it('exports root app component', () => {
    expect(App).toBeDefined();
  });

  it('renders without crashing and shows LandingPage initially', async () => {
    render(<App />);

    // Should show LandingPage initially
    expect(
      await screen.findByText(/HIGH STAKES/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

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

  it('closes settings before auto-resuming from pause budget depletion', async () => {
    localStorage.setItem('has_seen_landing', 'true');
    useGameStatusMock.mockReturnValue({
      gameStatus: 'PAUSED',
      handlePauseToggle: vi.fn(),
    });

    render(<App />);

    fireEvent.click(await screen.findByText('Open Settings'));
    expect(await screen.findByText('SettingsPanel')).toBeInTheDocument();

    act(() => {
      autoResumeCallbackRef.current?.();
    });

    await waitFor(() => {
      expect(screen.queryByText('SettingsPanel')).not.toBeInTheDocument();
    });
    expect(transitionMock).toHaveBeenCalledWith('PLAYING');
  });

  it('loads selected replay and opens playback screen', async () => {
    localStorage.setItem('has_seen_landing', 'true');

    render(<App />);

    fireEvent.click(await screen.findByText('Open Replays'));
    fireEvent.click(await screen.findByText('Watch Replay'));

    await waitFor(() => {
      expect(loadReplayFromServerMock).toHaveBeenCalledWith('replay-1');
    });
    expect(await screen.findByText('ReplayPlaybackScreen')).toBeInTheDocument();
  });
});
