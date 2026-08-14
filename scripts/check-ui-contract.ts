#!/usr/bin/env npx tsx
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as glob from 'glob';
import { isProductionUiSurface } from '../config/ui-contract/productionSurfaceManifest';

export const UI_CONTRACT_RULES = [
  'raw-interactive-element',
  'direct-theme-branch',
  'raw-color',
  'standalone-surface',
  'themed-visual-override',
] as const;

export type UiContractRule = (typeof UI_CONTRACT_RULES)[number];

export type UiContractViolation = {
  column: number;
  line: number;
  message: string;
  path: string;
  rule: UiContractRule | 'expired-legacy-allowlist';
};

export type UiContractAllowlistEntry = {
  expiresOn: string;
  owner: string;
  path: string;
  reason: string;
  rules: UiContractRule[];
};

export type UiContractAllowlist = {
  baselineCommit?: string;
  entries: UiContractAllowlistEntry[];
  enforcedPaths?: string[];
  version?: number;
};

export type UiContractAuditOptions = {
  allowlist?: UiContractAllowlist;
  content: string;
  now?: Date;
  relativePath: string;
};

const APPROVED_PRIMITIVE_PATH = 'components/themed/';
const RAW_INTERACTIVE_ELEMENT = /<(button|input|select|textarea)\b/g;
const DIRECT_THEME_BRANCH = /\bisRetro\s*(?:\?|&&|\|\|)|\bif\s*\([^)]*\bisRetro\b/g;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const THEMED_COMPONENT =
  /<Themed(?:Button|IconButton|Input|Textarea|Select|SelectionCard|Badge|Divider|Text|Panel)\b[\s\S]{0,800}?className=(?:{`([^`]*)`}|"([^"]*)")/g;
const VISUAL_OVERRIDE =
  /\b(?:bg|border|rounded|shadow|font|animate|transition|duration|ease)-|\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-|\btext-(?:xs|sm|base|lg|xl|\[|white|black|slate|gray|red|amber|emerald|cyan|orange|yellow|green|blue|purple|pink)-/;
const SURFACE_CLASS = /\b(?:bg|border|rounded|shadow)-/;

function normalizePath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function lineAndColumn(
  content: string,
  offset: number
): { column: number; line: number } {
  const leadingContent = content.slice(0, offset);
  const line = leadingContent.split('\n').length;
  const lastLineBreak = leadingContent.lastIndexOf('\n');

  return { column: offset - lastLineBreak, line };
}

export function matchesUiContractPath(pattern: string, relativePath: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  let expression = '';

  for (let index = 0; index < normalizedPattern.length; index++) {
    const character = normalizedPattern[index];
    if (!character) continue;

    if (character === '*') {
      const isGlobStar = normalizedPattern[index + 1] === '*';
      if (isGlobStar) {
        const includesFollowingSlash = normalizedPattern[index + 2] === '/';
        expression += includesFollowingSlash ? '(?:.*/)?' : '.*';
        index += includesFollowingSlash ? 2 : 1;
      } else {
        expression += '[^/]*';
      }
      continue;
    }

    expression += /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character;
  }

  return new RegExp(`^${expression}$`).test(normalizePath(relativePath));
}

function findLegacyEntry(
  allowlist: UiContractAllowlist | undefined,
  relativePath: string,
  rule: UiContractRule
): UiContractAllowlistEntry | undefined {
  return allowlist?.entries.find(
    entry =>
      matchesUiContractPath(entry.path, relativePath) && entry.rules.includes(rule)
  );
}

function isAllowed(
  allowlist: UiContractAllowlist | undefined,
  relativePath: string,
  rule: UiContractRule,
  now: Date
): { allowed: boolean; expired: UiContractAllowlistEntry | undefined } {
  const entry = findLegacyEntry(allowlist, relativePath, rule);

  if (!entry) return { allowed: false, expired: undefined };
  if (new Date(`${entry.expiresOn}T23:59:59.999Z`) >= now) {
    return { allowed: true, expired: undefined };
  }

  return { allowed: false, expired: entry };
}

export function isProductionUiFile(filePath: string): boolean {
  return isProductionUiSurface(normalizePath(filePath));
}

export function auditUiContractSource({
  allowlist,
  content,
  now = new Date(),
  relativePath: filePath,
}: UiContractAuditOptions): UiContractViolation[] {
  const relativePath = normalizePath(filePath);
  if (!isProductionUiFile(relativePath)) return [];

  const violations: UiContractViolation[] = [];
  const addViolation = (
    rule: UiContractRule,
    offset: number,
    message: string
  ): void => {
    const legacy = isAllowed(allowlist, relativePath, rule, now);
    const location = lineAndColumn(content, offset);

    if (legacy.allowed) return;

    if (legacy.expired) {
      violations.push({
        ...location,
        message: `Legacy allowlist for ${rule} expired on ${legacy.expired.expiresOn}.`,
        path: relativePath,
        rule: 'expired-legacy-allowlist',
      });
      return;
    }

    violations.push({ ...location, message, path: relativePath, rule });
  };

  if (!relativePath.startsWith(APPROVED_PRIMITIVE_PATH)) {
    for (const match of content.matchAll(RAW_INTERACTIVE_ELEMENT)) {
      addViolation(
        'raw-interactive-element',
        match.index ?? 0,
        `Use a themed primitive instead of raw <${match[1]}> in production UI.`
      );
    }
  }

  for (const match of content.matchAll(DIRECT_THEME_BRANCH)) {
    addViolation(
      'direct-theme-branch',
      match.index ?? 0,
      'Resolve theme presentation through a skin variant, not an isRetro branch.'
    );
  }

  for (const match of content.matchAll(RAW_COLOR)) {
    addViolation(
      'raw-color',
      match.index ?? 0,
      'Use a semantic token or component variant instead of a raw color literal.'
    );
  }

  for (const match of content.matchAll(THEMED_COMPONENT)) {
    const className = match[1] ?? match[2] ?? '';
    if (VISUAL_OVERRIDE.test(className)) {
      addViolation(
        'themed-visual-override',
        match.index ?? 0,
        'Themed primitive className may contain layout only; move visual styling to a variant.'
      );
    }
  }

  const surfaceElements =
    /<(?:div|section|aside|dialog)\b[\s\S]{0,500}?className=(?:{`([^`]*)`}|"([^"]*)")/g;
  for (const match of content.matchAll(surfaceElements)) {
    const className = match[1] ?? match[2] ?? '';
    const surfaceMatches = className.match(new RegExp(SURFACE_CLASS.source, 'g')) ?? [];
    if (surfaceMatches.length >= 2) {
      addViolation(
        'standalone-surface',
        match.index ?? 0,
        'Use ThemedPanel, PageShell, OverlayChrome, or StatePanel for a styled surface.'
      );
    }
  }

  return violations;
}

function readAllowlist(rootDir: string): UiContractAllowlist {
  const filePath = path.join(rootDir, 'config/ui-contract/legacy-allowlist.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as UiContractAllowlist;
}

/**
 * The baseline commit decides which files are grandfathered in. A shallow
 * clone does not contain it, and the lookup below would then silently report
 * "not in baseline" for every file — enforcing the whole component tree in CI
 * while passing locally. Fail loudly instead of diverging by clone depth.
 */
function assertBaselineIsReachable(rootDir: string, baselineCommit: string): void {
  const result = childProcess.spawnSync(
    'git',
    ['cat-file', '-e', `${baselineCommit}^{commit}`],
    { cwd: rootDir, encoding: 'utf-8' }
  );

  if (result.status !== 0) {
    throw new Error(
      `UI contract baseline commit ${baselineCommit} is not reachable. ` +
        'Fetch the full history (actions/checkout with fetch-depth: 0) before running this gate.'
    );
  }
}

function existsAtBaseline(
  rootDir: string,
  baselineCommit: string | undefined,
  relativePath: string
): boolean {
  if (!baselineCommit) return false;

  const result = childProcess.spawnSync(
    'git',
    ['cat-file', '-e', `${baselineCommit}:${relativePath}`],
    {
      cwd: rootDir,
      encoding: 'utf-8',
    }
  );

  return result.status === 0;
}

export function shouldEnforceUiFile(
  relativePath: string,
  allowlist: UiContractAllowlist,
  existsInBaseline: boolean
): boolean {
  return (
    !existsInBaseline ||
    (allowlist.enforcedPaths ?? []).some(pattern =>
      matchesUiContractPath(pattern, relativePath)
    )
  );
}

export function runUiContract(rootDir = process.cwd()): UiContractViolation[] {
  const allowlist = readAllowlist(rootDir);
  if (allowlist.baselineCommit) {
    assertBaselineIsReachable(rootDir, allowlist.baselineCommit);
  }
  const componentFiles = glob.sync('components/**/*.tsx', {
    cwd: rootDir,
    ignore: ['**/*.test.tsx'],
  });

  return componentFiles.flatMap(relativePath => {
    const normalizedPath = normalizePath(relativePath);
    const existsInBaseline = existsAtBaseline(
      rootDir,
      allowlist.baselineCommit,
      normalizedPath
    );
    if (!shouldEnforceUiFile(normalizedPath, allowlist, existsInBaseline)) return [];

    return auditUiContractSource({
      allowlist,
      content: fs.readFileSync(path.join(rootDir, relativePath), 'utf-8'),
      relativePath: normalizedPath,
    });
  });
}

function printViolations(violations: UiContractViolation[]): void {
  if (violations.length === 0) {
    console.log('UI contract: passed');
    return;
  }

  console.error(`UI contract: ${violations.length} violation(s)`);
  for (const violation of violations) {
    console.error(
      `${violation.path}:${violation.line}:${violation.column} [${violation.rule}] ${violation.message}`
    );
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/check-ui-contract.ts')) {
  const violations = runUiContract();
  printViolations(violations);
  if (violations.length > 0) process.exitCode = 1;
}
