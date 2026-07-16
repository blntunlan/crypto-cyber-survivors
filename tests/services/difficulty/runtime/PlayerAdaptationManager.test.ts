import { describe, expect, it } from 'vitest';

import { PlayerAdaptationManager } from '../../../../services/difficulty/runtime/managers/PlayerAdaptationManager';
import { type PlayerAdaptationInput } from '../../../../services/difficulty/runtime/contracts';

const createInput = (
  overrides: Partial<PlayerAdaptationInput> = {}
): PlayerAdaptationInput => ({
  telemetry: {
    damageTaken: 24,
    remainingHp: 76,
    killsInWindow: 30,
    dashesInWindow: 4,
    shotsInWindow: 120,
    level: 10,
    windowSeconds: 60,
  },
  world: {
    activeEnemies: 30,
    maximumEnemies: 60,
    activeEncounters: 0,
  },
  deltaSeconds: 1,
  validFromTick: 10,
  inputRevision: 4,
  ...overrides,
});

describe('PlayerAdaptationManager', () => {
  it('uses rolling damage, kill, and dash telemetry', () => {
    const manager = new PlayerAdaptationManager();

    const decision = manager.update(createInput());

    expect(decision.value.recentDamagePressure).toBeGreaterThan(0);
    expect(decision.value.killsPerMinute).toBe(30);
    expect(decision.value.mobilityUsage).toBeGreaterThan(0);
    expect(decision.value.screenPressure).toBe(0.5);
    expect(decision.reasonCodes).toContain('PLAYER_LIVE');
  });

  it('returns a neutral non-punitive decision for invalid telemetry', () => {
    const manager = new PlayerAdaptationManager();
    const input = createInput({
      telemetry: {
        ...createInput().telemetry!,
        damageTaken: Number.NaN,
      },
    });

    const decision = manager.update(input);

    expect(decision.quality).toBe('NEUTRAL');
    expect(decision.value.challengeAdjustment).toBe(0);
    expect(decision.value.recoveryNeed).toBe(0);
    expect(decision.reasonCodes).toContain('PLAYER_TELEMETRY_INVALID');
  });

  it('resets its rolling model and decision revision', () => {
    const manager = new PlayerAdaptationManager();
    manager.update(createInput());

    manager.reset();

    expect(manager.getSnapshot()).toMatchObject({
      revision: 0,
      quality: 'NEUTRAL',
      value: { challengeAdjustment: 0, recentDamagePressure: 0 },
    });
  });
});
