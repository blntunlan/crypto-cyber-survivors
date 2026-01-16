/**
 * ExperienceConfig - Global settings for player progression.
 */

export const EXPERIENCE_CONFIG = {
  BASE_EXP: 200,
  // Using a hybrid formula:
  // Level 1-25: Power Curve (level^1.5)
  // Level 25+: Linear scaling to prevent exponential explosion
  CURVE_EXPONENT: 1.5,
  LINEAR_STEP: 500,
  PLATEAU_LEVEL: 25,
} as const;
