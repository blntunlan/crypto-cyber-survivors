import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIRECTOR_CONFIG_V1 } from '../../../services/director/config/DirectorConfigV1';

/**
 * Dead-config guard.
 *
 * The contract audit found several values that were configured correctly and
 * read by nothing — the config looked right, the tests were green, and the game
 * did not implement the rule. This test fails the build when a Director config
 * leaf has no reader in `services/`, so that failure mode cannot come back.
 *
 * A genuinely inert value must be listed in KNOWN_UNUSED with a reason.
 */

const SERVICES_ROOT = resolve(__dirname, '../../../services');
const CONFIG_MODULE = resolve(
  __dirname,
  '../../../services/director/config/DirectorConfigV1.ts'
);

/**
 * Config leaves that are intentionally not read inside `services/`, with the
 * reason. Cash-out eligibility is owned by the server (contract §18); the block
 * is mirrored here only as the published numbers and is pinned by
 * ContractConformanceV1 plus the market-server CashOutPolicy tests.
 */
const SERVER_OWNED_CASH_OUT = 'server-authoritative (§18); mirrored contract value';
const KNOWN_UNUSED: Readonly<Record<string, string>> = {
  'cashOut.firstEligibilitySeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.forcedRecoveryAtSeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.quoteDurationSeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.maximumOfferDelaySeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.nextEligibilityBaseSeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.nextEligibilityPerGreedSeconds': SERVER_OWNED_CASH_OUT,
  'cashOut.nextEligibilityGreedCap': SERVER_OWNED_CASH_OUT,
};

/**
 * Short leaf names ("market", "greed") collide with ordinary identifiers, so
 * they only count as read when the parent-qualified access appears. Longer
 * names are distinctive enough to match on their own, which allows the common
 * `const range = config.pacing.peak; range.minSeconds` destructuring.
 */
const DISTINCTIVE_KEY_LENGTH = 8;

type LeafPath = { path: string; parentKey: string; leafKey: string };

const collectLeaves = (
  value: unknown,
  path: readonly string[],
  output: LeafPath[]
): void => {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) {
    const leafKey = path[path.length - 1] ?? '';
    const parentKey = path[path.length - 2] ?? '';
    output.push({ path: path.join('.'), parentKey, leafKey });
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    collectLeaves(child, [...path, key], output);
  }
};

const collectSourceFiles = (directory: string, output: string[]): void => {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      collectSourceFiles(fullPath, output);
      continue;
    }
    if (!fullPath.endsWith('.ts')) continue;
    if (resolve(fullPath) === CONFIG_MODULE) continue;
    output.push(fullPath);
  }
};

const sourceFiles: string[] = [];
collectSourceFiles(SERVICES_ROOT, sourceFiles);
const sourceText = sourceFiles.map(file => readFileSync(file, 'utf8')).join('\n');

const leaves: LeafPath[] = [];
collectLeaves(DIRECTOR_CONFIG_V1, [], leaves);

const isRead = (leaf: LeafPath): boolean => {
  if (!sourceText.includes(`.${leaf.leafKey}`)) return false;
  if (leaf.leafKey.length >= DISTINCTIVE_KEY_LENGTH) return true;
  return (
    leaf.parentKey === '' || sourceText.includes(`${leaf.parentKey}.${leaf.leafKey}`)
  );
};

describe('Director config usage', () => {
  it('enumerates the full config surface', () => {
    expect(leaves.length).toBeGreaterThan(50);
  });

  it.each(leaves.map(leaf => [leaf.path, leaf] as const))(
    'has a reader for %s',
    (path, leaf) => {
      if (KNOWN_UNUSED[path] !== undefined) {
        expect(KNOWN_UNUSED[path]).toBeTruthy();
        return;
      }
      expect(isRead(leaf), `${path} is configured but never read in services/`).toBe(
        true
      );
    }
  );

  it('keeps the KNOWN_UNUSED allowlist honest', () => {
    const knownPaths = new Set(leaves.map(leaf => leaf.path));
    for (const path of Object.keys(KNOWN_UNUSED)) {
      expect(knownPaths.has(path), `${path} is no longer a config leaf`).toBe(true);
    }
  });
});
