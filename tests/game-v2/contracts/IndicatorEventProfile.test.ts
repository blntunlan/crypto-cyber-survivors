import { describe, expect, it } from 'vitest';

import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

const VALID_BELOW: Record<string, unknown> = {
  id: 'test-oversold',
  direction: 'below',
  entryThreshold: 25,
  exitThreshold: 25,
  confirmationTicks: 3,
  cooldownTicks: 5,
  hysteresis: 5,
  priority: 1,
  outputKind: 'spawn',
  compatibleWith: ['test-other'],
};

const VALID_ABOVE: Record<string, unknown> = {
  ...VALID_BELOW,
  id: 'test-overbought',
  direction: 'above',
  entryThreshold: 75,
  exitThreshold: 75,
};

describe('assertIndicatorEventProfile', () => {
  it('validates and freezes a well-formed below-direction profile', () => {
    const profile = assertIndicatorEventProfile(VALID_BELOW);

    expect(profile).toEqual(VALID_BELOW);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.compatibleWith)).toBe(true);
  });

  it('validates a well-formed above-direction profile', () => {
    const profile = assertIndicatorEventProfile(VALID_ABOVE);
    expect(profile.direction).toBe('above');
  });

  it('accepts an exitThreshold strictly beyond entryThreshold (a wider active window)', () => {
    expect(() =>
      assertIndicatorEventProfile({
        ...VALID_BELOW,
        entryThreshold: 25,
        exitThreshold: 35,
      })
    ).not.toThrow();
    expect(() =>
      assertIndicatorEventProfile({
        ...VALID_ABOVE,
        entryThreshold: 75,
        exitThreshold: 65,
      })
    ).not.toThrow();
  });

  it.each([
    ['non-object input', 'not an object'],
    ['null input', null],
    ['empty id', { ...VALID_BELOW, id: '' }],
    ['invalid direction', { ...VALID_BELOW, direction: 'sideways' }],
    ['non-finite entryThreshold', { ...VALID_BELOW, entryThreshold: Number.NaN }],
    ['non-finite exitThreshold', { ...VALID_BELOW, exitThreshold: Number.NaN }],
    [
      'exitThreshold on the wrong side for below',
      { ...VALID_BELOW, entryThreshold: 25, exitThreshold: 20 },
    ],
    [
      'exitThreshold on the wrong side for above',
      { ...VALID_ABOVE, entryThreshold: 75, exitThreshold: 80 },
    ],
    ['non-integer confirmationTicks', { ...VALID_BELOW, confirmationTicks: 1.5 }],
    ['negative confirmationTicks', { ...VALID_BELOW, confirmationTicks: -1 }],
    ['non-integer cooldownTicks', { ...VALID_BELOW, cooldownTicks: 1.5 }],
    ['negative cooldownTicks', { ...VALID_BELOW, cooldownTicks: -1 }],
    ['negative hysteresis', { ...VALID_BELOW, hysteresis: -1 }],
    ['non-finite hysteresis', { ...VALID_BELOW, hysteresis: Number.NaN }],
    ['non-finite priority', { ...VALID_BELOW, priority: Number.NaN }],
    ['empty outputKind', { ...VALID_BELOW, outputKind: '' }],
    ['non-array compatibleWith', { ...VALID_BELOW, compatibleWith: 'not-an-array' }],
    ['compatibleWith with a non-string entry', { ...VALID_BELOW, compatibleWith: [1] }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() => assertIndicatorEventProfile(override)).toThrow();
  });

  it('does not let caller mutation of the input array leak into the frozen output', () => {
    const compatibleWith = ['a', 'b'];
    const profile = assertIndicatorEventProfile({ ...VALID_BELOW, compatibleWith });

    compatibleWith.push('c');

    expect(profile.compatibleWith).toEqual(['a', 'b']);
  });
});
