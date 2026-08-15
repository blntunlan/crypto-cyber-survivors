import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Delegate a written spec to the Antigravity CLI (`agy`) and report exactly what
 * it touched.
 *
 * Three things this wrapper exists to handle, all learned the hard way:
 *
 *  1. `--output-format text` does not terminate. The model finishes, the process
 *     keeps the stream open, and a piped caller blocks forever. `json` emits one
 *     object and exits, so this always forces json and parses the result.
 *  2. A delegated run has to be reviewable. The working tree is usually already
 *     dirty when we delegate, so "what changed" cannot be read off `git status`.
 *     We pin the pre-run state as a real commit object via `git stash create`
 *     (which does not touch the tree) and diff against that afterwards.
 *  3. A hung or half-finished run must fail loudly rather than look successful.
 *     There is a hard timeout, and a run that produced no file changes is
 *     reported as such instead of passing silently.
 *
 * Usage:
 *   node scripts/agy-delegate.mjs --spec <path> [options]
 *
 *   --spec <path>      Required. Markdown file describing the task.
 *   --model <id>       Default gemini-3.7-flash-high. `agy models` lists them.
 *   --timeout <min>    Hard kill after this many minutes. Default 30.
 *   --label <name>     Names the run directory. Default: the spec's basename.
 *   --continue <id>    Resume a previous conversation by id instead of starting
 *                      fresh — use this to send back review feedback.
 *
 * Exit codes: 0 ok · 1 agy reported failure · 2 timed out · 3 spec/setup error.
 */

const REPO_ROOT = process.cwd();
const RUNS_DIR = path.join(REPO_ROOT, '.agy-runs');
const DEFAULT_MODEL = 'gemini-3.7-flash-high';
const DEFAULT_TIMEOUT_MINUTES = 30;

const parseArgs = argv => {
  const args = { timeout: DEFAULT_TIMEOUT_MINUTES, model: DEFAULT_MODEL };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error(`Malformed argument near "${flag ?? ''}"`);
    }
    args[flag.slice(2)] = value;
  }
  return args;
};

/** `agy` is not always on PATH; fall back to the known install location. */
const resolveAgyBinary = () => {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.AGY_BIN,
    localAppData && path.join(localAppData, 'agy', 'bin', 'agy.exe'),
    path.join(os.homedir(), '.local', 'bin', 'agy'),
    'agy',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--help'], { stdio: 'ignore' });
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error('Could not find the agy binary. Set AGY_BIN to its full path.');
};

const git = argumentList =>
  execFileSync('git', argumentList, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

/**
 * A commit object for the current dirty tree, without modifying the tree.
 * Returns HEAD when everything is already committed, so the diff base is always
 * a valid revision.
 */
const captureTrackedBaseline = () => git(['stash', 'create']) || git(['rev-parse', 'HEAD']);

const captureUntracked = () => {
  const output = git(['ls-files', '--others', '--exclude-standard']);
  return new Set(output ? output.split('\n') : []);
};

const runAgy = (binary, { model, prompt, timeoutMinutes, conversationId }) => {
  const agyArguments = [
    '--model',
    model,
    '--effort',
    'high',
    '--dangerously-skip-permissions',
    '--output-format',
    'json',
    // agy's own soft limit; the hard kill below is what we actually rely on.
    '--print-timeout',
    `${timeoutMinutes}m`,
    '--print',
    prompt,
  ];
  if (conversationId) {
    agyArguments.unshift('--conversation', conversationId);
  }

  return new Promise(resolve => {
    const child = spawn(binary, agyArguments, { cwd: REPO_ROOT });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const killTimer = setTimeout(
      () => {
        timedOut = true;
        child.kill('SIGKILL');
      },
      timeoutMinutes * 60 * 1000
    );

    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
      // Surface progress live; agy logs its steps to stderr.
      process.stderr.write(chunk);
    });
    child.on('close', code => {
      clearTimeout(killTimer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
};

/** agy prefixes its own log lines; the result is the last JSON object printed. */
const extractResult = stdout => {
  const start = stdout.lastIndexOf('{"conversation_id"');
  if (start === -1) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) {
    console.error('Missing --spec <path>. See the header of this file for usage.');
    process.exit(3);
  }

  const specPath = path.resolve(REPO_ROOT, args.spec);
  const spec = await fs.readFile(specPath, 'utf8').catch(() => null);
  if (spec === null) {
    console.error(`Cannot read spec: ${specPath}`);
    process.exit(3);
  }

  const timeoutMinutes = Number(args.timeout);
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
    console.error(`Invalid --timeout: ${args.timeout}`);
    process.exit(3);
  }

  const binary = resolveAgyBinary();
  const label = args.label ?? path.basename(specPath, path.extname(specPath));
  const runDirectory = path.join(RUNS_DIR, `${Date.now()}-${label}`);
  await fs.mkdir(runDirectory, { recursive: true });

  const trackedBaseline = captureTrackedBaseline();
  const untrackedBefore = captureUntracked();

  console.error(`[agy-delegate] model=${args.model} timeout=${timeoutMinutes}m`);
  console.error(`[agy-delegate] diff base ${trackedBaseline.slice(0, 12)}`);

  const startedAt = Date.now();
  const { code, stdout, stderr, timedOut } = await runAgy(binary, {
    model: args.model,
    prompt:
      `Read the task specification at ${specPath} and carry it out exactly. ` +
      `Work in the current repository. Verify every claim in the spec against the ` +
      `code before acting on it. Finish with the report the spec asks for.`,
    timeoutMinutes,
    conversationId: args.continue,
  });
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

  const result = extractResult(stdout);
  await fs.writeFile(path.join(runDirectory, 'stdout.log'), stdout);
  await fs.writeFile(path.join(runDirectory, 'stderr.log'), stderr);
  if (result?.response) {
    await fs.writeFile(path.join(runDirectory, 'report.md'), result.response);
  }

  // What the delegate actually touched, independent of what was already dirty.
  const changedTracked = git(['diff', '--stat', trackedBaseline]);
  const untrackedAfter = captureUntracked();
  const newUntracked = [...untrackedAfter].filter(file => !untrackedBefore.has(file));

  const summary = [
    `# agy delegation run — ${label}`,
    '',
    `- spec: \`${path.relative(REPO_ROOT, specPath)}\``,
    `- model: \`${args.model}\``,
    `- elapsed: ${elapsedSeconds}s`,
    `- status: ${timedOut ? 'TIMED OUT' : (result?.status ?? `exit ${code}`)}`,
    `- conversation: \`${result?.conversation_id ?? 'unknown'}\``,
    result?.usage ? `- tokens: ${JSON.stringify(result.usage)}` : null,
    '',
    '## Tracked changes',
    '',
    changedTracked ? '```\n' + changedTracked + '\n```' : '_none_',
    '',
    '## New untracked files',
    '',
    newUntracked.length ? newUntracked.map(file => `- \`${file}\``).join('\n') : '_none_',
  ]
    .filter(line => line !== null)
    .join('\n');

  await fs.writeFile(path.join(runDirectory, 'summary.md'), summary + '\n');
  console.error(`\n${summary}\n`);
  console.error(`[agy-delegate] artifacts in ${path.relative(REPO_ROOT, runDirectory)}`);

  if (timedOut) {
    console.error('[agy-delegate] killed on timeout — treat any changes as half-finished.');
    process.exit(2);
  }
  if (result?.status !== 'SUCCESS') {
    console.error(`[agy-delegate] agy did not report success (exit ${code}).`);
    process.exit(1);
  }
  if (!changedTracked && newUntracked.length === 0) {
    console.error('[agy-delegate] run reported success but changed nothing.');
    process.exit(1);
  }
  process.exit(0);
};

main().catch(error => {
  console.error(`[agy-delegate] ${error.message}`);
  process.exit(3);
});
