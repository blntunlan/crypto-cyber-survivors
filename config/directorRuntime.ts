import {
  type DirectorRuntimeMode,
  type DirectorRuntimePlan,
  resolveDirectorRuntimePlan,
} from '../services/director/DirectorRuntimeMode';
import { getMarketRuntimeMode, type MarketRuntimeMode } from './marketRuntime';

const directorModeByMarketMode: Record<MarketRuntimeMode, DirectorRuntimeMode> = {
  legacy: 'LEGACY',
  dual: 'SHADOW',
  runtime: 'NEW_AUTHORITY',
};

export const getDirectorRuntimeConfig = (
  marketRuntimeMode: MarketRuntimeMode = getMarketRuntimeMode()
): DirectorRuntimePlan =>
  resolveDirectorRuntimePlan(directorModeByMarketMode[marketRuntimeMode]);
