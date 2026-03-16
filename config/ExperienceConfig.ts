/**
 * ExperienceConfig - Global settings for player progression.
 */

export const EXPERIENCE_CONFIG = {
  BASE_EXP: 600,
  // Using a hybrid formula:
  // Level 1-25: Power Curve (level^1.55)
  // Level 25+: Linear scaling to prevent exponential explosion
  CURVE_EXPONENT: 1.55,
  SCALING_FACTOR: 120,
  LINEAR_STEP: 1000,
  PLATEAU_LEVEL: 25,

  // Early game ramp: levels 1-5 require less XP to hook the player fast.
  // Linear interpolation from EARLY_SCALE at level 1 to 1.0 at EARLY_END.
  // Level 1: 20% XP needed (~8 kills), Level 5: 84% (~50 kills at 1x)
  EARLY_END: 6,
  EARLY_SCALE: 0.2,
} as const;
