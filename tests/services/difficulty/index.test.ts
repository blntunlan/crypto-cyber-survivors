import { describe, it, expect } from 'vitest';
import * as Difficulty from '../../../services/difficulty/index';

describe('difficulty index', () => {
  it('re-exports main API surface', () => {
    expect(Difficulty).toHaveProperty('DIFFICULTY_CONFIG');
    expect(Difficulty).toHaveProperty('LEVERAGE_TIERS');
    expect(Difficulty).toHaveProperty('calculatePnLFactor');
    expect(Difficulty).toHaveProperty('FlowStateManager');
  });
});
