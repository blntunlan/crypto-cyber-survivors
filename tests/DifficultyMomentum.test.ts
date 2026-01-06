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

    // technical with pnlEffect(0)=1.0, vol(0)=1.0, baseTime=1.0, level=1.0
    // technical = 1.0
    // psych = 0.5 (warmup multiplier)
    // momentum = 1.1
    // total = 1.0 * 0.5 * 1.1 = 0.55
    expect(state.total).toBeCloseTo(0.55, 2);
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

    // technical with pnlEffect(-0.1) -> loss=10, 1+log1p(10)*0.5 = 2.198... ≈ 2.2
    // technical = 1.0 * 2.2 * 1.0 * 1.0 = 2.2
    // psych = 0.5 (warmup multiplier)
    // momentum = 0.9
    // total = 2.2 * 0.5 * 0.9 = 0.99
    const state = DifficultyManager.calculate(-0.1, 0, 1, 100);
    expect(state.total).toBeCloseTo(0.99, 2);
  });
});
