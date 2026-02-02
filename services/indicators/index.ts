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

// Orchestrator (Legacy)
export {
  MarketIndicatorService,
  marketIndicatorService,
  createMarketIndicatorService,
} from './MarketIndicatorService';

// AI Director V2: Client-Side Indicators
export {
  ClientIndicatorService,
  createClientIndicatorService,
  CLIENT_INDICATOR_CONFIG,
  type ClientIndicatorState,
  getDefaultClientIndicatorState,
} from './ClientIndicatorService';

// Re-export types for convenience
export type { WhaleSpawnResult } from './VolumeAnalyzer';
