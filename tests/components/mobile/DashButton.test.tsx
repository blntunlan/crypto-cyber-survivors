import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '../../test-utils';
import { DashButton } from '../../../components/mobile/DashButton';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => ({
    isRetro: false,
    theme: {
      colors: {
        primary: '#22d3ee',
      },
    },
  }),
}));

describe('DashButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onDash on touch start and onDashRelease on touch end', () => {
    const onDash = vi.fn();
    const onDashRelease = vi.fn();
    const { getByText } = render(
      <DashButton onDash={onDash} onDashRelease={onDashRelease} />
    );

    const button = getByText('DASH').parentElement as HTMLElement;
    fireEvent.touchStart(button);
    expect(onDash).toHaveBeenCalledTimes(1);

    fireEvent.touchEnd(button);
    expect(onDashRelease).toHaveBeenCalledTimes(1);
  });

  it('shows cooldown overlay and clears after timer advances', () => {
    const { getByText, container } = render(
      <DashButton onDash={vi.fn()} cooldownMs={200} />
    );
    const button = getByText('DASH').parentElement as HTMLElement;

    fireEvent.touchStart(button);
    expect(container.querySelector('div[style*="height: 100%"]')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(
      container.querySelector('div[style*="height: 100%"]')
    ).not.toBeInTheDocument();
  });

  it('syncs cooldown from playerDash event', () => {
    const { container } = render(<DashButton onDash={vi.fn()} />);

    act(() => {
      EventBus.emit('playerDash', {
        duration: 300,
        cooldown: 1000,
        isDoubleDash: false,
      });
    });

    expect(container.querySelector('div[style*="height: 100%"]')).toBeInTheDocument();
  });
});
