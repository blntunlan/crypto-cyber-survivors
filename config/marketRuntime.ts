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

const DEFAULT_MARKET_RUNTIME_MODE: MarketRuntimeMode = 'runtime';

const isMarketRuntimeMode = (value: string): value is MarketRuntimeMode => {
  return MARKET_RUNTIME_MODES.includes(value as MarketRuntimeMode);
};

export const resolveMarketRuntimeMode = (
  rawMode: unknown,
  isProduction: boolean
): MarketRuntimeMode => {
  if (typeof rawMode !== 'string') return DEFAULT_MARKET_RUNTIME_MODE;

  const normalizedMode = rawMode.trim().toLowerCase();
  if (!isMarketRuntimeMode(normalizedMode)) {
    return DEFAULT_MARKET_RUNTIME_MODE;
  }

  if (isProduction && normalizedMode !== 'runtime') {
    return 'runtime';
  }

  return normalizedMode;
};

export const getMarketRuntimeMode = (): MarketRuntimeMode =>
  resolveMarketRuntimeMode(
    import.meta.env.VITE_MARKET_RUNTIME_MODE,
    import.meta.env.PROD
  );

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
