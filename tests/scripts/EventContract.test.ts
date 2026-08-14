import { describe, expect, it } from 'vitest';

// scripts/ sits outside the root tsconfig; the guard is plain ESM and only its
// two pure functions are exercised here.
import {
  applyAllowlist,
  computeViolations,
} from '../../scripts/check-event-contract.mjs';

type Violation = { event: string; detail: string };
type Violations = {
  declaredNotEmitted: Violation[];
  emittedNotListened: Violation[];
  listenedNotEmitted: Violation[];
  effectRegistryStale: Violation[];
};

const sets = (entries: Record<string, string[]>): Map<string, Set<string>> =>
  new Map(Object.entries(entries).map(([event, files]) => [event, new Set(files)]));

const eventsOf = (violations: Violation[]): string[] =>
  violations.map(violation => violation.event).sort();

describe('event contract guard', () => {
  it('flags a union member nothing emits', () => {
    const violations = computeViolations({
      declared: new Set(['live', 'neverEmitted']),
      emitted: sets({ live: ['services/a.ts'] }),
      listened: sets({ live: ['services/b.ts'] }),
      effectRegistryEvents: new Set<string>(),
    }) as Violations;

    expect(eventsOf(violations.declaredNotEmitted)).toEqual(['neverEmitted']);
  });

  it('flags an emit no one listens to, and names the emitting files', () => {
    const violations = computeViolations({
      declared: new Set(['shouted']),
      emitted: sets({ shouted: ['services/a.ts', 'services/b.ts'] }),
      listened: sets({}),
      effectRegistryEvents: new Set<string>(),
    }) as Violations;

    expect(eventsOf(violations.emittedNotListened)).toEqual(['shouted']);
    expect(violations.emittedNotListened[0]?.detail).toContain('services/a.ts');
  });

  it('flags listeners with no emitter — the lost-feature case', () => {
    // This is the rule that catches a dropped emitter, which is how
    // marketStateUpdated ended up with four live listeners and no producer.
    const violations = computeViolations({
      declared: new Set(['orphaned']),
      emitted: sets({}),
      listened: sets({ orphaned: ['components/hud/X.tsx'] }),
      effectRegistryEvents: new Set<string>(),
    }) as Violations;

    expect(eventsOf(violations.listenedNotEmitted)).toEqual(['orphaned']);
  });

  it('flags an effect policy keyed on an event nothing emits', () => {
    const violations = computeViolations({
      declared: new Set(['ghost']),
      emitted: sets({}),
      listened: sets({}),
      effectRegistryEvents: new Set(['ghost']),
    }) as Violations;

    expect(eventsOf(violations.effectRegistryStale)).toEqual(['ghost']);
  });

  it('passes a fully wired event', () => {
    const violations = computeViolations({
      declared: new Set(['wired']),
      emitted: sets({ wired: ['services/a.ts'] }),
      listened: sets({ wired: ['services/b.ts'] }),
      effectRegistryEvents: new Set(['wired']),
    }) as Violations;

    expect(Object.values(violations).every(entries => entries.length === 0)).toBe(true);
  });

  describe('allowlist', () => {
    const violations = {
      declaredNotEmitted: [{ event: 'known', detail: 'known' }],
      emittedNotListened: [],
      listenedNotEmitted: [],
      effectRegistryStale: [],
    };

    it('suppresses a listed violation', () => {
      const { unallowed, staleAllowlist } = applyAllowlist(
        violations,
        new Map([['declaredNotEmitted', new Set(['known'])]])
      );

      expect(unallowed).toEqual([]);
      expect(staleAllowlist).toEqual([]);
    });

    it('still reports a violation that is not listed', () => {
      const { unallowed } = applyAllowlist(violations, new Map());

      expect(unallowed).toHaveLength(1);
      expect(unallowed[0]?.rule).toBe('declaredNotEmitted');
    });

    it('fails an entry that no longer violates, so the list can only shrink', () => {
      const { staleAllowlist } = applyAllowlist(
        {
          declaredNotEmitted: [],
          emittedNotListened: [],
          listenedNotEmitted: [],
          effectRegistryStale: [],
        },
        new Map([['declaredNotEmitted', new Set(['alreadyFixed'])]])
      );

      expect(staleAllowlist).toEqual(['declaredNotEmitted/alreadyFixed']);
    });
  });
});
