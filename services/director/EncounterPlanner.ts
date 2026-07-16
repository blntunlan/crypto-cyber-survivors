import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import {
  type MarketEventFamily,
  type MarketRegimeSnapshot,
  type WorldPressureSnapshot,
} from './contracts';
import {
  ENCOUNTER_CARD_CATALOG,
  type EncounterCard,
  type EncounterRole,
} from './encounters/EncounterCatalog';
import {
  clampEncounterStatMultipliers,
  NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
  type EncounterStatMultipliers,
} from './encounters/EnemyCostCatalog';
import {
  resolveHeadwindChannels,
  type HeadwindChannel,
} from './encounters/HeadwindCatalog';

export const ENCOUNTER_PHASES = [
  'IDLE',
  'TELEGRAPH',
  'ACTIVE',
  'RECOVERY',
  'COOLDOWN',
] as const;

export type EncounterPhase = (typeof ENCOUNTER_PHASES)[number];

export type EncounterPlannerInput = {
  elapsedSeconds: number;
  seed: number;
  market: MarketRegimeSnapshot;
  headwind: number;
  liquidationProximity: number;
  availableCredits: number;
  world: WorldPressureSnapshot;
};

export type PlannedEncounter = {
  id: string;
  family: MarketEventFamily;
  role: EncounterRole;
  costUnits: number;
  statModifiers: EncounterStatMultipliers;
  isMechanicallyActive: boolean;
};

export type EncounterPlan = {
  phase: EncounterPhase;
  primary: PlannedEncounter | null;
  support: PlannedEncounter | null;
  headwindChannels: readonly HeadwindChannel[];
};

type ActiveEncounter = {
  family: MarketEventFamily;
  telegraphEndsAtElapsedSeconds: number;
  activeEndsAtElapsedSeconds: number;
  recoveryEndsAtElapsedSeconds: number;
  cooldownEndsAtElapsedSeconds: number;
  primary: EncounterCard | null;
  support: EncounterCard | null;
  headwindChannels: readonly HeadwindChannel[];
};

const FIRST_TICK = 0;

/**
 * Converts confirmed market events into a single bounded encounter lifecycle.
 * It plans data only; SpawnExecutor remains responsible for spending threat
 * credits and applying a resulting plan to pooled enemies.
 */
export class EncounterPlanner {
  private readonly config: DirectorConfigV1;
  private readonly catalog: readonly EncounterCard[];
  private active: ActiveEncounter | null = null;

  public constructor(
    config: DirectorConfigV1 = DIRECTOR_CONFIG_V1,
    catalog: readonly EncounterCard[] = ENCOUNTER_CARD_CATALOG
  ) {
    this.config = config;
    this.catalog = catalog;
  }

  public plan(input: EncounterPlannerInput): EncounterPlan {
    const active = this.resolveActiveEncounter(input);
    if (active === null) return this.createIdlePlan(input);

    const phase = this.resolvePhase(input.elapsedSeconds, active);
    if (phase === 'IDLE') {
      this.active = null;
      return this.createIdlePlan(input);
    }

    const isMechanicallyActive = phase === 'ACTIVE';
    return {
      phase,
      primary: this.createPlannedEncounter(active.primary, isMechanicallyActive),
      support: this.createPlannedEncounter(active.support, isMechanicallyActive),
      headwindChannels: active.headwindChannels,
    };
  }

  public reset(): void {
    this.active = null;
  }

  private resolveActiveEncounter(input: EncounterPlannerInput): ActiveEncounter | null {
    if (this.active !== null) return this.active;
    if (input.market.activeEventFamily === null) return null;

    const primary = this.selectCard(
      input.market.activeEventFamily,
      'PRIMARY',
      input.seed,
      input.world.activePrimaryEncounters <
        this.config.marketEvents.maxPrimaryEncounters,
      input.availableCredits
    );
    const remainingCredits = input.availableCredits - (primary?.costUnits ?? 0);
    const support = this.selectCard(
      input.market.activeEventFamily,
      'SUPPORT',
      input.seed ^ (primary?.costUnits ?? FIRST_TICK),
      input.world.activeSupportEncounters <
        this.config.marketEvents.maxSupportEncounters,
      remainingCredits
    );

    if (primary === null && support === null) return null;

    const telegraphEndsAtElapsedSeconds = Math.max(
      input.elapsedSeconds,
      input.market.eventTelegraphEndsAtElapsedSeconds ??
        input.elapsedSeconds + this.config.marketEvents.minTelegraphSeconds
    );
    const activeEndsAtElapsedSeconds =
      telegraphEndsAtElapsedSeconds + this.config.encounters.activeDurationSeconds;
    const recoveryEndsAtElapsedSeconds =
      activeEndsAtElapsedSeconds + this.config.encounters.recoveryDurationSeconds;
    const cooldownSeconds =
      input.market.activeEventFamily === 'WHALE_EVENT'
        ? this.config.marketEvents.whaleCooldownSeconds
        : this.config.marketEvents.defaultCooldownSeconds;

    this.active = {
      family: input.market.activeEventFamily,
      telegraphEndsAtElapsedSeconds,
      activeEndsAtElapsedSeconds,
      recoveryEndsAtElapsedSeconds,
      cooldownEndsAtElapsedSeconds: recoveryEndsAtElapsedSeconds + cooldownSeconds,
      primary,
      support,
      headwindChannels: resolveHeadwindChannels(
        {
          regime: input.market.regime,
          activeEventFamily: input.market.activeEventFamily,
          headwind: input.headwind,
          liquidationProximity: input.liquidationProximity,
        },
        this.config
      ),
    };
    return this.active;
  }

  private selectCard(
    family: MarketEventFamily,
    role: EncounterRole,
    seed: number,
    hasCapacity: boolean,
    availableCredits: number
  ): EncounterCard | null {
    if (!hasCapacity) return null;
    let candidateCount = 0;
    for (const card of this.catalog) {
      if (
        card.family === family &&
        card.role === role &&
        card.costUnits <= availableCredits
      ) {
        candidateCount += 1;
      }
    }
    if (candidateCount === FIRST_TICK) return null;

    const selectedIndex = Math.abs(Math.trunc(seed)) % candidateCount;
    let currentIndex = 0;
    for (const card of this.catalog) {
      if (
        card.family !== family ||
        card.role !== role ||
        card.costUnits > availableCredits
      ) {
        continue;
      }
      if (currentIndex === selectedIndex) return card;
      currentIndex += 1;
    }
    return null;
  }

  private resolvePhase(
    elapsedSeconds: number,
    active: ActiveEncounter
  ): EncounterPhase {
    if (elapsedSeconds < active.telegraphEndsAtElapsedSeconds) return 'TELEGRAPH';
    if (elapsedSeconds < active.activeEndsAtElapsedSeconds) return 'ACTIVE';
    if (elapsedSeconds < active.recoveryEndsAtElapsedSeconds) return 'RECOVERY';
    if (elapsedSeconds < active.cooldownEndsAtElapsedSeconds) return 'COOLDOWN';
    return 'IDLE';
  }

  private createPlannedEncounter(
    card: EncounterCard | null,
    isMechanicallyActive: boolean
  ): PlannedEncounter | null {
    if (card === null) return null;

    return {
      id: card.id,
      family: card.family,
      role: card.role,
      costUnits: card.costUnits,
      statModifiers: isMechanicallyActive
        ? clampEncounterStatMultipliers(card.statModifiers, this.config)
        : NEUTRAL_ENCOUNTER_STAT_MULTIPLIERS,
      isMechanicallyActive,
    };
  }

  private createIdlePlan(input: EncounterPlannerInput): EncounterPlan {
    return {
      phase: 'IDLE',
      primary: null,
      support: null,
      headwindChannels: resolveHeadwindChannels(
        {
          regime: input.market.regime,
          activeEventFamily: input.market.activeEventFamily,
          headwind: input.headwind,
          liquidationProximity: input.liquidationProximity,
        },
        this.config
      ),
    };
  }
}
