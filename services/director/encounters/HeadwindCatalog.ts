import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from '../config/DirectorConfigV1';
import { type MarketEventFamily, type MarketRegime } from '../contracts';

export const HEADWIND_CHANNELS = [
  'SPAWN_DENSITY',
  'MULTI_DIRECTIONAL_ENTRIES',
  'TELEGRAPHED_SPEED_BURST',
  'TEMPORARY_HAZARD',
  'PURSUER_RANGED_COMPOSITION',
  'SAFE_ROUTE_PRESSURE',
  'SHRINKING_SAFE_ZONE',
  'RECOVERY_REDUCTION',
  'ELITE_SYNERGY',
  'VISION_AREA_STRESS',
] as const;

export type HeadwindChannel = (typeof HEADWIND_CHANNELS)[number];

export type HeadwindChannelInput = {
  regime: MarketRegime;
  activeEventFamily: MarketEventFamily | null;
  headwind: number;
  liquidationProximity: number;
};

const HEADWIND_CHANNELS_BY_EVENT: Partial<
  Record<MarketEventFamily, readonly HeadwindChannel[]>
> = {
  VOLUME_SURGE: ['SPAWN_DENSITY', 'MULTI_DIRECTIONAL_ENTRIES'],
  VOLATILITY_SPIKE: ['TELEGRAPHED_SPEED_BURST', 'TEMPORARY_HAZARD'],
  PANIC_CRASH: ['ELITE_SYNERGY', 'VISION_AREA_STRESS'],
};

const HEADWIND_CHANNELS_BY_REGIME: Partial<
  Record<MarketRegime, readonly HeadwindChannel[]>
> = {
  BULL_TREND: ['PURSUER_RANGED_COMPOSITION', 'SAFE_ROUTE_PRESSURE'],
  BEAR_TREND: ['PURSUER_RANGED_COMPOSITION', 'SAFE_ROUTE_PRESSURE'],
  VOLATILE: ['TELEGRAPHED_SPEED_BURST', 'TEMPORARY_HAZARD'],
  PANIC: ['ELITE_SYNERGY', 'VISION_AREA_STRESS'],
  SQUEEZE: ['TELEGRAPHED_SPEED_BURST', 'TEMPORARY_HAZARD'],
};

const NO_HEADWIND = 0;

export const resolveHeadwindChannels = (
  input: HeadwindChannelInput,
  config: DirectorConfigV1 = DIRECTOR_CONFIG_V1
): readonly HeadwindChannel[] => {
  if (input.headwind <= NO_HEADWIND) return [];

  const sourceChannels =
    input.liquidationProximity >= config.encounters.liquidationHeadwindThreshold
      ? (['SHRINKING_SAFE_ZONE', 'RECOVERY_REDUCTION'] as const)
      : ((input.activeEventFamily === null
          ? undefined
          : HEADWIND_CHANNELS_BY_EVENT[input.activeEventFamily]) ??
        HEADWIND_CHANNELS_BY_REGIME[input.regime] ??
        []);

  return sourceChannels.slice(0, config.encounters.maximumHeadwindChannels);
};
