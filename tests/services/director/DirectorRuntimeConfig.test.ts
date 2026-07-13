import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_CONFIG_V1,
  DirectorConfigValidationError,
  validateDirectorConfig,
} from '../../../services/director/config/DirectorConfigV1';
import {
  createDirectorRuntimeState,
  resolveDirectorRuntimePlan,
  transitionDirectorRuntimeState,
} from '../../../services/director/DirectorRuntimeMode';
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

  it('keeps the legacy path authoritative when the feature flag is off', () => {
    const legacyGoldenHash = createMarketScenarioArtifact().contentHash;
    const config = getDirectorRuntimeConfig('legacy');
    const plan = resolveDirectorRuntimePlan(config.mode);

    expect(config).toMatchObject({
      mode: 'LEGACY',
      runsLegacyPipeline: true,
      runsShadowDirector: false,
      appliesDirectorSnapshot: false,
    });
    expect(plan).toEqual(config);
    expect(createMarketScenarioArtifact().contentHash).toBe(legacyGoldenHash);
  });

  it('runs shadow calculations without applying gameplay side effects', () => {
    const config = getDirectorRuntimeConfig('dual');

    expect(config).toMatchObject({
      mode: 'SHADOW',
      runsLegacyPipeline: true,
      runsShadowDirector: true,
      appliesDirectorSnapshot: false,
    });
  });

  it('makes the director the sole gameplay authority only in runtime mode', () => {
    const config = getDirectorRuntimeConfig('runtime');

    expect(config).toMatchObject({
      mode: 'NEW_AUTHORITY',
      runsLegacyPipeline: false,
      runsShadowDirector: true,
      appliesDirectorSnapshot: true,
    });
  });

  it('resets only director-owned state when rolling back to legacy', () => {
    const state = {
      ...createDirectorRuntimeState('NEW_AUTHORITY'),
      lastProcessedTick: 240,
      latestSnapshotRevision: 12,
    };

    expect(transitionDirectorRuntimeState(state, 'LEGACY')).toEqual({
      mode: 'LEGACY',
      transitionGeneration: 1,
      lastProcessedTick: null,
      latestSnapshotRevision: null,
    });
  });
});
