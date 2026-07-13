import { describe, expect, it } from 'vitest';
import {
  RewardCalculator as ClientRewardCalculator,
  type RewardCalculationParams,
  type RewardCalculationResult,
} from '../../services/gameplay/RewardCalculator';
import { RewardCalculator as ServerRewardCalculator } from '../../railway-market-server/src/shared/RewardCalculator';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  hashBaselinePayload,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';

type RewardPreviewCase = {
  name: string;
  params: RewardCalculationParams;
};

type RewardPreviewGoldenPayload = {
  outputHash: string;
  results: readonly { name: string; preview: RewardCalculationResult }[];
};

const FIXTURE_PATH = 'tests/golden/fixtures/reward-preview.v1.json';

const cases: readonly RewardPreviewCase[] = [
  {
    name: 'cycle-complete',
    params: {
      survivalTimeSeconds: 120,
      kills: 50,
      level: 5,
      pnl: 0.1,
      maxStreak: 15,
      exitType: 'cycle_complete',
    },
  },
  {
    name: 'take-profit',
    params: {
      survivalTimeSeconds: 220,
      kills: 80,
      level: 7,
      pnl: 0.08,
      maxStreak: 30,
      exitType: 'portal',
      portalType: 'TAKE_PROFIT',
    },
  },
  {
    name: 'stop-loss',
    params: {
      survivalTimeSeconds: 180,
      kills: 40,
      level: 4,
      pnl: 0.05,
      maxStreak: 12,
      exitType: 'portal',
      portalType: 'STOP_LOSS',
    },
  },
  {
    name: 'flow-exit',
    params: {
      survivalTimeSeconds: 180,
      kills: 40,
      level: 4,
      pnl: 0.05,
      maxStreak: 12,
      exitType: 'portal',
      portalType: 'FLOW_EXIT',
    },
  },
  {
    name: 'forced-exit',
    params: {
      survivalTimeSeconds: 180,
      kills: 40,
      level: 4,
      pnl: 0.05,
      maxStreak: 12,
      exitType: 'portal',
      portalType: 'FORCED',
    },
  },
  {
    name: 'death',
    params: {
      survivalTimeSeconds: 120,
      kills: 25,
      level: 3,
      pnl: -0.2,
      maxStreak: 10,
      exitType: 'death',
    },
  },
  {
    name: 'afk-death',
    params: {
      survivalTimeSeconds: 120,
      kills: 25,
      level: 3,
      pnl: 0.2,
      maxStreak: 10,
      exitType: 'afk_death',
    },
  },
  {
    name: 'negative-input',
    params: {
      survivalTimeSeconds: -10,
      kills: -5,
      level: -1,
      pnl: Number.NaN,
      maxStreak: Number.NaN,
    },
  },
  {
    name: 'level-cap',
    params: {
      survivalTimeSeconds: 300,
      kills: 100,
      level: 10_000,
      pnl: 0.1,
      maxStreak: 40,
      exitType: 'cycle_complete',
    },
  },
  {
    name: 'positive-pnl',
    params: {
      survivalTimeSeconds: 240,
      kills: 90,
      level: 8,
      pnl: 0.35,
      maxStreak: 45,
      exitType: 'cycle_complete',
    },
  },
  {
    name: 'negative-pnl',
    params: {
      survivalTimeSeconds: 240,
      kills: 90,
      level: 8,
      pnl: -0.35,
      maxStreak: 45,
      exitType: 'cycle_complete',
    },
  },
  {
    name: 'streak-cap',
    params: {
      survivalTimeSeconds: 240,
      kills: 90,
      level: 8,
      pnl: 0.1,
      maxStreak: 10_000,
      exitType: 'cycle_complete',
    },
  },
];

const runRewardPreviewGolden = (): RewardPreviewGoldenPayload['results'] =>
  cases.map(testCase => {
    const preview = new ClientRewardCalculator().calculate(testCase.params);
    expect(new ServerRewardCalculator().calculate(testCase.params)).toEqual(preview);
    return { name: testCase.name, preview };
  });

describe('Golden — reward preview and Railway parity', () => {
  it('locks client reward previews and server parity for all exit cases', () => {
    const results = runRewardPreviewGolden();
    expect(hashBaselinePayload(runRewardPreviewGolden())).toBe(
      hashBaselinePayload(results)
    );

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact(FIXTURE_PATH, {
        fixtureId: 'reward-preview.v1',
        producer: 'reward-preview',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: { outputHash: hashBaselinePayload(results), results },
      });
    }

    const expected = readBaselineArtifact<RewardPreviewGoldenPayload>(
      FIXTURE_PATH,
      'reward-preview'
    ).payload;
    expect(hashBaselinePayload(results)).toBe(expected.outputHash);
    expect(results).toEqual(expected.results);
  });
});
