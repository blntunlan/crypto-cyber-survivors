export const GAMEPLAY_RUN_MODES = ['TOKEN', 'MIRROR_PVP', 'PRACTICE'] as const;

export type GameplayRunMode = (typeof GAMEPLAY_RUN_MODES)[number];

export const PACING_STATES = [
  'BUILD_UP',
  'PEAK',
  'PEAK_FADE',
  'RECOVERY',
  'MARKET_SURGE',
  'DOOM',
] as const;

export type PacingState = (typeof PACING_STATES)[number];

export type DirectorPacingSnapshot = {
  state: PacingState;
  threatMultiplier: number;
  remainingSeconds: number;
};

export const MARKET_REGIMES = [
  'CALM',
  'BULL_TREND',
  'BEAR_TREND',
  'VOLATILE',
  'PANIC',
  'SQUEEZE',
] as const;

export type MarketRegime = (typeof MARKET_REGIMES)[number];

export const MARKET_EVENT_FAMILIES = [
  'BREAKOUT',
  'VOLATILITY_SPIKE',
  'VOLUME_SURGE',
  'SQUEEZE_RELEASE',
  'PANIC_CRASH',
  'WHALE_EVENT',
  'RSI_EXTREMITY',
] as const;

export type MarketEventFamily = (typeof MARKET_EVENT_FAMILIES)[number];

export type MarketRegimeSnapshot = {
  revision: number;
  regime: MarketRegime;
  confidence: number;
  pressure: number;
  volatility: number;
  volume: number;
  trend: number;
  rsiExtremity: number;
  whalePressure: number;
  activeEventFamily: MarketEventFamily | null;
  eventTelegraphEndsAtTick: number | null;
};

export type PositionRiskSnapshot = {
  sourceSequence: number;
  alignment: number;
  advantage: number;
  headwind: number;
  liquidationProximity: number;
  leverageRisk: number;
  isLiquidated: boolean;
};

export type IntensitySnapshot = {
  healthRatio: number;
  combatMastery: number;
  buildPower: number;
  recentDamagePerSecond: number;
  killsPerMinute: number;
  mobilityUsage: number;
  recentDamagePressure: number;
  nearbyThreatPressure: number;
  escapeResourcePressure: number;
  recoveryNeed: number;
};

export type WorldPressureSnapshot = {
  activeThreat: number;
  activePrimaryEncounters: number;
  activeSupportEncounters: number;
  queuedEventFamily: MarketEventFamily | null;
  doomStacks: number;
};

export type RunDirectorContext = {
  runId: string;
  seed: number;
  mode: GameplayRunMode;
  elapsedSeconds: number;
  greedLevel: number;
  isMarketStale: boolean;
};

export type DirectorInputFrame = {
  tick: number;
  deltaSeconds: number;
  pacing: DirectorPacingSnapshot;
  market: MarketRegimeSnapshot;
  position: PositionRiskSnapshot;
  player: IntensitySnapshot;
  world: WorldPressureSnapshot;
  run: RunDirectorContext;
};

export type GameplaySnapshot = {
  revision: number;
  validFromTick: number;
  pacing: {
    state: PacingState;
    threatMultiplier: number;
    remainingSeconds: number;
  };
  threat: {
    target: number;
    creditRate: number;
    availableCredits: number;
    maximumCredits: number;
  };
  advantage: {
    creditRate: number;
    availableCredits: number;
    maximumCredits: number;
    activeMechanic: string | null;
  };
  environment: {
    regime: MarketRegime;
    presentationIntensity: number;
    isFavorable: boolean;
  };
  encounter: {
    activeEventFamily: MarketEventFamily | null;
    canStartMarketSurge: boolean;
    queuedEventFamily: MarketEventFamily | null;
    phase: 'IDLE' | 'TELEGRAPH' | 'ACTIVE' | 'RECOVERY' | 'COOLDOWN';
    primaryCardId: string | null;
    supportCardId: string | null;
    headwindChannels: string[];
  };
};

export type SpawnPlan = {
  revision: number;
  seed: number;
  spendableThreat: number;
  composition: readonly string[];
  statTier: number;
  maxActiveEnemies: number;
  spawnWindowSeconds: number;
  intents: readonly SpawnIntent[];
};

export type SpawnIntent = {
  tick: number;
  sequence: number;
  enemyType: string;
  x: number;
  y: number;
  threatCost: number;
  difficulty: number;
  healthMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  intent: 'fodder' | 'pressure' | 'counter' | 'ranged' | 'boss';
  powerTier: number;
};
