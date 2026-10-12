import { describe, expect, it } from 'vitest';

import {
  CANNON_PROJECTILE,
  FLICKER_PROJECTILE,
  HEAVY_PROJECTILE,
  LANCE_PROJECTILE,
  MVP1_ABILITY_REGISTRY,
  NEEDLE_PROJECTILE,
  RAPID_PROJECTILE,
  SIEGE_PROJECTILE,
  STARTER_PROJECTILE,
  createAbilityRegistry,
} from '@/game-v2/config/AbilityRegistry';
import { type AbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';
import {
  EMPTY_ABILITY_CODE,
  MAX_ABILITY_CODE,
  type AbilityDefinition,
  type AbilityIdentityId,
} from '@/game-v2/contracts/AbilitySlot';

const starterEffect = (overrides: Partial<AbilityTierEffect> = {}): AbilityTierEffect =>
  ({
    ability: 'starter-projectile',
    damage: 1,
    projectileRadius: 0.1,
    cooldownTicks: 1,
    ...overrides,
  }) as AbilityTierEffect;

const definition = (overrides: {
  id: string;
  code: number;
  activation?: string;
  authoredTiers?: number;
  tierEffects?: readonly AbilityTierEffect[];
  startEligible?: unknown;
}): AbilityDefinition => {
  const authoredTiers = overrides.authoredTiers ?? 2;

  return {
    activation: overrides.activation ?? 'auto',
    authoredTiers,
    code: overrides.code,
    id: overrides.id as AbilityIdentityId,
    tierEffects:
      overrides.tierEffects ??
      Array.from({ length: authoredTiers }, () => starterEffect()),
    startEligible: 'startEligible' in overrides ? overrides.startEligible : false,
  } as AbilityDefinition;
};

describe('AbilityRegistry', () => {
  it('resolves the starter projectile by id and by code', () => {
    expect(MVP1_ABILITY_REGISTRY.byId('starter-projectile')).toEqual(
      STARTER_PROJECTILE
    );
    expect(MVP1_ABILITY_REGISTRY.byCode(STARTER_PROJECTILE.code)).toEqual(
      STARTER_PROJECTILE
    );
    expect(MVP1_ABILITY_REGISTRY.size).toBe(8);
  });

  it('exposes every registered identity through ids, in insertion order', () => {
    expect(MVP1_ABILITY_REGISTRY.ids).toEqual([
      'starter-projectile',
      'heavy-projectile',
      'rapid-projectile',
      'needle-projectile',
      'flicker-projectile',
      'lance-projectile',
      'cannon-projectile',
      'siege-projectile',
    ]);
    expect(Object.isFrozen(MVP1_ABILITY_REGISTRY.ids)).toBe(true);

    const registry = createAbilityRegistry([
      definition({ id: 'a', code: 1 }),
      definition({ id: 'b', code: 2 }),
    ]);
    expect(registry.ids).toEqual(['a', 'b']);
  });

  it('reserves code zero for the empty slot', () => {
    expect(EMPTY_ABILITY_CODE).toBe(0);
    expect(MVP1_ABILITY_REGISTRY.byCode(EMPTY_ABILITY_CODE)).toBeNull();
  });

  it('keeps the starter projectile an AUTO ability with all three tiers authored', () => {
    expect(STARTER_PROJECTILE.activation).toBe('auto');
    expect(STARTER_PROJECTILE.authoredTiers).toBe(3);
    expect(STARTER_PROJECTILE.code).toBeGreaterThanOrEqual(1);
    expect(STARTER_PROJECTILE.code).toBeLessThanOrEqual(MAX_ABILITY_CODE);
    expect(STARTER_PROJECTILE.tierEffects).toHaveLength(3);
  });

  it('raises starter-projectile damage at Tier 2 and holds it at Tier 3', () => {
    const [tier1, tier2, tier3] = STARTER_PROJECTILE.tierEffects as [
      AbilityTierEffect,
      AbilityTierEffect,
      AbilityTierEffect,
    ];

    expect(tier1.damage).toBeLessThan(tier2.damage);
    expect(tier3.damage).toBe(tier2.damage);
  });

  it('raises starter-projectile coverage and cadence only at Tier 3', () => {
    const [tier1, tier2, tier3] = STARTER_PROJECTILE.tierEffects as [
      AbilityTierEffect,
      AbilityTierEffect,
      AbilityTierEffect,
    ];

    expect(tier1.projectileRadius).toBe(tier2.projectileRadius);
    expect(tier3.projectileRadius).toBeGreaterThan(tier2.projectileRadius);
    expect(tier3.cooldownTicks).toBeLessThan(tier2.cooldownTicks);
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
    expect(Object.isFrozen(registry.byCode(7)?.tierEffects)).toBe(true);
  });

  it('rejects a tierEffects length that does not match authoredTiers', () => {
    expect(() =>
      createAbilityRegistry([
        definition({
          id: 'a',
          code: 1,
          authoredTiers: 3,
          tierEffects: [starterEffect()],
        }),
      ])
    ).toThrow('ability tierEffects length must equal its authoredTiers count');

    expect(() =>
      createAbilityRegistry([
        definition({
          id: 'a',
          code: 1,
          authoredTiers: 1,
          tierEffects: [starterEffect(), starterEffect()],
        }),
      ])
    ).toThrow('ability tierEffects length must equal its authoredTiers count');
  });

  it('rejects a tierEffects entry with an unrecognized shape', () => {
    expect(() =>
      createAbilityRegistry([
        definition({
          id: 'a',
          code: 1,
          authoredTiers: 1,
          tierEffects: [{ ability: 'unknown-shape' } as unknown as AbilityTierEffect],
        }),
      ])
    ).toThrow('unknown ability tier effect shape');
  });

  it('rejects a non-finite, negative, or fractional tier-cooldown effect field', () => {
    for (const damage of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createAbilityRegistry([
          definition({
            id: 'a',
            code: 1,
            authoredTiers: 1,
            tierEffects: [starterEffect({ damage })],
          }),
        ])
      ).toThrow(
        'starter-projectile tier effect requires finite positive damage, ' +
          'projectileRadius, and an integer cooldownTicks'
      );
    }

    expect(() =>
      createAbilityRegistry([
        definition({
          id: 'a',
          code: 1,
          authoredTiers: 1,
          tierEffects: [starterEffect({ cooldownTicks: 1.5 })],
        }),
      ])
    ).toThrow('integer cooldownTicks');
  });

  it('rejects a non-boolean startEligible', () => {
    for (const startEligible of [undefined, 'true', 1, null]) {
      expect(() =>
        createAbilityRegistry([definition({ id: 'a', code: 1, startEligible })])
      ).toThrow('ability startEligible must be a boolean');
    }
  });
});

describe('AbilityRegistry V2-106 start-eligible weapons', () => {
  it('registers heavy-projectile and rapid-projectile as start-eligible AUTO weapons', () => {
    for (const weapon of [STARTER_PROJECTILE, HEAVY_PROJECTILE, RAPID_PROJECTILE]) {
      expect(weapon.startEligible).toBe(true);
      expect(weapon.activation).toBe('auto');
      expect(weapon.authoredTiers).toBe(3);
      expect(weapon.tierEffects).toHaveLength(3);
      expect(weapon.code).toBeGreaterThanOrEqual(1);
      expect(weapon.code).toBeLessThanOrEqual(MAX_ABILITY_CODE);
    }
  });

  it('gives every tier effect a distinct ability tag matching its own identity', () => {
    for (const weapon of [STARTER_PROJECTILE, HEAVY_PROJECTILE, RAPID_PROJECTILE]) {
      for (const effect of weapon.tierEffects) {
        expect(effect.ability).toBe(weapon.id);
      }
    }
  });

  it('keeps the three start-eligible weapons pairwise distinct by code and by shape', () => {
    const weapons = [STARTER_PROJECTILE, HEAVY_PROJECTILE, RAPID_PROJECTILE];

    for (let i = 0; i < weapons.length; i += 1) {
      for (let j = i + 1; j < weapons.length; j += 1) {
        const a = weapons[i] as AbilityDefinition;
        const b = weapons[j] as AbilityDefinition;

        expect(a.code).not.toBe(b.code);
        expect(a.tierEffects[0]?.ability).not.toBe(b.tierEffects[0]?.ability);
      }
    }
  });

  it('keeps the three start-eligible weapons distinct by at least one numeric value per tier', () => {
    const weapons = [STARTER_PROJECTILE, HEAVY_PROJECTILE, RAPID_PROJECTILE];

    for (let tier = 0; tier < 3; tier += 1) {
      for (let i = 0; i < weapons.length; i += 1) {
        for (let j = i + 1; j < weapons.length; j += 1) {
          const a = weapons[i]?.tierEffects[tier] as AbilityTierEffect;
          const b = weapons[j]?.tierEffects[tier] as AbilityTierEffect;

          const differsOnAtLeastOneField =
            a.damage !== b.damage ||
            a.projectileRadius !== b.projectileRadius ||
            a.cooldownTicks !== b.cooldownTicks;

          expect(differsOnAtLeastOneField).toBe(true);
        }
      }
    }
  });

  it('raises heavy-projectile damage at Tier 2 and holds it at Tier 3', () => {
    const [tier1, tier2, tier3] = HEAVY_PROJECTILE.tierEffects as [
      AbilityTierEffect,
      AbilityTierEffect,
      AbilityTierEffect,
    ];

    expect(tier1.damage).toBeLessThan(tier2.damage);
    expect(tier3.damage).toBe(tier2.damage);
    expect(tier1.projectileRadius).toBe(tier2.projectileRadius);
    expect(tier3.projectileRadius).toBeGreaterThan(tier2.projectileRadius);
    expect(tier3.cooldownTicks).toBeLessThan(tier2.cooldownTicks);
  });

  it('raises rapid-projectile damage at Tier 2 and holds it at Tier 3', () => {
    const [tier1, tier2, tier3] = RAPID_PROJECTILE.tierEffects as [
      AbilityTierEffect,
      AbilityTierEffect,
      AbilityTierEffect,
    ];

    expect(tier1.damage).toBeLessThan(tier2.damage);
    expect(tier3.damage).toBe(tier2.damage);
    expect(tier1.projectileRadius).toBe(tier2.projectileRadius);
    expect(tier3.projectileRadius).toBeGreaterThan(tier2.projectileRadius);
    expect(tier3.cooldownTicks).toBeLessThan(tier2.cooldownTicks);
  });
});

const MID_RUN_ONLY_WEAPONS = [
  NEEDLE_PROJECTILE,
  FLICKER_PROJECTILE,
  LANCE_PROJECTILE,
  CANNON_PROJECTILE,
  SIEGE_PROJECTILE,
] as const;

const ALL_EIGHT_WEAPONS = [
  STARTER_PROJECTILE,
  HEAVY_PROJECTILE,
  RAPID_PROJECTILE,
  ...MID_RUN_ONLY_WEAPONS,
] as const;

describe('AbilityRegistry V2-107 mid-run-only weapons', () => {
  it('registers all five as non-start-eligible AUTO weapons with three tiers', () => {
    for (const weapon of MID_RUN_ONLY_WEAPONS) {
      expect(weapon.startEligible).toBe(false);
      expect(weapon.activation).toBe('auto');
      expect(weapon.authoredTiers).toBe(3);
      expect(weapon.tierEffects).toHaveLength(3);
      expect(weapon.code).toBeGreaterThanOrEqual(1);
      expect(weapon.code).toBeLessThanOrEqual(MAX_ABILITY_CODE);
    }
  });

  it('gives every tier effect a distinct ability tag matching its own identity', () => {
    for (const weapon of MID_RUN_ONLY_WEAPONS) {
      for (const effect of weapon.tierEffects) {
        expect(effect.ability).toBe(weapon.id);
      }
    }
  });

  it.each(MID_RUN_ONLY_WEAPONS)(
    'raises $id damage at Tier 2 and holds it at Tier 3, coverage and cadence improve at Tier 3',
    weapon => {
      const [tier1, tier2, tier3] = weapon.tierEffects as [
        AbilityTierEffect,
        AbilityTierEffect,
        AbilityTierEffect,
      ];

      expect(tier1.damage).toBeLessThan(tier2.damage);
      expect(tier3.damage).toBe(tier2.damage);
      expect(tier1.projectileRadius).toBe(tier2.projectileRadius);
      expect(tier3.projectileRadius).toBeGreaterThan(tier2.projectileRadius);
      expect(tier3.cooldownTicks).toBeLessThan(tier2.cooldownTicks);
    }
  );
});

describe('AbilityRegistry all eight identities (V2-106, V2-107)', () => {
  it('registers exactly eight identities in MVP1_ABILITY_REGISTRY, in this exact order', () => {
    expect(ALL_EIGHT_WEAPONS).toHaveLength(8);
    expect(MVP1_ABILITY_REGISTRY.ids).toEqual(
      ALL_EIGHT_WEAPONS.map(weapon => weapon.id)
    );
  });

  it('keeps every identity pairwise distinct by code and by ability tag', () => {
    for (let i = 0; i < ALL_EIGHT_WEAPONS.length; i += 1) {
      for (let j = i + 1; j < ALL_EIGHT_WEAPONS.length; j += 1) {
        const a = ALL_EIGHT_WEAPONS[i] as AbilityDefinition;
        const b = ALL_EIGHT_WEAPONS[j] as AbilityDefinition;

        expect(a.code).not.toBe(b.code);
        expect(a.id).not.toBe(b.id);
      }
    }
  });

  it('keeps every identity distinct by at least one numeric value per tier', () => {
    for (let tier = 0; tier < 3; tier += 1) {
      for (let i = 0; i < ALL_EIGHT_WEAPONS.length; i += 1) {
        for (let j = i + 1; j < ALL_EIGHT_WEAPONS.length; j += 1) {
          const a = ALL_EIGHT_WEAPONS[i]?.tierEffects[tier] as AbilityTierEffect;
          const b = ALL_EIGHT_WEAPONS[j]?.tierEffects[tier] as AbilityTierEffect;

          const differsOnAtLeastOneField =
            a.damage !== b.damage ||
            a.projectileRadius !== b.projectileRadius ||
            a.cooldownTicks !== b.cooldownTicks;

          expect(differsOnAtLeastOneField).toBe(true);
        }
      }
    }
  });

  it('opens every identity at the identical Tier 1 damage-per-tick baseline (V2-ADR-066)', () => {
    const starterTier1 = STARTER_PROJECTILE.tierEffects[0] as AbilityTierEffect;
    const baselineDps = starterTier1.damage / starterTier1.cooldownTicks;

    for (const weapon of ALL_EIGHT_WEAPONS) {
      const tier1 = weapon.tierEffects[0] as AbilityTierEffect;
      expect(tier1.damage / tier1.cooldownTicks).toBeCloseTo(baselineDps, 10);
    }
  });
});
