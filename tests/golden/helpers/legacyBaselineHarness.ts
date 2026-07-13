import { MarketPosition } from '../../../types';
import {
  UnifiedDirector,
  type UnifiedOutputs,
} from '../../../services/difficulty/UnifiedDirector';
import { DifficultyManager } from '../../../services/gameplay/DifficultyManager';
import {
  createMarketSignalPipeline,
  type MarketPipelineResult,
} from '../../../services/market/pipeline/MarketSignalPipeline';
import {
  MARKET_SCENARIOS,
  RULE_SCENARIOS,
  RULE_SCENARIO_STEPS,
  type MarketScenarioName,
} from './scenarios';

const LEGACY_LEVERAGE = 10;

export type BaselineClock = {
  nowMs: number;
};

export type UnifiedDirectorGoldenOutputs = Record<string, readonly UnifiedOutputs[]>;

export type LegacyPipelineGoldenOutputs = Record<
  MarketScenarioName,
  readonly MarketPipelineResult[]
>;

export const runUnifiedDirectorRules = (): UnifiedDirectorGoldenOutputs => {
  const outputs: UnifiedDirectorGoldenOutputs = {};

  for (const scenario of RULE_SCENARIOS) {
    UnifiedDirector.reset();
    const scenarioOutputs: UnifiedOutputs[] = [];

    for (let step = 0; step < RULE_SCENARIO_STEPS; step += 1) {
      UnifiedDirector.update(scenario.inputsAt(step), step * 1_000);
      UnifiedDirector.snapToTargets();
      scenarioOutputs.push(UnifiedDirector.getOutputs());
    }

    outputs[scenario.name] = scenarioOutputs;
  }

  return outputs;
};

const runScenario = (
  name: MarketScenarioName,
  clock: BaselineClock
): readonly MarketPipelineResult[] => {
  const scenario = MARKET_SCENARIOS.find(candidate => candidate.name === name);
  if (scenario === undefined) {
    throw new Error(`Missing market scenario: ${name}`);
  }

  DifficultyManager.reset();
  const pipeline = createMarketSignalPipeline();
  pipeline.reset();
  DifficultyManager.startGame(LEGACY_LEVERAGE);

  const outputs: MarketPipelineResult[] = [];
  for (let index = 0; index < scenario.frames.length; index += 1) {
    const frame = scenario.frames[index]!;
    clock.nowMs = index * 1_000;
    if (frame.connection === 'stale') continue;

    outputs.push(
      pipeline.processTick({
        pair: 'BTC',
        position: MarketPosition.LONG,
        price: frame.price,
        volume: frame.volume,
        timestamp: frame.timestamp,
        high: frame.high,
        low: frame.low,
      })
    );
  }

  return outputs;
};

export const runLegacyPipelineScenarios = (
  clock: BaselineClock
): LegacyPipelineGoldenOutputs => ({
  calm: runScenario('calm', clock),
  'trend-up': runScenario('trend-up', clock),
  'trend-down': runScenario('trend-down', clock),
  'volume-surge': runScenario('volume-surge', clock),
  'volatility-spike': runScenario('volatility-spike', clock),
  'stale-reconnect': runScenario('stale-reconnect', clock),
});
