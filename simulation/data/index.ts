/**
 * Simulation Data Module
 *
 * Provides market data loading and simulation for AI training.
 */

export { HistoricalDataLoader, historicalDataLoader } from './HistoricalDataLoader.ts';
export type {
  PriceDataPoint,
  MarketSegment,
  IndicatorSnapshot,
} from './HistoricalDataLoader.ts';

export {
  MarketSimulator,
  createMarketSimulator,
  TRAINING_SCENARIOS,
} from './MarketSimulator.ts';
export type { MarketState, MarketScenario, SimulationMode } from './MarketSimulator.ts';
