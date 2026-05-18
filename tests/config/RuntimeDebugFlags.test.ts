import { afterEach, describe, expect, it } from 'vitest';
import {
  applyRuntimeDebugDocumentFlags,
  getRuntimeDebugFlags,
  getRuntimeDebugSnapshot,
  resolveRuntimeCanvasDpr,
} from '../../config/RuntimeDebugFlags';

describe('RuntimeDebugFlags', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-runtime-no-motion');
    document.documentElement.removeAttribute('data-runtime-no-backdrop');
    document.documentElement.removeAttribute('data-runtime-no-glow');
    document.documentElement.removeAttribute('data-runtime-no-background-candles');
    document.documentElement.removeAttribute('data-runtime-no-screen-shake');
    document.documentElement.removeAttribute('data-runtime-dpr');
  });

  it('parses compositor and gameplay isolation flags from query params', () => {
    const flags = getRuntimeDebugFlags(
      '?noMotion=1&noBackdrop=true&noGlow=yes&noBackgroundCandles=on&noScreenShake=1'
    );

    expect(flags).toMatchObject({
      noMotion: true,
      noBackdrop: true,
      noGlow: true,
      noBackgroundCandles: true,
      noScreenShake: true,
      runtimeDpr: 1,
    });
  });

  it('parses and clamps runtime DPR settings', () => {
    expect(getRuntimeDebugFlags('?runtimeDpr=1.5').runtimeDpr).toBe(1.5);
    expect(getRuntimeDebugFlags('?runtimeDpr=9').runtimeDpr).toBe(3);
    expect(getRuntimeDebugFlags('?runtimeDpr=native').runtimeDpr).toBe('native');
    expect(
      resolveRuntimeCanvasDpr(getRuntimeDebugFlags('?runtimeDpr=native'), 2.25)
    ).toBe(2.25);
  });

  it('builds a compact active flag snapshot for diagnostics export', () => {
    const snapshot = getRuntimeDebugSnapshot('?noMotion=1&runtimeDpr=1.25', 2);

    expect(snapshot.activeFlags).toEqual(['noMotion', 'runtimeDpr:1.25']);
    expect(snapshot.resolvedCanvasDpr).toBe(1.25);
  });

  it('applies flags as document dataset attributes for CSS isolation', () => {
    applyRuntimeDebugDocumentFlags(
      getRuntimeDebugFlags('?noMotion=1&noBackdrop=1&noGlow=1&runtimeDpr=native')
    );

    expect(document.documentElement.dataset.runtimeNoMotion).toBe('true');
    expect(document.documentElement.dataset.runtimeNoBackdrop).toBe('true');
    expect(document.documentElement.dataset.runtimeNoGlow).toBe('true');
    expect(document.documentElement.dataset.runtimeDpr).toBe('native');
  });
});
