import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { STARTER_WEAPON_DAMAGE_TIER_2 } from '@/game-v2/config/Mvp0Config';
import { LevelUpOverlay } from '@/game-v2/ui/LevelUpOverlay';

describe('LevelUpOverlay', () => {
  it('renders primary choice button and fires onChoose on click', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);

    fireEvent.click(screen.getByRole('button', { name: /increase damage/i }));
    expect(onChoose).toHaveBeenCalledWith('starter-damage-2');
  });

  it('renders a native BUTTON element and remains in tab order', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });

  it('displays damageBefore and the configured STARTER_WEAPON_DAMAGE_TIER_2', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    expect(button.textContent).toContain('10');
    expect(button.textContent).toContain(String(STARTER_WEAPON_DAMAGE_TIER_2));
  });

  it('offers exactly one upgrade choice in MVP-0', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('exposes a modal dialog named by its visible level-up title', () => {
    render(<LevelUpOverlay damageBefore={10} onChoose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /level up/i })).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('calls onChoose exactly once per click', () => {
    const onChoose = vi.fn();
    render(<LevelUpOverlay damageBefore={10} onChoose={onChoose} />);

    const button = screen.getByRole('button', { name: /increase damage/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(onChoose).toHaveBeenNthCalledWith(1, 'starter-damage-2');
    expect(onChoose).toHaveBeenNthCalledWith(2, 'starter-damage-2');
  });
});
