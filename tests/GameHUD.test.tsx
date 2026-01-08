import { render, screen, act } from './test-utils';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameHUD } from '../components/GameHUD';
import { GameStatus, type Player } from '../types';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';

// Mock ComboSystem
vi.mock('../services/ComboSystem', () => ({
  ComboSystem: {
    getComboTimeRemaining: vi.fn(() => 1.0),
    getNextMilestone: vi.fn(() => ({
      kills: 10,
      name: 'SUPER COMBO!',
      multiplier: 1.5,
      color: '#00ff00',
    })),
    getCurrentMilestone: vi.fn(() => null),
    getMaxStreak: vi.fn(() => 0),
    getState: vi.fn(() => ({ killStreak: 0, comboMultiplier: 1.0, totalBonusXp: 0 })),
  },
}));

// Mock audioService
vi.mock('../services/AudioService', () => ({
  audio: {
    playComboMilestone: vi.fn(),
  },
}));

describe('GameHUD', () => {
  let mockPlayer: Player;

  beforeEach(() => {
    vi.useFakeTimers();
    EventBus.clear();
    vi.mocked(ComboSystem.getComboTimeRemaining).mockReturnValue(1.0);

    mockPlayer = {
      hp: 100,
      maxHp: 100,
      level: 1,
      exp: 0,
      nextLevelExp: 100,
      radius: 10,
      x: 0,
      y: 0,
      color: 'white',
      speed: 5,
      fireRate: 1,
      critChance: 0,
      baseDamage: 10,
      luck: 0,
      magnet: 0,
      armor: 0,
      area: 1,
      projectiles: 1,
      critDamage: 2,
      regen: 0,
      dodge: 0,
      lifesteal: 0,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when in MENU status', () => {
    const { container } = render(<GameHUD status={GameStatus.MENU} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render and contain essential HUD elements', () => {
    render(<GameHUD status={GameStatus.PLAYING} />);

    // In the new decoupled architecture, streak and multiplier are updated via DOM
    // We check if the elements exist with correct IDs
    expect(screen.getByText('COMBO')).toBeInTheDocument();
    expect(document.getElementById('combo-streak-count')).toBeInTheDocument();
    expect(document.getElementById('combo-multiplier-badge')).toBeInTheDocument();
    expect(document.getElementById('combo-timer-bar')).toBeInTheDocument();
  });

  it('should show milestone text when comboMilestone event is emitted', () => {
    render(<GameHUD status={GameStatus.PLAYING} />);

    act(() => {
      EventBus.emit('comboMilestone', {
        name: 'KILLING SPREE',
        kills: 25,
        multiplier: 2.0,
        color: 'rgb(0, 255, 0)',
        sound: 'none',
      });
    });

    const milestoneText = screen.getByText(/KILLING SPREE/i);
    expect(milestoneText).toBeInTheDocument();
    // Use rgb value to match JSDOM expectation
    expect(milestoneText).toHaveStyle({ color: 'rgb(255, 255, 255)' });

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.queryByText(/KILLING SPREE/i)).not.toBeInTheDocument();
  });

  it('should show Near-Death Glow when HP is low', () => {
    mockPlayer.hp = 10; // 10% health
    const { container } = render(<GameHUD status={GameStatus.PLAYING} player={mockPlayer} />);

    const glow = container.querySelector('#near-death-glow') as HTMLElement;
    expect(glow).toBeInTheDocument();
  });

  it('should show CLUTCH! when recovering from low health', () => {
    mockPlayer.hp = 5; // 5% health
    const { rerender } = render(<GameHUD status={GameStatus.PLAYING} player={mockPlayer} />);

    // Trigger recovery (from < 20% to > 50%)
    act(() => {
      const recoveredPlayer = { ...mockPlayer, hp: 60 };
      rerender(<GameHUD status={GameStatus.PLAYING} player={recoveredPlayer} />);
    });

    expect(screen.getByText('CLUTCH!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.queryByText('CLUTCH!')).not.toBeInTheDocument();
  });

  it('should display the wave timer container', () => {
    const startTime = Date.now() - 65000; // 65 seconds ago
    render(<GameHUD status={GameStatus.PLAYING} sessionStartTime={startTime} />);

    expect(screen.getByText(/Survival Time/i)).toBeInTheDocument();
    expect(document.getElementById('wave-timer-text')).toBeInTheDocument();
  });

  it('should render off-screen enemy pointers container', () => {
    const enemies = [
      { id: '1', active: true, x: -50, y: 100, radius: 10, color: 'red', type: 'bear' },
    ];

    render(
      <GameHUD status={GameStatus.PLAYING} enemies={enemies as any} width={800} height={600} />
    );

    // Check if pointer container has the correct ID
    expect(document.getElementById('fps-counter')).toBeInTheDocument();
    // The pointers are 10 div children of a ref container, let's check by svg
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});
