import { describe, expect, it } from 'vitest';

import {
  MOVE_SPEED_PASSIVE,
  MVP1_PASSIVE_REGISTRY,
  createPassiveRegistry,
} from '@/game-v2/config/PassiveRegistry';
import { PLAYER_MOVE_SPEED } from '@/game-v2/config/Mvp0Config';
import {
  EMPTY_PASSIVE_CODE,
  MAX_PASSIVE_CODE,
  PASSIVE_MAX_LEVEL,
  PASSIVE_MOVE_SPEED_BY_LEVEL,
  type PassiveDefinition,
  type PassiveIdentityId,
} from '@/game-v2/contracts/PassiveSlot';

const definition = (overrides: {
  id: string;
  code: number;
  authoredLevels?: number;
}): PassiveDefinition =>
  ({
    authoredLevels: overrides.authoredLevels ?? PASSIVE_MAX_LEVEL,
    code: overrides.code,
    id: overrides.id as PassiveIdentityId,
  }) as PassiveDefinition;

describe('PassiveRegistry', () => {
  it('resolves the move-speed passive by id and by code', () => {
    expect(MVP1_PASSIVE_REGISTRY.byId('move-speed')).toEqual(MOVE_SPEED_PASSIVE);
    expect(MVP1_PASSIVE_REGISTRY.byCode(MOVE_SPEED_PASSIVE.code)).toEqual(
      MOVE_SPEED_PASSIVE
    );
    expect(MVP1_PASSIVE_REGISTRY.size).toBe(1);
  });

  it('reserves code zero for the empty slot', () => {
    expect(EMPTY_PASSIVE_CODE).toBe(0);
    expect(MVP1_PASSIVE_REGISTRY.byCode(EMPTY_PASSIVE_CODE)).toBeNull();
  });

  it('authors every one of the five move-speed levels', () => {
    expect(MOVE_SPEED_PASSIVE.authoredLevels).toBe(PASSIVE_MAX_LEVEL);
    expect(PASSIVE_MOVE_SPEED_BY_LEVEL).toHaveLength(PASSIVE_MAX_LEVEL + 1);
    expect(PASSIVE_MOVE_SPEED_BY_LEVEL[0]).toBe(PLAYER_MOVE_SPEED);

    for (let level = 1; level <= PASSIVE_MAX_LEVEL; level += 1) {
      const previous = PASSIVE_MOVE_SPEED_BY_LEVEL[level - 1] as number;
      const current = PASSIVE_MOVE_SPEED_BY_LEVEL[level] as number;

      expect(current).toBeGreaterThan(previous);
      expect(current - previous).toBeCloseTo(PLAYER_MOVE_SPEED / 12, 10);
      expect(Math.fround(current)).toBe(current);
    }
  });

  it('rejects an unknown identity and an unknown code', () => {
    expect(() => MVP1_PASSIVE_REGISTRY.byId('missing' as PassiveIdentityId)).toThrow(
      'unknown passive identity'
    );
    expect(() => MVP1_PASSIVE_REGISTRY.byCode(MAX_PASSIVE_CODE)).toThrow(
      'unknown passive code'
    );
  });

  it('rejects an empty registry, duplicate identities, and duplicate codes', () => {
    expect(() => createPassiveRegistry([])).toThrow(
      'passive registry requires at least one definition'
    );
    expect(() =>
      createPassiveRegistry([
        definition({ id: 'a', code: 1 }),
        definition({ id: 'a', code: 2 }),
      ])
    ).toThrow('passive registry contains a duplicate identity');
    expect(() =>
      createPassiveRegistry([
        definition({ id: 'a', code: 1 }),
        definition({ id: 'b', code: 1 }),
      ])
    ).toThrow('passive registry contains a duplicate code');
  });

  it('rejects a code outside the hashable byte range', () => {
    for (const code of [0, -1, 1.5, MAX_PASSIVE_CODE + 1, Number.NaN]) {
      expect(() => createPassiveRegistry([definition({ id: 'a', code })])).toThrow(
        `passive code must be an integer inside 1..${MAX_PASSIVE_CODE}`
      );
    }
  });

  it('rejects an authored level count outside one through five', () => {
    for (const authoredLevels of [0, 6, 1.5, Number.NaN]) {
      expect(() =>
        createPassiveRegistry([definition({ id: 'a', code: 1, authoredLevels })])
      ).toThrow(
        `authored level count must be an integer inside 1..${PASSIVE_MAX_LEVEL}`
      );
    }
  });

  it('freezes the definitions it returns', () => {
    const registry = createPassiveRegistry([definition({ id: 'a', code: 9 })]);

    expect(Object.isFrozen(registry.byCode(9))).toBe(true);
  });
});
