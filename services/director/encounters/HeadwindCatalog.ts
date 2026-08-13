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

/**
 * Contract §11 maps each market identity to a primary and secondary pressure.
 * The channel is the pressure, so the enemy composition belongs here rather
 * than inside the spawn builder, which must stay free of market knowledge.
 */
const COMPOSITION_BY_CHANNEL: Readonly<Record<HeadwindChannel, readonly string[]>> = {
  SPAWN_DENSITY: ['fud', 'fud', 'bear'],
  MULTI_DIRECTIONAL_ENTRIES: ['sandwich', 'flash_loan', 'fud'],
  TELEGRAPHED_SPEED_BURST: ['fud', 'bull', 'pumpdump'],
  TEMPORARY_HAZARD: ['pumpdump', 'fud'],
  PURSUER_RANGED_COMPOSITION: ['bear', 'mev_bot', 'market_maker'],
  SAFE_ROUTE_PRESSURE: ['bear', 'bull', 'mev_bot'],
  SHRINKING_SAFE_ZONE: ['liquidator', 'bear'],
  RECOVERY_REDUCTION: ['bear', 'fud'],
  ELITE_SYNERGY: ['rugpull', 'liquidator', 'bear'],
  VISION_AREA_STRESS: ['rsi', 'mev_bot', 'fud'],
};

export const NEUTRAL_COMPOSITION: readonly string[] = [
  'bear',
  'bull',
  'fud',
  'mev_bot',
];

/**
 * Resolves the archetype pool for the active channels. The first channel is the
 * primary pressure, so it leads; the neutral pool is used when no headwind is
 * present so a calm market still fields a readable mix.
 */
export const resolveComposition = (
  channels: readonly HeadwindChannel[]
): readonly string[] => {
  if (channels.length === 0) return NEUTRAL_COMPOSITION;

  const composition: string[] = [];
  for (const channel of channels) {
    for (const archetype of COMPOSITION_BY_CHANNEL[channel]) {
      composition.push(archetype);
    }
  }
  return composition.length > 0 ? composition : NEUTRAL_COMPOSITION;
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
