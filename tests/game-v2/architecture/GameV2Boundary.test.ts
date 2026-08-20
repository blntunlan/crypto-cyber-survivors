import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const GAME_V2_DIRECTORY = join(process.cwd(), 'game-v2');
const STATIC_IMPORT_FIXTURE_PATH = join(
  process.cwd(),
  'tests',
  'game-v2',
  'architecture',
  'fixtures',
  'static-import-forms.fixture.txt'
);
const SOURCE_FILE_PATTERN = /\.(?:ts|tsx)$/;
const forbiddenImports = [
  'components/GameEngine',
  'services/gameplay/GameRuntime',
  'services/core/TimeService',
  'services/combat/PoolManager',
  'services/renderers/GameRenderer',
  'services/replay/Replay',
  'services/core/EventBus',
  'services/core/ResetOrchestrator',
];

const getSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return getSourceFiles(path);
    }

    return SOURCE_FILE_PATTERN.test(entry.name) ? [path] : [];
  });

const getImportSpecifiers = (source: string): string[] => {
  const sourceFile = ts.createSourceFile(
    'GameV2Boundary.fixture.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [moduleSpecifier] = node.arguments;

      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        specifiers.push(moduleSpecifier.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return specifiers;
};

const normalizeImportSpecifier = (specifier: string): string =>
  specifier.replace(/\\/g, '/').replace(/^(?:@\/|(?:\.\.?\/)+)/, '');

const getForbiddenImportSpecifiers = (specifiers: string[]): string[] =>
  specifiers.filter(specifier => {
    const normalizedSpecifier = normalizeImportSpecifier(specifier);

    return forbiddenImports.some(
      forbiddenImport =>
        normalizedSpecifier === forbiddenImport ||
        normalizedSpecifier.endsWith(`/${forbiddenImport}`)
    );
  });

describe('Game V2 architecture boundary', () => {
  it('exists as a source boundary without legacy gameplay imports', () => {
    expect(existsSync(GAME_V2_DIRECTORY)).toBe(true);

    const imports = getSourceFiles(GAME_V2_DIRECTORY).flatMap(filePath =>
      getImportSpecifiers(readFileSync(filePath, 'utf8'))
    );

    expect(getForbiddenImportSpecifiers(imports)).toEqual([]);
  });

  it('detects real forbidden imports while ignoring import-like text', () => {
    const fixtureImports = getImportSpecifiers(
      readFileSync(STATIC_IMPORT_FIXTURE_PATH, 'utf8')
    );

    expect(fixtureImports).toEqual([
      '@/services/core/EventBus',
      '../services/gameplay/GameRuntime',
      '../services/core/TimeService',
      '../services/combat/PoolManager',
      '@/services/core/EventBus',
      '@/game-v2/GameV2App',
      '@/services/replay/Replay',
      '@/game-v2/GameV2App',
    ]);
    expect(getForbiddenImportSpecifiers(fixtureImports)).toEqual([
      '@/services/core/EventBus',
      '../services/gameplay/GameRuntime',
      '../services/core/TimeService',
      '../services/combat/PoolManager',
      '@/services/core/EventBus',
      '@/services/replay/Replay',
    ]);
    expect(getForbiddenImportSpecifiers(fixtureImports)).not.toContain(
      '@/game-v2/GameV2App'
    );
  });
});
