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
    expect(source).not.toMatch(/lastSyncedStats\.current\s*=\s*\{/);
    expect(source).toContain(
      'const weaponMarketContext = weaponMarketContextRef.current'
    );
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

  it('keeps flow analysis and input phase free of per-frame collection allocation', () => {
    const flowSource = readFileSync('services/difficulty/FlowStateManager.ts', 'utf8');
    const inputSource = readFileSync('services/gameplay/phases/InputPhase.ts', 'utf8');
    const coreLoopSource = readFileSync(
      'services/gameplay/CoreGameplayLoop.ts',
      'utf8'
    );

    expectNoForbiddenHotPathCalls([
      extractMethodSpan(
        flowSource,
        'private cleanOldEvents(currentTime: number): void'
      ),
      extractMethodSpan(
        flowSource,
        'private updateDerivedMetrics(currentTime: number): void'
      ),
      extractMethodSpan(
        flowSource,
        'private analyze(currentTime: number): FlowStateAnalysis'
      ),
      extractMethodSpan(coreLoopSource, 'public update(input: CoreGameplayLoopInput)'),
    ]);
    expect(inputSource).not.toContain('s.dashTrail.push({');
  });

  it('keeps rolling ATR rank updates allocation-free', () => {
    const source = readFileSync(
      'services/market/regime/RollingAtrPercentile.ts',
      'utf8'
    );
    const update = extractMethodSpan(source, 'public update(');

    expectNoForbiddenHotPathCalls([update]);
    expect(update).not.toContain('.sort(');
  });

  it('reuses difficulty boundary records instead of allocating them every frame', () => {
    const source = readFileSync(
      'services/difficulty/runtime/DifficultyRuntime.ts',
      'utf8'
    );
    const commit = extractMethodSpan(source, 'public commitAtBoundary(');

    expect(source).toContain('private readonly boundaryRunConstants');
    expect(source).toContain('private readonly boundaryWorldPressure');
    expect(commit).not.toMatch(/initializeRun\(\s*\{/);
    expect(commit).not.toMatch(/recordWorldPressure\(\s*\{/);
  });

  it('selects Advantage cards without allocating a filtered catalog', () => {
    const source = readFileSync('services/director/AdvantageAllocator.ts', 'utf8');
    const planNext = extractMethodSpan(source, 'public planNext(');

    expect(planNext).not.toContain('.filter(');
  });
});
