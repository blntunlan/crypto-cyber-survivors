import { beforeEach, describe, expect, it } from 'vitest';
import { UnifiedDirector } from '../../services/difficulty/UnifiedDirector';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  hashBaselinePayload,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';
import { collectGoldenMismatches } from './helpers/goldenIo';
import { runUnifiedDirectorRules } from './helpers/legacyBaselineHarness';
import { RULE_SCENARIOS, RULE_SCENARIO_STEPS } from './helpers/scenarios';

const FIXTURE_PATH = 'tests/golden/fixtures/unified-rules.v1.json';
const TOLERANCE = 1e-8;

type UnifiedDirectorGoldenPayload = {
  outputHash: string;
  outputs: ReturnType<typeof runUnifiedDirectorRules>;
};

describe('Golden — UnifiedDirector legacy rules', () => {
  beforeEach(() => {
    UnifiedDirector.reset();
  });

  it('matches the versioned golden output for all legacy rule scenarios', () => {
    const actual = runUnifiedDirectorRules();

    expect(Object.keys(actual)).toHaveLength(RULE_SCENARIOS.length);
    for (const scenario of RULE_SCENARIOS) {
      expect(actual[scenario.name]).toHaveLength(RULE_SCENARIO_STEPS);
    }

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact(FIXTURE_PATH, {
        fixtureId: 'unified-rules.v1',
        producer: 'unified-director-rules',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: { outputHash: hashBaselinePayload(actual), outputs: actual },
      });
    }

    const expected = readBaselineArtifact<UnifiedDirectorGoldenPayload>(
      FIXTURE_PATH,
      'unified-director-rules'
    ).payload;
    expect(hashBaselinePayload(actual)).toBe(expected.outputHash);
    expect(collectGoldenMismatches(actual, expected.outputs, TOLERANCE)).toEqual([]);
  });

  it('produces the same output hash across repeated runs in one process', () => {
    expect(hashBaselinePayload(runUnifiedDirectorRules())).toBe(
      hashBaselinePayload(runUnifiedDirectorRules())
    );
  });
});
