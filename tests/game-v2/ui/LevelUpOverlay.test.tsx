import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { STARTER_WEAPON_DAMAGE_TIER_2 } from '@/game-v2/config/Mvp0Config';
import {
  PASSIVE_MAX_LEVEL,
  PASSIVE_MOVE_SPEED_BY_LEVEL,
} from '@/game-v2/contracts/PassiveSlot';
import { LevelUpOverlay, type LevelUpOverlayProps } from '@/game-v2/ui/LevelUpOverlay';

const props = (overrides: Partial<LevelUpOverlayProps> = {}): LevelUpOverlayProps => ({
  damageBefore: 10,
  moveSpeedBefore: PASSIVE_MOVE_SPEED_BY_LEVEL[0] as number,
  moveSpeedLevel: 0,
  moveSpeedUpgradable: true,
  onChoose: vi.fn(),
  ...overrides,
});

describe('LevelUpOverlay', () => {
  it('renders primary choice button and fires onChoose on click', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay {...props({ onChoose })} />);

    fireEvent.click(screen.getByRole('button', { name: /increase damage/i }));
    expect(onChoose).toHaveBeenCalledWith('starter-damage-2');
  });

  it('renders a native BUTTON element and remains in tab order', () => {
    render(<LevelUpOverlay {...props()} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });

  it('displays damageBefore and the configured STARTER_WEAPON_DAMAGE_TIER_2', () => {
    render(<LevelUpOverlay {...props()} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    expect(button.textContent).toContain('10');
    expect(button.textContent).toContain(String(STARTER_WEAPON_DAMAGE_TIER_2));
  });

  it('offers the weapon tier and the passive as the two fixed choices', () => {
    render(<LevelUpOverlay {...props()} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('fires the passive choice and shows the next authored speed', () => {
    const onChoose = vi.fn();
    render(
      <LevelUpOverlay {...props({ moveSpeedLevel: 2, moveSpeedBefore: 7, onChoose })} />
    );

    const button = screen.getByRole('button', { name: /increase move speed/i });
    expect(button.textContent).toContain('7');
    expect(button.textContent).toContain(String(PASSIVE_MOVE_SPEED_BY_LEVEL[3]));

    fireEvent.click(button);
    expect(onChoose).toHaveBeenCalledWith('passive-move-speed');
  });

  it('hides the passive choice when it can no longer be taken', () => {
    render(
      <LevelUpOverlay
        {...props({
          moveSpeedLevel: PASSIVE_MAX_LEVEL,
          moveSpeedBefore: PASSIVE_MOVE_SPEED_BY_LEVEL[PASSIVE_MAX_LEVEL] as number,
          moveSpeedUpgradable: false,
        })}
      />
    );

    expect(screen.queryByRole('button', { name: /increase move speed/i })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('hides the passive choice when the loadout has no room for it', () => {
    render(
      <LevelUpOverlay {...props({ moveSpeedLevel: 0, moveSpeedUpgradable: false })} />
    );

    expect(screen.queryByRole('button', { name: /increase move speed/i })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('exposes a modal dialog named by its visible level-up title', () => {
    render(<LevelUpOverlay {...props()} />);

    expect(screen.getByRole('dialog', { name: /level up/i })).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('calls onChoose exactly once per click', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay {...props({ onChoose })} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(onChoose).toHaveBeenNthCalledWith(1, 'starter-damage-2');
    expect(onChoose).toHaveBeenNthCalledWith(2, 'starter-damage-2');
  });
});
