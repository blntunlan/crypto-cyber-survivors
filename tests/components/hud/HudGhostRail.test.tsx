import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import { HUD_WAR_ROOM } from '../../../config/HUDWarRoom';
import { HudEventRail, HudGhostRail } from '../../../components/hud/HudGhostRail';

describe('HudGhostRail', () => {
  it('renders semantic tone and alignment without an opaque surface class', () => {
    render(
      <HudGhostRail testId="market-rail" side="left" tone="gold">
        Market Intel
      </HudGhostRail>
    );

    const rail = screen.getByTestId('market-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'gold');
    expect(rail).toHaveAttribute('data-hud-side', 'left');
    expect(rail).not.toHaveClass('bg-black');
    expect(rail).not.toHaveClass('backdrop-blur');
  });

  it('exposes an event rail and compact HP token values', () => {
    render(<HudEventRail tone="danger">Enemies +15% rage</HudEventRail>);

    expect(screen.getByText('Enemies +15% rage')).toHaveAttribute(
      'data-hud-tone',
      'danger'
    );
    expect(HUD_WAR_ROOM.hp.maxWidth).toBe(222);
    expect(HUD_WAR_ROOM.hp.height).toBe(8);
    expect(HUD_WAR_ROOM.hp.criticalThreshold).toBe(35);
  });
});
