import { LEVERAGE_OPTIONS } from '../../../types';

export type DirectorVersionInfo = {
  directorVersion: string;
  configVersion: string;
  contentManifestHash: string;
};

export const FINAL_NORMAL_ENEMY_STAT_CAPS = {
  normalHealth: 2.2,
  normalDamage: 1.8,
  normalSpeed: 1.35,
} as const;

export const FINAL_ENCOUNTER_LIMITS = {
  maximumHeadwindChannels: 2,
  maximumConcurrentStatSpikes: 3,
} as const;

export type DurationRange = {
  minSeconds: number;
  maxSeconds: number;
};

export type DirectorConfigV1 = {
  versions: DirectorVersionInfo;
  runtime: {
    updateFrequencyHz: number;
    telemetryCapacity: number;
  };
  presentation: {
    cueCooldownSeconds: number;
    maximumSensoryLoad: number;
    maximumShake: number;
    maximumFlash: number;
    maximumHitStop: number;
    ambienceSmoothingSeconds: number;
  };
  pacing: {
    buildUp: DurationRange & { threatMultiplier: number };
    peak: DurationRange & { threatMultiplier: number };
    peakFade: DurationRange & { threatMultiplier: number };
    recovery: DurationRange & { threatMultiplier: number };
    marketSurge: { maxSeconds: number; threatMultiplier: number };
  };
  marketEvents: {
    minTelegraphSeconds: number;
    initialSurgeLockoutSeconds: number;
    defaultCooldownSeconds: number;
    whaleCooldownSeconds: number;
    queueCapacity: number;
    maxPrimaryEncounters: number;
    maxSupportEncounters: number;
  };
  survival: {
    pressurePoints: readonly { elapsedSeconds: number; pressure: number }[];
    pressureCap: number;
    doomStartsAtSeconds: number;
    doomStackIntervalSeconds: number;
    recoveryReductionPerDoomStackSeconds: number;
    minimumRecoverySeconds: number;
    minimumSupportEfficiency: number;
  };
  threat: {
    weights: {
      market: number;
      headwind: number;
      greed: number;
      encounter: number;
    };
    minimumTarget: number;
    maximumTarget: number;
    baseCreditsPerSecond: number;
    maximumCreditBankSeconds: number;
  };
  marketPressure: {
    weights: {
      volatility: number;
      volume: number;
      trend: number;
      rsiExtremity: number;
      whale: number;
    };
    minimum: number;
    maximum: number;
  };
  advantage: {
    baseCreditsPerSecond: number;
    regimeConfidenceBaseMultiplier: number;
    regimeConfidenceWeight: number;
    maximumCreditBankSeconds: number;
    maximumActiveMechanics: number;
  };
  encounters: {
    activeDurationSeconds: number;
    recoveryDurationSeconds: number;
    maximumHeadwindChannels: number;
    maximumConcurrentStatSpikes: number;
    maximumSpawnDensityMultiplier: number;
    liquidationHeadwindThreshold: number;
  };
  enemyStatCaps: {
    normalHealth: number;
    normalDamage: number;
    normalSpeed: number;
  };
  position: {
    alignmentScale: number;
    alignmentEmaSeconds: number;
    maximumPublicLeverage: number;
    publicLeverageTiers: readonly number[];
  };
  cashOut: {
    firstEligibilitySeconds: number;
    forcedRecoveryAtSeconds: number;
    quoteDurationSeconds: number;
    maximumOfferDelaySeconds: number;
    nextEligibilityBaseSeconds: number;
    nextEligibilityPerGreedSeconds: number;
    nextEligibilityGreedCap: number;
  };
  greed: {
    maximumPressure: number;
    pressurePerLevel: number;
    maximumRecoveryReduction: number;
    recoveryReductionPerLevel: number;
  };
  regimeThresholds: {
    rsi: {
      overboughtEnter: number;
      overboughtExit: number;
      oversoldEnter: number;
      oversoldExit: number;
      confirmationFrames: number;
    };
    volatility: {
      highEnter: number;
      extremeEnter: number;
      highExit: number;
      confirmationFrames: number;
    };
    volume: {
      surgeEnter: number;
      surgeExit: number;
      confirmationFrames: number;
    };
  };
  regime: {
    minimumDurationSeconds: number;
    volatilityReferenceAtrPercent: number;
    macdConfirmationFrames: number;
    minimumTrendStrength: number;
    whaleEventMinimumTier: number;
  };
};

export class DirectorConfigValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DirectorConfigValidationError';
  }
}

export const DIRECTOR_CONFIG_V1: DirectorConfigV1 = {
  versions: {
    directorVersion: 'director-v1',
    configVersion: 'director-config-v1',
    contentManifestHash: 'content-manifest-pending',
  },
  runtime: {
    updateFrequencyHz: 5,
    telemetryCapacity: 120,
  },
  presentation: {
    cueCooldownSeconds: 1,
    maximumSensoryLoad: 1,
    maximumShake: 0.45,
    maximumFlash: 0.35,
    maximumHitStop: 0.2,
    ambienceSmoothingSeconds: 2,
  },
  pacing: {
    buildUp: { minSeconds: 45, maxSeconds: 70, threatMultiplier: 0.75 },
    peak: { minSeconds: 20, maxSeconds: 35, threatMultiplier: 1.25 },
    peakFade: { minSeconds: 8, maxSeconds: 12, threatMultiplier: 0.85 },
    recovery: { minSeconds: 25, maxSeconds: 40, threatMultiplier: 0.35 },
    marketSurge: { maxSeconds: 20, threatMultiplier: 1.4 },
  },
  marketEvents: {
    minTelegraphSeconds: 2,
    initialSurgeLockoutSeconds: 90,
    defaultCooldownSeconds: 75,
    whaleCooldownSeconds: 120,
    queueCapacity: 1,
    maxPrimaryEncounters: 1,
    maxSupportEncounters: 1,
  },
  survival: {
    pressurePoints: [
      { elapsedSeconds: 0, pressure: 0.2 },
      { elapsedSeconds: 180, pressure: 0.3 },
      { elapsedSeconds: 480, pressure: 0.55 },
      { elapsedSeconds: 900, pressure: 0.85 },
      { elapsedSeconds: 1500, pressure: 1.15 },
      { elapsedSeconds: 2100, pressure: 1.4 },
    ],
    pressureCap: 1.4,
    doomStartsAtSeconds: 1500,
    doomStackIntervalSeconds: 300,
    recoveryReductionPerDoomStackSeconds: 2,
    minimumRecoverySeconds: 8,
    minimumSupportEfficiency: 0.4,
  },
  threat: {
    weights: { market: 0.35, headwind: 0.35, greed: 1, encounter: 0.3 },
    minimumTarget: 0.2,
    maximumTarget: 2,
    baseCreditsPerSecond: 1,
    maximumCreditBankSeconds: 8,
  },
  marketPressure: {
    weights: {
      volatility: 0.35,
      volume: 0.25,
      trend: 0.2,
      rsiExtremity: 0.1,
      whale: 0.1,
    },
    minimum: 0,
    maximum: 1,
  },
  advantage: {
    baseCreditsPerSecond: 1,
    regimeConfidenceBaseMultiplier: 0.6,
    regimeConfidenceWeight: 0.4,
    maximumCreditBankSeconds: 45,
    maximumActiveMechanics: 1,
  },
  encounters: {
    activeDurationSeconds: 12,
    recoveryDurationSeconds: 8,
    maximumHeadwindChannels: FINAL_ENCOUNTER_LIMITS.maximumHeadwindChannels,
    maximumConcurrentStatSpikes: FINAL_ENCOUNTER_LIMITS.maximumConcurrentStatSpikes,
    maximumSpawnDensityMultiplier: 1.5,
    liquidationHeadwindThreshold: 0.5,
  },
  enemyStatCaps: {
    ...FINAL_NORMAL_ENEMY_STAT_CAPS,
  },
  position: {
    alignmentScale: 0.05,
    alignmentEmaSeconds: 8,
    maximumPublicLeverage: Math.max(...LEVERAGE_OPTIONS),
    publicLeverageTiers: LEVERAGE_OPTIONS,
  },
  cashOut: {
    firstEligibilitySeconds: 300,
    forcedRecoveryAtSeconds: 345,
    quoteDurationSeconds: 15,
    maximumOfferDelaySeconds: 45,
    nextEligibilityBaseSeconds: 240,
    nextEligibilityPerGreedSeconds: 30,
    nextEligibilityGreedCap: 4,
  },
  greed: {
    maximumPressure: 0.5,
    pressurePerLevel: 0.1,
    maximumRecoveryReduction: 0.35,
    recoveryReductionPerLevel: 0.07,
  },
  regimeThresholds: {
    rsi: {
      overboughtEnter: 70,
      overboughtExit: 65,
      oversoldEnter: 30,
      oversoldExit: 35,
      confirmationFrames: 3,
    },
    volatility: {
      highEnter: 0.75,
      extremeEnter: 0.9,
      highExit: 0.6,
      confirmationFrames: 3,
    },
    volume: {
      surgeEnter: 0.8,
      surgeExit: 0.6,
      confirmationFrames: 3,
    },
  },
  regime: {
    minimumDurationSeconds: 3,
    volatilityReferenceAtrPercent: 0.02,
    macdConfirmationFrames: 2,
    minimumTrendStrength: 0.6,
    whaleEventMinimumTier: 2,
  },
};

const WEIGHT_SUM_EPSILON = 0.000001;

const assertFinitePositive = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DirectorConfigValidationError(
      `${label} must be a finite positive number`
    );
  }
};

const assertFiniteNonNegative = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new DirectorConfigValidationError(
      `${label} must be a finite non-negative number`
    );
  }
};

const assertRange = (range: DurationRange, label: string): void => {
  assertFinitePositive(range.minSeconds, `${label}.minSeconds`);
  assertFinitePositive(range.maxSeconds, `${label}.maxSeconds`);
  if (range.minSeconds > range.maxSeconds) {
    throw new DirectorConfigValidationError(`${label} minimum cannot exceed maximum`);
  }
};

const assertWeightTotal = (weights: Record<string, number>, label: string): void => {
  const total = Object.values(weights).reduce((sum, weight) => {
    assertFiniteNonNegative(weight, `${label} weight`);
    return sum + weight;
  }, 0);

  if (Math.abs(total - 1) > WEIGHT_SUM_EPSILON) {
    throw new DirectorConfigValidationError(
      `${label} weights must total 1; received ${total}`
    );
  }
};

const assertIntegerAtLeast = (value: number, minimum: number, label: string): void => {
  if (!Number.isInteger(value) || value < minimum) {
    throw new DirectorConfigValidationError(
      `${label} must be an integer of at least ${minimum}`
    );
  }
};

export const validateDirectorConfig = (config: DirectorConfigV1): DirectorConfigV1 => {
  const {
    pacing,
    marketEvents,
    survival,
    threat,
    marketPressure,
    advantage,
    encounters,
  } = config;

  if (
    !config.versions.directorVersion ||
    !config.versions.configVersion ||
    !config.versions.contentManifestHash
  ) {
    throw new DirectorConfigValidationError(
      'director, config, and content manifest versions are required'
    );
  }

  assertFinitePositive(config.runtime.updateFrequencyHz, 'runtime.updateFrequencyHz');
  assertIntegerAtLeast(
    config.runtime.telemetryCapacity,
    1,
    'runtime.telemetryCapacity'
  );
  assertFinitePositive(
    config.presentation.cueCooldownSeconds,
    'presentation.cueCooldownSeconds'
  );
  assertFinitePositive(
    config.presentation.maximumSensoryLoad,
    'presentation.maximumSensoryLoad'
  );
  assertFiniteNonNegative(
    config.presentation.maximumShake,
    'presentation.maximumShake'
  );
  assertFiniteNonNegative(
    config.presentation.maximumFlash,
    'presentation.maximumFlash'
  );
  assertFiniteNonNegative(
    config.presentation.maximumHitStop,
    'presentation.maximumHitStop'
  );
  assertFinitePositive(
    config.presentation.ambienceSmoothingSeconds,
    'presentation.ambienceSmoothingSeconds'
  );

  assertRange(pacing.buildUp, 'pacing.buildUp');
  assertRange(pacing.peak, 'pacing.peak');
  assertRange(pacing.peakFade, 'pacing.peakFade');
  assertRange(pacing.recovery, 'pacing.recovery');
  assertFinitePositive(pacing.marketSurge.maxSeconds, 'pacing.marketSurge.maxSeconds');

  for (const [label, multiplier] of [
    ['pacing.buildUp.threatMultiplier', pacing.buildUp.threatMultiplier],
    ['pacing.peak.threatMultiplier', pacing.peak.threatMultiplier],
    ['pacing.peakFade.threatMultiplier', pacing.peakFade.threatMultiplier],
    ['pacing.recovery.threatMultiplier', pacing.recovery.threatMultiplier],
    ['pacing.marketSurge.threatMultiplier', pacing.marketSurge.threatMultiplier],
  ] as const) {
    assertFinitePositive(multiplier, label);
  }

  assertWeightTotal(marketPressure.weights, 'marketPressure');
  assertFiniteNonNegative(marketPressure.minimum, 'marketPressure.minimum');
  assertFinitePositive(marketPressure.maximum, 'marketPressure.maximum');
  if (marketPressure.minimum > marketPressure.maximum) {
    throw new DirectorConfigValidationError(
      'marketPressure minimum cannot exceed maximum'
    );
  }

  assertFiniteNonNegative(threat.weights.market, 'threat.weights.market');
  assertFiniteNonNegative(threat.weights.headwind, 'threat.weights.headwind');
  assertFiniteNonNegative(threat.weights.greed, 'threat.weights.greed');
  assertFiniteNonNegative(threat.weights.encounter, 'threat.weights.encounter');
  assertFinitePositive(threat.minimumTarget, 'threat.minimumTarget');
  assertFinitePositive(threat.maximumTarget, 'threat.maximumTarget');
  if (threat.minimumTarget > threat.maximumTarget) {
    throw new DirectorConfigValidationError('threat minimum cannot exceed maximum');
  }
  assertFinitePositive(threat.baseCreditsPerSecond, 'threat.baseCreditsPerSecond');
  assertFinitePositive(
    threat.maximumCreditBankSeconds,
    'threat.maximumCreditBankSeconds'
  );

  let previousElapsedSeconds = -1;
  for (const point of survival.pressurePoints) {
    assertFiniteNonNegative(
      point.elapsedSeconds,
      'survival pressure point elapsedSeconds'
    );
    assertFiniteNonNegative(point.pressure, 'survival pressure point pressure');
    if (point.elapsedSeconds <= previousElapsedSeconds) {
      throw new DirectorConfigValidationError(
        'survival pressure points must be strictly ordered'
      );
    }
    previousElapsedSeconds = point.elapsedSeconds;
  }
  assertFinitePositive(survival.pressureCap, 'survival.pressureCap');
  assertFinitePositive(survival.doomStartsAtSeconds, 'survival.doomStartsAtSeconds');
  assertFinitePositive(
    survival.doomStackIntervalSeconds,
    'survival.doomStackIntervalSeconds'
  );
  assertFinitePositive(
    survival.recoveryReductionPerDoomStackSeconds,
    'survival.recoveryReductionPerDoomStackSeconds'
  );
  assertFinitePositive(
    survival.minimumRecoverySeconds,
    'survival.minimumRecoverySeconds'
  );
  assertFinitePositive(
    survival.minimumSupportEfficiency,
    'survival.minimumSupportEfficiency'
  );
  if (survival.minimumRecoverySeconds > pacing.recovery.maxSeconds) {
    throw new DirectorConfigValidationError(
      'minimum recovery cannot exceed recovery maximum'
    );
  }

  for (const [label, value] of Object.entries(marketEvents)) {
    assertIntegerAtLeast(value, 1, `marketEvents.${label}`);
  }
  assertFinitePositive(
    advantage.baseCreditsPerSecond,
    'advantage.baseCreditsPerSecond'
  );
  assertWeightTotal(
    {
      base: advantage.regimeConfidenceBaseMultiplier,
      confidence: advantage.regimeConfidenceWeight,
    },
    'advantage regime confidence'
  );
  assertFinitePositive(
    advantage.maximumCreditBankSeconds,
    'advantage.maximumCreditBankSeconds'
  );
  assertIntegerAtLeast(
    advantage.maximumActiveMechanics,
    1,
    'advantage.maximumActiveMechanics'
  );

  assertFinitePositive(
    encounters.activeDurationSeconds,
    'encounters.activeDurationSeconds'
  );
  assertFinitePositive(
    encounters.recoveryDurationSeconds,
    'encounters.recoveryDurationSeconds'
  );
  assertIntegerAtLeast(
    encounters.maximumHeadwindChannels,
    1,
    'encounters.maximumHeadwindChannels'
  );
  if (
    encounters.maximumHeadwindChannels > FINAL_ENCOUNTER_LIMITS.maximumHeadwindChannels
  ) {
    throw new DirectorConfigValidationError(
      'encounter headwind channel limit cannot exceed the final contract'
    );
  }
  assertIntegerAtLeast(
    encounters.maximumConcurrentStatSpikes,
    1,
    'encounters.maximumConcurrentStatSpikes'
  );
  if (
    encounters.maximumConcurrentStatSpikes >
    FINAL_ENCOUNTER_LIMITS.maximumConcurrentStatSpikes
  ) {
    throw new DirectorConfigValidationError(
      'encounter stat spike limit cannot exceed the final contract'
    );
  }
  assertFinitePositive(
    encounters.maximumSpawnDensityMultiplier,
    'encounters.maximumSpawnDensityMultiplier'
  );
  assertFiniteNonNegative(
    encounters.liquidationHeadwindThreshold,
    'encounters.liquidationHeadwindThreshold'
  );
  if (encounters.liquidationHeadwindThreshold > 1) {
    throw new DirectorConfigValidationError(
      'encounters.liquidationHeadwindThreshold cannot exceed 1'
    );
  }

  for (const [label, cap] of Object.entries(config.enemyStatCaps)) {
    assertFinitePositive(cap, `enemyStatCaps.${label}`);
  }
  if (
    config.enemyStatCaps.normalHealth > FINAL_NORMAL_ENEMY_STAT_CAPS.normalHealth ||
    config.enemyStatCaps.normalDamage > FINAL_NORMAL_ENEMY_STAT_CAPS.normalDamage ||
    config.enemyStatCaps.normalSpeed > FINAL_NORMAL_ENEMY_STAT_CAPS.normalSpeed
  ) {
    throw new DirectorConfigValidationError(
      'enemy stat caps cannot exceed the final contract'
    );
  }
  assertFinitePositive(config.position.alignmentScale, 'position.alignmentScale');
  assertFinitePositive(
    config.position.alignmentEmaSeconds,
    'position.alignmentEmaSeconds'
  );
  assertFinitePositive(
    config.position.maximumPublicLeverage,
    'position.maximumPublicLeverage'
  );
  if (
    config.position.publicLeverageTiers.length === 0 ||
    config.position.publicLeverageTiers.some(
      tier =>
        !Number.isFinite(tier) ||
        tier <= 0 ||
        tier > config.position.maximumPublicLeverage
    )
  ) {
    throw new DirectorConfigValidationError(
      'position public leverage tiers are invalid'
    );
  }
  for (const [label, value] of Object.entries(config.cashOut)) {
    assertFinitePositive(value, `cashOut.${label}`);
  }
  for (const [label, value] of Object.entries(config.greed)) {
    assertFiniteNonNegative(value, `greed.${label}`);
  }

  const { rsi, volatility, volume } = config.regimeThresholds;
  if (
    rsi.oversoldEnter >= rsi.oversoldExit ||
    rsi.overboughtExit >= rsi.overboughtEnter
  ) {
    throw new DirectorConfigValidationError(
      'RSI entry and exit thresholds must include hysteresis'
    );
  }
  if (
    volatility.highExit >= volatility.highEnter ||
    volatility.highEnter >= volatility.extremeEnter
  ) {
    throw new DirectorConfigValidationError(
      'volatility thresholds must include ordered hysteresis'
    );
  }
  if (volume.surgeExit >= volume.surgeEnter) {
    throw new DirectorConfigValidationError(
      'volume thresholds must include hysteresis'
    );
  }
  assertIntegerAtLeast(
    rsi.confirmationFrames,
    1,
    'regimeThresholds.rsi.confirmationFrames'
  );
  assertIntegerAtLeast(
    volatility.confirmationFrames,
    1,
    'regimeThresholds.volatility.confirmationFrames'
  );
  assertIntegerAtLeast(
    volume.confirmationFrames,
    1,
    'regimeThresholds.volume.confirmationFrames'
  );

  assertFinitePositive(
    config.regime.minimumDurationSeconds,
    'regime.minimumDurationSeconds'
  );
  assertFinitePositive(
    config.regime.volatilityReferenceAtrPercent,
    'regime.volatilityReferenceAtrPercent'
  );
  assertIntegerAtLeast(
    config.regime.macdConfirmationFrames,
    1,
    'regime.macdConfirmationFrames'
  );
  assertFiniteNonNegative(
    config.regime.minimumTrendStrength,
    'regime.minimumTrendStrength'
  );
  assertIntegerAtLeast(
    config.regime.whaleEventMinimumTier,
    1,
    'regime.whaleEventMinimumTier'
  );

  return config;
};

validateDirectorConfig(DIRECTOR_CONFIG_V1);
