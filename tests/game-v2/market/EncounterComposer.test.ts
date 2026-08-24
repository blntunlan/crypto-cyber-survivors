import { describe, expect, it } from 'vitest';

import { assertSpawnEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';
import {
  EncounterComposer,
  type ComposedEncounter,
  type EncounterCandidate,
} from '@/game-v2/market/EncounterComposer';

const profile = (
  id: string,
  priority: number,
  compatibleWith: readonly string[] = []
): ReturnType<typeof assertIndicatorEventProfile> =>
  assertIndicatorEventProfile({
    id,
    direction: 'above',
    entryThreshold: 0.5,
    exitThreshold: 0.5,
    confirmationTicks: 0,
    cooldownTicks: 0,
    hysteresis: 0,
    priority,
    outputKind: 'SPAWN',
    compatibleWith,
  });

const output = (themeId: string): ReturnType<typeof assertSpawnEncounterOutput> =>
  assertSpawnEncounterOutput({ kind: 'SPAWN', enemyBudget: 1, themeId });

const candidate = (
  id: string,
  priority: number,
  compatibleWith: readonly string[] = []
): EncounterCandidate => ({
  profile: profile(id, priority, compatibleWith),
  output: output(id),
});

const freshOut = (): ComposedEncounter => ({ primary: null, support: null });

describe('EncounterComposer', () => {
  it('composes primary: null, support: null for zero candidates', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([], out);

    expect(out).toEqual({ primary: null, support: null });
  });

  it('composes primary-only for a single candidate', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([candidate('a', 1)], out);

    expect(out.primary).toEqual(output('a'));
    expect(out.support).toBeNull();
  });

  it('composes primary+support when the primary marks the other candidate compatible', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([candidate('a', 2, ['b']), candidate('b', 1)], out);

    expect(out.primary).toEqual(output('a'));
    expect(out.support).toEqual(output('b'));
  });

  it("drops the loser silently when candidates are incompatible (today's real content)", () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([candidate('a', 2), candidate('b', 1)], out);

    expect(out.primary).toEqual(output('a'));
    expect(out.support).toBeNull();
  });

  it('never selects more than one primary and one support among three candidates', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    // Only 'a' <-> 'b' are compatible; 'c' is a third, higher-priority
    // incompatible candidate that must still be dropped.
    composer.compose(
      [candidate('a', 2, ['b']), candidate('b', 1), candidate('c', 3)],
      out
    );

    expect(out.primary).toEqual(output('c'));
    expect(out.support).toBeNull();
  });

  it('resolves equal-priority ties by ascending profile id (V2-ADR-124)', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([candidate('zebra', 1), candidate('apple', 1)], out);

    expect(out.primary).toEqual(output('apple'));
  });

  it('resolves equal-priority support ties by ascending profile id too', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose(
      [
        candidate('primary', 5, ['zebra', 'apple']),
        candidate('zebra', 1),
        candidate('apple', 1),
      ],
      out
    );

    expect(out.support).toEqual(output('apple'));
  });

  it('prefers strictly higher priority over id ordering', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    // 'apple' would win by id, but 'zebra' has strictly higher priority.
    composer.compose([candidate('zebra', 2), candidate('apple', 1)], out);

    expect(out.primary).toEqual(output('zebra'));
  });

  it('checks compatibility directionally against the primary only (V2-ADR-125)', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    // 'b' lists 'a' as compatible, but 'a' (the winning primary) does not
    // list 'b' back — so no support is selected.
    composer.compose([candidate('a', 2), candidate('b', 1, ['a'])], out);

    expect(out.primary).toEqual(output('a'));
    expect(out.support).toBeNull();
  });

  it('is stateless: consecutive calls never remember a rejected candidate', () => {
    const composer = new EncounterComposer();
    const out = freshOut();

    composer.compose([candidate('a', 2), candidate('b', 1)], out);
    expect(out.support).toBeNull();

    // A later call with only the previously-rejected candidate must
    // resolve on its own, with no memory of the earlier tick.
    composer.compose([candidate('b', 1)], out);
    expect(out.primary).toEqual(output('b'));
    expect(out.support).toBeNull();
  });
});
