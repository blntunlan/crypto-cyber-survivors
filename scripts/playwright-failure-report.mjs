import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath = 'output/e2e-failures.md'] = process.argv.slice(2);

if (!inputPath) {
  console.error(
    'Usage: node scripts/playwright-failure-report.mjs <playwright-json-report> [output-md]'
  );
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(
    `Failed to parse JSON from ${inputPath}: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

const normalizePath = filePath =>
  filePath?.startsWith('e2e/') || filePath?.startsWith('e2e\\')
    ? filePath
    : `e2e/${filePath ?? ''}`;

const collectSpecs = (suite, chain = [], acc = []) => {
  const nextChain = suite?.title ? [...chain, suite.title] : chain;

  for (const spec of suite?.specs ?? []) {
    acc.push({ spec, chain: nextChain });
  }

  for (const child of suite?.suites ?? []) {
    collectSpecs(child, nextChain, acc);
  }

  return acc;
};

const allSpecs = [];
for (const suite of report?.suites ?? []) {
  collectSpecs(suite, [], allSpecs);
}

const summarizeError = errorMessage => {
  if (!errorMessage) return 'No error message.';
  const firstLine = errorMessage
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);
  return firstLine || 'No error message.';
};

const failures = [];

for (const { spec, chain } of allSpecs) {
  for (const test of spec?.tests ?? []) {
    const results = test?.results ?? [];
    const failingResult =
      [...results]
        .reverse()
        .find(result =>
          ['failed', 'timedOut', 'interrupted'].includes(result?.status ?? '')
        ) ?? null;

    const hasUnexpectedStatus = test?.status === 'unexpected';
    if (!hasUnexpectedStatus && !failingResult) {
      continue;
    }

    const errorMessage =
      failingResult?.errors?.[0]?.message ||
      failingResult?.errors?.[0]?.value ||
      'No error message.';

    failures.push({
      suite: chain.filter(Boolean).join(' > '),
      title: spec?.title ?? 'Untitled spec',
      file: normalizePath(spec?.file),
      line: spec?.line ?? 1,
      column: spec?.column ?? 1,
      project: test?.projectName ?? test?.projectId ?? 'unknown',
      status: failingResult?.status ?? test?.status ?? 'unknown',
      error: summarizeError(errorMessage),
      fullError: errorMessage,
    });
  }
}

const statusPriority = {
  failed: 0,
  timedOut: 1,
  unexpected: 2,
  interrupted: 3,
};

failures.sort((a, b) => {
  const aPriority = statusPriority[a.status] ?? 99;
  const bPriority = statusPriority[b.status] ?? 99;
  if (aPriority !== bPriority) return aPriority - bPriority;
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  if (a.line !== b.line) return a.line - b.line;
  return a.title.localeCompare(b.title);
});

const generatedAt = new Date().toISOString();
const summaryLine = `Total failures: ${failures.length}`;
const statsLine = report?.stats
  ? `Stats: expected=${report.stats.expected ?? 0}, unexpected=${
      report.stats.unexpected ?? 0
    }, flaky=${report.stats.flaky ?? 0}, skipped=${report.stats.skipped ?? 0}`
  : null;

const lines = [
  '# E2E Failure Report',
  '',
  `Generated at: ${generatedAt}`,
  summaryLine,
  ...(statsLine ? [statsLine] : []),
  '',
];

if (failures.length === 0) {
  lines.push('No failures found in report.');
} else {
  failures.forEach((failure, index) => {
    lines.push(`## ${index + 1}. [${failure.project}] ${failure.title}`);
    lines.push(`- File: ${failure.file}:${failure.line}:${failure.column}`);
    lines.push(`- Suite: ${failure.suite || '(root)'}`);
    lines.push(`- Status: ${failure.status}`);
    lines.push(`- Error: ${failure.error}`);
    lines.push(
      `- Repro: \`npx playwright test ${failure.file} --project=${failure.project} -g "${failure.title.replaceAll(
        '"',
        '\\"'
      )}"\``
    );
    lines.push('');
  });
}

const outputDir = path.dirname(outputPath);
if (outputDir && outputDir !== '.') {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

console.log(
  `Wrote ${failures.length} failure entr${failures.length === 1 ? 'y' : 'ies'} to ${outputPath}`
);
