/**
 * Golden fixture IO + tolerant comparison helpers.
 *
 * Fixtures live in tests/golden/fixtures/ and are generated ONCE via:
 *   UPDATE_GOLDEN=1 npx vitest run tests/golden
 * After generation they are committed and act as a behavioral lock for the
 * market→difficulty pipeline during the Director/MarketSession migration.
 * Regenerating a fixture is a deliberate, reviewed behavior change — never
 * bundle a fixture bump with a refactor commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures'
);

export const isGoldenUpdateMode = (): boolean => process.env.UPDATE_GOLDEN === '1';

export function writeGoldenFixture(name: string, data: unknown): void {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const file = path.join(FIXTURES_DIR, name);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  console.warn(`[golden] fixture regenerated: ${file}`);
}

export function readGoldenFixture<T>(name: string): T {
  const file = path.join(FIXTURES_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Golden fixture missing: ${name}. Generate it once with ` +
        `"UPDATE_GOLDEN=1 npx vitest run tests/golden" and commit the result.`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/**
 * Recursively compares actual vs expected. Numbers must match within
 * `tolerance`; everything else (strings, booleans, null, array lengths,
 * object keys) must match exactly. Returns a flat list of human-readable
 * mismatch descriptions (empty list = match).
 */
export function collectGoldenMismatches(
  actual: unknown,
  expected: unknown,
  tolerance: number,
  atPath = '$'
): string[] {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isNaN(expected) && Number.isNaN(actual)) return [];
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      return [`${atPath}: ${actual} != ${expected} (|Δ|=${diff} > ${tolerance})`];
    }
    return [];
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return [`${atPath}: expected array, got ${typeof actual}`];
    }
    if (actual.length !== expected.length) {
      return [`${atPath}: array length ${actual.length} != ${expected.length}`];
    }
    const mismatches: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      mismatches.push(
        ...collectGoldenMismatches(actual[i], expected[i], tolerance, `${atPath}[${i}]`)
      );
    }
    return mismatches;
  }

  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      return [`${atPath}: expected object, got ${JSON.stringify(actual)}`];
    }
    const expectedKeys = Object.keys(expected as Record<string, unknown>).sort();
    const actualKeys = Object.keys(actual as Record<string, unknown>).sort();
    if (expectedKeys.join(',') !== actualKeys.join(',')) {
      return [
        `${atPath}: keys [${actualKeys.join(',')}] != [${expectedKeys.join(',')}]`,
      ];
    }
    const mismatches: string[] = [];
    for (const key of expectedKeys) {
      mismatches.push(
        ...collectGoldenMismatches(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key],
          tolerance,
          `${atPath}.${key}`
        )
      );
    }
    return mismatches;
  }

  if (actual !== expected) {
    return [`${atPath}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`];
  }
  return [];
}
