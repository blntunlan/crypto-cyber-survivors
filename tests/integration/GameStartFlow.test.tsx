import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../App';
import { GameSessionService } from '../../services/auth/GameSessionService';
import { GameProvider } from '../../contexts/GameContext';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock Language Context to bypass fetch and async loading
vi.mock('../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SUPPORTED_LANGUAGES: ['en', 'tr', 'hi', 'vi', 'es', 'pt', 'zh', 'ru'],
  useLanguage: () => ({
    t: (key: string) => {
      // Simple mock translation
      if (key === 'common.menu.title') return 'CRYPTO';
      if (key === 'common.menu.subtitle') return 'SURVIVORS';
      if (key === 'hub.play') return 'PLAY';
      if (key === 'common.long') return 'LONG';
      return key;
    },
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

// Mock dependencies
vi.mock('../../services/audio', () => ({
  audio: {
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
    playSelectionTick: vi.fn(),
    playPairSelect: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/auth/GameSessionService', () => ({
  GameSessionService: {
    startSession: vi.fn(),
    submitSession: vi.fn(),
    getCurrentSessionId: vi.fn(),
    getPlayerId: vi.fn().mockReturnValue('test-player-id'),
  },
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn().mockReturnValue('TestUser'),
    getProfileId: vi.fn().mockReturnValue('test-profile-id'),
    register: vi.fn(),
  },
}));

// Mock UserPersistenceService to handle initialization
vi.mock('../../services/auth/UserPersistenceService', () => ({
  UserPersistenceService: {
    initialize: vi
      .fn()
      .mockResolvedValue({ nickname: 'TestUser', playerId: 'test-player-id' }),
    getStoredUser: vi
      .fn()
      .mockReturnValue({ nickname: 'TestUser', playerId: 'test-player-id' }),
    saveUser: vi.fn(),
  },
}));

// Mock hooks
vi.mock('../../hooks/useMarketData', () => ({
  useMarketData: () => ({
    marketData: {
      price: 50000,
      pnl: 0,
      effectivePnl: 0,
      difficulty: 1,
      momentum: 0,
    },
  }),
}));

vi.mock('../../services/market/MarketStateService', () => ({
  MarketStateService: {
    init: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
  },
}));

// Mock simple components to avoid canvas issues
vi.mock('../../components/GameEngine', () => ({
  GameEngine: () => <div data-testid="game-engine">Game Engine Running</div>,
}));

vi.mock('../../components/GameUI', () => ({
  GameUI: () => <div data-testid="game-ui">Game UI Running</div>,
}));

describe('Game Entry Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to gameplay when Long button is clicked', async () => {
    // Mock successful session start
    vi.mocked(GameSessionService.startSession).mockResolvedValue({
      sessionId: 'test-session',
      startTime: new Date().toISOString(),
      sessionSecret: 'secret',
    });

    await act(async () => {
      render(
        <LanguageProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </LanguageProvider>
      );
    });

    // Current state should be Hub Menu - WAIT for it to load
    await waitFor(() => {
      expect(screen.getByText('CRYPTO')).toBeInTheDocument();
    });
    expect(screen.getByText('SURVIVORS')).toBeInTheDocument();

    // Find and click Play button in Hub
    // Button text is "PLAY"
    const playButton = screen.getByText('PLAY');
    await act(async () => {
      fireEvent.click(playButton);
    });

    // Current state should be Main Menu
    // Check for LONG button which indicates we are in Main Menu
    const longButton = await screen.findByText('LONG');
    expect(longButton.closest('button')).toBeEnabled();

    await act(async () => {
      fireEvent.click(longButton.closest('button')!);
    });

    // Wait for transition
    await waitFor(() => {
      expect(GameSessionService.startSession).toHaveBeenCalled();
    });

    // Should see Game Engine or Game UI
    expect(await screen.findByTestId('game-engine')).toBeInTheDocument();
  });
});
