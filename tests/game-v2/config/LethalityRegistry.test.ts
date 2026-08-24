import { describe, expect, it } from 'vitest';

import {
  BRUTE_ENEMY_CONTACT_DAMAGE,
  ENEMY_CONTACT_COOLDOWN_TICKS,
  ENEMY_CONTACT_DAMAGE,
  MVP0_ENEMY_SPAWN_BUDGET,
  MVP0_MAX_LIVE_ENEMIES,
  PLAYER_MAX_HEALTH,
  SWARMLING_ENEMY_CONTACT_DAMAGE,
} from '@/game-v2/config/Mvp0Config';
import {
  LEVERAGE_LETHALITY_PROFILES,
  resolveIncomingDamage,
  resolveLethalityProfile,
} from '@/game-v2/config/LethalityRegistry';
import { LEVERAGE_MODES } from '@/game-v2/contracts/PositionContext';

describe('LEVERAGE_LETHALITY_PROFILES', () => {
  it('registers exactly the five displayed leverage modes, pairwise distinct', () => {
    const leverages = Object.values(LEVERAGE_LETHALITY_PROFILES).map(
      profile => profile.leverage
    );

    expect(leverages).toHaveLength(5);
    expect(new Set(leverages).size).toBe(5);
    expect([...leverages].sort((a, b) => a - b)).toEqual(
      [...LEVERAGE_MODES].sort((a, b) => a - b)
    );
  });

  it("reproduces today's exact constants at 1x (V2-ADR-092)", () => {
    const profile = resolveLethalityProfile(1);

    expect(profile.playerMaxHealth).toBe(PLAYER_MAX_HEALTH);
    expect(profile.enemyDamageMultiplier).toBe(1);
    expect(profile.playerArmor).toBe(0);
  });

  it('holds enemyDamageMultiplier and playerArmor fixed across every mode (V2-ADR-093)', () => {
    for (const leverage of LEVERAGE_MODES) {
      const profile = resolveLethalityProfile(leverage);
      expect(profile.enemyDamageMultiplier).toBe(1);
      expect(profile.playerArmor).toBe(0);
    }
  });

  it('derives playerMaxHealth as PLAYER_MAX_HEALTH / leverage, rounded', () => {
    for (const leverage of LEVERAGE_MODES) {
      const profile = resolveLethalityProfile(leverage);
      expect(profile.playerMaxHealth).toBe(Math.round(PLAYER_MAX_HEALTH / leverage));
    }
  });

  it('strictly decreases playerMaxHealth as leverage rises', () => {
    const sorted = [...LEVERAGE_MODES].sort((a, b) => a - b);
    let previousHealth = Number.POSITIVE_INFINITY;

    for (const leverage of sorted) {
      const health = resolveLethalityProfile(leverage).playerMaxHealth;
      expect(health).toBeLessThan(previousHealth);
      previousHealth = health;
    }
  });

  it('derives the placeholder fields from real existing constants, not invented numbers (V2-ADR-095)', () => {
    for (const leverage of LEVERAGE_MODES) {
      const profile = resolveLethalityProfile(leverage);

      expect(profile.encounterPressureLimit).toBe(MVP0_MAX_LIVE_ENEMIES);
      expect(profile.encounterComplexityLimit).toBe(MVP0_ENEMY_SPAWN_BUDGET);
      expect(profile.liquidationDistance).toBe(profile.playerMaxHealth);
      expect(profile.rewardCeiling).toBe(leverage);
      expect(profile.recoveryToleranceTicks).toBe(
        Math.floor(profile.playerMaxHealth / ENEMY_CONTACT_DAMAGE) *
          ENEMY_CONTACT_COOLDOWN_TICKS
      );
    }
  });

  it('derives incomingDamageEnvelope from the enemy registry min/max through the same composer (V2-ADR-096)', () => {
    for (const leverage of LEVERAGE_MODES) {
      const profile = resolveLethalityProfile(leverage);

      expect(profile.incomingDamageEnvelope.min).toBe(
        resolveIncomingDamage(profile, SWARMLING_ENEMY_CONTACT_DAMAGE)
      );
      expect(profile.incomingDamageEnvelope.max).toBe(
        resolveIncomingDamage(profile, BRUTE_ENEMY_CONTACT_DAMAGE)
      );
    }
  });
});

describe('resolveIncomingDamage', () => {
  it('applies exactly one multiplication and one reduction (no double scaling)', () => {
    const profile = { enemyDamageMultiplier: 2, playerArmor: 0.25 };

    // 10 * 2 * (1 - 0.25) = 15, not e.g. 10 * 2 * 2 * 0.75 (a double-applied multiplier).
    expect(resolveIncomingDamage(profile, 10)).toBe(15);
  });

  it('never returns negative damage', () => {
    const fullyAbsorbed = { enemyDamageMultiplier: 1, playerArmor: 1 };
    expect(resolveIncomingDamage(fullyAbsorbed, 100)).toBe(0);

    // `resolveIncomingDamage` does not itself re-validate against
    // `assertCombatLethalityProfile`'s 0..1 armor bound — it takes any
    // object matching its narrow `Pick` shape — so the safety floor is
    // only actually exercised by an out-of-range armor value; every
    // authored profile keeps armor inside 0..1, where the floor happens to
    // never bind. Without `Math.max(0, ...)`, this would return -100.
    const overAbsorbed = { enemyDamageMultiplier: 1, playerArmor: 1.5 };
    expect(resolveIncomingDamage(overAbsorbed, 100)).toBe(0);
  });

  it.each([
    ['non-finite rawDamage', Number.NaN],
    ['negative rawDamage', -1],
  ] as const)('rejects %s', (_label, rawDamage) => {
    expect(() =>
      resolveIncomingDamage({ enemyDamageMultiplier: 1, playerArmor: 0 }, rawDamage)
    ).toThrow(RangeError);
  });
});

describe('resolveLethalityProfile', () => {
  it('rejects an unregistered leverage', () => {
    // @ts-expect-error deliberately invalid leverage for the runtime guard
    expect(() => resolveLethalityProfile(2)).toThrow(RangeError);
  });
});
