/// <reference types="vite/client" />
export const MARKET_RUNTIME_MODES = ['legacy', 'dual', 'runtime'] as const;

export type MarketRuntimeMode = (typeof MARKET_RUNTIME_MODES)[number];

export interface MarketRuntimeConfig {
  mode: MarketRuntimeMode;
  isLegacyMode: boolean;
  isDualMode: boolean;
  isRuntimeMode: boolean;
  shouldRunShadowRuntime: boolean;
}

const DEFAULT_MARKET_RUNTIME_MODE: MarketRuntimeMode = 'legacy';

const isMarketRuntimeMode = (value: string): value is MarketRuntimeMode => {
  return MARKET_RUNTIME_MODES.includes(value as MarketRuntimeMode);
};

export const getMarketRuntimeMode = (): MarketRuntimeMode => {
  const rawMode = import.meta.env.VITE_MARKET_RUNTIME_MODE;
  if (typeof rawMode !== 'string') return DEFAULT_MARKET_RUNTIME_MODE;

  const normalizedMode = rawMode.trim().toLowerCase();
  if (!isMarketRuntimeMode(normalizedMode)) {
    return DEFAULT_MARKET_RUNTIME_MODE;
  }

  return normalizedMode;
};

export const getMarketRuntimeConfig = (): MarketRuntimeConfig => {
  const mode = getMarketRuntimeMode();

  return {
    mode,
    isLegacyMode: mode === 'legacy',
    isDualMode: mode === 'dual',
    isRuntimeMode: mode === 'runtime',
    shouldRunShadowRuntime: mode !== 'legacy',
  };
};
