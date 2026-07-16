import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_CONFIG_V1,
  DirectorConfigValidationError,
  validateDirectorConfig,
} from '../../../services/director/config/DirectorConfigV1';
import { resolveDirectorRuntimePlan } from '../../../services/director/DirectorRuntimeMode';
import { getDirectorRuntimeConfig } from '../../../config/directorRuntime';
import { createMarketScenarioArtifact } from '../../golden/helpers/scenarios';

describe('Director runtime configuration', () => {
  it('accepts the versioned v1 director config', () => {
    expect(validateDirectorConfig(DIRECTOR_CONFIG_V1)).toBe(DIRECTOR_CONFIG_V1);
    expect(DIRECTOR_CONFIG_V1.versions).toEqual({
      directorVersion: 'director-v1',
      configVersion: 'director-config-v1',
      contentManifestHash: 'content-manifest-pending',
    });
  });

  it('fails fast when market-pressure weights do not total one', () => {
    const invalidConfig = {
      ...DIRECTOR_CONFIG_V1,
      marketPressure: {
        ...DIRECTOR_CONFIG_V1.marketPressure,
        weights: {
          ...DIRECTOR_CONFIG_V1.marketPressure.weights,
          volatility: 0.5,
        },
      },
    };

    expect(() => validateDirectorConfig(invalidConfig)).toThrow(
      DirectorConfigValidationError
    );
  });

  it.each([
    ['current', 'current', true, false, false],
    ['shadow', 'shadow', true, true, false],
    ['modular', 'modular', false, true, true],
    ['runtime', 'current', true, false, false],
    ['invalid', 'current', true, false, false],
  ] as const)(
    'resolves %s without consulting market runtime mode',
    (rawMode, mode, runsCurrentAdapter, runsModularShadow, appliesModularSnapshot) => {
      const legacyGoldenHash = createMarketScenarioArtifact().contentHash;
      const config = getDirectorRuntimeConfig(rawMode);

      expect(config).toMatchObject({
        mode,
        runsCurrentAdapter,
        runsModularShadow,
        appliesModularSnapshot,
      });
      expect(resolveDirectorRuntimePlan(config.mode)).toEqual(config);
      expect(createMarketScenarioArtifact().contentHash).toBe(legacyGoldenHash);
    }
  );
});
