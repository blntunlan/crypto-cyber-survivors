import { act, render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketAnnouncementBanner } from '../../../components/hud/MarketAnnouncementBanner';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
  },
}));

describe('MarketAnnouncementBanner', () => {
  let announcementHandler: ((data: Record<string, unknown>) => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(EventBus.on).mockImplementation((event, callback) => {
      if (event === 'marketAnnouncement') {
        announcementHandler = callback as (data: Record<string, unknown>) => void;
      }
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders liquidation events as a danger rail without an opaque card', () => {
    render(<MarketAnnouncementBanner />);

    act(() => {
      announcementHandler?.({
        type: 'LIQUIDATION_WARNING',
        message: 'Margin pressure rising',
        color: '#FF7777',
        icon: '⚠',
        duration: 5000,
        priority: 10,
      });
      vi.advanceTimersByTime(0);
    });

    const rail = screen.getByTestId('hud-event-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'danger');
    expect(rail).toHaveTextContent('Margin pressure rising');
    expect(rail).not.toHaveClass('bg-black');
  });
});
