/**
 * @fileoverview Tests for PortalRewardCalculator
 * @description Verifies exact kills/level parameters are passed to RewardCalculator,
 * portal exit type bonuses, death penalties, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortalRewardCalculator } from '../../../services/gameplay/portal/PortalRewardCalculator';
// DEFAULT_REWARD_RATES available if needed for custom rate tests

// Mock TimeService to return a fixed game time
vi.mock('../../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => 120),
  },
}));

describe('PortalRewardCalculator', () => {
  let calculator: PortalRewardCalculator;

  beforeEach(() => {
    calculator = new PortalRewardCalculator();
  });

  describe('exact kills and level parameters', () => {
    it('passes exact kills count to RewardCalculator', () => {
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        0.05,
        0,
        0,
        0,
        47, // exact kills
        1
      );

      // killBonus in breakdown.raw should be kills * perKill
      // TAKE_PROFIT gives +20% portal bonus on (base + killBonus + marketBonus)
      // base = 120 * 2 = 240, killBonus = 47 * 5 = 235, marketBonus = floor(0.05 * 100 * 100) = 500
      // portalBonus = floor((240 + 235 + 500) * 0.2) = floor(975 * 0.2) = 195
      expect(result.breakdown.raw).toBe(235);
    });

    it('passes exact level to RewardCalculator', () => {
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        0,
        0,
        0,
        0,
        0,
        7 // exact level
      );

      // levelBonus = 7 * 50 = 350 (included in total but not in breakdown directly)
      // base = 240, killBonus = 0, marketBonus = 0
      // portalBonus = floor((240 + 0 + 0) * 0.2) = 48
      // total = 240 + 0 + 350 + 0 + 0 + 48 = 638
      expect(result.total).toBe(638);
    });

    it('uses default kills=0 and level=1 when not provided', () => {
      const result = calculator.calculate('portal', 'TAKE_PROFIT', 0, 0, 0, 0);

      // base = 240, killBonus = 0, levelBonus = 1*50 = 50, marketBonus = 0
      // portalBonus = floor(240 * 0.2) = 48
      // total = 240 + 0 + 50 + 0 + 0 + 48 = 338
      expect(result.breakdown.raw).toBe(0);
      expect(result.total).toBe(338);
    });
  });

  describe('portal exit types', () => {
    const kills = 20;
    const level = 5;
    const pnl = 0.03;
    const maxStreak = 15;

    it('TAKE_PROFIT gives 20% bonus on base + killBonus + marketBonus', () => {
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      // base = 240, killBonus = 100, marketBonus = floor(0.03*100*100) = 300
      // streakBonus = min(floor(15/10)*25, 250) = 25
      // levelBonus = 5*50 = 250
      // portalBonus = floor((240+100+300)*0.2) = floor(128) = 128
      expect(result.breakdown.portalBonus).toBe(128);
      expect(result.breakdown.portalBonus).toBeGreaterThan(0);
      expect(result.total).toBe(240 + 100 + 250 + 300 + 25 + 128);
    });

    it('STOP_LOSS gives 0 portal bonus and zeroes base and market', () => {
      const result = calculator.calculate(
        'portal',
        'STOP_LOSS',
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      // base = 0 (zeroed), killBonus = 100, marketBonus = 0 (zeroed)
      // streakBonus = 25, levelBonus = 250, portalBonus = 0
      expect(result.breakdown.portalBonus).toBe(0);
      expect(result.breakdown.survivalBonus).toBe(0);
      expect(result.total).toBe(0 + 100 + 250 + 0 + 25 + 0);
    });

    it('FLOW_EXIT gives partial bonus (50% survival)', () => {
      const result = calculator.calculate(
        'portal',
        'FLOW_EXIT',
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      // base = floor(240 * 0.5) = 120, killBonus = 100, marketBonus = 300
      // streakBonus = 25, levelBonus = 250, portalBonus = 0 (FLOW_EXIT has no portal bonus)
      expect(result.breakdown.survivalBonus).toBe(120);
      expect(result.breakdown.portalBonus).toBe(0);
      expect(result.total).toBe(120 + 100 + 250 + 300 + 25 + 0);
    });

    it('FORCED gives 50% survival bonus like FLOW_EXIT', () => {
      const result = calculator.calculate(
        'portal',
        'FORCED',
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      expect(result.breakdown.survivalBonus).toBe(120);
      expect(result.breakdown.portalBonus).toBe(0);
    });
  });

  describe('death types', () => {
    const kills = 30;
    const level = 4;
    const pnl = 0.02;
    const maxStreak = 10;

    it('death applies 50% penalty on kills/level and zeroes base/market/streak', () => {
      const result = calculator.calculate(
        'death',
        null,
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      // base = 0, killBonus = floor(150*0.5) = 75, levelBonus = floor(200*0.5) = 100
      // marketBonus = 0, streakBonus = 0, portalBonus = 0
      expect(result.breakdown.survivalBonus).toBe(0);
      expect(result.breakdown.raw).toBe(75); // killBonus
      expect(result.breakdown.portalBonus).toBe(0);
      expect(result.breakdown.comboBonus).toBe(0);
      expect(result.total).toBe(75 + 100);
    });

    it('afk_death returns 0 total reward', () => {
      const result = calculator.calculate(
        'afk_death',
        null,
        pnl,
        0,
        0,
        maxStreak,
        kills,
        level
      );

      expect(result.total).toBe(0);
      expect(result.breakdown.raw).toBe(0);
      expect(result.breakdown.survivalBonus).toBe(0);
      expect(result.breakdown.portalBonus).toBe(0);
      expect(result.breakdown.comboBonus).toBe(0);
      expect(result.breakdown.enemyDrops).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('0 kills gives 0 kill bonus', () => {
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        0,
        0,
        0,
        0,
        0, // 0 kills
        5
      );

      expect(result.breakdown.raw).toBe(0);
      // base = 240, levelBonus = 250, portalBonus = floor(240*0.2) = 48
      expect(result.total).toBe(240 + 0 + 250 + 0 + 0 + 48);
    });

    it('very high kill count scales linearly', () => {
      const highKills = 10000;
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        0,
        0,
        0,
        0,
        highKills,
        1
      );

      // killBonus = 10000 * 5 = 50000
      // base = 240, levelBonus = 50
      // portalBonus = floor((240 + 50000 + 0) * 0.2) = floor(50240 * 0.2) = 10048
      expect(result.breakdown.raw).toBe(50000);
      expect(result.total).toBe(240 + 50000 + 50 + 0 + 0 + 10048);
    });

    it('level 1 gives minimal level bonus', () => {
      const result = calculator.calculate('portal', 'TAKE_PROFIT', 0, 0, 0, 0, 10, 1);

      // levelBonus = 1 * 50 = 50
      // base = 240, killBonus = 50, portalBonus = floor((240+50)*0.2) = 58
      expect(result.total).toBe(240 + 50 + 50 + 0 + 0 + 58);
    });

    it('high level gives proportionally higher level bonus', () => {
      const result = calculator.calculate('portal', 'TAKE_PROFIT', 0, 0, 0, 0, 10, 50);

      // levelBonus = 50 * 50 = 2500
      // base = 240, killBonus = 50, portalBonus = floor((240+50)*0.2) = 58
      expect(result.total).toBe(240 + 50 + 2500 + 0 + 0 + 58);
    });
  });

  describe('result structure', () => {
    it('returns correct exitType and portalType', () => {
      const result = calculator.calculate('portal', 'TAKE_PROFIT', 0, 0, 0, 0, 10, 5);

      expect(result.exitType).toBe('portal');
      expect(result.portalType).toBe('TAKE_PROFIT');
    });

    it('returns null portalType for death', () => {
      const result = calculator.calculate('death', null, 0, 0, 0, 0, 10, 5);

      expect(result.exitType).toBe('death');
      expect(result.portalType).toBeNull();
    });

    it('always sets enemyDrops to 0', () => {
      const result = calculator.calculate(
        'portal',
        'TAKE_PROFIT',
        0,
        999,
        999,
        0,
        10,
        5
      );

      expect(result.breakdown.enemyDrops).toBe(0);
    });
  });
});
