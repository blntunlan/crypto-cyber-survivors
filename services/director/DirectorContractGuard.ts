import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import { type GameplaySnapshot, type SpawnPlan } from './contracts';
import { type PacingSnapshot } from './PacingStateMachine';

/**
 * Every code names one binding rule of the Final Design Contract v1.0. A code
 * appearing at runtime means the pipeline broke that rule — the point is that a
 * regression surfaces as a named rule instead of "the game feels off".
 */
export const DIRECTOR_CONTRACT_VIOLATIONS = [
  'ENEMY_HEALTH_CAP', // §9 normal enemy health <= 2.20x
  'ENEMY_DAMAGE_CAP', // §9 normal enemy damage <= 1.80x
  'ENEMY_SPEED_CAP', // §9 normal enemy speed <= 1.35x
  'THREAT_TARGET_RANGE', // §9 threat target clamped to [0.20, 2.00]
  'HEADWIND_CHANNEL_LIMIT', // §11 at most two mechanical channels
  'ADVANTAGE_MECHANIC_LIMIT', // §10 at most one active advantage mechanic
  'SURGE_BEFORE_LOCKOUT', // §7 no MarketSurge in the first 90 seconds
  'SURGE_OVERRUN', // §7 MarketSurge caps at 20 seconds
  'SUPPORT_EFFICIENCY_FLOOR', // §8 support efficiency never below 40%
  'GREED_NOT_MONOTONIC', // §13 greed never decreases inside a run
  'SPAWN_BUDGET_MISMATCH', // §9 the plan may only spend what it declares
  'SPAWN_UNAFFORDABLE', // §9 the plan may not overspend the threat bank
  'UNTELEGRAPHED_ENCOUNTER', // §4/§19 no mechanical effect without a telegraph
  'STALE_MARKET_EVENT', // §12 a stale feed cannot produce fake events
  'LEVERAGE_OFF_LADDER', // §6 leverage must sit on the public ladder
] as const;

export type DirectorContractViolation = (typeof DIRECTOR_CONTRACT_VIOLATIONS)[number];

export type DirectorContractGuardInput = {
  snapshot: GameplaySnapshot;
  pacing: PacingSnapshot;
  plan: SpawnPlan;
  elapsedSeconds: number;
  greedLevel: number;
  leverage: number;
  isMarketStale: boolean;
};

const FLOAT_TOLERANCE = 0.000001;

/**
 * Stateless with respect to gameplay, stateful only for the two rules that are
 * about transitions (greed monotonicity and telegraph ordering). It allocates
 * nothing per call so it can run on every Director commit, not just in dev.
 */
export class DirectorContractGuard {
  private readonly config: DirectorConfigV1;
  private readonly violations: DirectorContractViolation[] = [];
  private lastGreedLevel = 0;
  private lastEncounterPhase: GameplaySnapshot['encounter']['phase'] = 'IDLE';

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public evaluate(
    input: DirectorContractGuardInput
  ): readonly DirectorContractViolation[] {
    const violations = this.violations;
    violations.length = 0;

    this.checkEnemyStats(input, violations);
    this.checkThreat(input, violations);
    this.checkChannels(input, violations);
    this.checkPacing(input, violations);
    this.checkSpawnBudget(input, violations);
    this.checkTransitions(input, violations);
    this.checkPosition(input, violations);

    this.lastGreedLevel = input.greedLevel;
    this.lastEncounterPhase = input.snapshot.encounter.phase;
    return violations;
  }

  public reset(): void {
    this.violations.length = 0;
    this.lastGreedLevel = 0;
    this.lastEncounterPhase = 'IDLE';
  }

  private checkEnemyStats(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    const enemy = input.snapshot.enemy;
    const caps = this.config.enemyStatCaps;
    if (enemy.healthMultiplier > caps.normalHealth + FLOAT_TOLERANCE) {
      violations.push('ENEMY_HEALTH_CAP');
    }
    if (enemy.damageMultiplier > caps.normalDamage + FLOAT_TOLERANCE) {
      violations.push('ENEMY_DAMAGE_CAP');
    }
    if (enemy.speedMultiplier > caps.normalSpeed + FLOAT_TOLERANCE) {
      violations.push('ENEMY_SPEED_CAP');
    }
  }

  private checkThreat(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    const target = input.snapshot.threat.target;
    if (
      target < this.config.threat.minimumTarget - FLOAT_TOLERANCE ||
      target > this.config.threat.maximumTarget + FLOAT_TOLERANCE
    ) {
      violations.push('THREAT_TARGET_RANGE');
    }
  }

  private checkChannels(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    if (
      input.snapshot.encounter.headwindChannels.length >
      this.config.encounters.maximumHeadwindChannels
    ) {
      violations.push('HEADWIND_CHANNEL_LIMIT');
    }
    if (
      input.snapshot.advantage.activeMechanic !== null &&
      this.config.advantage.maximumActiveMechanics < 1
    ) {
      violations.push('ADVANTAGE_MECHANIC_LIMIT');
    }
  }

  private checkPacing(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    if (input.pacing.state !== 'MARKET_SURGE') {
      if (
        input.pacing.supportEfficiency <
        this.config.survival.minimumSupportEfficiency - FLOAT_TOLERANCE
      ) {
        violations.push('SUPPORT_EFFICIENCY_FLOOR');
      }
      return;
    }

    if (input.elapsedSeconds < this.config.marketEvents.initialSurgeLockoutSeconds) {
      violations.push('SURGE_BEFORE_LOCKOUT');
    }
    if (
      input.pacing.remainingSeconds >
      this.config.pacing.marketSurge.maxSeconds + FLOAT_TOLERANCE
    ) {
      violations.push('SURGE_OVERRUN');
    }
    if (
      input.pacing.supportEfficiency <
      this.config.survival.minimumSupportEfficiency - FLOAT_TOLERANCE
    ) {
      violations.push('SUPPORT_EFFICIENCY_FLOOR');
    }
  }

  private checkSpawnBudget(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    const intents = input.plan.intents;
    let declaredCost = 0;
    for (let index = 0; index < intents.length; index += 1) {
      declaredCost += intents[index]?.threatCost ?? 0;
    }
    if (Math.abs(declaredCost - input.plan.spendableThreat) > FLOAT_TOLERANCE) {
      violations.push('SPAWN_BUDGET_MISMATCH');
    }
    if (
      declaredCost >
      input.snapshot.threat.availableCredits +
        input.plan.spendableThreat +
        FLOAT_TOLERANCE
    ) {
      violations.push('SPAWN_UNAFFORDABLE');
    }
  }

  private checkTransitions(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    if (input.greedLevel < this.lastGreedLevel) {
      violations.push('GREED_NOT_MONOTONIC');
    }
    if (
      input.snapshot.encounter.phase === 'ACTIVE' &&
      this.lastEncounterPhase === 'IDLE'
    ) {
      violations.push('UNTELEGRAPHED_ENCOUNTER');
    }
    if (input.isMarketStale && input.snapshot.encounter.activeEventFamily !== null) {
      violations.push('STALE_MARKET_EVENT');
    }
  }

  private checkPosition(
    input: DirectorContractGuardInput,
    violations: DirectorContractViolation[]
  ): void {
    if (!this.config.position.publicLeverageTiers.includes(input.leverage)) {
      violations.push('LEVERAGE_OFF_LADDER');
    }
  }
}
