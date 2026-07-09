/**
 * Golden test — Katman A: UnifiedDirector kural pipeline'ının HAM
 * (pre-smoothing) çıktılarını kilitler.
 *
 * 4 senaryo × 60 adım sabit UnifiedInputs dizisi → her adımda update +
 * snapToTargets → raw hedef çıktılar. Kurallar Director.RulesLayer'a
 * taşınırken bit-eşitlik (1e-8) garantisi sağlar.
 *
 * Fixture üretimi (bir kez): UPDATE_GOLDEN=1 npx vitest run tests/golden
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnifiedDirector,
  type UnifiedOutputs,
} from '../../services/difficulty/UnifiedDirector';
import {
  collectGoldenMismatches,
  isGoldenUpdateMode,
  readGoldenFixture,
  writeGoldenFixture,
} from './helpers/goldenIo';
import { RULE_SCENARIOS, RULE_SCENARIO_STEPS } from './helpers/scenarios';

const FIXTURE_NAME = 'unified-rules.golden.json';
const TOLERANCE = 1e-8;

type RuleGoldenFixture = Record<string, UnifiedOutputs[]>;

function runScenarios(): RuleGoldenFixture {
  const results: RuleGoldenFixture = {};

  for (const scenario of RULE_SCENARIOS) {
    UnifiedDirector.reset();
    const outputs: UnifiedOutputs[] = [];

    for (let step = 0; step < RULE_SCENARIO_STEPS; step++) {
      UnifiedDirector.update(scenario.inputsAt(step), step * 1000);
      // Ham hedef çıktılar: snap sonrası smoothed == raw target
      UnifiedDirector.snapToTargets();
      outputs.push(UnifiedDirector.getOutputs());
    }

    results[scenario.name] = outputs;
  }

  return results;
}

describe('Golden — UnifiedDirector rule pipeline (raw outputs)', () => {
  beforeEach(() => {
    UnifiedDirector.reset();
  });

  it('matches the locked golden fixture for all scenarios', () => {
    const actual = runScenarios();

    // Temel sağlamlık — fixture modundan bağımsız
    expect(Object.keys(actual)).toHaveLength(RULE_SCENARIOS.length);
    for (const scenario of RULE_SCENARIOS) {
      expect(actual[scenario.name]).toHaveLength(RULE_SCENARIO_STEPS);
    }

    if (isGoldenUpdateMode()) {
      writeGoldenFixture(FIXTURE_NAME, actual);
      return;
    }

    const expected = readGoldenFixture<RuleGoldenFixture>(FIXTURE_NAME);
    const mismatches = collectGoldenMismatches(actual, expected, TOLERANCE);
    expect(mismatches).toEqual([]);
  });

  it('is deterministic across repeated runs in the same process', () => {
    const first = runScenarios();
    const second = runScenarios();
    expect(collectGoldenMismatches(second, first, 0)).toEqual([]);
  });
});
