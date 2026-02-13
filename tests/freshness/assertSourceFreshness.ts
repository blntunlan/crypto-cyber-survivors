import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const FRESHNESS_ROOT_SEGMENT = `${path.sep}tests${path.sep}freshness`;
const FRESHNESS_TIME_TOLERANCE_MS = 1000;

function resolveRepoRoot(testFilePath: string): string {
  const normalized = path.normalize(testFilePath);
  const markerIndex = normalized.lastIndexOf(FRESHNESS_ROOT_SEGMENT);

  if (markerIndex < 0) {
    throw new Error(
      `Could not resolve repository root from test path: ${testFilePath}`
    );
  }

  return normalized.slice(0, markerIndex);
}

export function assertSourceFreshness(
  sourceRelativePath: string,
  testFileMetaUrl: string
): void {
  const testFilePath = fileURLToPath(testFileMetaUrl);
  const repoRoot = resolveRepoRoot(testFilePath);
  const sourcePath = path.join(
    repoRoot,
    ...sourceRelativePath.split('/').filter(Boolean)
  );

  expect(fs.existsSync(sourcePath)).toBe(true);

  const sourceStats = fs.statSync(sourcePath);
  const testStats = fs.statSync(testFilePath);

  expect(sourceStats.isFile()).toBe(true);
  expect(sourceStats.size).toBeGreaterThan(0);
  expect(sourceStats.mtimeMs).toBeLessThanOrEqual(
    testStats.mtimeMs + FRESHNESS_TIME_TOLERANCE_MS
  );
}
