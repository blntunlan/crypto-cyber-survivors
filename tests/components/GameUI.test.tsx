/**
 * GameUI.test.tsx - GameUI Component Tests
 *
 * Tests for the GameUI overlay component, including
 * the mobile pause button z-index stacking context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameUI } from '../../components/GameUI';
import { GameStatus, MarketPosition } from '../../types';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock dependencies
vi.mock('../../services/ScreenService', () => ({
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

vi.mock('../../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  },
}));

// Mock HUD sub-components to simplify testing
vi.mock('../../components/hud', async () => {
  return {
    KernelStatus: () => <div data-testid="kernel-status">KernelStatus</div>,
    LiveFeed: () => <div data-testid="live-feed">LiveFeed</div>,
    AccountHealthPremium: () => <div data-testid="account-health">AccountHealth</div>,
    BuffIndicator: () => <div data-testid="buff-indicator">BuffIndicator</div>,
    MarketAnnouncer: () => <div data-testid="market-announcer">MarketAnnouncer</div>,
    WaveTimer: () => <div data-testid="wave-timer">WaveTimer</div>, // Added explicit mock
    ExperienceBar: () => <div data-testid="experience-bar">ExperienceBar</div>,
    NearDeathGlow: () => <div data-testid="near-death-glow">NearDeathGlow</div>,
    FPSCounter: () => <div data-testid="fps-counter">FPSCounter</div>,
    EnemyPointers: () => <div data-testid="enemy-pointers">EnemyPointers</div>,
    LevelUpFlash: () => <div data-testid="level-up-flash">LevelUpFlash</div>,
    ClutchAnnouncement: () => (
      <div data-testid="clutch-announcement">ClutchAnnouncement</div>
    ),
    ComboPanel: () => <div data-testid="combo-panel">ComboPanel</div>,
    MilestoneAnnouncer: () => (
      <div data-testid="milestone-announcer">MilestoneAnnouncer</div>
    ),
    AchievementPopup: () => <div data-testid="achievement-popup">AchievementPopup</div>,
  };
});

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

      render(
        <LanguageProvider>
          <GameUI {...defaultProps} onTogglePause={onTogglePause} />
        </LanguageProvider>
      );

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should NOT render pause button when onTogglePause is not provided', () => {
      render(
        <LanguageProvider>
          <GameUI {...defaultProps} />
        </LanguageProvider>
      );

      const pauseButton = screen.queryByRole('button', { name: /pause game/i });
      expect(pauseButton).not.toBeInTheDocument();
    });

    it('should NOT render pause button when status is not PLAYING', () => {
      const onTogglePause = vi.fn();

      render(
        <LanguageProvider>
          <GameUI
            {...defaultProps}
            status={GameStatus.PAUSED}
            onTogglePause={onTogglePause}
          />
        </LanguageProvider>
      );

      const pauseButton = screen.queryByRole('button', { name: /pause game/i });
      expect(pauseButton).not.toBeInTheDocument();
    });

    it('should call onTogglePause when pause button is clicked', () => {
      const onTogglePause = vi.fn();

      render(
        <LanguageProvider>
          <GameUI {...defaultProps} onTogglePause={onTogglePause} />
        </LanguageProvider>
      );

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      fireEvent.click(pauseButton);

      expect(onTogglePause).toHaveBeenCalledTimes(1);
    });

    it('should call onTogglePause when pause button receives touchEnd event (mobile)', () => {
      const onTogglePause = vi.fn();

      render(
        <LanguageProvider>
          <GameUI {...defaultProps} onTogglePause={onTogglePause} />
        </LanguageProvider>
      );

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      fireEvent.touchEnd(pauseButton);

      expect(onTogglePause).toHaveBeenCalledTimes(1);
    });

    /**
     * Critical test for mobile z-index stacking context issue.
     * The pause button wrapper must have a z-index higher than
     * DragToMoveController (z-998) to be clickable on mobile.
     */
    it('should have z-index higher than DragToMoveController (z-998) for mobile touch', () => {
      const onTogglePause = vi.fn();

      render(
        <LanguageProvider>
          <GameUI {...defaultProps} onTogglePause={onTogglePause} />
        </LanguageProvider>
      );

      const pauseButton = screen.getByRole('button', { name: /hud\.pause_aria/i });
      const pauseWrapper = pauseButton.parentElement;

      expect(pauseWrapper).toBeInTheDocument();
      expect(pauseWrapper?.className).toContain('z-[1005]');
      expect(pauseWrapper?.className).toContain('relative');
    });
  });
});
