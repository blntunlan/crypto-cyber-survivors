import { DIFFICULTY_RUNTIME_CONFIG } from '../../../config/difficulty/DifficultyRuntimeConfig';
import { DIRECTOR_CONFIG_V1 } from '../../director/config/DirectorConfigV1';
import {
  assertRuntimeDifficultySnapshot,
  type DifficultyDecisionTrace,
  type DifficultyReasonCode,
  type ReadonlyDeep,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';
import {
  type DifficultyRevisionVector,
  type DifficultyWorldPressure,
  type EncounterDecision,
  type MarketRegimeDecision,
  type PacingDecision,
  type PlayerAdaptationDecision,
  type PositionRiskDecision,
  type RecoveryBudgetDecision,
  type ThreatReservation,
} from './contracts';
import { DifficultyDecisionTraceRing } from './DifficultyDecisionTraceRing';

export type DifficultySnapshotCompositionInput = {
  tick: number;
  elapsedSeconds: number;
  inputRevision: number;
  inputRevisions: Readonly<DifficultyRevisionVector>;
  seed: number;
  world: Readonly<DifficultyWorldPressure>;
  market: MarketRegimeDecision;
  player: PlayerAdaptationDecision;
  position: PositionRiskDecision;
  pacing: PacingDecision;
  recovery: RecoveryBudgetDecision;
  reservation: Readonly<ThreatReservation>;
  encounter: EncounterDecision;
  fallbackCodes: readonly DifficultyReasonCode[];
};

export type DifficultySnapshotComposerOptions = {
  traceRing?: DifficultyDecisionTraceRing;
  onCommit?: (snapshot: RuntimeDifficultySnapshot) => void;
};

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const deepFreeze = <TValue>(value: TValue): ReadonlyDeep<TValue> => {
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) deepFreeze(record[key]);
    Object.freeze(value);
  }
  return value as ReadonlyDeep<TValue>;
};

const canonicalStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map(
    key => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`
  );
  return `{${pairs.join(',')}}`;
};

const createHash = (value: unknown): string => {
  const serialized = canonicalStringify(value);
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const resolvePressureBand = (
  pressure: number
): RuntimeDifficultySnapshot['pressure']['band'] => {
  const bands = DIFFICULTY_RUNTIME_CONFIG.pressureBands;
  if (pressure <= bands.reliefMaximum) return 'RELIEF';
  if (pressure <= bands.lowMaximum) return 'LOW';
  if (pressure <= bands.normalMaximum) return 'NORMAL';
  if (pressure <= bands.highMaximum) return 'HIGH';
  return 'CRITICAL';
};

export class DifficultySnapshotComposer {
  private readonly traceRing: DifficultyDecisionTraceRing;
  private readonly onCommit: ((snapshot: RuntimeDifficultySnapshot) => void) | null;
  private previousSnapshot: RuntimeDifficultySnapshot | null = null;
  private revision = 0;

  public constructor(options: DifficultySnapshotComposerOptions = {}) {
    this.traceRing =
      options.traceRing ??
      new DifficultyDecisionTraceRing(DIFFICULTY_RUNTIME_CONFIG.traceCapacity);
    this.onCommit = options.onCommit ?? null;
  }

  public compose(input: DifficultySnapshotCompositionInput): RuntimeDifficultySnapshot {
    const revision = this.revision + 1;
    const pressure = clamp(input.reservation.finalPressure, 0, 1);
    const ranges = DIFFICULTY_RUNTIME_CONFIG.ranges;
    const mapping = DIFFICULTY_RUNTIME_CONFIG.outputMapping;
    const spawnConfig = DIFFICULTY_RUNTIME_CONFIG.spawn;
    const maximumActiveEnemies = Math.trunc(
      clamp(
        input.world.maximumEnemies,
        ranges.activeEnemyCount.minimum,
        ranges.activeEnemyCount.maximum
      )
    );
    const spawnWindowSeconds =
      spawnConfig.maximumWindowSeconds -
      pressure * (spawnConfig.maximumWindowSeconds - spawnConfig.minimumWindowSeconds);
    const behaviorTier = Math.trunc(pressure * spawnConfig.maximumBehaviorTier);
    const encounterModifiers = input.encounter.value.statModifiers;
    const quality = this.resolveQuality(input);
    const trace = this.createTrace(input, pressure);
    const decisionId = `${DIFFICULTY_RUNTIME_CONFIG.versions.algorithm}:${createHash({
      revision,
      elapsedSeconds: input.elapsedSeconds,
      inputRevisions: input.inputRevisions,
      pressure,
      market: input.market.value,
      player: input.player.value,
      position: input.position.value,
      pacing: input.pacing.value,
      recovery: input.recovery.value,
      encounter: input.encounter.value,
    })}`;
    const presentationIntensity = clamp(
      Math.max(pressure, input.market.value.confidence),
      0,
      1
    );
    const snapshot = {
      meta: {
        revision,
        validFromTick: input.tick,
        inputRevision: input.inputRevision,
        decisionId,
        algoVersion: DIFFICULTY_RUNTIME_CONFIG.versions.algorithm,
        configVersion: DIFFICULTY_RUNTIME_CONFIG.versions.config,
        quality,
      },
      signals: {
        market: {
          ...input.market.value,
          reasonCodes: [...input.market.value.reasonCodes],
        },
        player: {
          ...input.player.value,
          reasonCodes: [...input.player.value.reasonCodes],
        },
        position: {
          ...input.position.value,
          reasonCodes: [...input.position.value.reasonCodes],
        },
        pacing: {
          ...input.pacing.value,
          reasonCodes: [...input.pacing.value.reasonCodes],
        },
      },
      pressure: {
        total: pressure,
        band: resolvePressureBand(pressure),
        threatTarget: pressure,
        creditRate: input.reservation.creditRate,
        availableCredits: input.reservation.availableCredits,
        maximumCredits: input.reservation.maximumCredits,
        spawnCadence: spawnWindowSeconds,
        maximumActiveEnemies,
      },
      spawn: {
        revision,
        seed: input.seed,
        spawnWindowSeconds,
        maximumActiveEnemies,
        behaviorTier,
        availableCredits: input.reservation.availableCredits,
        reservedCredits: input.reservation.reservedCredits,
        remainingCredits: input.reservation.remainingCredits,
        directives:
          input.reservation.reservedCredits > 0
            ? [{ archetype: 'bear', intent: 'fodder' as const, allocation: 1 }]
            : [],
      },
      enemy: {
        healthMultiplier: clamp(
          (1 + pressure * mapping.enemyHealthPressureScale) *
            encounterModifiers.healthMultiplier,
          ranges.enemyHealthMultiplier.minimum,
          DIRECTOR_CONFIG_V1.enemyStatCaps.normalHealth
        ),
        damageMultiplier: clamp(
          (1 + pressure * mapping.enemyDamagePressureScale) *
            encounterModifiers.damageMultiplier,
          ranges.enemyDamageMultiplier.minimum,
          DIRECTOR_CONFIG_V1.enemyStatCaps.normalDamage
        ),
        speedMultiplier: clamp(
          (1 + pressure * mapping.enemySpeedPressureScale) *
            encounterModifiers.speedMultiplier,
          ranges.enemySpeedMultiplier.minimum,
          DIRECTOR_CONFIG_V1.enemyStatCaps.normalSpeed
        ),
        varietyMultiplier: clamp(
          1 + pressure * mapping.enemyVarietyPressureScale,
          ranges.enemyVarietyMultiplier.minimum,
          ranges.enemyVarietyMultiplier.maximum
        ),
        behaviorTier,
      },
      recovery: {
        mercy: input.recovery.value.mercy,
        recoveryNeed: input.recovery.value.recoveryNeed,
        advantageCreditRate: input.recovery.value.advantageCreditRate,
        availableAdvantageCredits: input.recovery.value.availableAdvantageCredits,
        activeMechanic: input.recovery.value.activeMechanic,
      },
      rewards: {
        xpMultiplier: 1 + pressure * mapping.rewardPressureScale,
        gemDropMultiplier: 1 + pressure * mapping.rewardPressureScale,
        lootOpportunityMultiplier: 1 + pressure * mapping.rewardPressureScale,
      },
      encounter: {
        ...input.encounter.value,
        headwindChannels: [...input.encounter.value.headwindChannels],
        statModifiers: { ...encounterModifiers },
        reasonCodes: [...input.encounter.value.reasonCodes],
      },
      presentation: {
        intensity: presentationIntensity,
        suggestedBpm:
          mapping.baseSuggestedBpm + presentationIntensity * mapping.suggestedBpmRange,
        shakeLimit:
          presentationIntensity * DIRECTOR_CONFIG_V1.presentation.maximumShake,
        audioIntensity: presentationIntensity,
      },
      trace,
    };
    const committed = deepFreeze(snapshot) as RuntimeDifficultySnapshot;
    assertRuntimeDifficultySnapshot(committed, this.previousSnapshot);

    this.revision = revision;
    this.previousSnapshot = committed;
    this.traceRing.record(revision, decisionId, committed.trace);
    this.onCommit?.(committed);
    return committed;
  }

  public getSnapshot(): RuntimeDifficultySnapshot | null {
    return this.previousSnapshot;
  }

  public getTraceRing(): DifficultyDecisionTraceRing {
    return this.traceRing;
  }

  public reset(): void {
    this.previousSnapshot = null;
    this.revision = 0;
    this.traceRing.clear();
  }

  private resolveQuality(
    input: DifficultySnapshotCompositionInput
  ): RuntimeDifficultySnapshot['meta']['quality'] {
    if (input.fallbackCodes.length > 0) return 'DEGRADED';
    const qualities = [
      input.market.quality,
      input.player.quality,
      input.position.quality,
      input.pacing.quality,
      input.recovery.quality,
      input.encounter.quality,
    ];
    if (qualities.every(quality => quality === 'LIVE')) return 'LIVE';
    if (qualities.some(quality => quality === 'DEGRADED')) return 'DEGRADED';
    return 'NEUTRAL';
  }

  private createTrace(
    input: DifficultySnapshotCompositionInput,
    finalPressure: number
  ): DifficultyDecisionTrace {
    return {
      inputRevisions: { ...input.inputRevisions },
      managerContributions: [
        this.createContribution(
          'market',
          input.market.inputRevision,
          input.market.quality,
          input.market.value.pressure,
          input.market.reasonCodes
        ),
        this.createContribution(
          'player',
          input.player.inputRevision,
          input.player.quality,
          Math.max(0, input.player.value.challengeAdjustment),
          input.player.reasonCodes
        ),
        this.createContribution(
          'position',
          input.position.inputRevision,
          input.position.quality,
          input.position.value.headwind,
          input.position.reasonCodes
        ),
        this.createContribution(
          'pacing',
          input.pacing.inputRevision,
          input.pacing.quality,
          input.pacing.value.baselinePressure,
          input.pacing.reasonCodes
        ),
        this.createContribution(
          'recovery',
          input.recovery.inputRevision,
          input.recovery.quality,
          0,
          input.recovery.reasonCodes
        ),
        this.createContribution(
          'encounter',
          input.encounter.inputRevision,
          input.encounter.quality,
          0,
          input.encounter.reasonCodes
        ),
      ],
      requestedPressure: input.reservation.requestedPressure,
      finalPressure,
      clampCodes: [...input.reservation.clampCodes],
      fallbackCodes: [...input.fallbackCodes],
      rejectedEncounterCardIds: [],
    };
  }

  private createContribution(
    manager: string,
    inputRevision: number,
    quality: DifficultyDecisionTrace['managerContributions'][number]['quality'],
    requestedPressure: number,
    reasonCodes: readonly DifficultyReasonCode[]
  ): DifficultyDecisionTrace['managerContributions'][number] {
    return {
      manager,
      inputRevision,
      quality,
      requestedPressure: clamp(requestedPressure, 0, 1),
      reasonCodes: [...reasonCodes],
    };
  }
}
