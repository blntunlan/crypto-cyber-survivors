import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_HOT_PATH_CALLS = [
  '.map(',
  '.filter(',
  'Array.from(',
  'new Array(',
  'setTimeout(',
  'setInterval(',
] as const;

const extractMethodSpan = (source: string, signature: string): string => {
  const signatureIndex = source.indexOf(signature);
  expect(signatureIndex, `Missing audited method: ${signature}`).toBeGreaterThanOrEqual(
    0
  );

  const bodyStartIndex = source.indexOf('{', signatureIndex);
  expect(
    bodyStartIndex,
    `Missing body for audited method: ${signature}`
  ).toBeGreaterThan(signatureIndex);

  let braceDepth = 0;
  for (let sourceIndex = bodyStartIndex; sourceIndex < source.length; sourceIndex++) {
    const character = source[sourceIndex];
    if (character === '{') {
      braceDepth++;
    } else if (character === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        return source.slice(signatureIndex, sourceIndex + 1);
      }
    }
  }

  throw new Error(`Unterminated audited method: ${signature}`);
};

const expectNoForbiddenHotPathCalls = (methodSpans: readonly string[]): void => {
  for (const methodSpan of methodSpans) {
    for (const forbiddenCall of FORBIDDEN_HOT_PATH_CALLS) {
      expect(methodSpan).not.toContain(forbiddenCall);
    }
  }
};

describe('GameEngine hot-path allocation audit', () => {
  it('does not replace telemetry or phase result objects inside the RAF loop', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('tick.telemetry.phaseDurationsMs = {}');
    expect(source).not.toContain('tick.telemetry.counters = {}');
    expect(source).not.toContain('tick.telemetry.marks = {}');
    expect(source).not.toMatch(/lastPhaseTickRef\.current\s*=\s*\{/);
  });

  it('keeps the six explicitly scanned Market Cache method bodies free of forbidden calls', () => {
    const lootCacheSource = readFileSync(
      'services/gameplay/loot/LootCacheSystem.ts',
      'utf8'
    );
    const rendererSource = readFileSync('services/renderers/EntityRenderer.ts', 'utf8');

    const auditedMethodSpans = [
      extractMethodSpan(lootCacheSource, 'update(input: LootCacheUpdateInput): void'),
      extractMethodSpan(
        lootCacheSource,
        'private updateActiveCache(input: LootCacheUpdateInput): void'
      ),
      extractMethodSpan(rendererSource, 'render('),
      extractMethodSpan(rendererSource, 'private drawInteractables('),
      extractMethodSpan(rendererSource, 'private drawLootCache('),
      extractMethodSpan(rendererSource, 'private drawLootCacheEdgeMarker('),
    ];

    expectNoForbiddenHotPathCalls(auditedMethodSpans);
  });
});
