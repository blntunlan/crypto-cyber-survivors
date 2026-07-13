import { type MarketEventFamily } from '../../director/contracts';
import { type GameMarketEvent } from '../MarketEventManager';

export type MarketEventCatalogEntry = {
  family: MarketEventFamily;
  legacyEvent: GameMarketEvent | null;
  supportsGameplayEncounter: boolean;
};

export const MARKET_EVENT_CATALOG: readonly MarketEventCatalogEntry[] = [
  {
    family: 'BREAKOUT',
    legacyEvent: 'PRICE_BREAKOUT',
    supportsGameplayEncounter: true,
  },
  {
    family: 'VOLATILITY_SPIKE',
    legacyEvent: null,
    supportsGameplayEncounter: true,
  },
  {
    family: 'VOLUME_SURGE',
    legacyEvent: 'VOLUME_SPIKE',
    supportsGameplayEncounter: true,
  },
  {
    family: 'SQUEEZE_RELEASE',
    legacyEvent: 'CONSOLIDATION',
    supportsGameplayEncounter: true,
  },
  {
    family: 'PANIC_CRASH',
    legacyEvent: 'FLASH_CRASH',
    supportsGameplayEncounter: true,
  },
  {
    family: 'WHALE_EVENT',
    legacyEvent: 'WHALE_ALERT',
    supportsGameplayEncounter: true,
  },
  { family: 'RSI_EXTREMITY', legacyEvent: null, supportsGameplayEncounter: false },
];

export const getMarketEventCatalogEntry = (
  family: MarketEventFamily
): MarketEventCatalogEntry => {
  const entry = MARKET_EVENT_CATALOG.find(candidate => candidate.family === family);
  if (!entry) throw new Error(`Missing market event catalog entry for ${family}`);
  return entry;
};
