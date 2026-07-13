import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const BASELINE_SCHEMA_VERSION = 1 as const;
export const BASELINE_SOURCE_REVISION = '1ce825ab6045a63636422556a7fd5621df5a0328';

export type BaselineArtifact<TPayload> = {
  schemaVersion: typeof BASELINE_SCHEMA_VERSION;
  fixtureId: string;
  sourceRevision: string;
  producer: string;
  contentHash: string;
  payload: TPayload;
};

type ArtifactInput<TPayload> = Omit<
  BaselineArtifact<TPayload>,
  'schemaVersion' | 'contentHash'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Cannot hash non-finite number in baseline payload');
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (!isRecord(value)) {
    throw new Error(`Cannot hash unsupported baseline payload value: ${typeof value}`);
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
};

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

export const hashBaselinePayload = (payload: unknown): string =>
  createHash('sha256').update(canonicalJson(payload)).digest('hex');

export const createBaselineArtifact = <TPayload>(
  input: ArtifactInput<TPayload>
): BaselineArtifact<TPayload> => ({
  ...input,
  schemaVersion: BASELINE_SCHEMA_VERSION,
  contentHash: hashBaselinePayload(input.payload),
});

export const validateBaselineArtifact = <TPayload>(
  value: unknown,
  expectedProducer?: string
): BaselineArtifact<TPayload> => {
  if (!isRecord(value)) {
    throw new Error('Baseline artifact must be an object');
  }
  if (value.schemaVersion !== BASELINE_SCHEMA_VERSION) {
    throw new Error('Unsupported schemaVersion');
  }
  if (typeof value.fixtureId !== 'string' || value.fixtureId.length === 0) {
    throw new Error('Missing fixtureId');
  }
  if (typeof value.sourceRevision !== 'string' || value.sourceRevision.length === 0) {
    throw new Error('Missing sourceRevision');
  }
  if (typeof value.producer !== 'string' || value.producer.length === 0) {
    throw new Error('Missing producer');
  }
  if (expectedProducer !== undefined && value.producer !== expectedProducer) {
    throw new Error('Unexpected producer');
  }
  if (typeof value.contentHash !== 'string') {
    throw new Error('Invalid contentHash');
  }
  if (value.contentHash !== hashBaselinePayload(value.payload)) {
    throw new Error('Invalid contentHash');
  }

  return value as BaselineArtifact<TPayload>;
};

export const readBaselineArtifact = <TPayload>(
  fixturePath: string,
  expectedProducer?: string
): BaselineArtifact<TPayload> =>
  validateBaselineArtifact<TPayload>(
    JSON.parse(readFileSync(resolve(fixturePath), 'utf8')),
    expectedProducer
  );

export const writeBaselineArtifact = <TPayload>(
  fixturePath: string,
  input: ArtifactInput<TPayload>
): void => {
  const destination = resolve(fixturePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(
    destination,
    `${JSON.stringify(createBaselineArtifact(input), null, 2)}\n`
  );
};

export const assertBaselineProductionSource = (): void => {
  const productionPaths = [
    'services/difficulty',
    'services/gameplay',
    'services/combat',
    'services/market',
  ];
  const gitDirectory = process.env.BASELINE_GIT_DIR;
  const gitArgs = [
    ...(gitDirectory === undefined
      ? []
      : [`--git-dir=${gitDirectory}`, `--work-tree=${process.cwd()}`]),
    'diff',
    '--quiet',
    BASELINE_SOURCE_REVISION,
    '--',
    ...productionPaths,
  ];
  const result = spawnSync('git', gitArgs, { stdio: 'ignore' });

  if (result.status !== 0) {
    throw new Error(`Legacy production differs from ${BASELINE_SOURCE_REVISION}`);
  }
};
