import { DIFFICULTY_RUNTIME_CONFIG } from '../config/difficulty/DifficultyRuntimeConfig';

export type PositionSide = 'long' | 'short';
export type TrendAlignment = 'with_player' | 'against_player' | 'neutral';

export const DECISION_QUALITIES = ['LIVE', 'DEGRADED', 'NEUTRAL'] as const;
export type DecisionQuality = (typeof DECISION_QUALITIES)[number];

export type ReadonlyDeep<TValue> = TValue extends (...args: never[]) => unknown
  ? TValue
  : TValue extends readonly (infer TItem)[]
    ? readonly ReadonlyDeep<TItem>[]
    : TValue extends object
      ? { readonly [TKey in keyof TValue]: ReadonlyDeep<TValue[TKey]> }
      : TValue;

export type UnitInterval = number;
export type DifficultyReasonCode =
  (typeof DIFFICULTY_RUNTIME_CONFIG.reasonCodes)[number];
export type DifficultyClampCode = (typeof DIFFICULTY_RUNTIME_CONFIG.clampCodes)[number];

export type MarketDecisionSummary = {
  sourceSequence: number;
  quality: DecisionQuality;
  regime: 'CALM' | 'BULL_TREND' | 'BEAR_TREND' | 'VOLATILE' | 'PANIC' | 'SQUEEZE';
  confidence: UnitInterval;
  pressure: UnitInterval;
  volatility: UnitInterval;
  volume: UnitInterval;
  trend: number;
  rsiExtremity: UnitInterval;
  whalePressure: UnitInterval;
  activeEventFamily: string | null;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type PlayerDecisionSummary = {
  flowState: 'BORED' | 'FLOW' | 'STRESSED';
  engagement: UnitInterval;
  frustration: UnitInterval;
  combatMastery: UnitInterval;
  buildPower: UnitInterval;
  recentDamagePressure: UnitInterval;
  killsPerMinute: number;
  mobilityUsage: UnitInterval;
  screenPressure: UnitInterval;
  recoveryNeed: UnitInterval;
  challengeAdjustment: number;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type PositionRiskSummary = {
  alignment: number;
  advantage: UnitInterval;
  headwind: UnitInterval;
  leverageRisk: UnitInterval;
  liquidationProximity: UnitInterval;
  isLiquidated: boolean;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type PacingDecisionSummary = {
  phase: 'BUILD_UP' | 'PEAK' | 'PEAK_FADE' | 'RECOVERY' | 'MARKET_SURGE' | 'DOOM';
  baselinePressure: UnitInterval;
  minimumPressure: UnitInterval;
  maximumPressure: UnitInterval;
  remainingSeconds: number;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type SpawnDirective = {
  archetype: string;
  intent: 'fodder' | 'pressure' | 'counter' | 'ranged' | 'boss';
  allocation: UnitInterval;
};

export type SpawnDecisionSummary = {
  revision: number;
  seed: number;
  spawnWindowSeconds: number;
  maximumActiveEnemies: number;
  behaviorTier: number;
  availableCredits: number;
  reservedCredits: number;
  remainingCredits: number;
  directives: readonly SpawnDirective[];
};

export type EncounterStatModifiers = {
  healthMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  spawnDensityMultiplier: number;
};

export type EncounterDecisionSummary = {
  phase: 'IDLE' | 'TELEGRAPH' | 'ACTIVE' | 'RECOVERY' | 'COOLDOWN';
  family: string | null;
  primaryCardId: string | null;
  supportCardId: string | null;
  headwindChannels: readonly string[];
  statModifiers: EncounterStatModifiers;
  reservedCredits: number;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type RecoveryDecisionSummary = {
  mercy: UnitInterval;
  recoveryNeed: UnitInterval;
  advantageCreditRate: number;
  availableAdvantageCredits: number;
  activeMechanic: string | null;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type DifficultyManagerContribution = {
  manager: string;
  inputRevision: number;
  quality: DecisionQuality;
  requestedPressure: UnitInterval;
  reasonCodes: readonly DifficultyReasonCode[];
};

export type DifficultyDecisionTrace = {
  inputRevisions: { market: number; player: number; run: number; world: number };
  managerContributions: readonly DifficultyManagerContribution[];
  requestedPressure: UnitInterval;
  finalPressure: UnitInterval;
  clampCodes: readonly DifficultyClampCode[];
  fallbackCodes: readonly DifficultyReasonCode[];
  rejectedEncounterCardIds: readonly string[];
};

type RuntimeDifficultySnapshotValue = {
  meta: {
    revision: number;
    validFromTick: number;
    inputRevision: number;
    decisionId: string;
    algoVersion: string;
    configVersion: string;
    quality: DecisionQuality;
  };
  signals: {
    market: MarketDecisionSummary;
    player: PlayerDecisionSummary;
    position: PositionRiskSummary;
    pacing: PacingDecisionSummary;
  };
  pressure: {
    total: number;
    band: 'RELIEF' | 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    threatTarget: number;
    creditRate: number;
    availableCredits: number;
    maximumCredits: number;
    spawnCadence: number;
    maximumActiveEnemies: number;
  };
  spawn: SpawnDecisionSummary;
  enemy: {
    healthMultiplier: number;
    damageMultiplier: number;
    speedMultiplier: number;
    varietyMultiplier: number;
    behaviorTier: number;
  };
  recovery: {
    mercy: number;
    recoveryNeed: number;
    advantageCreditRate: number;
    availableAdvantageCredits: number;
    activeMechanic: string | null;
  };
  rewards: {
    xpMultiplier: number;
    gemDropMultiplier: number;
    lootOpportunityMultiplier: number;
  };
  encounter: EncounterDecisionSummary;
  presentation: {
    intensity: number;
    suggestedBpm: number;
    shakeLimit: number;
    audioIntensity: number;
  };
  trace: DifficultyDecisionTrace;
};

export type RuntimeDifficultySnapshot = ReadonlyDeep<RuntimeDifficultySnapshotValue>;

type NeutralSnapshotInput = {
  tick: number;
  inputRevision: number;
};

type NumericRange = {
  readonly minimum: number;
  readonly maximum: number;
  readonly integer: boolean;
};

const deepFreeze = <TValue>(value: TValue): ReadonlyDeep<TValue> => {
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      deepFreeze(record[key]);
    }
    Object.freeze(value);
  }

  return value as ReadonlyDeep<TValue>;
};

const assertRecursivelyFrozen = (value: unknown, path: string): void => {
  if (value === null || typeof value !== 'object') return;
  if (!Object.isFrozen(value)) {
    throw new Error(
      `Runtime difficulty snapshot must be recursively frozen at ${path}`
    );
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    assertRecursivelyFrozen(record[key], `${path}.${key}`);
  }
};

const assertNumericRange = (value: number, range: NumericRange, path: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${path} must be finite`);
  }
  if (value < range.minimum || value > range.maximum) {
    throw new Error(`${path} is outside its configured range`);
  }
  if (range.integer && !Number.isInteger(value)) {
    throw new Error(`${path} must be an integer within its configured range`);
  }
};

const assertReasonCodes = (codes: readonly string[], path: string): void => {
  for (const code of codes) {
    if (!(DIFFICULTY_RUNTIME_CONFIG.reasonCodes as readonly string[]).includes(code)) {
      throw new Error(`${path} contains an unregistered reason code: ${code}`);
    }
  }
};

const assertClampCodes = (codes: readonly string[], path: string): void => {
  for (const code of codes) {
    if (!(DIFFICULTY_RUNTIME_CONFIG.clampCodes as readonly string[]).includes(code)) {
      throw new Error(`${path} contains an unregistered clamp code: ${code}`);
    }
  }
};

export const createNeutralRuntimeDifficultySnapshot = ({
  tick,
  inputRevision,
}: NeutralSnapshotInput): RuntimeDifficultySnapshot => {
  const neutral = DIFFICULTY_RUNTIME_CONFIG.neutral;
  const reasonCodes: DifficultyReasonCode[] = [neutral.reasonCode];
  const snapshot: RuntimeDifficultySnapshotValue = {
    meta: {
      revision: 0,
      validFromTick: tick,
      inputRevision,
      decisionId: `neutral:0:${tick}:${inputRevision}`,
      algoVersion: DIFFICULTY_RUNTIME_CONFIG.versions.algorithm,
      configVersion: DIFFICULTY_RUNTIME_CONFIG.versions.config,
      quality: neutral.quality,
    },
    signals: {
      market: {
        sourceSequence: neutral.sourceSequence,
        quality: neutral.quality,
        regime: neutral.marketRegime,
        confidence: neutral.unitInterval,
        pressure: neutral.unitInterval,
        volatility: neutral.unitInterval,
        volume: neutral.unitInterval,
        trend: neutral.unitInterval,
        rsiExtremity: neutral.unitInterval,
        whalePressure: neutral.unitInterval,
        activeEventFamily: null,
        reasonCodes: [...reasonCodes],
      },
      player: {
        flowState: neutral.playerFlowState,
        engagement: neutral.unitInterval,
        frustration: neutral.unitInterval,
        combatMastery: neutral.unitInterval,
        buildPower: neutral.unitInterval,
        recentDamagePressure: neutral.unitInterval,
        killsPerMinute: neutral.unitInterval,
        mobilityUsage: neutral.unitInterval,
        screenPressure: neutral.unitInterval,
        recoveryNeed: neutral.unitInterval,
        challengeAdjustment: neutral.unitInterval,
        reasonCodes: [...reasonCodes],
      },
      position: {
        alignment: neutral.unitInterval,
        advantage: neutral.unitInterval,
        headwind: neutral.unitInterval,
        leverageRisk: neutral.unitInterval,
        liquidationProximity: neutral.unitInterval,
        isLiquidated: false,
        reasonCodes: [...reasonCodes],
      },
      pacing: {
        phase: neutral.pacingPhase,
        baselinePressure: neutral.unitInterval,
        minimumPressure: neutral.unitInterval,
        maximumPressure: neutral.unitInterval,
        remainingSeconds: neutral.durationSeconds,
        reasonCodes: [...reasonCodes],
      },
    },
    pressure: {
      total: neutral.unitInterval,
      band: neutral.pressureBand,
      threatTarget: neutral.unitInterval,
      creditRate: neutral.unitInterval,
      availableCredits: neutral.unitInterval,
      maximumCredits: neutral.unitInterval,
      spawnCadence: neutral.durationSeconds,
      maximumActiveEnemies: neutral.count,
    },
    spawn: {
      revision: 0,
      seed: neutral.seed,
      spawnWindowSeconds: neutral.durationSeconds,
      maximumActiveEnemies: neutral.count,
      behaviorTier: neutral.behaviorTier,
      availableCredits: neutral.unitInterval,
      reservedCredits: neutral.unitInterval,
      remainingCredits: neutral.unitInterval,
      directives: [],
    },
    enemy: {
      healthMultiplier: neutral.multiplier,
      damageMultiplier: neutral.multiplier,
      speedMultiplier: neutral.multiplier,
      varietyMultiplier: neutral.multiplier,
      behaviorTier: neutral.behaviorTier,
    },
    recovery: {
      mercy: neutral.unitInterval,
      recoveryNeed: neutral.unitInterval,
      advantageCreditRate: neutral.unitInterval,
      availableAdvantageCredits: neutral.unitInterval,
      activeMechanic: null,
    },
    rewards: {
      xpMultiplier: neutral.multiplier,
      gemDropMultiplier: neutral.multiplier,
      lootOpportunityMultiplier: neutral.multiplier,
    },
    encounter: {
      phase: neutral.encounterPhase,
      family: null,
      primaryCardId: null,
      supportCardId: null,
      headwindChannels: [],
      statModifiers: {
        healthMultiplier: neutral.multiplier,
        damageMultiplier: neutral.multiplier,
        speedMultiplier: neutral.multiplier,
        spawnDensityMultiplier: neutral.multiplier,
      },
      reservedCredits: neutral.unitInterval,
      reasonCodes: [...reasonCodes],
    },
    presentation: {
      intensity: neutral.unitInterval,
      suggestedBpm: neutral.suggestedBpm,
      shakeLimit: neutral.unitInterval,
      audioIntensity: neutral.unitInterval,
    },
    trace: {
      inputRevisions: {
        market: 0,
        player: 0,
        run: 0,
        world: 0,
      },
      managerContributions: [],
      requestedPressure: neutral.unitInterval,
      finalPressure: neutral.unitInterval,
      clampCodes: [],
      fallbackCodes: [],
      rejectedEncounterCardIds: [],
    },
  };

  return deepFreeze(snapshot);
};

export const assertRuntimeDifficultySnapshot = (
  snapshot: RuntimeDifficultySnapshot,
  previousSnapshot: RuntimeDifficultySnapshot | null = null
): void => {
  const ranges = DIFFICULTY_RUNTIME_CONFIG.ranges;
  assertRecursivelyFrozen(snapshot, 'snapshot');

  assertNumericRange(snapshot.meta.revision, ranges.revision, 'meta.revision');
  assertNumericRange(snapshot.meta.validFromTick, ranges.tick, 'meta.validFromTick');
  assertNumericRange(
    snapshot.meta.inputRevision,
    ranges.inputRevision,
    'meta.inputRevision'
  );
  if (!DECISION_QUALITIES.includes(snapshot.meta.quality)) {
    throw new Error(`Unknown decision quality: ${snapshot.meta.quality}`);
  }
  if (
    snapshot.meta.decisionId.length === 0 ||
    snapshot.meta.algoVersion.length === 0 ||
    snapshot.meta.configVersion.length === 0
  ) {
    throw new Error('Runtime difficulty metadata strings must be present');
  }

  if (previousSnapshot !== null) {
    if (
      snapshot.meta.revision <= previousSnapshot.meta.revision ||
      snapshot.meta.validFromTick < previousSnapshot.meta.validFromTick ||
      snapshot.meta.inputRevision < previousSnapshot.meta.inputRevision
    ) {
      throw new Error('Runtime difficulty commit metadata must be monotonic');
    }
  }

  const market = snapshot.signals.market;
  assertNumericRange(
    market.sourceSequence,
    ranges.sourceSequence,
    'signals.market.sourceSequence'
  );
  assertNumericRange(
    market.confidence,
    ranges.unitInterval,
    'signals.market.confidence'
  );
  assertNumericRange(market.pressure, ranges.unitInterval, 'signals.market.pressure');
  assertNumericRange(
    market.volatility,
    ranges.unitInterval,
    'signals.market.volatility'
  );
  assertNumericRange(market.volume, ranges.unitInterval, 'signals.market.volume');
  assertNumericRange(market.trend, ranges.alignment, 'signals.market.trend');
  assertNumericRange(
    market.rsiExtremity,
    ranges.unitInterval,
    'signals.market.rsiExtremity'
  );
  assertNumericRange(
    market.whalePressure,
    ranges.unitInterval,
    'signals.market.whalePressure'
  );
  assertReasonCodes(market.reasonCodes, 'signals.market.reasonCodes');

  const player = snapshot.signals.player;
  assertNumericRange(
    player.engagement,
    ranges.unitInterval,
    'signals.player.engagement'
  );
  assertNumericRange(
    player.frustration,
    ranges.unitInterval,
    'signals.player.frustration'
  );
  assertNumericRange(
    player.combatMastery,
    ranges.unitInterval,
    'signals.player.combatMastery'
  );
  assertNumericRange(
    player.buildPower,
    ranges.unitInterval,
    'signals.player.buildPower'
  );
  assertNumericRange(
    player.recentDamagePressure,
    ranges.unitInterval,
    'signals.player.recentDamagePressure'
  );
  assertNumericRange(
    player.killsPerMinute,
    ranges.killsPerMinute,
    'signals.player.killsPerMinute'
  );
  assertNumericRange(
    player.mobilityUsage,
    ranges.unitInterval,
    'signals.player.mobilityUsage'
  );
  assertNumericRange(
    player.screenPressure,
    ranges.unitInterval,
    'signals.player.screenPressure'
  );
  assertNumericRange(
    player.recoveryNeed,
    ranges.unitInterval,
    'signals.player.recoveryNeed'
  );
  assertNumericRange(
    player.challengeAdjustment,
    ranges.challengeAdjustment,
    'signals.player.challengeAdjustment'
  );
  assertReasonCodes(player.reasonCodes, 'signals.player.reasonCodes');

  const position = snapshot.signals.position;
  assertNumericRange(
    position.alignment,
    ranges.alignment,
    'signals.position.alignment'
  );
  assertNumericRange(
    position.advantage,
    ranges.unitInterval,
    'signals.position.advantage'
  );
  assertNumericRange(
    position.headwind,
    ranges.unitInterval,
    'signals.position.headwind'
  );
  assertNumericRange(
    position.leverageRisk,
    ranges.unitInterval,
    'signals.position.leverageRisk'
  );
  assertNumericRange(
    position.liquidationProximity,
    ranges.unitInterval,
    'signals.position.liquidationProximity'
  );
  assertReasonCodes(position.reasonCodes, 'signals.position.reasonCodes');

  const pacing = snapshot.signals.pacing;
  assertNumericRange(
    pacing.baselinePressure,
    ranges.unitInterval,
    'signals.pacing.baselinePressure'
  );
  assertNumericRange(
    pacing.minimumPressure,
    ranges.unitInterval,
    'signals.pacing.minimumPressure'
  );
  assertNumericRange(
    pacing.maximumPressure,
    ranges.unitInterval,
    'signals.pacing.maximumPressure'
  );
  assertNumericRange(
    pacing.remainingSeconds,
    ranges.durationSeconds,
    'signals.pacing.remainingSeconds'
  );
  assertReasonCodes(pacing.reasonCodes, 'signals.pacing.reasonCodes');

  assertNumericRange(snapshot.pressure.total, ranges.unitInterval, 'pressure.total');
  assertNumericRange(
    snapshot.pressure.threatTarget,
    ranges.unitInterval,
    'pressure.threatTarget'
  );
  assertNumericRange(
    snapshot.pressure.creditRate,
    ranges.creditRate,
    'pressure.creditRate'
  );
  assertNumericRange(
    snapshot.pressure.availableCredits,
    ranges.credits,
    'pressure.availableCredits'
  );
  assertNumericRange(
    snapshot.pressure.maximumCredits,
    ranges.credits,
    'pressure.maximumCredits'
  );
  assertNumericRange(
    snapshot.pressure.spawnCadence,
    ranges.durationSeconds,
    'pressure.spawnCadence'
  );
  assertNumericRange(
    snapshot.pressure.maximumActiveEnemies,
    ranges.activeEnemyCount,
    'pressure.maximumActiveEnemies'
  );

  assertNumericRange(snapshot.spawn.revision, ranges.revision, 'spawn.revision');
  assertNumericRange(snapshot.spawn.seed, ranges.seed, 'spawn.seed');
  assertNumericRange(
    snapshot.spawn.spawnWindowSeconds,
    ranges.durationSeconds,
    'spawn.spawnWindowSeconds'
  );
  assertNumericRange(
    snapshot.spawn.maximumActiveEnemies,
    ranges.activeEnemyCount,
    'spawn.maximumActiveEnemies'
  );
  assertNumericRange(
    snapshot.spawn.behaviorTier,
    ranges.behaviorTier,
    'spawn.behaviorTier'
  );
  assertNumericRange(
    snapshot.spawn.availableCredits,
    ranges.credits,
    'spawn.availableCredits'
  );
  assertNumericRange(
    snapshot.spawn.reservedCredits,
    ranges.credits,
    'spawn.reservedCredits'
  );
  assertNumericRange(
    snapshot.spawn.remainingCredits,
    ranges.credits,
    'spawn.remainingCredits'
  );
  if (snapshot.spawn.revision !== snapshot.meta.revision) {
    throw new Error('Spawn revision must match the committed snapshot revision');
  }
  for (const directive of snapshot.spawn.directives) {
    assertNumericRange(
      directive.allocation,
      ranges.unitInterval,
      'spawn.directives.allocation'
    );
  }

  assertNumericRange(
    snapshot.enemy.healthMultiplier,
    ranges.enemyHealthMultiplier,
    'enemy.healthMultiplier'
  );
  assertNumericRange(
    snapshot.enemy.damageMultiplier,
    ranges.enemyDamageMultiplier,
    'enemy.damageMultiplier'
  );
  assertNumericRange(
    snapshot.enemy.speedMultiplier,
    ranges.enemySpeedMultiplier,
    'enemy.speedMultiplier'
  );
  assertNumericRange(
    snapshot.enemy.varietyMultiplier,
    ranges.enemyVarietyMultiplier,
    'enemy.varietyMultiplier'
  );
  assertNumericRange(
    snapshot.enemy.behaviorTier,
    ranges.behaviorTier,
    'enemy.behaviorTier'
  );

  assertNumericRange(snapshot.recovery.mercy, ranges.unitInterval, 'recovery.mercy');
  assertNumericRange(
    snapshot.recovery.recoveryNeed,
    ranges.unitInterval,
    'recovery.recoveryNeed'
  );
  assertNumericRange(
    snapshot.recovery.advantageCreditRate,
    ranges.creditRate,
    'recovery.advantageCreditRate'
  );
  assertNumericRange(
    snapshot.recovery.availableAdvantageCredits,
    ranges.credits,
    'recovery.availableAdvantageCredits'
  );

  assertNumericRange(
    snapshot.rewards.xpMultiplier,
    ranges.rewardMultiplier,
    'rewards.xpMultiplier'
  );
  assertNumericRange(
    snapshot.rewards.gemDropMultiplier,
    ranges.rewardMultiplier,
    'rewards.gemDropMultiplier'
  );
  assertNumericRange(
    snapshot.rewards.lootOpportunityMultiplier,
    ranges.rewardMultiplier,
    'rewards.lootOpportunityMultiplier'
  );

  assertReasonCodes(snapshot.encounter.reasonCodes, 'encounter.reasonCodes');
  assertNumericRange(
    snapshot.encounter.statModifiers.healthMultiplier,
    ranges.enemyHealthMultiplier,
    'encounter.statModifiers.healthMultiplier'
  );
  assertNumericRange(
    snapshot.encounter.statModifiers.damageMultiplier,
    ranges.enemyDamageMultiplier,
    'encounter.statModifiers.damageMultiplier'
  );
  assertNumericRange(
    snapshot.encounter.statModifiers.speedMultiplier,
    ranges.enemySpeedMultiplier,
    'encounter.statModifiers.speedMultiplier'
  );
  assertNumericRange(
    snapshot.encounter.statModifiers.spawnDensityMultiplier,
    ranges.enemyVarietyMultiplier,
    'encounter.statModifiers.spawnDensityMultiplier'
  );
  assertNumericRange(
    snapshot.encounter.reservedCredits,
    ranges.credits,
    'encounter.reservedCredits'
  );
  assertNumericRange(
    snapshot.presentation.intensity,
    ranges.unitInterval,
    'presentation.intensity'
  );
  assertNumericRange(
    snapshot.presentation.suggestedBpm,
    ranges.suggestedBpm,
    'presentation.suggestedBpm'
  );
  assertNumericRange(
    snapshot.presentation.shakeLimit,
    ranges.unitInterval,
    'presentation.shakeLimit'
  );
  assertNumericRange(
    snapshot.presentation.audioIntensity,
    ranges.unitInterval,
    'presentation.audioIntensity'
  );

  const inputRevisions = snapshot.trace.inputRevisions;
  assertNumericRange(
    inputRevisions.market,
    ranges.inputRevision,
    'trace.inputRevisions.market'
  );
  assertNumericRange(
    inputRevisions.player,
    ranges.inputRevision,
    'trace.inputRevisions.player'
  );
  assertNumericRange(
    inputRevisions.run,
    ranges.inputRevision,
    'trace.inputRevisions.run'
  );
  assertNumericRange(
    inputRevisions.world,
    ranges.inputRevision,
    'trace.inputRevisions.world'
  );
  assertNumericRange(
    snapshot.trace.requestedPressure,
    ranges.unitInterval,
    'trace.requestedPressure'
  );
  assertNumericRange(
    snapshot.trace.finalPressure,
    ranges.unitInterval,
    'trace.finalPressure'
  );
  assertClampCodes(snapshot.trace.clampCodes, 'trace.clampCodes');
  assertReasonCodes(snapshot.trace.fallbackCodes, 'trace.fallbackCodes');
  for (const contribution of snapshot.trace.managerContributions) {
    assertNumericRange(
      contribution.inputRevision,
      ranges.inputRevision,
      'trace.managerContributions.inputRevision'
    );
    assertNumericRange(
      contribution.requestedPressure,
      ranges.unitInterval,
      'trace.managerContributions.requestedPressure'
    );
    assertReasonCodes(
      contribution.reasonCodes,
      'trace.managerContributions.reasonCodes'
    );
  }
};
