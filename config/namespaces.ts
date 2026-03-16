/**
 * Configuration namespace constants for ConfigRegistry.
 * Each namespace maps to a config module.
 */
export const CONFIG_NS = {
  GAME: 'game',
  ENEMY: 'enemy',
  ENEMY_REGISTRY: 'enemyRegistry',
  EXPERIENCE: 'experience',
  PLAYER: 'player',
  COLORS: 'colors',
  METRICS: 'metrics',
  AUDIO: 'audio',
  PERFORMANCE: 'performance',
  TUTORIAL: 'tutorial',
  UI_LAYOUT: 'uiLayout',
  STAT_REGISTRY: 'statRegistry',
  MARKET_RUNTIME: 'marketRuntime',
  DIFFICULTY: 'difficulty',
} as const;

export type ConfigNamespace = (typeof CONFIG_NS)[keyof typeof CONFIG_NS];
