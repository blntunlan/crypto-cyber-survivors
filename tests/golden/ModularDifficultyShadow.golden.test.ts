import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ShadowComparisonRecorder } from '../../services/difficulty/runtime/ShadowComparisonRecorder';
import { SHADOW_COMPARISON_CONFIG } from '../../config/difficulty/ShadowComparisonConfig';
import {
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../types/runtimeDifficulty';

type Fixture = {
  version: string;
  scenarios: Array<{
    id: string;
    current: Parameters<ShadowComparisonRecorder['record']>[1];
    modular: {
      threatTarget: number;
      creditRate: number;
      spawnWindowSeconds: number;
      spawnCount: number;
      composition: string[];
      enemyHealthMultiplier: number;
      enemyDamageMultiplier: number;
      enemySpeedMultiplier: number;
      mercy: number;
      recoveryNeed: number;
      encounterPhase: RuntimeDifficultySnapshot['encounter']['phase'];
      presentationIntensity: number;
      quality: RuntimeDifficultySnapshot['meta']['quality'];
      fallbackCodes: string[];
    };
    expectedPassed: boolean;
  }>;
};

const fixture = JSON.parse(
  readFileSync('tests/golden/fixtures/modular-difficulty-shadow.v1.json', 'utf8')
) as Fixture;

describe('modular difficulty shadow golden', () => {
  it('matches the versioned scenario outcomes', () => {
    const recorder = new ShadowComparisonRecorder(SHADOW_COMPARISON_CONFIG);

    for (const scenario of fixture.scenarios) {
      const snapshot = structuredClone(
        createNeutralRuntimeDifficultySnapshot({ tick: 1, inputRevision: 1 })
      ) as any;
      const modular = scenario.modular;
      snapshot.meta.revision = 1;
      snapshot.meta.quality = modular.quality;
      snapshot.pressure.threatTarget = modular.threatTarget;
      snapshot.pressure.creditRate = modular.creditRate;
      snapshot.pressure.spawnCadence = modular.spawnWindowSeconds;
      snapshot.spawn.spawnWindowSeconds = modular.spawnWindowSeconds;
      snapshot.spawn.reservedCredits = modular.spawnCount;
      snapshot.spawn.directives = modular.composition.map(archetype => ({
        archetype,
        intent: 'pressure',
        allocation: 1,
      }));
      snapshot.enemy.healthMultiplier = modular.enemyHealthMultiplier;
      snapshot.enemy.damageMultiplier = modular.enemyDamageMultiplier;
      snapshot.enemy.speedMultiplier = modular.enemySpeedMultiplier;
      snapshot.recovery.mercy = modular.mercy;
      snapshot.recovery.recoveryNeed = modular.recoveryNeed;
      snapshot.encounter.phase = modular.encounterPhase;
      snapshot.presentation.intensity = modular.presentationIntensity;
      snapshot.trace.fallbackCodes = modular.fallbackCodes;

      expect(recorder.record(scenario.id, scenario.current, snapshot).passed).toBe(
        scenario.expectedPassed
      );
    }
  });
});
