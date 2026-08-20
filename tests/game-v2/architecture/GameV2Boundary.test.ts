import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const GAME_V2_DIRECTORY = join(process.cwd(), 'game-v2');
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

const getImportSpecifiers = (source: string): string[] =>
  [...source.matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
    match => match[1] ?? match[2] ?? ''
  );

describe('Game V2 architecture boundary', () => {
  it('exists as a source boundary without legacy gameplay imports', () => {
    expect(existsSync(GAME_V2_DIRECTORY)).toBe(true);

    const imports = getSourceFiles(GAME_V2_DIRECTORY).flatMap(filePath =>
      getImportSpecifiers(readFileSync(filePath, 'utf8'))
    );

    for (const forbiddenImport of forbiddenImports) {
      expect(imports).not.toContain(forbiddenImport);
    }
  });
});
