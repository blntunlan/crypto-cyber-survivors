/**
 * GameUI.test.tsx - GameUI Component Tests
 *
 * Tests for the GameUI overlay component, including
 * the mobile pause button z-index stacking context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { GameUI } from '../../components/GameUI';
import { GameStatus, MarketPosition } from '../../types';

// Mock dependencies
vi.mock('../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => true),
  },
}));

vi.mock('../../stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    graphics: { showFPS: false },
  })),
}));

vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(() => false),
    getDecoratedStats: vi.fn(),
  },
}));

vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  },
}));

// Mock HUD sub-components to simplify testing
vi.mock('../../components/hud', () => ({
  WaveTimer: () => <div data-testid="wave-timer" />,
  FPSCounter: () => <div data-testid="fps-counter" />,
  ClutchAnnouncement: () => <div data-testid="clutch-announcement" />,
  LevelUpFlash: () => <div data-testid="level-up-flash" />,
  NearDeathGlow: () => <div data-testid="near-death-glow" />,
  EnemyPointers: () => <div data-testid="enemy-pointers" />,
  AchievementPopup: () => <div data-testid="achievement-popup" />,
  MilestoneAnnouncer: () => <div data-testid="milestone-announcer" />,
  ComboPanel: () => <div data-testid="combo-panel" />,
  KernelStatus: () => <div data-testid="kernel-status" />,
  LiveFeed: () => <div data-testid="live-feed" />,
  AccountHealthPremium: () => <div data-testid="account-health" />,
  BuffIndicator: () => <div data-testid="buff-indicator" />,
  LiquidationWarningOverlay: () => <div data-testid="liquidation-warning" />,
  CycleDecisionScreen: () => <div data-testid="cycle-decision-screen" />,
  LeaderboardPanel: () => <div data-testid="leaderboard-panel" />,
  MarketBanner: () => <div data-testid="market-banner" />,
}));

describe('GameUI', () => {
  const defaultProps = {
    position: MarketPosition.LONG,
    entryPrice: 50000,
    marketData: {
      price: 51000,
      pnl: 0.02,
      effectivePnl: 0.018,
      difficulty: 1,
      trend: 'bullish' as const,
      volatility: 0.3,
      volume24h: 1000000,
      spread: 10,
      liquidity: 500000,
      momentum: 0.1,
      volume: 1000000,
      leverage: 10 as const,
      rsi: 50,
    },
    player: {
      x: 400,
      y: 300,
      hp: 100,
      maxHp: 100,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
      baseDamage: 10,
      speed: 5,
      fireRate: 1,
      luck: 0,
      lifesteal: 0,
      critChance: 0.1,
      area: 1,
      armor: 0,
      regen: 0,
      dodge: 0,
      invulnerabilityTimer: 0,
      radius: 20,
      color: '#00FF00',
      critDamage: 1.5,
      projectiles: 1,
      magnet: 1,
    },
    status: GameStatus.PLAYING,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pause Button', () => {
    it('should render pause button when status is PLAYING and onTogglePause is provided', () => {
      const onTogglePause = vi.fn();

      render(<GameUI {...defaultProps} onTogglePause={onTogglePause} />);

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should NOT render pause button when onTogglePause is not provided', () => {
      render(<GameUI {...defaultProps} />);

      const pauseButton = screen.queryByRole('button', { name: /pause game/i });
      expect(pauseButton).not.toBeInTheDocument();
    });

    it('should NOT render pause button when status is not PLAYING', () => {
      const onTogglePause = vi.fn();

      render(
        <GameUI
          {...defaultProps}
          status={GameStatus.PAUSED}
          onTogglePause={onTogglePause}
        />
      );

      const pauseButton = screen.queryByRole('button', { name: /pause game/i });
      expect(pauseButton).not.toBeInTheDocument();
    });

    it('should call onTogglePause when pause button is pressed (pointerDown)', () => {
      const onTogglePause = vi.fn();
      render(
        <GameUI
          {...defaultProps}
          status={GameStatus.PLAYING}
          onTogglePause={onTogglePause}
        />
      );

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      fireEvent.pointerDown(pauseButton);

      expect(onTogglePause).toHaveBeenCalledTimes(1);
    });

    /**
     * Critical test for mobile z-index stacking context issue.
     * The pause button wrapper must have a z-index higher than
     * DragToMoveController (z-998) to be clickable on mobile.
     */
    it('should have z-index higher than DragToMoveController (z-998) for mobile touch', () => {
      const { container } = render(
        <GameUI {...defaultProps} status={GameStatus.PLAYING} onTogglePause={vi.fn()} />
      );

      // Use attribute selector which is more robust for Tailwind's square brackets
      const pauseWrapper = container.querySelector('[class*="z-[3005]"]');

      expect(pauseWrapper).toBeInTheDocument();
      expect(pauseWrapper?.className).toContain('z-[3005]');
      expect(pauseWrapper?.className).toContain('relative');
    });
  });
});
