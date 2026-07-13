import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const referenceOnly = process.argv.includes('--reference-only');
const targets = referenceOnly
  ? ['tests/golden/PerformanceBaseline.golden.test.ts']
  : ['tests/golden'];
const vitestCli = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url)
);
const result = spawnSync(
  process.execPath,
  [vitestCli, 'run', ...targets, '--pool=forks', '--maxWorkers=1'],
  { stdio: 'inherit', env: { ...process.env, DIRECTOR_BASELINE_MEASURE: '1' } }
);

if (result.error !== undefined) throw result.error;
process.exit(result.status ?? 1);
