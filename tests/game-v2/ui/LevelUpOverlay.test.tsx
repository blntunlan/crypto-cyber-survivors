import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import {
  LEVEL_UP_OFFER_COUNTDOWN_SECONDS,
  LEVEL_UP_OFFER_REVEAL_SECONDS,
  LEVEL_UP_OFFER_TOTAL_SECONDS,
} from '@/game-v2/config/Mvp0Config';
import { type LevelUpOfferReadout } from '@/game-v2/contracts/GameV2Debug';
import { LevelUpOverlay, type LevelUpOverlayProps } from '@/game-v2/ui/LevelUpOverlay';

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

/**
 * Renders with reroll/banish charges defaulted to 0 (hidden controls) so the
 * pre-existing choice-only tests keep asserting exactly what they always
 * did; V2-105 tests opt into charges via `overrides`.
 */
const renderOverlay = (
  offer: LevelUpOfferReadout,
  overrides: Partial<LevelUpOverlayProps> = {}
): ReturnType<typeof render> =>
  render(
    <LevelUpOverlay
      offer={offer}
      onChoose={vi.fn()}
      rerollCharges={0}
      banishCharges={0}
      onReroll={vi.fn()}
      onBanish={vi.fn()}
      {...overrides}
    />
  );

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
    renderOverlay(twoCandidateOffer());

    expect(screen.getByTestId('level-up-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('level-up-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('level-up-card-2')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('renders native BUTTON elements labelled by kind and identity', () => {
    renderOverlay(twoCandidateOffer());

    const abilityCard = screen.getByTestId('level-up-card-0');
    expect(abilityCard.tagName.toLowerCase()).toBe('button');
    expect(abilityCard.textContent).toContain('Ability');
    expect(abilityCard.textContent).toContain('starter-projectile');

    const passiveCard = screen.getByTestId('level-up-card-1');
    expect(passiveCard.textContent).toContain('Passive');
    expect(passiveCard.textContent).toContain('move-speed');
  });

  it('exposes a modal dialog named by its visible level-up title', () => {
    renderOverlay(twoCandidateOffer());

    expect(screen.getByRole('dialog', { name: /level up/i })).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('ignores clicks and keyboard input during the reveal window', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(), { onChoose });

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
    renderOverlay(twoCandidateOffer(), { onChoose });

    advance(REVEAL_MS + 200);
    expect(screen.getByTestId('level-up-card-1')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('level-up-card-1'));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('accepts a 1/2/3 keypress once the reveal window ends', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(), { onChoose });

    advance(REVEAL_MS + 200);
    fireEvent.keyDown(window, { code: 'Digit2' });

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('ignores a keypress for an empty candidate slot', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(), { onChoose });

    advance(REVEAL_MS + 200);
    fireEvent.keyDown(window, { code: 'Digit3' });

    expect(onChoose).not.toHaveBeenCalled();
  });

  it('shows no countdown before the last countdown window and shows it after', () => {
    renderOverlay(twoCandidateOffer());

    advance(COUNTDOWN_START_MS - 200);
    expect(screen.queryByTestId('level-up-countdown')).toBeNull();

    advance(400);
    expect(screen.getByTestId('level-up-countdown')).toBeInTheDocument();
  });

  it('resolves with the offer default index on a real-time timeout', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(1), { onChoose });

    advance(TOTAL_MS + 200);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('does not fire the timeout when a manual choice already resolved', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(1), { onChoose });

    advance(REVEAL_MS + 200);
    fireEvent.click(screen.getByTestId('level-up-card-0'));

    advance(TOTAL_MS);

    expect(onChoose).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('calls onChoose exactly once even for a rapid double click', () => {
    const onChoose = vi.fn();
    renderOverlay(twoCandidateOffer(), { onChoose });

    advance(REVEAL_MS + 200);
    const card = screen.getByTestId('level-up-card-0');
    fireEvent.click(card);
    fireEvent.click(card);

    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  describe('reroll (V2-105)', () => {
    it('hides the reroll control when the charge is already spent', () => {
      renderOverlay(twoCandidateOffer(), { rerollCharges: 0 });

      expect(screen.queryByTestId('level-up-reroll')).toBeNull();
    });

    it('renders the reroll control when the charge is unspent, disabled during reveal', () => {
      renderOverlay(twoCandidateOffer(), { rerollCharges: 1 });

      expect(screen.getByTestId('level-up-reroll')).toBeDisabled();
    });

    it('ignores a reroll click during the reveal window', () => {
      const onReroll = vi.fn();
      renderOverlay(twoCandidateOffer(), { rerollCharges: 1, onReroll });

      fireEvent.click(screen.getByTestId('level-up-reroll'));

      expect(onReroll).not.toHaveBeenCalled();
    });

    it('calls onReroll once the reveal window ends and does not affect the offer cards', () => {
      const onReroll = vi.fn();
      renderOverlay(twoCandidateOffer(), { rerollCharges: 1, onReroll });

      advance(REVEAL_MS + 200);
      fireEvent.click(screen.getByTestId('level-up-reroll'));

      expect(onReroll).toHaveBeenCalledExactlyOnceWith();
      expect(screen.getByTestId('level-up-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('level-up-card-1')).toBeInTheDocument();
    });

    it('does not reset or advance the countdown deadline when rerolling', () => {
      const onChoose = vi.fn();
      const onReroll = vi.fn();
      renderOverlay(twoCandidateOffer(1), { rerollCharges: 1, onChoose, onReroll });

      advance(REVEAL_MS + 200);
      fireEvent.click(screen.getByTestId('level-up-reroll'));

      // The real-time timeout still fires at the unmodified TOTAL_MS deadline.
      advance(TOTAL_MS - REVEAL_MS - 200 + 200);
      expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('leaves the visible countdown unchanged synchronously after a reroll click', () => {
      // `elapsedMs` is recomputed every TICK_INTERVAL_MS from `Date.now()`, so
      // a stray reset self-corrects within 100ms and the assertion above
      // alone cannot see it. Reading the DOM synchronously right after the
      // click (fireEvent flushes state updates via `act`) catches a
      // one-tick reset that would otherwise be invisible.
      renderOverlay(twoCandidateOffer(), { rerollCharges: 1 });

      advance(COUNTDOWN_START_MS + 200);
      const before = screen.getByTestId('level-up-countdown').textContent;

      fireEvent.click(screen.getByTestId('level-up-reroll'));

      expect(screen.getByTestId('level-up-countdown').textContent).toBe(before);
    });
  });

  describe('banish (V2-105)', () => {
    it('hides every banish control when the charge is already spent', () => {
      renderOverlay(twoCandidateOffer(), { banishCharges: 0 });

      expect(screen.queryByTestId('level-up-banish-0')).toBeNull();
      expect(screen.queryByTestId('level-up-banish-1')).toBeNull();
    });

    it('renders one banish control per occupied card when the charge is unspent, disabled during reveal', () => {
      renderOverlay(twoCandidateOffer(), { banishCharges: 1 });

      expect(screen.getByTestId('level-up-banish-0')).toBeDisabled();
      expect(screen.getByTestId('level-up-banish-1')).toBeDisabled();
      expect(screen.queryByTestId('level-up-banish-2')).toBeNull();
    });

    it('ignores a banish click during the reveal window', () => {
      const onBanish = vi.fn();
      renderOverlay(twoCandidateOffer(), { banishCharges: 1, onBanish });

      fireEvent.click(screen.getByTestId('level-up-banish-0'));

      expect(onBanish).not.toHaveBeenCalled();
    });

    it('calls onBanish with the clicked card index once the reveal window ends', () => {
      const onBanish = vi.fn();
      renderOverlay(twoCandidateOffer(), { banishCharges: 1, onBanish });

      advance(REVEAL_MS + 200);
      fireEvent.click(screen.getByTestId('level-up-banish-1'));

      expect(onBanish).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('does not reset or advance the countdown deadline when banishing', () => {
      const onChoose = vi.fn();
      const onBanish = vi.fn();
      renderOverlay(twoCandidateOffer(1), { banishCharges: 1, onChoose, onBanish });

      advance(REVEAL_MS + 200);
      fireEvent.click(screen.getByTestId('level-up-banish-0'));

      advance(TOTAL_MS - REVEAL_MS - 200 + 200);
      expect(onChoose).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('leaves the visible countdown unchanged synchronously after a banish click', () => {
      renderOverlay(twoCandidateOffer(), { banishCharges: 1 });

      advance(COUNTDOWN_START_MS + 200);
      const before = screen.getByTestId('level-up-countdown').textContent;

      fireEvent.click(screen.getByTestId('level-up-banish-0'));

      expect(screen.getByTestId('level-up-countdown').textContent).toBe(before);
    });
  });
});
