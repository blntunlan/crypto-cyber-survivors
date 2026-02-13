import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getMarketRuntimeConfig,
  getMarketRuntimeMode,
  MARKET_RUNTIME_MODES,
} from '../../../config/marketRuntime';

describe('marketRuntime config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to legacy mode when env is not set', () => {
    const mode = getMarketRuntimeMode();
    const config = getMarketRuntimeConfig();

    expect(mode).toBe('legacy');
    expect(config.isLegacyMode).toBe(true);
    expect(config.shouldRunShadowRuntime).toBe(false);
  });

  it('accepts supported runtime modes', () => {
    for (const mode of MARKET_RUNTIME_MODES) {
      vi.stubEnv('VITE_MARKET_RUNTIME_MODE', mode);
      expect(getMarketRuntimeMode()).toBe(mode);
    }
  });

  it('falls back to legacy on invalid mode', () => {
    vi.stubEnv('VITE_MARKET_RUNTIME_MODE', 'invalid-mode');

    const config = getMarketRuntimeConfig();
    expect(config.mode).toBe('legacy');
    expect(config.isLegacyMode).toBe(true);
    expect(config.isDualMode).toBe(false);
    expect(config.isRuntimeMode).toBe(false);
  });

  it('enables shadow runtime in dual and runtime modes', () => {
    vi.stubEnv('VITE_MARKET_RUNTIME_MODE', 'dual');
    expect(getMarketRuntimeConfig().shouldRunShadowRuntime).toBe(true);

    vi.stubEnv('VITE_MARKET_RUNTIME_MODE', 'runtime');
    expect(getMarketRuntimeConfig().shouldRunShadowRuntime).toBe(true);
  });
});
