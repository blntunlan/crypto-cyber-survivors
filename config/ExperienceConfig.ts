/**
 * ExperienceConfig - Global settings for player progression.
 */

export const EXPERIENCE_CONFIG = {
  BASE_EXP: 350,
  // Using a hybrid formula:
  // Level 1-25: Power Curve (level^1.55)
  // Level 25+: Linear scaling to prevent exponential explosion
  CURVE_EXPONENT: 1.55,
  SCALING_FACTOR: 60,
  LINEAR_STEP: 800,
  PLATEAU_LEVEL: 25,
} as const;
