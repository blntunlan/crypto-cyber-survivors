import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PositionSelectScreen } from '@/game-v2/ui/PositionSelectScreen';

afterEach(() => {
  cleanup();
});

describe('PositionSelectScreen', () => {
  it('shows BTC and a connecting state before a live price arrives', () => {
    render(<PositionSelectScreen livePrice={null} onStart={() => {}} />);

    expect(screen.getByTestId('position-select-asset').textContent).toBe('BTC/USD');
    expect(screen.getByTestId('position-select-price').textContent).toMatch(
      /connecting/i
    );
    expect(screen.getByTestId('position-select-start')).toBeDisabled();
  });

  it('shows the live price and enables Start once one arrives', () => {
    render(<PositionSelectScreen livePrice={65_000} onStart={() => {}} />);

    expect(screen.getByTestId('position-select-price').textContent).toContain('65,000');
    expect(screen.getByTestId('position-select-start')).toBeEnabled();
  });

  it('defaults to LONG and 1x, and lets the player change both', () => {
    render(<PositionSelectScreen livePrice={65_000} onStart={() => {}} />);

    expect(screen.getByTestId('position-select-side-long')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('position-select-leverage-1')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByTestId('position-select-side-short'));
    fireEvent.click(screen.getByTestId('position-select-leverage-25'));

    expect(screen.getByTestId('position-select-side-short')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('position-select-side-long')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('position-select-leverage-25')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('calls onStart with the currently selected side and leverage', () => {
    const onStart = vi.fn();
    render(<PositionSelectScreen livePrice={65_000} onStart={onStart} />);

    fireEvent.click(screen.getByTestId('position-select-side-short'));
    fireEvent.click(screen.getByTestId('position-select-leverage-10'));
    fireEvent.click(screen.getByTestId('position-select-start'));

    expect(onStart).toHaveBeenCalledExactlyOnceWith('SHORT', 10);
  });

  it('renders all five leverage options', () => {
    render(<PositionSelectScreen livePrice={65_000} onStart={() => {}} />);

    for (const mode of [1, 5, 10, 25, 50]) {
      expect(
        screen.getByTestId(`position-select-leverage-${mode}`)
      ).toBeInTheDocument();
    }
  });
});
