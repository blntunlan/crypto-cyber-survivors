import { describe, it, expect } from 'vitest';
import * as Difficulty from '../../../services/difficulty/index';

describe('difficulty index', () => {
  it('re-exports main API surface', () => {
    expect(Difficulty).toHaveProperty('DIFFICULTY_CONFIG');
    expect(Difficulty).toHaveProperty('LEVERAGE_TIERS');
    expect(Difficulty).toHaveProperty('difficultyContext');
    expect(Difficulty).toHaveProperty('UnifiedDirector');
    expect(Difficulty).toHaveProperty('clamp');
    expect(Difficulty).toHaveProperty('getDefaultInputs');
    expect(Difficulty).toHaveProperty('FlowStateManager');
  });
});
