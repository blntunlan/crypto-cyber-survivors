import { describe, expect, it } from 'vitest';

import { assertEnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';

const validDefinition = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'grunt',
  health: 30,
  moveSpeed: 2.2,
  contactDamage: 15,
  radius: 0.6,
  xpValue: 5,
  cost: 2,
  telegraph: { behavior: 'none' },
  ...overrides,
});

const validChargerTelegraph = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  behavior: 'charger',
  telegraphTicks: 30,
  activeTicks: 20,
  cooldownTicks: 120,
  dashSpeed: 6.6,
  triggerRange: 3.1,
  ...overrides,
});

const validBloaterTelegraph = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  behavior: 'bloater',
  telegraphTicks: 45,
  burstDamage: 30,
  burstRadius: 2.4,
  ...overrides,
});

const validSniperTelegraph = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  behavior: 'sniper',
  telegraphTicks: 36,
  activeTicks: 6,
  cooldownTicks: 150,
  lineDamage: 19.5,
  lineTolerance: 0.8,
  lineRange: 7.2,
  ...overrides,
});

describe('assertEnemyDefinition', () => {
  it('accepts a well-formed definition and returns it', () => {
    const result = assertEnemyDefinition(validDefinition());

    expect(result).toEqual(validDefinition());
  });

  it('rejects a non-object value', () => {
    expect(() => assertEnemyDefinition(null)).toThrow(
      'enemy definition must be an object'
    );
    expect(() => assertEnemyDefinition('grunt')).toThrow(
      'enemy definition must be an object'
    );
  });

  it('rejects a missing or empty id', () => {
    expect(() => assertEnemyDefinition(validDefinition({ id: '' }))).toThrow(
      'enemy definition id must be a non-empty string'
    );
    expect(() => assertEnemyDefinition(validDefinition({ id: undefined }))).toThrow(
      'enemy definition id must be a non-empty string'
    );
  });

  it.each(['health', 'moveSpeed', 'contactDamage', 'radius', 'xpValue'])(
    'rejects a non-finite, negative, or zero %s',
    field => {
      for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
        expect(() =>
          assertEnemyDefinition(validDefinition({ [field]: value }))
        ).toThrow(
          'requires finite positive health, moveSpeed, contactDamage, radius, and xpValue'
        );
      }
    }
  );

  it('rejects a non-integer, zero, or negative cost', () => {
    for (const cost of [0, -1, 1.5, Number.NaN, undefined]) {
      expect(() => assertEnemyDefinition(validDefinition({ cost }))).toThrow(
        'enemy definition cost must be a positive integer'
      );
    }
  });

  describe('telegraph (V2-300)', () => {
    it('rejects a non-object telegraph', () => {
      expect(() => assertEnemyDefinition(validDefinition({ telegraph: null }))).toThrow(
        'enemy definition telegraph must be an object'
      );
      expect(() =>
        assertEnemyDefinition(validDefinition({ telegraph: undefined }))
      ).toThrow('enemy definition telegraph must be an object');
    });

    it('rejects an unknown behavior', () => {
      expect(() =>
        assertEnemyDefinition(validDefinition({ telegraph: { behavior: 'ghost' } }))
      ).toThrow('enemy definition telegraph has an unknown behavior');
    });

    it('accepts a well-formed charger telegraph', () => {
      const definition = validDefinition({ telegraph: validChargerTelegraph() });
      const result = assertEnemyDefinition(definition);

      expect(result.telegraph).toEqual(validChargerTelegraph());
    });

    it.each(['telegraphTicks', 'activeTicks', 'cooldownTicks'])(
      'rejects a non-positive-integer charger %s',
      field => {
        for (const value of [0, -1, 1.5, Number.NaN, undefined]) {
          expect(() =>
            assertEnemyDefinition(
              validDefinition({
                telegraph: validChargerTelegraph({ [field]: value }),
              })
            )
          ).toThrow(/charger telegraph requires/);
        }
      }
    );

    it.each(['dashSpeed', 'triggerRange'])(
      'rejects a non-finite-positive charger %s',
      field => {
        for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
          expect(() =>
            assertEnemyDefinition(
              validDefinition({
                telegraph: validChargerTelegraph({ [field]: value }),
              })
            )
          ).toThrow(/charger telegraph requires/);
        }
      }
    );

    it('accepts a well-formed bloater telegraph', () => {
      const definition = validDefinition({ telegraph: validBloaterTelegraph() });
      const result = assertEnemyDefinition(definition);

      expect(result.telegraph).toEqual(validBloaterTelegraph());
    });

    it.each(['telegraphTicks', 'burstDamage', 'burstRadius'])(
      'rejects an invalid bloater %s',
      field => {
        const value = field === 'telegraphTicks' ? 1.5 : 0;
        expect(() =>
          assertEnemyDefinition(
            validDefinition({
              telegraph: validBloaterTelegraph({ [field]: value }),
            })
          )
        ).toThrow(/bloater telegraph requires/);
      }
    );

    it('accepts a well-formed sniper telegraph', () => {
      const definition = validDefinition({ telegraph: validSniperTelegraph() });
      const result = assertEnemyDefinition(definition);

      expect(result.telegraph).toEqual(validSniperTelegraph());
    });

    it.each([
      'telegraphTicks',
      'activeTicks',
      'cooldownTicks',
      'lineDamage',
      'lineTolerance',
      'lineRange',
    ])('rejects an invalid sniper %s', field => {
      const isTickField = field.endsWith('Ticks');
      const value = isTickField ? 1.5 : 0;
      expect(() =>
        assertEnemyDefinition(
          validDefinition({
            telegraph: validSniperTelegraph({ [field]: value }),
          })
        )
      ).toThrow(/sniper telegraph requires/);
    });
  });
});
