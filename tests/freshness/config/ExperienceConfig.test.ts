import { describe, it, expect } from 'vitest';
import { EXPERIENCE_CONFIG } from '../../../config/ExperienceConfig';

describe('EXPERIENCE_CONFIG', () => {
  it('uses positive progression constants', () => {
    expect(EXPERIENCE_CONFIG.BASE_EXP).toBeGreaterThan(0);
    expect(EXPERIENCE_CONFIG.SCALING_FACTOR).toBeGreaterThan(0);
    expect(EXPERIENCE_CONFIG.LINEAR_STEP).toBeGreaterThan(0);
  });

  it('keeps curve parameters in sensible order', () => {
    expect(EXPERIENCE_CONFIG.CURVE_EXPONENT).toBeGreaterThan(1);
    expect(EXPERIENCE_CONFIG.PLATEAU_LEVEL).toBeGreaterThan(1);
    expect(EXPERIENCE_CONFIG.LINEAR_STEP).toBeGreaterThan(
      EXPERIENCE_CONFIG.SCALING_FACTOR
    );
  });
});
