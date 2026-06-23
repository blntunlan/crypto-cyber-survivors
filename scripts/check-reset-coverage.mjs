import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Reset coverage guard.
 *
 * Every singleton in singleton-whitelist.json must either:
 *   (a) wire into the GameLifecycle reset path — its source contains one of
 *       `registerResettable`, `registerResetHandler`, or `on('gameReset'`, OR
 *   (b) be explicitly listed in reset-exempt.json (stateless / session-scoped /
 *       reset transitively via a parent).
 *
 * This makes "I added a stateful singleton but forgot to reset it" a CI failure
 * — the exact class of bug that silently leaked a weapon from one run into the
 * next. Mirrors the style of check-singleton-regressions.mjs.
 */

const ROOT = process.cwd();
const ARCH_DIR = path.join(ROOT, 'config', 'architecture');
const WHITELIST_PATH = path.join(ARCH_DIR, 'singleton-whitelist.json');
const EXEMPT_PATH = path.join(ARCH_DIR, 'reset-exempt.json');

// A file is "wired" if its source references any canonical reset hook.
const RESET_WIRING_PATTERN =
  /registerResettable|registerResetHandler|on\(\s*['"]gameReset['"]/;

const readJsonArray = async (filePath, key) => {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed[key])) {
    throw new Error(`${path.basename(filePath)} must contain a ${key} array`);
  }
  return parsed[key];
};

const formatList = values => values.map(value => `  - ${value}`).join('\n');

const main = async () => {
  const whitelist = await readJsonArray(WHITELIST_PATH, 'allowedFiles');
  const exemptList = await readJsonArray(EXEMPT_PATH, 'exemptFiles');
  const exempt = new Set(exemptList);

  const uncovered = [];

  for (const relFile of whitelist) {
    if (exempt.has(relFile)) continue;

    let source = '';
    try {
      source = await fs.readFile(path.join(ROOT, relFile), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Stale whitelist entry — surfaced by check:architecture, skip here.
        continue;
      }
      throw error;
    }

    if (!RESET_WIRING_PATTERN.test(source)) {
      uncovered.push(relFile);
    }
  }

  // Exempt entries that no longer exist or are now wired should be cleaned up.
  const staleExempt = [];
  for (const relFile of exemptList) {
    if (!whitelist.includes(relFile)) {
      staleExempt.push(`${relFile} (not in singleton-whitelist.json)`);
    }
  }

  if (uncovered.length === 0 && staleExempt.length === 0) {
    console.log(
      `Reset coverage check passed (${whitelist.length} singletons: ` +
        `${whitelist.length - exempt.size} wired, ${exempt.size} exempt).`
    );
    return;
  }

  if (uncovered.length > 0) {
    console.error('Singletons with no reset coverage detected:');
    console.error(formatList(uncovered));
    console.error('');
    console.error(
      'Wire each into the GameLifecycle reset path (ResetOrchestrator.registerResettable ' +
        "or EventBus.on('gameReset', ...)) so its run state clears on a new game, " +
        'OR add it to config/architecture/reset-exempt.json if it holds no per-run state.'
    );
  }

  if (staleExempt.length > 0) {
    console.error('Stale reset-exempt.json entries detected:');
    console.error(formatList(staleExempt));
    console.error('');
    console.error('Remove retired entries from config/architecture/reset-exempt.json.');
  }

  process.exit(1);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
