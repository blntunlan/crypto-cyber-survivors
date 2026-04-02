import { describe, it, expect } from 'vitest';
import { evaluateCycleTimer } from '../../../../services/gameplay/loop/cycleTimer';
import { GameMode } from '../../../../types/gameMode';

describe('evaluateCycleTimer', () => {
  describe('COMPETITIVE mode', () => {
    it('returns cycle 1 with no emit at t=0', () => {
      const result = evaluateCycleTimer(0, 1, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(1);
      expect(result.shouldEmit).toBe(false);
    });

    it('stays in cycle 1 at t=299', () => {
      const result = evaluateCycleTimer(299, 1, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(1);
      expect(result.shouldEmit).toBe(false);
    });

    it('crosses into cycle 2 at t=300', () => {
      const result = evaluateCycleTimer(300, 1, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(2);
      expect(result.shouldEmit).toBe(true);
    });

    it('does not re-emit for the same cycle', () => {
      const result = evaluateCycleTimer(350, 2, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(2);
      expect(result.shouldEmit).toBe(false);
    });

    it('handles skipped cycles (lag spike)', () => {
      // Jump from cycle 1 to cycle 4
      const result = evaluateCycleTimer(900, 1, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(4);
      expect(result.shouldEmit).toBe(true);
    });

    it('cycle 3 at t=600', () => {
      const result = evaluateCycleTimer(600, 2, GameMode.COMPETITIVE);
      expect(result.currentCycle).toBe(3);
      expect(result.shouldEmit).toBe(true);
    });
  });

  describe('CASUAL mode', () => {
    it('always returns cycle 1 with no emit', () => {
      const result = evaluateCycleTimer(500, 1, GameMode.CASUAL);
      expect(result.currentCycle).toBe(1);
      expect(result.shouldEmit).toBe(false);
    });

    it('never emits even with large elapsed time', () => {
      const result = evaluateCycleTimer(9999, 0, GameMode.CASUAL);
      expect(result.currentCycle).toBe(1);
      expect(result.shouldEmit).toBe(false);
    });
  });
});
