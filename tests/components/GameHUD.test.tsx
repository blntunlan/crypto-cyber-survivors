import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '../../components/GameHUD';
import { GameStatus } from '../../types';
import { useDevice } from '../../hooks/useDevice';
import { useGameStore } from '../../stores/gameStore';

// Mock hooks
vi.mock('../../hooks/useDevice', () => ({
  useDevice: vi.fn(),
}));

vi.mock('../../stores/gameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../../hooks/useHUDEvents', () => ({
  useHUDEvents: vi.fn(() => ({
    uiMeta: { maxStreak: 10, totalBonusXp: 100, milestoneText: '', milestoneColor: '' },
    flash: 0,
    showMilestone: false,
    clutchActive: false,
    achievement: null,
  })),
}));

vi.mock('../../hooks/useHUDUpdateLoop', () => ({
  useHUDUpdateLoop: vi.fn(),
}));

vi.mock('../../hooks/useEnemyPointers', () => ({
  useEnemyPointers: vi.fn(),
}));

// Mock sub-components
vi.mock('../../components/hud', () => ({
  WaveTimer: () => <div data-testid="wave-timer">WaveTimer</div>,
  FPSCounter: () => <div data-testid="fps-counter">FPSCounter</div>,
  ClutchAnnouncement: () => (
    <div data-testid="clutch-announcement">ClutchAnnouncement</div>
  ),
  LevelUpFlash: () => <div data-testid="level-up-flash">LevelUpFlash</div>,
  NearDeathGlow: () => <div data-testid="near-death-glow">NearDeathGlow</div>,
  EnemyPointers: () => <div data-testid="enemy-pointers">EnemyPointers</div>,
  AchievementPopup: () => <div data-testid="achievement-popup">AchievementPopup</div>,
  MilestoneAnnouncer: () => (
    <div data-testid="milestone-announcer">MilestoneAnnouncer</div>
  ),
  ComboPanel: () => <div data-testid="combo-panel">ComboPanel</div>,
}));

// Mock config
vi.mock('../../config/UILayout', () => ({
  getHUDLayout: vi.fn(() => ({
    globalScale: 1,
    elements: {
      waveTimer: { visible: true },
      fpsCounter: { visible: true },
      comboPanel: { visible: true, offset: 0 },
      milestoneAnnouncer: { visible: true },
      achievementPopup: { visible: true },
    },
  })),
}));

describe('GameHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDevice as any).mockReturnValue({ platform: 'desktop', isMobile: false });
    (useGameStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ graphics: { hudScale: 1, showFPS: true } });
      }
      return { graphics: { hudScale: 1, showFPS: true } };
    });
  });

  it('should not render when status is MENU', () => {
    const { container } = render(<GameHUD status={GameStatus.MENU} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all components when active', () => {
    render(<GameHUD status={GameStatus.PLAYING} width={800} height={600} />);

    expect(screen.getByTestId('near-death-glow')).toBeTruthy();
    expect(screen.getByTestId('fps-counter')).toBeTruthy();
    expect(screen.getByTestId('enemy-pointers')).toBeTruthy();
    expect(screen.getByTestId('level-up-flash')).toBeTruthy();
    expect(screen.getByTestId('clutch-announcement')).toBeTruthy();
    expect(screen.getByTestId('combo-panel')).toBeTruthy();
    expect(screen.getByTestId('milestone-announcer')).toBeTruthy();
    expect(screen.getByTestId('achievement-popup')).toBeTruthy();
  });

  it('should not render specific components if disabled in layout', async () => {
    const { getHUDLayout } = await import('../../config/UILayout');
    (getHUDLayout as any).mockReturnValue({
      globalScale: 1,
      elements: {
        waveTimer: { visible: false },
        fpsCounter: { visible: false },
        comboPanel: { visible: false, offset: 0 },
        milestoneAnnouncer: { visible: false },
        achievementPopup: { visible: false },
      },
    });

    // Also ensure showFPS is false in store
    (useGameStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ graphics: { hudScale: 1, showFPS: false } });
      }
      return { graphics: { hudScale: 1, showFPS: false } };
    });

    render(<GameHUD status={GameStatus.PLAYING} width={800} height={600} />);

    expect(screen.queryByTestId('wave-timer')).toBeNull();
    expect(screen.queryByTestId('fps-counter')).toBeNull();
    // NearDeathGlow is always rendered if not in MENU
    expect(screen.getByTestId('near-death-glow')).toBeTruthy();
  });
});
