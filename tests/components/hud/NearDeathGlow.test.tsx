import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '../../test-utils';
import { NearDeathGlow } from '../../../components/hud/NearDeathGlow';
import { EventBus } from '../../../services/core/EventBus';
import { screenService } from '../../../services/system/ScreenService';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
  },
}));

describe('NearDeathGlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates opacity based on hp thresholds', () => {
    render(<NearDeathGlow maxHp={100} />);
    const glow = document.getElementById('near-death-glow');
    expect(glow).toBeInTheDocument();
    expect(glow).toHaveStyle('opacity: 0');

    act(() => {
      EventBus.emit('hudValuesUpdated', { hp: 30 });
    });
    expect(parseFloat(glow?.style.opacity ?? '0')).toBeCloseTo(0.25, 3);

    act(() => {
      EventBus.emit('hudValuesUpdated', { hp: 10 });
    });
    expect(parseFloat(glow?.style.opacity ?? '0')).toBeCloseTo(0.75, 3);
  });

  it('resets opacity on gameReset', () => {
    render(<NearDeathGlow maxHp={100} />);
    const glow = document.getElementById('near-death-glow');

    act(() => {
      EventBus.emit('hudValuesUpdated', { hp: 5 });
    });
    expect(parseFloat(glow?.style.opacity ?? '0')).toBeCloseTo(0.875, 3);

    act(() => {
      EventBus.emit('gameReset', {});
    });
    expect(glow?.style.opacity).toBe('0');
  });

  it('renders mobile glow style on mobile', () => {
    // @ts-expect-error testing mock
    screenService.isMobile.mockReturnValue(true);
    const { container } = render(<NearDeathGlow maxHp={100} />);
    expect(
      container.querySelector(
        '.shadow-\\[inset_0_0_80px_rgba\\(239\\,68\\,68\\,1\\.0\\)\\]'
      )
    ).toBeInTheDocument();
  });
});
