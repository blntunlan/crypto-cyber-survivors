import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpawnSystem } from '../../services/combat/SpawnSystem';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { MarketPosition } from '../../types';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  hashBaselinePayload,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';
import { collectGoldenMismatches } from './helpers/goldenIo';
import { MARKET_SCENARIOS, type MarketScenario } from './helpers/scenarios';

vi.mock('../../services/system/Logger', () => ({
  Logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../stores/admin/configStore', () => ({
  useAdminConfigStore: {
    getState: vi.fn(() => ({
      config: { spawn: { baseInterval: 1_000, maxEnemies: 100, waveIntensity: 0.5 } },
    })),
  },
}));

type SpawnIntent = {
  type: string;
  x: number;
  y: number;
  difficulty: number;
  side: MarketPosition;
  isElite: boolean;
};

type SpawnGoldenPayload = {
  outputHash: string;
  scenarios: Record<string, readonly SpawnIntent[]>;
};

const FIXTURE_PATH = 'tests/golden/fixtures/spawn-system.v1.json';
const randomValues = [0.1, 0.3, 0.7, 0.9];
let randomIndex = 0;

const round = (value: number): number => Number(value.toFixed(8));

const runSpawnScenario = (scenario: MarketScenario): readonly SpawnIntent[] => {
  const intents: SpawnIntent[] = [];
  const pool = {
    activeEnemies: [],
    getEnemy: vi.fn(
      (
        x: number,
        y: number,
        difficulty: number,
        side: MarketPosition,
        type?: string
      ) => {
        intents.push({
          type: type ?? 'bear',
          x: round(x),
          y: round(y),
          difficulty,
          side,
          isElite: false,
        });
        return { id: `enemy-${intents.length}`, type: type ?? 'bear', x, y };
      }
    ),
    getWhaleEnemy: vi.fn(),
  } as unknown as IPoolManager;
  const spawnSystem = SpawnSystem.getInstance();

  for (const frame of scenario.frames) {
    if (frame.connection === 'stale') continue;
    spawnSystem.updateLegacy(
      1_000,
      1.25,
      800,
      600,
      MarketPosition.LONG,
      pool,
      frame.rawPnl,
      undefined,
      1,
      'BTC',
      1,
      1,
      { rsi: 50, rsiState: 'NEUTRAL', whaleTier: 0 }
    );
  }

  return intents;
};

const runAllScenarios = (): Record<string, readonly SpawnIntent[]> => {
  const results: Record<string, readonly SpawnIntent[]> = {};
  for (const scenario of MARKET_SCENARIOS) {
    SpawnSystem.resetInstance();
    randomIndex = 0;
    results[scenario.name] = runSpawnScenario(scenario);
  }
  return results;
};

describe('Golden — SpawnSystem observable intents', () => {
  beforeEach(() => {
    SpawnSystem.resetInstance();
    randomIndex = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = randomValues[randomIndex % randomValues.length]!;
      randomIndex += 1;
      return value;
    });
  });

  it('locks deterministic observable spawn intents for every market scenario', () => {
    const actual = runAllScenarios();
    expect(hashBaselinePayload(runAllScenarios())).toBe(hashBaselinePayload(actual));

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact(FIXTURE_PATH, {
        fixtureId: 'spawn-system.v1',
        producer: 'spawn-system',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: { outputHash: hashBaselinePayload(actual), scenarios: actual },
      });
    }

    const expected = readBaselineArtifact<SpawnGoldenPayload>(
      FIXTURE_PATH,
      'spawn-system'
    ).payload;
    expect(hashBaselinePayload(actual)).toBe(expected.outputHash);
    expect(collectGoldenMismatches(actual, expected.scenarios, 1e-8)).toEqual([]);
  });
});
