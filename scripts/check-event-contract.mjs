import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Event contract guard.
 *
 * The EventBus is the widest coupling surface in the codebase and the only one
 * with no static edges: you cannot grep "who calls this", only "who listens".
 * That makes it the one place where dead wiring accumulates invisibly — an emit
 * nobody hears, a listener nothing ever triggers, a union member that no code
 * has produced since the feature was cut.
 *
 * Four rules, each a distinct failure mode:
 *   declaredNotEmitted   — in the GameEvent union, never emitted in app code.
 *   emittedNotListened   — emitted, but no app listener. The emit is dead work.
 *   listenedNotEmitted   — listened for, but nothing emits it. The FEATURE is
 *                          dead; this is the rule that catches a lost emitter.
 *   effectRegistryStale  — config/EffectRegistry.ts keys an effect policy on an
 *                          event no one emits. Event names go stale there
 *                          independently of the bus.
 *
 * Existing debt is frozen in config/architecture/event-contract.json with a
 * mandatory reason per entry, and an allowlist entry that no longer violates is
 * itself a failure — so the list can only shrink.
 *
 * Mirrors the style of check-reset-coverage.mjs.
 */

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'config', 'architecture', 'event-contract.json');
const EVENTS_PATH = path.join(ROOT, 'types', 'events.ts');
const EFFECT_REGISTRY_PATH = path.join(ROOT, 'config', 'EffectRegistry.ts');

const SCAN_DIRS = [
  'components',
  'config',
  'contexts',
  'factories',
  'hooks',
  'services',
  'stores',
  'types',
  'utils',
];
const SCAN_FILES = ['App.tsx'];

// Matches EventBus.emit('x') / .emitThrottled / .on / .once / .subscribe, and
// the instance alias used by LootCacheSystem (this.eventBus.emit('x')).
const CALL_PATTERN =
  /(?:EventBus|this\.eventBus)\s*\.\s*(emit|emitThrottled|on|once|subscribe)\s*\(\s*['"]([^'"]+)['"]/g;
// Same call shapes but with a non-literal first argument — these cannot be
// attributed to an event name, so they are reported rather than silently
// skewing the counts.
const DYNAMIC_CALL_PATTERN =
  /(?:EventBus|this\.eventBus)\s*\.\s*(emit|emitThrottled|on|once|subscribe)\s*\(\s*(?!['"])[A-Za-z_$]/g;

const EMIT_METHODS = new Set(['emit', 'emitThrottled']);

const RULES = [
  'declaredNotEmitted',
  'emittedNotListened',
  'listenedNotEmitted',
  'effectRegistryStale',
];

const RULE_GUIDANCE = {
  declaredNotEmitted:
    'Remove the member from the GameEvent union and EventDataMap in types/events.ts, ' +
    'or emit it.',
  emittedNotListened: 'Delete the emit, or wire the listener it was written for.',
  listenedNotEmitted:
    'Something has to emit this. A lost emitter means the feature behind these ' +
    'listeners is dead — verify before deleting the listeners.',
  effectRegistryStale:
    'Drop the entry from EFFECT_POLICIES in config/EffectRegistry.ts, or emit the event.',
};

const toPosixPath = filePath => filePath.split(path.sep).join('/');

const isSourceFile = filePath =>
  (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
  !filePath.endsWith('.d.ts');

const walk = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
      continue;
    }

    if (entry.isFile() && isSourceFile(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const collectSourceFiles = async () => {
  const files = [];

  for (const directory of SCAN_DIRS) {
    files.push(...(await walk(path.join(ROOT, directory))));
  }

  for (const file of SCAN_FILES) {
    files.push(path.join(ROOT, file));
  }

  return files;
};

/** Union members, read straight off the `| 'name'` lines of the declaration. */
const readDeclaredEvents = async () => {
  const source = await fs.readFile(EVENTS_PATH, 'utf8');
  const start = source.indexOf('export type GameEvent =');
  if (start === -1) {
    throw new Error('Could not locate the GameEvent union in types/events.ts');
  }

  const end = source.indexOf(';', start);
  const body = source.slice(start, end === -1 ? undefined : end);
  return new Set([...body.matchAll(/\|\s*'([^']+)'/g)].map(match => match[1]));
};

/**
 * EventDataMap keys, so drift against the union can be caught. TypeScript will
 * not: EventDataMap is an interface, so a key for an event that no longer
 * exists in the union sits there silently — which is exactly what happened to
 * eighteen entries when their features were cut.
 */
const readDataMapKeys = async () => {
  const source = await fs.readFile(EVENTS_PATH, 'utf8');
  const start = source.indexOf('export interface EventDataMap');
  if (start === -1) {
    throw new Error('Could not locate EventDataMap in types/events.ts');
  }

  const keys = new Set();
  let depth = 0;

  for (const line of source.slice(start).split('\n')) {
    const entry = line.match(/^ {2}'?([A-Za-z:]+)'?:/);
    if (depth === 1 && entry) keys.add(entry[1]);

    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    if (depth <= 0 && keys.size > 0) break;
  }

  return keys;
};

const readEffectRegistryEvents = async () => {
  const source = await fs.readFile(EFFECT_REGISTRY_PATH, 'utf8');
  return new Set([...source.matchAll(/\bevent:\s*'([^']+)'/g)].map(match => match[1]));
};

const scanCallSites = async (files, declared) => {
  const emitted = new Map();
  const listened = new Map();
  const dynamic = [];

  const record = (target, event, file) => {
    if (!target.has(event)) target.set(event, new Set());
    target.get(event).add(file);
  };

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    const relative = toPosixPath(path.relative(ROOT, file));

    for (const match of source.matchAll(CALL_PATTERN)) {
      const [, method, event] = match;
      record(EMIT_METHODS.has(method) ? emitted : listened, event, relative);
    }

    DYNAMIC_CALL_PATTERN.lastIndex = 0;
    if (DYNAMIC_CALL_PATTERN.test(source)) {
      dynamic.push(relative);
      // A file that routes through a variable (VerificationQueue wraps
      // EventBus.emit behind a typed helper) hides its event names from the
      // scan. Deleting those as "never emitted" would break a live feature, so
      // every declared event named anywhere in such a file counts as emitted.
      for (const match of source.matchAll(/['"]([^'"\n]+)['"]/g)) {
        if (declared.has(match[1])) {
          record(emitted, match[1], `${relative} (dynamic)`);
        }
      }
    }
    DYNAMIC_CALL_PATTERN.lastIndex = 0;
  }

  return { emitted, listened, dynamic };
};

const readAllowlist = async () => {
  const raw = await fs.readFile(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const allowed = parsed.allowed ?? {};
  const byRule = new Map();
  const malformed = [];

  for (const rule of RULES) {
    const entries = allowed[rule] ?? [];
    if (!Array.isArray(entries)) {
      throw new Error(`event-contract.json: allowed.${rule} must be an array`);
    }

    const events = new Set();
    for (const entry of entries) {
      if (typeof entry?.event !== 'string' || typeof entry?.reason !== 'string') {
        malformed.push(`${rule}: entries need both "event" and "reason"`);
        continue;
      }
      if (entry.reason.trim() === '') {
        malformed.push(`${rule}/${entry.event}: "reason" may not be empty`);
        continue;
      }
      events.add(entry.event);
    }

    byRule.set(rule, events);
  }

  return { byRule, malformed };
};

const formatList = values => values.map(value => `  - ${value}`).join('\n');

const describe = (event, files) =>
  files === undefined || files.size === 0
    ? event
    : `${event}  (${[...files].sort().join(', ')})`;

/**
 * Pure rule evaluation, split out from the IO so it can be unit-tested the way
 * check-ui-contract.ts is. `emitted` and `listened` are Map<event, Set<file>>.
 */
export const computeViolations = ({
  declared,
  emitted,
  listened,
  effectRegistryEvents,
}) => ({
  declaredNotEmitted: [...declared]
    .filter(event => !emitted.has(event))
    .map(event => ({ event, detail: event })),
  emittedNotListened: [...emitted.keys()]
    .filter(event => !listened.has(event))
    .map(event => ({ event, detail: describe(event, emitted.get(event)) })),
  listenedNotEmitted: [...listened.keys()]
    .filter(event => !emitted.has(event))
    .map(event => ({ event, detail: describe(event, listened.get(event)) })),
  effectRegistryStale: [...effectRegistryEvents]
    .filter(event => !emitted.has(event))
    .map(event => ({ event, detail: event })),
});

/** Splits violations into "not covered by the allowlist" and "allowlist entries that no longer apply". */
export const applyAllowlist = (violations, allowlistByRule) => {
  const unallowed = [];
  const staleAllowlist = [];

  for (const rule of RULES) {
    const allowed = allowlistByRule.get(rule) ?? new Set();
    const offending = new Set(violations[rule].map(entry => entry.event));

    const remaining = violations[rule].filter(entry => !allowed.has(entry.event));
    if (remaining.length > 0) {
      unallowed.push({ rule, entries: remaining });
    }

    for (const event of allowed) {
      if (!offending.has(event)) {
        staleAllowlist.push(`${rule}/${event}`);
      }
    }
  }

  return { unallowed, staleAllowlist };
};

const main = async () => {
  const [declared, dataMapKeys, effectRegistryEvents, files, allowlist] =
    await Promise.all([
      readDeclaredEvents(),
      readDataMapKeys(),
      readEffectRegistryEvents(),
      collectSourceFiles(),
      readAllowlist(),
    ]);

  // Structural invariant, deliberately not allowlistable: the union and the
  // payload map describe the same set or the typing is a lie.
  const missingPayload = [...declared].filter(event => !dataMapKeys.has(event));
  const orphanPayload = [...dataMapKeys].filter(event => !declared.has(event));

  if (missingPayload.length > 0 || orphanPayload.length > 0) {
    console.error('GameEvent union and EventDataMap have drifted:');
    if (missingPayload.length > 0) {
      console.error('  In the union with no EventDataMap entry:');
      console.error(formatList(missingPayload));
    }
    if (orphanPayload.length > 0) {
      console.error('  In EventDataMap but not in the union:');
      console.error(formatList(orphanPayload));
    }
    process.exit(1);
  }

  const { emitted, listened, dynamic } = await scanCallSites(files, declared);

  const violations = computeViolations({
    declared,
    emitted,
    listened,
    effectRegistryEvents,
  });
  const { unallowed, staleAllowlist } = applyAllowlist(violations, allowlist.byRule);

  if (
    unallowed.length === 0 &&
    staleAllowlist.length === 0 &&
    allowlist.malformed.length === 0
  ) {
    const allowedTotal = RULES.reduce(
      (total, rule) => total + allowlist.byRule.get(rule).size,
      0
    );
    console.log(
      `Event contract check passed (${declared.size} declared, ` +
        `${emitted.size} emitted, ${listened.size} listened, ` +
        `${allowedTotal} allowlisted).`
    );
    if (dynamic.length > 0) {
      console.log(
        `Note: ${dynamic.length} file(s) route events through a variable and cannot ` +
          `be attributed statically: ${dynamic.sort().join(', ')}`
      );
    }
    return;
  }

  if (allowlist.malformed.length > 0) {
    console.error('Malformed event-contract.json entries:');
    console.error(formatList(allowlist.malformed));
    console.error('');
  }

  for (const { rule, entries } of unallowed) {
    console.error(`Event contract violations — ${rule}:`);
    console.error(formatList(entries.map(entry => entry.detail)));
    console.error('');
    console.error(`  ${RULE_GUIDANCE[rule]}`);
    console.error(
      '  If it must stay for now, add it to config/architecture/event-contract.json ' +
        `under allowed.${rule} with a reason.`
    );
    console.error('');
  }

  if (staleAllowlist.length > 0) {
    console.error('Stale event-contract.json entries (no longer violating):');
    console.error(formatList(staleAllowlist));
    console.error('');
    console.error(
      'Remove them from config/architecture/event-contract.json — the allowlist ' +
        'only shrinks.'
    );
  }

  process.exit(1);
};

// Only run the IO shell when invoked as a script; the tests import the pure
// rule functions above.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
