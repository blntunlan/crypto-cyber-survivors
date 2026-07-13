import { describe, expect, it } from 'vitest';
import {
  BASELINE_SCHEMA_VERSION,
  BASELINE_SOURCE_REVISION,
  createBaselineArtifact,
  hashBaselinePayload,
  validateBaselineArtifact,
} from './baselineArtifact';

describe('baselineArtifact', () => {
  it('hashes equal objects with different key insertion order identically', () => {
    expect(hashBaselinePayload({ b: 2, a: { z: true, y: [3, 1] } })).toBe(
      hashBaselinePayload({ a: { y: [3, 1], z: true }, b: 2 })
    );
  });

  it('creates a schema-versioned artifact with a verified payload hash', () => {
    const artifact = createBaselineArtifact({
      fixtureId: 'artifact-test.v1',
      producer: 'baselineArtifact.test',
      sourceRevision: BASELINE_SOURCE_REVISION,
      payload: { sample: [1, 2, 3] },
    });

    expect(artifact.schemaVersion).toBe(BASELINE_SCHEMA_VERSION);
    expect(validateBaselineArtifact(artifact, 'baselineArtifact.test').payload).toEqual(
      {
        sample: [1, 2, 3],
      }
    );
  });

  it('rejects a mismatched hash, unsupported schema, and non-finite payload', () => {
    const artifact = createBaselineArtifact({
      fixtureId: 'invalid.v1',
      producer: 'baselineArtifact.test',
      sourceRevision: BASELINE_SOURCE_REVISION,
      payload: { sample: 1 },
    });

    expect(() =>
      validateBaselineArtifact({ ...artifact, contentHash: '0'.repeat(64) })
    ).toThrow('contentHash');
    expect(() => validateBaselineArtifact({ ...artifact, schemaVersion: 2 })).toThrow(
      'schemaVersion'
    );
    expect(() => hashBaselinePayload({ sample: Number.NaN })).toThrow('non-finite');
  });
});
