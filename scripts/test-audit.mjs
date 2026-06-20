#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ROOTS = ['tests'];
const DEFAULT_OUT_DIR = 'test-results';
const TEST_FILE_RE = /\.(?:test|spec)\.[cm]?[tj]sx?$/;
const IGNORED_DIRS = new Set([
  '.agent',
  '.agents',
  '.claude',
  '.codex',
  '.gemini',
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const WEAK_MATCHERS = new Set(['toBeDefined', 'toBeTruthy', 'toBeFalsy']);
const SNAPSHOT_MATCHERS = new Set(['toMatchSnapshot', 'toMatchInlineSnapshot']);
const CALL_MATCHERS = new Set([
  'toHaveBeenCalled',
  'toHaveBeenCalledOnce',
  'toHaveBeenCalledTimes',
  'toHaveBeenCalledWith',
  'toHaveBeenLastCalledWith',
  'toHaveBeenNthCalledWith',
  'toHaveReturned',
  'toHaveReturnedTimes',
  'toHaveReturnedWith',
]);

const TEST_CALL_RE =
  /\b(?:it|test)(?:\s*\.\s*(?:skip|only|todo|concurrent|fails)\b|\s*\.\s*(?:each|runIf|skipIf)\s*\([^)]*\))*\s*\(/g;

function parseArgs(argv) {
  const options = {
    roots: [],
    includeE2e: false,
    includeRailway: false,
    outDir: DEFAULT_OUT_DIR,
    top: 40,
    minScore: 1,
    format: 'both',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--root' && next) {
      options.roots.push(next);
      index += 1;
    } else if (arg === '--include-e2e') {
      options.includeE2e = true;
    } else if (arg === '--include-railway') {
      options.includeRailway = true;
    } else if (arg === '--out-dir' && next) {
      options.outDir = next;
      index += 1;
    } else if (arg === '--top' && next) {
      options.top = Math.max(1, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === '--min-score' && next) {
      options.minScore = Math.max(0, Number.parseInt(next, 10));
      index += 1;
    } else if (arg === '--format' && next) {
      options.format = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete option: ${arg}`);
    }
  }

  if (options.roots.length === 0) {
    options.roots.push(...DEFAULT_ROOTS);
  }
  if (options.includeE2e) {
    options.roots.push('e2e');
  }
  if (options.includeRailway) {
    options.roots.push('railway-market-server/test');
  }
  if (!['json', 'markdown', 'both'].includes(options.format)) {
    throw new Error('--format must be one of: json, markdown, both');
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/test-audit.mjs [options]

Static audit for low-value or suspicious tests. It does not delete tests.

Options:
  --root <dir>          Directory to scan. Can be repeated. Default: tests
  --include-e2e         Include Playwright specs under e2e/
  --include-railway     Include railway-market-server/test/
  --out-dir <dir>       Output directory. Default: test-results
  --top <n>             Number of findings in markdown table. Default: 40
  --min-score <n>       Minimum score to include in reports. Default: 1
  --format <mode>       json, markdown, or both. Default: both
  --help                Show this message
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const repoRoot = process.cwd();
  const files = await collectTestFiles(repoRoot, options.roots);
  const analyzedFiles = [];

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    analyzedFiles.push(analyzeFile(repoRoot, filePath, source));
  }

  const rankedFiles = analyzedFiles
    .filter(file => file.score >= options.minScore)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.metrics.activeTestCount - left.metrics.activeTestCount;
    });

  const report = {
    generatedAt: new Date().toISOString(),
    roots: options.roots,
    summary: summarize(analyzedFiles, rankedFiles),
    files: rankedFiles,
  };

  await mkdir(path.resolve(repoRoot, options.outDir), { recursive: true });

  const written = [];
  if (options.format === 'json' || options.format === 'both') {
    const jsonPath = path.resolve(repoRoot, options.outDir, 'test-audit.json');
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    written.push(path.relative(repoRoot, jsonPath));
  }
  if (options.format === 'markdown' || options.format === 'both') {
    const markdownPath = path.resolve(repoRoot, options.outDir, 'test-audit.md');
    await writeFile(markdownPath, buildMarkdown(report, options.top), 'utf8');
    written.push(path.relative(repoRoot, markdownPath));
  }

  const { summary } = report;
  console.log(
    [
      `Scanned ${summary.totalFiles} files and ${summary.totalTests} tests.`,
      `Flagged ${summary.flaggedFiles} files: ${summary.high} high, ${summary.medium} medium, ${summary.low} low.`,
      `Reports: ${written.join(', ')}`,
    ].join('\n')
  );
}

async function collectTestFiles(repoRoot, roots) {
  const rootSet = [...new Set(roots)];
  const files = [];

  for (const root of rootSet) {
    const absoluteRoot = path.resolve(repoRoot, root);
    await walk(absoluteRoot, files);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function walk(directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walk(absolutePath, files);
      }
      continue;
    }

    if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      files.push(absolutePath);
    }
  }
}

function analyzeFile(repoRoot, filePath, source) {
  const relativePath = normalizePath(path.relative(repoRoot, filePath));
  const code = stripCommentsKeepingLength(source);
  const testCases = extractTestCases(code);
  const duplicateTitles = findDuplicateTitles(testCases);
  const metrics = collectMetrics(code, testCases);
  const findings = buildFindings(metrics, testCases, duplicateTitles);
  const score = Math.min(
    100,
    findings.reduce((total, finding) => total + finding.weight, 0)
  );

  return {
    path: relativePath,
    score,
    severity: severityForScore(score),
    findings: findings.map(({ weight: _weight, ...finding }) => finding),
    metrics,
    duplicateTitles,
    examples: buildExamples(testCases),
  };
}

function collectMetrics(code, testCases) {
  const matchers = getMatchers(code);
  const activeTestCases = testCases.filter(
    testCase => !testCase.skipped && !testCase.todo
  );
  const weakMatcherCount = matchers.filter(matcher =>
    WEAK_MATCHERS.has(matcher)
  ).length;
  const snapshotCount = matchers.filter(matcher =>
    SNAPSHOT_MATCHERS.has(matcher)
  ).length;
  const callMatcherCount = matchers.filter(matcher =>
    CALL_MATCHERS.has(matcher)
  ).length;

  return {
    loc: code.split(/\r?\n/).filter(line => line.trim().length > 0).length,
    describeCount: countPattern(code, /\bdescribe(?:\.\w+)?\s*\(/g),
    testCount: testCases.length,
    activeTestCount: activeTestCases.length,
    skippedTestCount: testCases.filter(testCase => testCase.skipped).length,
    todoTestCount: testCases.filter(testCase => testCase.todo).length,
    onlyTestCount: testCases.filter(testCase => testCase.only).length,
    expectCount: countExpectCalls(code),
    matcherCount: matchers.length,
    weakMatcherCount,
    snapshotCount,
    callMatcherCount,
    meaningfulMatcherCount:
      matchers.length - weakMatcherCount - snapshotCount - callMatcherCount,
    placeholderAssertionCount: countPattern(
      code,
      /\bexpect\s*\(\s*(true|false)\s*\)\s*\.\s*toBe\s*\(\s*\1\s*\)/g
    ),
    renderCount: countPattern(code, /\brender\s*\(/g),
    userInteractionCount: countPattern(
      code,
      /\b(?:fireEvent|userEvent|act|waitFor)\s*[\.(]/g
    ),
    mockCount: countPattern(
      code,
      /\b(?:vi|jest)\s*\.\s*(?:mock|fn|spyOn|stubGlobal|useFakeTimers)\s*\(/g
    ),
    assertionlessTestCount: activeTestCases.filter(
      testCase => testCase.metrics.expectCount === 0
    ).length,
    weakOnlyTestCount: activeTestCases.filter(testCase => isWeakOnly(testCase.metrics))
      .length,
    snapshotOnlyTestCount: activeTestCases.filter(testCase =>
      isSnapshotOnly(testCase.metrics)
    ).length,
    renderWithoutAssertionCount: activeTestCases.filter(
      testCase => testCase.metrics.renderCount > 0 && testCase.metrics.expectCount === 0
    ).length,
    placeholderTestCount: activeTestCases.filter(
      testCase => testCase.metrics.placeholderAssertionCount > 0
    ).length,
    callOnlyTestCount: activeTestCases.filter(testCase => isCallOnly(testCase.metrics))
      .length,
  };
}

function buildFindings(metrics, testCases, duplicateTitles) {
  const findings = [];
  const activeTestCount = Math.max(metrics.activeTestCount, 1);

  addFinding(
    findings,
    metrics.testCount > 0 && metrics.expectCount === 0,
    'no-assertions',
    40,
    'File declares tests but has no expect/assert calls.'
  );
  addFinding(
    findings,
    metrics.assertionlessTestCount > 0,
    'assertionless-cases',
    Math.min(35, metrics.assertionlessTestCount * 8),
    `${metrics.assertionlessTestCount} active test case(s) have no assertions.`
  );
  addFinding(
    findings,
    metrics.placeholderAssertionCount > 0,
    'placeholder-assertions',
    Math.min(25, metrics.placeholderAssertionCount * 10),
    `${metrics.placeholderAssertionCount} placeholder expect(true).toBe(true)-style assertion(s).`
  );
  addFinding(
    findings,
    metrics.weakOnlyTestCount >= 2 ||
      metrics.weakOnlyTestCount / activeTestCount >= 0.4,
    'weak-only-tests',
    Math.min(25, Math.max(10, metrics.weakOnlyTestCount * 5)),
    `${metrics.weakOnlyTestCount} test case(s) only use weak existence/truthiness assertions.`
  );
  addFinding(
    findings,
    metrics.snapshotOnlyTestCount > 0,
    'snapshot-only-tests',
    Math.min(20, metrics.snapshotOnlyTestCount * 8),
    `${metrics.snapshotOnlyTestCount} test case(s) only assert snapshots.`
  );
  addFinding(
    findings,
    metrics.renderWithoutAssertionCount > 0,
    'render-without-assertion',
    Math.min(20, metrics.renderWithoutAssertionCount * 8),
    `${metrics.renderWithoutAssertionCount} render smoke test(s) have no assertions.`
  );
  addFinding(
    findings,
    metrics.onlyTestCount > 0,
    'focused-tests',
    30,
    `${metrics.onlyTestCount} .only test(s) found.`
  );
  addFinding(
    findings,
    metrics.skippedTestCount + metrics.todoTestCount > 0,
    'skipped-or-todo-tests',
    Math.min(18, (metrics.skippedTestCount + metrics.todoTestCount) * 6),
    `${metrics.skippedTestCount + metrics.todoTestCount} skipped/todo test(s) found.`
  );
  addFinding(
    findings,
    duplicateTitles.length > 0,
    'duplicate-titles',
    Math.min(15, duplicateTitles.length * 5),
    `${duplicateTitles.length} duplicate test title group(s) found.`
  );
  addFinding(
    findings,
    metrics.mockCount >= 8 && metrics.meaningfulMatcherCount <= 2,
    'mock-heavy-low-signal',
    8,
    `Uses ${metrics.mockCount} mock helpers but has ${metrics.meaningfulMatcherCount} meaningful matcher(s).`
  );
  addFinding(
    findings,
    metrics.callOnlyTestCount >= 2 && metrics.meaningfulMatcherCount === 0,
    'interaction-only',
    Math.min(8, metrics.callOnlyTestCount * 2),
    `${metrics.callOnlyTestCount} test case(s) only assert mock calls.`
  );
  addFinding(
    findings,
    testCases.length > 0 &&
      metrics.expectCount / activeTestCount < 0.5 &&
      metrics.assertionlessTestCount > 0,
    'low-assertion-density',
    10,
    'Average assertions per active test is below 0.5.'
  );

  return findings;
}

function addFinding(findings, condition, code, weight, message) {
  if (condition) {
    findings.push({ code, weight, message });
  }
}

function buildExamples(testCases) {
  return testCases
    .filter(testCase => testCase.reasons.length > 0)
    .slice(0, 8)
    .map(testCase => ({
      line: testCase.line,
      title: testCase.title,
      reasons: testCase.reasons,
    }));
}

function extractTestCases(code) {
  const testCases = [];
  TEST_CALL_RE.lastIndex = 0;

  let match;
  while ((match = TEST_CALL_RE.exec(code)) != null) {
    const openParen = TEST_CALL_RE.lastIndex - 1;
    const callLead = code.slice(match.index, openParen);
    const body = findCallbackBody(code, openParen);
    const title = extractFirstStringArgument(code, openParen) ?? '(dynamic test name)';
    const metrics = body == null ? emptyMetrics() : collectBodyMetrics(body);
    const testCase = {
      line: lineNumberAt(code, match.index),
      title: normalizeWhitespace(title),
      skipped: /\.skip\b/.test(callLead),
      todo: /\.todo\b/.test(callLead),
      only: /\.only\b/.test(callLead),
      metrics,
      reasons: [],
    };

    testCase.reasons = reasonsForTestCase(testCase);
    testCases.push(testCase);
  }

  return testCases;
}

function reasonsForTestCase(testCase) {
  const reasons = [];
  const { metrics } = testCase;

  if (!testCase.skipped && !testCase.todo && metrics.expectCount === 0) {
    reasons.push('no assertions');
  }
  if (metrics.placeholderAssertionCount > 0) {
    reasons.push('placeholder assertion');
  }
  if (isWeakOnly(metrics)) {
    reasons.push('weak-only assertions');
  }
  if (isSnapshotOnly(metrics)) {
    reasons.push('snapshot-only assertion');
  }
  if (metrics.renderCount > 0 && metrics.expectCount === 0) {
    reasons.push('render without assertion');
  }
  if (isCallOnly(metrics)) {
    reasons.push('mock-call assertions only');
  }
  if (testCase.only) {
    reasons.push('.only');
  }
  if (testCase.skipped || testCase.todo) {
    reasons.push('skipped/todo');
  }

  return reasons;
}

function collectBodyMetrics(body) {
  const matchers = getMatchers(body);
  const weakMatcherCount = matchers.filter(matcher =>
    WEAK_MATCHERS.has(matcher)
  ).length;
  const snapshotCount = matchers.filter(matcher =>
    SNAPSHOT_MATCHERS.has(matcher)
  ).length;
  const callMatcherCount = matchers.filter(matcher =>
    CALL_MATCHERS.has(matcher)
  ).length;

  return {
    expectCount: countExpectCalls(body),
    matcherCount: matchers.length,
    weakMatcherCount,
    snapshotCount,
    callMatcherCount,
    meaningfulMatcherCount:
      matchers.length - weakMatcherCount - snapshotCount - callMatcherCount,
    placeholderAssertionCount: countPattern(
      body,
      /\bexpect\s*\(\s*(true|false)\s*\)\s*\.\s*toBe\s*\(\s*\1\s*\)/g
    ),
    renderCount: countPattern(body, /\brender\s*\(/g),
  };
}

function emptyMetrics() {
  return {
    expectCount: 0,
    matcherCount: 0,
    weakMatcherCount: 0,
    snapshotCount: 0,
    callMatcherCount: 0,
    meaningfulMatcherCount: 0,
    placeholderAssertionCount: 0,
    renderCount: 0,
  };
}

function isWeakOnly(metrics) {
  return (
    metrics.expectCount > 0 &&
    metrics.matcherCount > 0 &&
    metrics.meaningfulMatcherCount === 0 &&
    metrics.snapshotCount === 0 &&
    metrics.callMatcherCount === 0 &&
    metrics.weakMatcherCount + metrics.placeholderAssertionCount > 0
  );
}

function isSnapshotOnly(metrics) {
  return (
    metrics.expectCount > 0 &&
    metrics.matcherCount > 0 &&
    metrics.snapshotCount === metrics.matcherCount
  );
}

function isCallOnly(metrics) {
  return (
    metrics.expectCount > 0 &&
    metrics.matcherCount > 0 &&
    metrics.callMatcherCount === metrics.matcherCount
  );
}

function getMatchers(code) {
  const matchers = [];
  const matcherRe =
    /\bexpect(?:\.\w+)?\s*\([\s\S]*?\)\s*(?:\.\s*(?:resolves|rejects|not)\s*)*\.\s*(\w+)\s*\(/g;

  let match;
  while ((match = matcherRe.exec(code)) != null) {
    matchers.push(match[1]);
  }

  return matchers;
}

function countExpectCalls(code) {
  return countPattern(code, /\bexpect(?:\.\w+)?\s*\(/g);
}

function countPattern(code, regex) {
  regex.lastIndex = 0;
  let count = 0;
  while (regex.exec(code) != null) {
    count += 1;
  }
  return count;
}

function findDuplicateTitles(testCases) {
  const byTitle = new Map();

  for (const testCase of testCases) {
    if (testCase.title === '(dynamic test name)') {
      continue;
    }
    const key = testCase.title.toLowerCase();
    const existing = byTitle.get(key) ?? [];
    existing.push(testCase.line);
    byTitle.set(key, existing);
  }

  return [...byTitle.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([title, lines]) => ({ title, lines }));
}

function findCallbackBody(code, openParen) {
  const closeParen = findMatching(code, openParen, '(', ')');
  if (closeParen == null) {
    return null;
  }

  const callSource = code.slice(openParen, closeParen + 1);
  const arrowAt = callSource.indexOf('=>');
  const functionAt = callSource.indexOf('function');
  const callbackAt = minPositive(arrowAt, functionAt);

  if (callbackAt == null) {
    return null;
  }

  const callbackStart = openParen + callbackAt;
  const bodyStart = code.indexOf('{', callbackStart);

  if (bodyStart === -1 || bodyStart > closeParen) {
    const expressionStart = arrowAt >= 0 ? callbackStart + 2 : callbackStart;
    return code.slice(expressionStart, closeParen);
  }

  const bodyEnd = findMatching(code, bodyStart, '{', '}');
  if (bodyEnd == null) {
    return null;
  }

  return code.slice(bodyStart + 1, bodyEnd);
}

function extractFirstStringArgument(code, openParen) {
  let index = openParen + 1;
  while (/\s/.test(code[index] ?? '')) {
    index += 1;
  }

  const quote = code[index];
  if (!['"', "'", '`'].includes(quote)) {
    return null;
  }

  let value = '';
  for (index += 1; index < code.length; index += 1) {
    const char = code[index];
    if (char === '\\') {
      value += char;
      index += 1;
      value += code[index] ?? '';
      continue;
    }
    if (char === quote) {
      return value;
    }
    value += char;
  }

  return null;
}

function findMatching(code, startIndex, openChar, closeChar) {
  let depth = 0;
  let state = 'code';
  let escaped = false;

  for (let index = startIndex; index < code.length; index += 1) {
    const char = code[index];
    const next = code[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') {
        state = 'code';
      }
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        index += 1;
        state = 'code';
      }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (char === "'") {
      state = 'single';
      continue;
    }
    if (char === '"') {
      state = 'double';
      continue;
    }
    if (char === '`') {
      state = 'template';
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return null;
}

function stripCommentsKeepingLength(source) {
  let output = '';
  let state = 'code';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') {
        output += char;
        state = 'code';
      } else {
        output += ' ';
      }
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'line-comment';
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'block-comment';
      continue;
    }
    if (char === "'") {
      state = 'single';
    } else if (char === '"') {
      state = 'double';
    } else if (char === '`') {
      state = 'template';
    }
    output += char;
  }

  return output;
}

function summarize(allFiles, flaggedFiles) {
  const totalTests = allFiles.reduce(
    (total, file) => total + file.metrics.testCount,
    0
  );
  const severityCounts = flaggedFiles.reduce(
    (counts, file) => {
      counts[file.severity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0, none: 0 }
  );

  return {
    totalFiles: allFiles.length,
    totalTests,
    flaggedFiles: flaggedFiles.length,
    high: severityCounts.high,
    medium: severityCounts.medium,
    low: severityCounts.low,
  };
}

function buildMarkdown(report, top) {
  const lines = [
    '# Test Audit Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Roots: ${report.roots.map(root => `\`${root}\``).join(', ')}`,
    '',
    'This is a heuristic report. Treat entries as review candidates, not automatic deletion requests.',
    '',
    '## Summary',
    '',
    `- Files scanned: ${report.summary.totalFiles}`,
    `- Tests scanned: ${report.summary.totalTests}`,
    `- Flagged files: ${report.summary.flaggedFiles}`,
    `- Severity: ${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low`,
    '',
    '## Top Candidates',
    '',
  ];

  if (report.files.length === 0) {
    lines.push('No suspicious files found with the current thresholds.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Rank | Severity | Score | File | Tests | Expects | Main signals |');
  lines.push('| ---: | --- | ---: | --- | ---: | ---: | --- |');

  for (const [index, file] of report.files.slice(0, top).entries()) {
    const firstLine = file.examples[0]?.line ?? 1;
    const link = `[${escapeMarkdown(file.path)}](${file.path}:${firstLine})`;
    const signals = file.findings
      .slice(0, 4)
      .map(finding => `\`${finding.code}\``)
      .join(', ');

    lines.push(
      `| ${index + 1} | ${file.severity} | ${file.score} | ${link} | ${file.metrics.testCount} | ${file.metrics.expectCount} | ${signals} |`
    );
  }

  lines.push('', '## Detail', '');

  for (const file of report.files.slice(0, top)) {
    lines.push(`### ${file.path}`);
    lines.push(
      `Score ${file.score} (${file.severity}); tests ${file.metrics.testCount}, expects ${file.metrics.expectCount}, mocks ${file.metrics.mockCount}.`
    );
    for (const finding of file.findings) {
      lines.push(`- \`${finding.code}\`: ${finding.message}`);
    }
    for (const example of file.examples.slice(0, 5)) {
      lines.push(
        `- Line ${example.line}: ${escapeMarkdown(example.title)} (${example.reasons.join(', ')})`
      );
    }
    lines.push('');
  }

  lines.push(
    '## Follow-up',
    '',
    '- Use this report to pick review targets.',
    '- Confirm with mutation testing for critical services before deleting or weakening tests.',
    '- Prefer replacing low-signal smoke tests with behavior assertions instead of removing coverage blindly.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function severityForScore(score) {
  if (score >= 50) {
    return 'high';
  }
  if (score >= 25) {
    return 'medium';
  }
  if (score > 0) {
    return 'low';
  }
  return 'none';
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === '\n') {
      line += 1;
    }
  }
  return line;
}

function minPositive(...values) {
  const positives = values.filter(value => value >= 0);
  return positives.length > 0 ? Math.min(...positives) : null;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function escapeMarkdown(value) {
  return value.replaceAll('|', '\\|');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
