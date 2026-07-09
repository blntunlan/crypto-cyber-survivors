import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuffIndicator } from '../../../components/hud/BuffIndicator';
import { BuffManager } from '../../../services/patterns/decorators/BuffManager';
import { EventBus } from '../../../services/core/EventBus';
import { GameStatus } from '../../../types';
import { screenService } from '../../../services/system/ScreenService';

// Mocks
vi.mock('../../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    isInitialized: vi.fn(),
    getActiveEffects: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: vi.fn(() => ({ isVeryNarrow: false })),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, options?: any) => options?.defaultValue ?? key,
  }),
}));

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
  },
}));

describe('BuffIndicator', () => {
  const mockEffects = [
    {
      id: 'buff-1',
      name: 'Rage Mode',
      icon: '😡',
      description: 'Increases damage',
      remainingMs: 5000,
      isPermanent: false,
    },
    {
      id: 'debuff-1',
      name: 'Slowed',
      icon: '🐌',
      description: 'Decreases speed',
      remainingMs: 3000,
      isPermanent: false,
    },
    {
      id: 'perm-1',
      name: 'Diamond Hands',
      icon: '💎',
      description: 'Permanent buff',
      remainingMs: 0,
      isPermanent: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mocks
    (BuffManager.isInitialized as any).mockReturnValue(true);
    (BuffManager.getActiveEffects as any).mockReturnValue(mockEffects);
    (screenService.isMobile as any).mockReturnValue(false);

    // Mock EventBus.on to return an unsubscribe function
    (EventBus.on as any).mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when status is not PLAYING', () => {
    render(<BuffIndicator status={GameStatus.MENU} />);
    expect(screen.queryByText('Rage Mode')).not.toBeInTheDocument();
  });

  it('should not render when there are no effects', () => {
    (BuffManager.getActiveEffects as any).mockReturnValue([]);
    render(<BuffIndicator status={GameStatus.PLAYING} />);
    expect(screen.queryByText('Rage Mode')).not.toBeInTheDocument();
  });

  it('should render active effects when PLAYING', () => {
    render(<BuffIndicator status={GameStatus.PLAYING} />);

    expect(screen.getByText('Rage Mode')).toBeInTheDocument();
    expect(screen.getByText('Slowed')).toBeInTheDocument();
    expect(screen.getByText('Diamond Hands')).toBeInTheDocument();

    // Check durations
    expect(screen.getByText('5s')).toBeInTheDocument();
    expect(screen.getByText('3s')).toBeInTheDocument();
    expect(screen.getByText('∞')).toBeInTheDocument();
  });

  it('should update effects on "buffApplied" event', () => {
    let buffAppliedCallback: () => void;
    (EventBus.on as any).mockImplementation((event: string, cb: () => void) => {
      if (event === 'buffApplied') buffAppliedCallback = cb;
      return vi.fn();
    });

    const { rerender } = render(<BuffIndicator status={GameStatus.PLAYING} />);

    // Initial render has 3 effects
    expect(screen.getByText('Rage Mode')).toBeInTheDocument();

    // Mock a new effect
    const newEffects = [
      ...mockEffects,
      {
        id: 'buff-2',
        name: 'Speed Boost',
        icon: '⚡',
        description: 'Increases speed',
        remainingMs: 10000,
        isPermanent: false,
      },
    ];
    (BuffManager.getActiveEffects as any).mockReturnValue(newEffects);

    // Trigger update
    act(() => {
      buffAppliedCallback();
    });

    rerender(<BuffIndicator status={GameStatus.PLAYING} />);
    expect(screen.getByText('Speed Boost')).toBeInTheDocument();
  });

  it('should update effects on interval', () => {
    render(<BuffIndicator status={GameStatus.PLAYING} />);

    expect(BuffManager.getActiveEffects).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(BuffManager.getActiveEffects).toHaveBeenCalledTimes(2);
  });

  it('should render correctly in mobile mode', () => {
    (screenService.isMobile as any).mockReturnValue(true);
    render(<BuffIndicator status={GameStatus.PLAYING} />);

    // Mobile mode now shows buff names (compact) alongside icons and time
    expect(screen.getByText('Rage Mode')).toBeInTheDocument();
    expect(screen.getByText('😡')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('should apply correct styling for buffs vs debuffs', () => {
    render(<BuffIndicator status={GameStatus.PLAYING} />);

    const rageMode = screen.getByText('Rage Mode').closest('div');
    const slowed = screen.getByText('Slowed').closest('div');

    // Check classes (using partial matching as tailwind classes can be long)
    expect(rageMode?.className).toContain('emerald');
    expect(slowed?.className).toContain('rose');
  });

  it('renders buffs and debuffs as non-opaque tactical rails', () => {
    render(<BuffIndicator status={GameStatus.PLAYING} />);

    const buffRail = screen.getByText('Rage Mode').closest('[data-hud-tone]');
    const debuffRail = screen.getByText('Slowed').closest('[data-hud-tone]');

    expect(buffRail).toHaveAttribute('data-hud-tone', 'positive');
    expect(debuffRail).toHaveAttribute('data-hud-tone', 'danger');
    expect(buffRail).not.toHaveClass('bg-emerald-500/20');
    expect(debuffRail).not.toHaveClass('bg-rose-500/20');
  });

  it('should handle uninitialized BuffManager gracefully', () => {
    (BuffManager.isInitialized as any).mockReturnValue(false);
    render(<BuffIndicator status={GameStatus.PLAYING} />);
    expect(screen.queryByText('Rage Mode')).not.toBeInTheDocument();
  });

  it('should render icon-only on very narrow screens (not hidden)', async () => {
    // Re-mock hook for this specific test
    const useResponsiveUIModule = await import('../../../hooks/useResponsiveUI');
    (useResponsiveUIModule.useResponsiveUI as any).mockReturnValue({
      isVeryNarrow: true,
    });
    // Very narrow screens are always mobile in practice
    (screenService.isMobile as any).mockReturnValue(true);

    render(<BuffIndicator status={GameStatus.PLAYING} />);

    // Very narrow screens show ultra-compact icon-only row (no names)
    expect(screen.queryByText('Rage Mode')).not.toBeInTheDocument();
    // Icons should still be visible
    expect(screen.getByText('😡')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });
});
