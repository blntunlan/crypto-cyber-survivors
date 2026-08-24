import { describe, expect, it } from 'vitest';

import { assertSpawnEncounterOutput } from '@/game-v2/contracts/EncounterOutput';

const VALID: Record<string, unknown> = {
  kind: 'SPAWN',
  enemyBudget: 8,
  themeId: 'bullish-breakout',
};

describe('assertSpawnEncounterOutput', () => {
  it('validates and freezes a well-formed output', () => {
    const output = assertSpawnEncounterOutput(VALID);

    expect(output).toEqual(VALID);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['wrong kind', { ...VALID, kind: 'WORLD_EVENT' }],
    ['zero enemyBudget', { ...VALID, enemyBudget: 0 }],
    ['negative enemyBudget', { ...VALID, enemyBudget: -1 }],
    ['non-integer enemyBudget', { ...VALID, enemyBudget: 1.5 }],
    ['non-finite enemyBudget', { ...VALID, enemyBudget: Number.NaN }],
    ['empty themeId', { ...VALID, themeId: '' }],
    ['non-string themeId', { ...VALID, themeId: 42 }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertSpawnEncounterOutput(override)).toThrow();
  });
});
