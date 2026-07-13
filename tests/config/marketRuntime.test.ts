import { describe, expect, it } from 'vitest';
import { resolveMarketRuntimeMode } from '../../config/marketRuntime';

describe('market runtime mode resolution', () => {
  it('defaults to the Director runtime when no mode is configured', () => {
    expect(resolveMarketRuntimeMode(undefined, false)).toBe('runtime');
  });

  it('does not permit the legacy pipeline in production', () => {
    expect(resolveMarketRuntimeMode('legacy', true)).toBe('runtime');
    expect(resolveMarketRuntimeMode('dual', true)).toBe('runtime');
    expect(resolveMarketRuntimeMode('runtime', true)).toBe('runtime');
  });

  it('keeps explicit legacy mode available only outside production for rollback testing', () => {
    expect(resolveMarketRuntimeMode('legacy', false)).toBe('legacy');
  });
});
