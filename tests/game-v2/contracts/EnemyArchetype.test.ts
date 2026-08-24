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
});
