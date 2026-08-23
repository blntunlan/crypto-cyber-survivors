import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import {
  LEVEL_UP_OFFER_COUNTDOWN_SECONDS,
  LEVEL_UP_OFFER_REVEAL_SECONDS,
  LEVEL_UP_OFFER_TOTAL_SECONDS,
} from '@/game-v2/config/Mvp0Config';
import { type LevelUpOfferReadout } from '@/game-v2/contracts/GameV2Debug';
import { LevelUpOverlay } from '@/game-v2/ui/LevelUpOverlay';

const TOTAL_MS = LEVEL_UP_OFFER_TOTAL_SECONDS * 1000;
const REVEAL_MS = LEVEL_UP_OFFER_REVEAL_SECONDS * 1000;
const COUNTDOWN_START_MS = TOTAL_MS - LEVEL_UP_OFFER_COUNTDOWN_SECONDS * 1000;

const twoCandidateOffer = (defaultIndex: 0 | 1 | 2 = 0): LevelUpOfferReadout => ({
  candidates: [
    { kind: 'ability', identity: 'starter-projectile' },
    { kind: 'passive', identity: 'move-speed' },
    null,
  ],
  defaultIndex,
});

/** Timer-driven `setState` calls need to flush inside `act` to reach the DOM. */
const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LevelUpOverlay', () => {
  it('renders one card per occupied candidate and none for an empty one', () => {
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={vi.fn()} />);

    expect(screen.getByTestId('level-up-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('level-up-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('level-up-card-2')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('renders native BUTTON elements labelled by kind and identity', () => {
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={vi.fn()} />);

    const abilityCard = screen.getByTestId('level-up-card-0');
    expect(abilityCard.tagName.toLowerCase()).toBe('button');
    expect(abilityCard.textContent).toContain('Ability');
    expect(abilityCard.textContent).toContain('starter-projectile');

    const passiveCard = screen.getByTestId('level-up-card-1');
    expect(passiveCard.textContent).toContain('Passive');
    expect(passiveCard.textContent).toContain('move-speed');
  });

  it('exposes a modal dialog named by its visible level-up title', () => {
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /level up/i })).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('ignores clicks and keyboard input during the reveal window', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={onChoose} />);

    expect(screen.getByTestId('level-up-card-0')).toBeDisabled();
    fireEvent.click(screen.getByTestId('level-up-card-0'));
    fireEvent.keyDown(window, { code: 'Digit1' });

    advance(REVEAL_MS - 200);
    expect(screen.getByTestId('level-up-card-0')).toBeDisabled();
    fireEvent.click(screen.getByTestId('level-up-card-0'));

    expect(onChoose).not.toHaveBeenCalled();
  });

  it('accepts a click once the reveal window ends', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={onChoose} />);

    advance(REVEAL_MS + 200);
    expect(screen.getByTestId('level-up-card-1')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('level-up-card-1'));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('accepts a 1/2/3 keypress once the reveal window ends', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={onChoose} />);

    advance(REVEAL_MS + 200);
    fireEvent.keyDown(window, { code: 'Digit2' });

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('ignores a keypress for an empty candidate slot', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={onChoose} />);

    advance(REVEAL_MS + 200);
    fireEvent.keyDown(window, { code: 'Digit3' });

    expect(onChoose).not.toHaveBeenCalled();
  });

  it('shows no countdown before the last countdown window and shows it after', () => {
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={vi.fn()} />);

    advance(COUNTDOWN_START_MS - 200);
    expect(screen.queryByTestId('level-up-countdown')).toBeNull();

    advance(400);
    expect(screen.getByTestId('level-up-countdown')).toBeInTheDocument();
  });

  it('resolves with the offer default index on a real-time timeout', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer(1)} onChoose={onChoose} />);

    advance(TOTAL_MS + 200);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('does not fire the timeout when a manual choice already resolved', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer(1)} onChoose={onChoose} />);

    advance(REVEAL_MS + 200);
    fireEvent.click(screen.getByTestId('level-up-card-0'));

    advance(TOTAL_MS);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('calls onChoose exactly once even for a rapid double click', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay offer={twoCandidateOffer()} onChoose={onChoose} />);

    advance(REVEAL_MS + 200);
    const card = screen.getByTestId('level-up-card-0');
    fireEvent.click(card);
    fireEvent.click(card);

    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
