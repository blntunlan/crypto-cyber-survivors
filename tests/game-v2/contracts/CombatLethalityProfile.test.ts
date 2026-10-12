import { describe, expect, it } from 'vitest';

import { assertCombatLethalityProfile } from '@/game-v2/contracts/CombatLethalityProfile';

const VALID: Record<string, unknown> = {
  leverage: 5,
  playerMaxHealth: 20,
  playerArmor: 0,
  enemyDamageMultiplier: 1,
  incomingDamageEnvelope: { min: 7.5, max: 22.5 },
  recoveryToleranceTicks: 60,
  encounterPressureLimit: 32,
  encounterComplexityLimit: 2,
  liquidationDistance: 20,
  rewardCeiling: 5,
};

describe('assertCombatLethalityProfile', () => {
  it('validates and freezes a well-formed profile', () => {
    const profile = assertCombatLethalityProfile(VALID);

    expect(profile).toEqual(VALID);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.incomingDamageEnvelope)).toBe(true);
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['zero leverage', { ...VALID, leverage: 0 }],
    ['non-integer leverage', { ...VALID, leverage: 5.5 }],
    ['non-finite leverage', { ...VALID, leverage: Number.NaN }],
    ['zero playerMaxHealth', { ...VALID, playerMaxHealth: 0 }],
    ['negative playerMaxHealth', { ...VALID, playerMaxHealth: -1 }],
    ['non-finite playerMaxHealth', { ...VALID, playerMaxHealth: Number.NaN }],
    ['negative playerArmor', { ...VALID, playerArmor: -0.1 }],
    ['playerArmor above 1', { ...VALID, playerArmor: 1.1 }],
    ['zero enemyDamageMultiplier', { ...VALID, enemyDamageMultiplier: 0 }],
    ['negative enemyDamageMultiplier', { ...VALID, enemyDamageMultiplier: -1 }],
    ['missing incomingDamageEnvelope', { ...VALID, incomingDamageEnvelope: undefined }],
    [
      'inverted incomingDamageEnvelope',
      { ...VALID, incomingDamageEnvelope: { min: 10, max: 5 } },
    ],
    [
      'non-finite incomingDamageEnvelope.min',
      { ...VALID, incomingDamageEnvelope: { min: Number.NaN, max: 5 } },
    ],
    ['non-integer recoveryToleranceTicks', { ...VALID, recoveryToleranceTicks: 1.5 }],
    ['negative recoveryToleranceTicks', { ...VALID, recoveryToleranceTicks: -1 }],
    ['non-integer encounterPressureLimit', { ...VALID, encounterPressureLimit: 1.5 }],
    [
      'non-integer encounterComplexityLimit',
      { ...VALID, encounterComplexityLimit: 1.5 },
    ],
    ['non-finite liquidationDistance', { ...VALID, liquidationDistance: Number.NaN }],
    ['negative liquidationDistance', { ...VALID, liquidationDistance: -1 }],
    ['non-finite rewardCeiling', { ...VALID, rewardCeiling: Number.NaN }],
    ['negative rewardCeiling', { ...VALID, rewardCeiling: -1 }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertCombatLethalityProfile(override)).toThrow();
  });
});
