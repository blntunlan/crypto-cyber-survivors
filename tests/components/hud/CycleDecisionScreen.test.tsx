/**
 * CycleDecisionScreen Component Tests
 *
 * Tests for the end-of-cycle decision overlay
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { CycleDecisionScreen } from '../../../components/hud/CycleDecisionScreen';
import { EventBus } from '../../../services/core/EventBus';

// Mock modules
vi.mock('../../../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    getLatestOutput: vi.fn(() => ({ total: 2.5 })),
  },
}));

vi.mock('../../../services/difficulty/factors', () => ({
  calculateCycleFactor: vi.fn(() => 1.5),
}));

describe('CycleDecisionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to real timers for most tests to avoid AnimatePresence issues
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    it('should not be visible by default', () => {
      render(<CycleDecisionScreen testMode={true} />);
      expect(screen.queryByText(/CYCLE COMPLETE/i)).not.toBeInTheDocument();
    });

    it('should become visible when controlled externally with visible=true', () => {
      render(<CycleDecisionScreen visible={true} testMode={true} />);
      expect(screen.getByText(/CYCLE COMPLETE/i)).toBeInTheDocument();
    });

    it('should show when cycleComplete event is emitted', async () => {
      render(<CycleDecisionScreen testMode={true} />);

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/CYCLE COMPLETE/i)).toBeInTheDocument();
      });
    });
  });

  describe('Content Display', () => {
    it('should display cycle number', () => {
      render(<CycleDecisionScreen visible={true} testMode={true} />);
      expect(screen.getByText(/Cycle 1/i)).toBeInTheDocument();
    });

    it('should display current and next difficulty', () => {
      render(<CycleDecisionScreen visible={true} testMode={true} />);
      expect(screen.getByText(/Current Difficulty/i)).toBeInTheDocument();
      expect(screen.getByText(/Next Cycle Difficulty/i)).toBeInTheDocument();
    });

    it('should display countdown timer', () => {
      render(<CycleDecisionScreen visible={true} testMode={true} />);
      expect(screen.getByText(/35s/i)).toBeInTheDocument();
    });

    it('should show continue and cash out buttons', () => {
      render(<CycleDecisionScreen visible={true} testMode={true} />);
      expect(screen.getByText(/CONTINUE PLAYING/i)).toBeInTheDocument();
      expect(screen.getByText(/CASH OUT/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onContinue when continue button is clicked', async () => {
      const onContinue = vi.fn();
      render(
        <CycleDecisionScreen visible={true} onContinue={onContinue} testMode={true} />
      );

      const continueButton = screen.getByText(/CONTINUE PLAYING/i).closest('button');
      fireEvent.click(continueButton!);

      await waitFor(() => {
        expect(onContinue).toHaveBeenCalled();
      });
    });

    it('should emit cycleDecisionMade event on continue', async () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      render(<CycleDecisionScreen visible={true} testMode={true} />);

      const continueButton = screen.getByText(/CONTINUE PLAYING/i).closest('button');
      fireEvent.click(continueButton!);

      await waitFor(() => {
        expect(emitSpy).toHaveBeenCalledWith(
          'cycleDecisionMade',
          expect.objectContaining({ decision: 'CONTINUE' })
        );
      });
    });
  });

  describe('Timer Countdown', () => {
    it('should countdown the timer', async () => {
      vi.useFakeTimers();
      render(<CycleDecisionScreen visible={true} testMode={false} />);

      expect(screen.getByText(/35s/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/34s/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText(/29s/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should auto-continue when timer reaches zero', async () => {
      vi.useFakeTimers();
      const emitSpy = vi.spyOn(EventBus, 'emit');
      render(<CycleDecisionScreen visible={true} testMode={false} />);

      act(() => {
        vi.advanceTimersByTime(35000); // 35s countdown
      });

      // Handle the 300ms delay in handleContinue
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(emitSpy).toHaveBeenCalledWith(
        'cycleDecisionMade',
        expect.objectContaining({ decision: 'CONTINUE' })
      );
      vi.useRealTimers();
    });
  });

  describe('Button States', () => {
    it('should disable buttons after selection', async () => {
      // Use testMode=false so selection state persists for current render
      render(<CycleDecisionScreen visible={true} testMode={false} />);

      const continueButton = screen.getByText(/CONTINUE PLAYING/i).closest('button');
      const cashOutButton = screen.getByText(/CASH OUT/i).closest('button');

      expect(continueButton).not.toBeDisabled();
      fireEvent.click(continueButton!);
      expect(continueButton).toBeDisabled();
      expect(cashOutButton).toBeDisabled();
    });
  });
});
