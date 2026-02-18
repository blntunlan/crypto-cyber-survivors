import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rawJsonPath = 'output/e2e-triage.json';
const markdownPath = 'output/e2e-failures.md';

const playwrightCommand =
  'npx playwright test --project=chromium --workers=1 --max-failures=1 --reporter=json';

const runResult = spawnSync(playwrightCommand, {
  encoding: 'utf8',
  shell: true,
  maxBuffer: 1024 * 1024 * 500,
});

if (runResult.stderr) {
  process.stderr.write(runResult.stderr);
}

const rawJsonDir = path.dirname(rawJsonPath);
if (rawJsonDir && rawJsonDir !== '.') {
  fs.mkdirSync(rawJsonDir, { recursive: true });
}
fs.writeFileSync(rawJsonPath, runResult.stdout ?? '', 'utf8');

const reportResult = spawnSync(
  process.execPath,
  ['scripts/playwright-failure-report.mjs', rawJsonPath, markdownPath],
  {
    stdio: 'inherit',
  }
);

if (runResult.error) {
  console.error(runResult.error.message);
  process.exit(1);
}

if (reportResult.status !== 0) {
  process.exit(reportResult.status ?? 1);
}

process.exit(runResult.status ?? 1);
