import { describe, expect, it } from 'vitest';

import {
  assertLootEventEncounterOutput,
  assertSpawnEncounterOutput,
  assertWorldEventEncounterOutput,
} from '@/game-v2/contracts/EncounterOutput';

const VALID_SPAWN: Record<string, unknown> = {
  kind: 'SPAWN',
  enemyBudget: 8,
  themeId: 'bullish-breakout',
};

const VALID_WORLD_EVENT: Record<string, unknown> = {
  kind: 'WORLD_EVENT',
  hazardId: 'volatility-tremor',
  telegraphTicks: 120,
};

const VALID_LOOT_EVENT: Record<string, unknown> = {
  kind: 'LOOT_EVENT',
  lootTierId: 'whale-loot',
  lootValue: 2,
};

describe('assertSpawnEncounterOutput', () => {
  it('validates and freezes a well-formed output', () => {
    const output = assertSpawnEncounterOutput(VALID_SPAWN);

    expect(output).toEqual(VALID_SPAWN);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['wrong kind', { ...VALID_SPAWN, kind: 'WORLD_EVENT' }],
    ['zero enemyBudget', { ...VALID_SPAWN, enemyBudget: 0 }],
    ['negative enemyBudget', { ...VALID_SPAWN, enemyBudget: -1 }],
    ['non-integer enemyBudget', { ...VALID_SPAWN, enemyBudget: 1.5 }],
    ['non-finite enemyBudget', { ...VALID_SPAWN, enemyBudget: Number.NaN }],
    ['empty themeId', { ...VALID_SPAWN, themeId: '' }],
    ['non-string themeId', { ...VALID_SPAWN, themeId: 42 }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertSpawnEncounterOutput(override)).toThrow();
  });
});

describe('assertWorldEventEncounterOutput', () => {
  it('validates and freezes a well-formed output', () => {
    const output = assertWorldEventEncounterOutput(VALID_WORLD_EVENT);

    expect(output).toEqual(VALID_WORLD_EVENT);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['wrong kind', { ...VALID_WORLD_EVENT, kind: 'SPAWN' }],
    ['empty hazardId', { ...VALID_WORLD_EVENT, hazardId: '' }],
    ['non-string hazardId', { ...VALID_WORLD_EVENT, hazardId: 42 }],
    ['zero telegraphTicks', { ...VALID_WORLD_EVENT, telegraphTicks: 0 }],
    ['negative telegraphTicks', { ...VALID_WORLD_EVENT, telegraphTicks: -1 }],
    ['non-integer telegraphTicks', { ...VALID_WORLD_EVENT, telegraphTicks: 1.5 }],
    ['non-finite telegraphTicks', { ...VALID_WORLD_EVENT, telegraphTicks: Number.NaN }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertWorldEventEncounterOutput(override)).toThrow();
  });
});

describe('assertLootEventEncounterOutput', () => {
  it('validates and freezes a well-formed output', () => {
    const output = assertLootEventEncounterOutput(VALID_LOOT_EVENT);

    expect(output).toEqual(VALID_LOOT_EVENT);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['wrong kind', { ...VALID_LOOT_EVENT, kind: 'SPAWN' }],
    ['empty lootTierId', { ...VALID_LOOT_EVENT, lootTierId: '' }],
    ['non-string lootTierId', { ...VALID_LOOT_EVENT, lootTierId: 42 }],
    ['zero lootValue', { ...VALID_LOOT_EVENT, lootValue: 0 }],
    ['negative lootValue', { ...VALID_LOOT_EVENT, lootValue: -1 }],
    ['non-integer lootValue', { ...VALID_LOOT_EVENT, lootValue: 1.5 }],
    ['non-finite lootValue', { ...VALID_LOOT_EVENT, lootValue: Number.NaN }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertLootEventEncounterOutput(override)).toThrow();
  });
});
