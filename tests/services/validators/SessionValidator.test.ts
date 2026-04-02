import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionValidator } from '../../../services/validators/SessionValidator';
import { type SessionValidationInput } from '../../../services/validators/types';

vi.mock('../../../services/system/Logger', () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

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

describe('SessionValidator', () => {
  beforeEach(() => {
    SessionValidator.reset();
  });

  it('returns pass for valid normal gameplay', () => {
    const result = SessionValidator.validate(makeInput());
    expect(result.severity).toBe('pass');
    expect(result.findings.filter(f => f.severity !== 'pass')).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns fail when session is too short', () => {
    const result = SessionValidator.validate(makeInput({ survivalSeconds: 2 }));
    expect(result.severity).toBe('fail');
    expect(
      result.findings.some(f => f.validator === 'duration' && f.severity === 'fail')
    ).toBe(true);
  });

  it('returns warn when kills are suspiciously high', () => {
    const result = SessionValidator.validate(
      makeInput({ kills: 800, survivalSeconds: 10 })
    );
    expect(result.severity).toBe('warn');
  });

  it('returns fail when streak exceeds kills', () => {
    const result = SessionValidator.validate(makeInput({ maxStreak: 100, kills: 50 }));
    expect(result.severity).toBe('fail');
  });

  it('aggregates worst severity across all validators', () => {
    // Short duration (fail) + high kills (warn) → overall fail
    const result = SessionValidator.validate(
      makeInput({
        survivalSeconds: 2,
        kills: 800,
      })
    );
    expect(result.severity).toBe('fail');
  });

  it('addValidator registers custom validator', () => {
    SessionValidator.addValidator(input => {
      if (input.level > 99) {
        return [{ validator: 'custom', severity: 'fail', reason: 'Level too high' }];
      }
      return [];
    });

    const result = SessionValidator.validate(makeInput({ level: 100, kills: 500 }));
    expect(result.findings.some(f => f.validator === 'custom')).toBe(true);
  });

  it('reset restores default validators', () => {
    SessionValidator.addValidator(() => [
      { validator: 'custom', severity: 'fail', reason: 'Always fail' },
    ]);

    let result = SessionValidator.validate(makeInput());
    expect(result.severity).toBe('fail');

    SessionValidator.reset();
    result = SessionValidator.validate(makeInput());
    expect(result.severity).toBe('pass');
  });

  it('includes durationMs in result', () => {
    const result = SessionValidator.validate(makeInput());
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
