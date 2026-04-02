import { describe, it, expect } from 'vitest';
import { validateReward } from '../../../services/validators/rewardValidator';
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
  exitType: 'cycle_complete',
  ...overrides,
});

describe('validateReward', () => {
  it('returns no findings when totalCoins is undefined', () => {
    const findings = validateReward(makeInput({ totalCoins: undefined }));
    expect(findings).toHaveLength(0);
  });

  it('returns no findings when totalCoins is 0', () => {
    const findings = validateReward(makeInput({ totalCoins: 0 }));
    expect(findings).toHaveLength(0);
  });

  it('passes when totalCoins matches expected calculation', () => {
    // Calculate expected: survival=120*2=240, kills=50*5=250, level=5*50=250,
    // market=10*100=1000, streak=25 (15/10=1 milestone), total=1765
    const findings = validateReward(makeInput({ totalCoins: 1765 }));
    const reward = findings.filter(f => f.validator === 'reward');
    expect(reward).toHaveLength(0);
  });

  it('warns when totalCoins diverges by >10% from expected', () => {
    const findings = validateReward(makeInput({ totalCoins: 2200 }));
    const reward = findings.find(f => f.validator === 'reward');
    expect(reward?.severity).toBe('warn');
  });

  it('fails when totalCoins diverges by >50% from expected', () => {
    const findings = validateReward(makeInput({ totalCoins: 5000 }));
    const reward = findings.find(f => f.validator === 'reward');
    expect(reward?.severity).toBe('fail');
  });

  it('warns when breakdown sum does not match totalCoins', () => {
    const findings = validateReward(
      makeInput({
        totalCoins: 500,
        breakdown: { base: 100, kill: 100, level: 100 },
      })
    );
    const breakdown = findings.find(f => f.validator === 'reward_breakdown');
    expect(breakdown?.severity).toBe('warn');
  });

  it('passes when breakdown sum matches totalCoins', () => {
    const findings = validateReward(
      makeInput({
        totalCoins: 300,
        breakdown: { base: 100, kill: 100, level: 100 },
      })
    );
    const breakdown = findings.filter(f => f.validator === 'reward_breakdown');
    expect(breakdown).toHaveLength(0);
  });
});
