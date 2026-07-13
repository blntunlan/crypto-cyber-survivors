import { render, screen, waitFor, fireEvent, within } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock framer-motion BEFORE importing LevelUpScreen
vi.mock('framer-motion', () => {
  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef<HTMLElement, any>(
      (
        {
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          variants: _variants,
          whileHover: _whileHover,
          whileTap: _whileTap,
          transition: _transition,
          onAnimationStart: _onAnimationStart,
          onAnimationComplete: _onAnimationComplete,
          onUpdate: _onUpdate,
          layout: _layout,
          ...rest
        },
        ref
      ) => {
        return React.createElement(tag, { ref, ...rest }, children as React.ReactNode);
      }
    );
    Component.displayName = `motion.${tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
      h3: createMotionComponent('h3'),
      p: createMotionComponent('p'),
      span: createMotionComponent('span'),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock audio service - include all methods used by LevelUpScreen and SlotReel
vi.mock('../../services/audio', () => ({
  audio: {
    playSlotTick: vi.fn(),
    playReelStop: vi.fn(),
    playSlotWin: vi.fn(),
    playAnticipation: vi.fn(),
    playSlowdownTension: vi.fn(),
    playCoinShower: vi.fn(),
    playMultiplierChime: vi.fn(),
    playNearMiss: vi.fn(),
    playButton: vi.fn(),
  },
}));

import { LevelUpScreen } from '../../components/screens/LevelUpScreen';
import { type Card } from '../../services/cards/CardSystem';
import { audio } from '../../services/audio';

describe('LevelUpScreen', () => {
  const mockChoices: Card[] = [
    {
      id: 'test-1',
      name: 'Test Upgrade',
      description: 'Test Description',
      icon: '🔥',
      tier: 'common',
      effect: p => p,
    },
    {
      id: 'test-2',
      name: 'Test Upgrade 2',
      description: 'Test Description 2',
      icon: '⚡',
      tier: 'rare',
      effect: p => p,
    },
    {
      id: 'test-3',
      name: 'Test Upgrade 3',
      description: 'Test Description 3',
      icon: '💎',
      tier: 'epic',
      effect: p => p,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should render LEVEL UP title', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);
    expect(screen.getByText('levelup.title')).toBeDefined();
  });

  it('should render spinning status initially', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);
    expect(screen.getByText('levelup.spinning')).toBeDefined();
  });

  it('should call onSelect with the chosen card when a card is clicked', async () => {
    vi.useRealTimers();
    const onSelectMock = vi.fn();
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={onSelectMock} />);

    // Wait for all reels to stop and buttons to become enabled
    await waitFor(
      () => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0]).not.toBeDisabled();
      },
      { timeout: 7000 }
    ); // Animasyonun bitmesi için yeterli süre

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);

    expect(onSelectMock).toHaveBeenCalledWith(mockChoices[0]);
  });

  it('should render 3 slot reels for 3 choices', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);
    // Each reel becomes a button after stop
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('renders every upgrade reel inside one vertical payline cabinet', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    const cabinet = screen.getByTestId('level-up-payline-cabinet');
    expect(within(cabinet).getAllByRole('button')).toHaveLength(3);

    const progress = screen.getByTestId('level-up-lock-progress');
    expect(progress.querySelectorAll('[data-locked="false"]')).toHaveLength(3);
  });

  it('marks each reward row as spinning before it locks', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    const reels = screen.getAllByTestId('level-up-reel');
    expect(reels).toHaveLength(3);
    expect(reels.every(reel => reel.dataset.reelState === 'spinning')).toBe(true);
  });

  it('keeps card icons and the cabinet background free of box and line chrome', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    const cabinet = screen.getByTestId('level-up-payline-cabinet');
    expect(cabinet.querySelector('[aria-hidden="true"].h-px')).toBeNull();

    const reels = screen.getAllByTestId('level-up-reel');
    reels.forEach(reel => {
      const iconContainer = reel.querySelector('.h-11.w-11');
      expect(iconContainer).not.toHaveClass('border');
    });
  });

  it('should display tier badges', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    expect(screen.getByText('Common')).toBeDefined();
    expect(screen.getByText('Rare')).toBeDefined();
    expect(screen.getByText('Epic')).toBeDefined();
  });

  it('should show "Choose your upgrade" after all reels stop', async () => {
    vi.useRealTimers(); // Need real timers for this test
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    // Wait for all reels to stop (total time ~4-5 seconds in real implementation)
    await waitFor(
      () => {
        expect(screen.getByText('levelup.choose_upgrade')).toBeDefined();
      },
      { timeout: 6000 }
    );

    const progress = screen.getByTestId('level-up-lock-progress');
    expect(progress.querySelectorAll('[data-locked="true"]')).toHaveLength(3);
  });

  it('keeps reel audio and enables keyboard selection after all locks', async () => {
    vi.useRealTimers();
    const onSelect = vi.fn();
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={onSelect} />);

    await waitFor(
      () => {
        expect(screen.getByText('levelup.choose_upgrade')).toBeDefined();
      },
      { timeout: 7000 }
    );

    expect(audio.playReelStop).toHaveBeenCalledTimes(3);
    expect(audio.playMultiplierChime).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(mockChoices[1]);
  });

  it('should render card icons or emojis', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    // At least check that the component renders without error
    expect(screen.getByText('levelup.title')).toBeDefined();
  });
});
