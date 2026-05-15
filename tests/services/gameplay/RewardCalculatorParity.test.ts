import { describe, expect, it } from 'vitest';
import {
  RewardCalculator as ClientRewardCalculator,
  type RewardCalculationParams,
} from '../../../services/gameplay/RewardCalculator';
import { RewardCalculator as ServerRewardCalculator } from '../../../railway-market-server/src/shared/RewardCalculator';

const cases: Array<RewardCalculationParams | Record<string, unknown>> = [
  {
    survivalTimeSeconds: 120,
    kills: 50,
    level: 5,
    pnl: 0.1,
    maxStreak: 15,
    exitType: 'cycle_complete',
  },
  {
    survivalTimeSeconds: 220,
    kills: 80,
    level: 7,
    pnl: 0.08,
    maxStreak: 30,
    exitType: 'portal',
    portalType: 'TAKE_PROFIT',
  },
  {
    survivalTimeSeconds: 180,
    kills: 40,
    level: 4,
    pnl: 0.05,
    maxStreak: 12,
    exitType: 'portal',
    portalType: 'STOP_LOSS',
  },
  {
    survivalTimeSeconds: 180,
    kills: 40,
    level: 4,
    pnl: 0.05,
    maxStreak: 12,
    exitType: 'portal',
    portalType: 'FLOW_EXIT',
  },
  {
    survivalTimeSeconds: 120,
    kills: 25,
    level: 3,
    pnl: -0.2,
    maxStreak: 10,
    exitType: 'death',
  },
  {
    survivalTimeSeconds: 120,
    kills: 25,
    level: 3,
    pnl: 0.2,
    maxStreak: 10,
    exitType: 'afk_death',
  },
  {
    survivalTimeSeconds: -10,
    kills: -5,
    level: -1,
    pnl: Number.NaN,
    maxStreak: Number.NaN,
  },
  {
    survivalTimeSeconds: 300,
    kills: 100,
    level: 10_000,
    pnl: 0.1,
    maxStreak: 40,
    exitType: 'cycle_complete',
  },
];

describe('RewardCalculator parity', () => {
  it.each(cases)('matches Railway shared calculator for %#', params => {
    const client = new ClientRewardCalculator().calculate(
      params as RewardCalculationParams
    );
    const server = new ServerRewardCalculator().calculate(
      params as RewardCalculationParams
    );

    expect(client).toEqual(server);
  });
});
