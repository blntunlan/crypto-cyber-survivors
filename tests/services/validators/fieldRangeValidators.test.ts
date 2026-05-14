import { describe, it, expect } from 'vitest';
import { validateFieldRanges } from '../../../services/validators/fieldRangeValidators';
import { type SessionValidationInput } from '../../../services/validators/types';

const makeInput = (
  overrides: Partial<SessionValidationInput> = {}
): SessionValidationInput => ({
  kills: 50,
  level: 5,
  survivalSeconds: 120,
  entryPrice: 50000,
  exitPrice: 50500,
  pnlPercent: 0.1,
  leverage: 10,
  maxStreak: 15,
  exitType: 'portal',
  ...overrides,
});

describe('validateFieldRanges', () => {
  describe('duration', () => {
    it('passes for normal duration', () => {
      const findings = validateFieldRanges(makeInput({ survivalSeconds: 120 }));
      const duration = findings.filter(f => f.validator === 'duration');
      expect(duration).toHaveLength(0);
    });

    it('fails for duration < 5s', () => {
      const findings = validateFieldRanges(makeInput({ survivalSeconds: 3 }));
      const duration = findings.find(f => f.validator === 'duration');
      expect(duration?.severity).toBe('fail');
    });

    it('fails for duration > 24h', () => {
      const findings = validateFieldRanges(makeInput({ survivalSeconds: 90000 }));
      const duration = findings.find(f => f.validator === 'duration');
      expect(duration?.severity).toBe('fail');
    });
  });

  describe('kills', () => {
    it('passes for plausible kill rate', () => {
      const findings = validateFieldRanges(
        makeInput({ kills: 50, survivalSeconds: 120 })
      );
      const kills = findings.filter(f => f.validator === 'kills');
      expect(kills).toHaveLength(0);
    });

    it('fails for negative kills', () => {
      const findings = validateFieldRanges(makeInput({ kills: -5 }));
      const kills = findings.find(f => f.validator === 'kills');
      expect(kills?.severity).toBe('fail');
    });

    it('warns for impossibly high kill rate', () => {
      // 1000 kills in 10s = 100 kills/s (max is 5/s)
      const findings = validateFieldRanges(
        makeInput({ kills: 1000, survivalSeconds: 10 })
      );
      const kills = findings.find(f => f.validator === 'kills');
      expect(kills?.severity).toBe('warn');
    });

    it('passes for 0 kills', () => {
      const findings = validateFieldRanges(makeInput({ kills: 0, level: 1 }));
      const kills = findings.filter(f => f.validator === 'kills');
      expect(kills).toHaveLength(0);
    });
  });

  describe('level', () => {
    it('passes for normal level/kills ratio', () => {
      const findings = validateFieldRanges(makeInput({ level: 5, kills: 50 }));
      const level = findings.filter(f => f.validator === 'level');
      expect(level).toHaveLength(0);
    });

    it('warns when level is too high for kill count', () => {
      // Level 20 with only 5 kills (need at least 38)
      const findings = validateFieldRanges(makeInput({ level: 20, kills: 5 }));
      const level = findings.find(f => f.validator === 'level');
      expect(level?.severity).toBe('warn');
    });
  });

  describe('pnl', () => {
    it('passes when PnL matches entry/exit/leverage', () => {
      // exit=50500, entry=50000 → 1% raw, 10x leverage → 10%
      const findings = validateFieldRanges(
        makeInput({
          entryPrice: 50000,
          exitPrice: 50500,
          pnlPercent: 0.1,
          leverage: 10,
        })
      );
      const pnl = findings.filter(f => f.validator === 'pnl');
      expect(pnl).toHaveLength(0);
    });

    it('passes when SHORT PnL matches entry/exit/leverage', () => {
      // short gains when price falls: entry=50000, exit=49500 → 1% raw, 10x → 10%
      const findings = validateFieldRanges(
        makeInput({
          position: 'SHORT',
          entryPrice: 50000,
          exitPrice: 49500,
          pnlPercent: 0.1,
          leverage: 10,
        })
      );
      const pnl = findings.filter(f => f.validator === 'pnl');
      expect(pnl).toHaveLength(0);
    });

    it('warns when PnL diverges from price calculation', () => {
      const findings = validateFieldRanges(
        makeInput({
          entryPrice: 50000,
          exitPrice: 50500,
          pnlPercent: 0.5,
          leverage: 10,
        })
      );
      const pnl = findings.find(f => f.validator === 'pnl');
      expect(pnl?.severity).toBe('warn');
    });
  });

  describe('streak', () => {
    it('passes for valid streak', () => {
      const findings = validateFieldRanges(makeInput({ maxStreak: 15, kills: 50 }));
      const streak = findings.filter(f => f.validator === 'streak');
      expect(streak).toHaveLength(0);
    });

    it('fails when streak exceeds total kills', () => {
      const findings = validateFieldRanges(makeInput({ maxStreak: 60, kills: 50 }));
      const streak = findings.find(f => f.validator === 'streak');
      expect(streak?.severity).toBe('fail');
    });
  });
});
