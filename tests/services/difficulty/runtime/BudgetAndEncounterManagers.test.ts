import { describe, expect, it } from 'vitest';

import { EncounterManager } from '../../../../services/difficulty/runtime/managers/EncounterManager';
import { RecoveryBudgetManager } from '../../../../services/difficulty/runtime/managers/RecoveryBudgetManager';
import { ThreatBudgetManager } from '../../../../services/difficulty/runtime/managers/ThreatBudgetManager';
import {
  type EncounterManagerInput,
  type RecoveryBudgetInput,
  type ThreatReservationInput,
} from '../../../../services/difficulty/runtime/contracts';

const createRecoveryInput = (
  overrides: Partial<RecoveryBudgetInput> = {}
): RecoveryBudgetInput => ({
  recoveryNeed: 1,
  advantage: 0,
  regime: 'VOLATILE',
  regimeConfidence: 1,
  deltaSeconds: 1,
  elapsedSeconds: 100,
  seed: 7,
  validFromTick: 10,
  inputRevision: 4,
  ...overrides,
});

const createThreatInput = (
  overrides: Partial<ThreatReservationInput> = {}
): ThreatReservationInput => ({
  requestedPressure: 1,
  minimumPressure: 0,
  maximumPressure: 1,
  marketPressure: 0,
  headwind: 0,
  mercy: 0,
  deltaSeconds: 10,
  requestedCredits: 4,
  validFromTick: 10,
  inputRevision: 4,
  ...overrides,
});

const createEncounterInput = (
  overrides: Partial<EncounterManagerInput> = {}
): EncounterManagerInput => ({
  elapsedSeconds: 100,
  validFromTick: 10,
  inputRevision: 4,
  seed: 11,
  market: {
    sourceSequence: 8,
    quality: 'LIVE',
    regime: 'BULL_TREND',
    confidence: 1,
    pressure: 0.8,
    volatility: 0.4,
    volume: 0.6,
    trend: 0.8,
    rsiExtremity: 0.2,
    whalePressure: 0,
    activeEventFamily: 'BREAKOUT',
    reasonCodes: ['MARKET_LIVE'],
  },
  pacing: {
    phase: 'PEAK',
    baselinePressure: 0.6,
    minimumPressure: 0.45,
    maximumPressure: 0.75,
    remainingSeconds: 20,
    reasonCodes: ['PACING_PEAK'],
  },
  reservation: {
    revision: 1,
    validFromTick: 10,
    inputRevision: 4,
    requestedPressure: 0.7,
    finalPressure: 0.7,
    creditRate: 1,
    availableCredits: 12,
    maximumCredits: 12,
    requestedCredits: 12,
    reservedCredits: 12,
    remainingCredits: 0,
    clampCodes: [],
  },
  headwind: 0.2,
  liquidationProximity: 0,
  world: {
    activeEnemies: 20,
    maximumEnemies: 60,
    activeEncounters: 0,
  },
  ...overrides,
});

describe('runtime budgets and encounters', () => {
  it('applies mercy before reserving threat credits', () => {
    const threat = new ThreatBudgetManager();
    const recovery = new RecoveryBudgetManager();
    const relief = recovery.update(createRecoveryInput());

    const reservation = threat.reserve(
      createThreatInput({ mercy: relief.value.mercy })
    );

    expect(reservation.finalPressure).toBeLessThan(1);
    expect(reservation.reservedCredits).toBeLessThanOrEqual(
      reservation.availableCredits
    );
    expect(reservation.clampCodes).toContain('PLAYER_SAFETY_MAXIMUM');
  });

  it('deduplicates a reservation for the same coherent input revision', () => {
    const threat = new ThreatBudgetManager();
    const input = createThreatInput();

    const first = threat.reserve(input);
    const second = threat.reserve(input);

    expect(second).toBe(first);
    expect(second.remainingCredits).toBe(first.remainingCredits);
  });

  it('uses reserved credits and elapsed seconds for encounter modifiers', () => {
    const manager = new EncounterManager();

    const telegraph = manager.update(createEncounterInput());
    const active = manager.update(
      createEncounterInput({ elapsedSeconds: 102, validFromTick: 11 })
    );

    expect(telegraph.value.phase).toBe('TELEGRAPH');
    expect(active.value.phase).toBe('ACTIVE');
    expect(active.value.primaryCardId).toBe('BREAKOUT_PURSUER');
    expect(active.value.statModifiers.speedMultiplier).toBeGreaterThan(1);
    expect(active.value.reservedCredits).toBe(12);
  });

  it('does not start an encounter without a sufficient reservation', () => {
    const manager = new EncounterManager();
    const input = createEncounterInput({
      reservation: {
        ...createEncounterInput().reservation,
        availableCredits: 0,
        requestedCredits: 0,
        reservedCredits: 0,
      },
    });

    const decision = manager.update(input);

    expect(decision.value.phase).toBe('IDLE');
    expect(decision.value.primaryCardId).toBeNull();
  });
});
