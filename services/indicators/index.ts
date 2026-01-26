/**
 * Market Indicators Module
 *
 * Exports all market indicator services for easy imports.
 */

// Calculators
export { RSICalculator, getRSICalculator, createRSICalculator } from './RSICalculator';
export { ATRCalculator } from './ATRCalculator';
export {
  VolumeAnalyzer,
  getVolumeAnalyzer,
  createVolumeAnalyzer,
} from './VolumeAnalyzer';

// Orchestrator
export {
  MarketIndicatorService,
  marketIndicatorService,
  createMarketIndicatorService,
} from './MarketIndicatorService';

// Re-export types for convenience
export type { WhaleSpawnResult } from './VolumeAnalyzer';
