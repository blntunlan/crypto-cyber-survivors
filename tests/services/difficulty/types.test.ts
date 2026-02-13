import { describe, it, expect } from 'vitest';
import * as DifficultyTypes from '../../../services/difficulty/types';

describe('difficulty types module', () => {
  it('is importable at runtime for compatibility', () => {
    expect(DifficultyTypes).toBeTypeOf('object');
  });
});
