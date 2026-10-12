import { describe, expect, it } from 'vitest';

import { type AbilitySlotReadout } from '@/game-v2/contracts/GameV2Debug';
import { formatAbilitySlotBinding } from '@/game-v2/ui/AbilitySlotLabel';

const slot = (index: number, activation: 'active' | 'auto'): AbilitySlotReadout =>
  ({
    index,
    activation,
    tier: 1,
  }) as AbilitySlotReadout;

describe('formatAbilitySlotBinding', () => {
  it('shows AUTO for an auto ability regardless of its slot index', () => {
    for (let index = 0; index < 4; index += 1) {
      expect(formatAbilitySlotBinding(slot(index, 'auto'))).toBe('AUTO');
    }
  });

  it('shows the 1-based slot position for an active ability', () => {
    expect(formatAbilitySlotBinding(slot(0, 'active'))).toBe('1');
    expect(formatAbilitySlotBinding(slot(1, 'active'))).toBe('2');
    expect(formatAbilitySlotBinding(slot(2, 'active'))).toBe('3');
    expect(formatAbilitySlotBinding(slot(3, 'active'))).toBe('4');
  });
});
