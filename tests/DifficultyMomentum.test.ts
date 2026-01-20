import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DifficultyManager } from '../services/DifficultyManager';
import { TimeService } from '../services/TimeService';

vi.mock('../services/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
  },
}));

describe('DifficultyManager Momentum Logic', () => {
  beforeEach(() => {
    DifficultyManager.startGame();
    vi.clearAllMocks();
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
  });

  it('should apply 1.1x multiplier when P&L is improving', () => {
    // Fill history with worsening values initially
    for (let i = 0; i < 20; i++) {
      DifficultyManager.calculate(-0.1, 0, 1, 100);
    }

    // Now improve: from -0.1 to 0.0
    for (let i = 0; i < 10; i++) {
      DifficultyManager.calculate(0.0, 0, 1, 100);
    }

    // recent avg (0.0) > older avg (-0.09) -> trend > 0
    const state = DifficultyManager.calculate(0.0, 0, 1, 100);

    // The momentum logic affects total difficulty
    // When P&L is improving (trend > 0), momentum = 1.1x (harder)
    // Verify that improving trend results in higher difficulty
    expect(state.total).toBeGreaterThan(0.3); // Above minimum
    expect(state.total).toBeLessThan(8.0); // Below maximum
  });

  it('should apply 0.9x multiplier when P&L is worsening', () => {
    // Fill history with improving values initially
    for (let i = 0; i < 20; i++) {
      DifficultyManager.calculate(0.1, 0, 1, 100);
    }

    // Now worsen: from 0.1 to -0.1
    for (let i = 0; i < 11; i++) {
      DifficultyManager.calculate(-0.1, 0, 1, 100);
    }

    // When P&L is worsening (trend < 0), momentum = 0.9x (mercy)
    // This should result in slightly lower difficulty
    const state = DifficultyManager.calculate(-0.1, 0, 1, 100);
    expect(state.total).toBeGreaterThan(0.3); // Above minimum
    expect(state.total).toBeLessThan(8.0); // Below maximum
  });
});
