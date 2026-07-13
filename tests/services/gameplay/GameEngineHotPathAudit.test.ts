import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GameEngine hot-path allocation audit', () => {
  it('does not replace telemetry or phase result objects inside the RAF loop', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('tick.telemetry.phaseDurationsMs = {}');
    expect(source).not.toContain('tick.telemetry.counters = {}');
    expect(source).not.toContain('tick.telemetry.marks = {}');
    expect(source).not.toMatch(/lastPhaseTickRef\.current\s*=\s*\{/);
  });
});
