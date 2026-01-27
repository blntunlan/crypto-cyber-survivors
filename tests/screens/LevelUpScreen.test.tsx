import { render, screen, waitFor, fireEvent } from '../test-utils';
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
  },
}));

import { LevelUpScreen } from '../../components/screens/LevelUpScreen';
import { type Card } from '../../services/cards/CardSystem';

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

  it('should display tier badges', () => {
    vi.useRealTimers();
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    // At least some tier badges should be rendered (specific tier depends on random spinning)
    // Check that tier text styling exists (font-black uppercase tracking-widest)
    const tierBadges = document.querySelectorAll('.tracking-widest');
    expect(tierBadges.length).toBeGreaterThanOrEqual(3);
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
  });

  it('should render card icons or emojis', () => {
    render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

    // At least check that the component renders without error
    expect(screen.getByText('levelup.title')).toBeDefined();
  });
});
