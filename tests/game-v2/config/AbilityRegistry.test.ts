import { describe, expect, it } from 'vitest';

import {
  MVP1_ABILITY_REGISTRY,
  STARTER_PROJECTILE,
  createAbilityRegistry,
} from '@/game-v2/config/AbilityRegistry';
import {
  EMPTY_ABILITY_CODE,
  MAX_ABILITY_CODE,
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';

const definition = (overrides: {
  id: string;
  code: number;
  activation?: string;
  authoredTiers?: number;
}): AbilityDefinition =>
  ({
    activation: overrides.activation ?? 'auto',
    authoredTiers: overrides.authoredTiers ?? 2,
    code: overrides.code,
    id: overrides.id as AbilityIdentityId,
  }) as AbilityDefinition;

describe('AbilityRegistry', () => {
  it('resolves the starter projectile by id and by code', () => {
    expect(MVP1_ABILITY_REGISTRY.byId('starter-projectile')).toEqual(
      STARTER_PROJECTILE
    );
    expect(MVP1_ABILITY_REGISTRY.byCode(STARTER_PROJECTILE.code)).toEqual(
      STARTER_PROJECTILE
    );
    expect(MVP1_ABILITY_REGISTRY.size).toBe(1);
  });

  it('reserves code zero for the empty slot', () => {
    expect(EMPTY_ABILITY_CODE).toBe(0);
    expect(MVP1_ABILITY_REGISTRY.byCode(EMPTY_ABILITY_CODE)).toBeNull();
  });

  it('keeps the starter projectile an AUTO ability with two authored tiers', () => {
    expect(STARTER_PROJECTILE.activation).toBe('auto');
    expect(STARTER_PROJECTILE.authoredTiers).toBe(2);
    expect(STARTER_PROJECTILE.code).toBeGreaterThanOrEqual(1);
    expect(STARTER_PROJECTILE.code).toBeLessThanOrEqual(MAX_ABILITY_CODE);
  });

  it('rejects an unknown identity and an unknown code', () => {
    expect(() => MVP1_ABILITY_REGISTRY.byId('missing' as AbilityIdentityId)).toThrow(
      'unknown ability identity'
    );
    expect(() => MVP1_ABILITY_REGISTRY.byCode(MAX_ABILITY_CODE)).toThrow(
      'unknown ability code'
    );
  });

  it('rejects an empty registry', () => {
    expect(() => createAbilityRegistry([])).toThrow(
      'ability registry requires at least one definition'
    );
  });

  it('rejects duplicate identities and duplicate codes', () => {
    expect(() =>
      createAbilityRegistry([
        definition({ id: 'a', code: 1 }),
        definition({ id: 'a', code: 2 }),
      ])
    ).toThrow('ability registry contains a duplicate identity');

    expect(() =>
      createAbilityRegistry([
        definition({ id: 'a', code: 1 }),
        definition({ id: 'b', code: 1 }),
      ])
    ).toThrow('ability registry contains a duplicate code');
  });

  it('rejects a code outside the hashable byte range', () => {
    for (const code of [0, -1, 1.5, MAX_ABILITY_CODE + 1, Number.NaN]) {
      expect(() => createAbilityRegistry([definition({ id: 'a', code })])).toThrow(
        `ability code must be an integer inside 1..${MAX_ABILITY_CODE}`
      );
    }
  });

  it('rejects an unsupported authored tier count and activation kind', () => {
    expect(() =>
      createAbilityRegistry([definition({ id: 'a', code: 1, authoredTiers: 4 })])
    ).toThrow('authored tier count must be 1, 2, or 3');

    expect(() =>
      createAbilityRegistry([definition({ id: 'a', code: 1, activation: 'passive' })])
    ).toThrow('ability activation must be active or auto');
  });

  it('freezes the definitions it returns', () => {
    const registry = createAbilityRegistry([definition({ id: 'a', code: 7 })]);
    expect(Object.isFrozen(registry.byCode(7))).toBe(true);
  });
});
