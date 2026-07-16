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

  it('replaces the current ordinary announcement instead of queueing it', () => {
    render(<MarketAnnouncementBanner />);

    act(() => {
      announcementHandler?.({
        type: 'RSI_OVERSOLD',
        message: 'FIRST MARKET SIGNAL',
        color: '#67e8f9',
        icon: '◇',
        duration: 5000,
        priority: 5,
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('FIRST MARKET SIGNAL')).toBeInTheDocument();

    act(() => {
      announcementHandler?.({
        type: 'FAVORABLE_MARKET',
        message: 'LONG EDGE // BULL SIGNAL LOCKED',
        color: '#fbbf24',
        icon: '▲',
        duration: 1800,
        priority: 5,
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.queryByText('FIRST MARKET SIGNAL')).not.toBeInTheDocument();
    expect(screen.getByText('LONG EDGE')).toBeInTheDocument();
    expect(screen.getByText('BULL SIGNAL LOCKED')).toBeInTheDocument();
  });

  it('does not restore an ordinary announcement after liquidation interrupts it', () => {
    render(<MarketAnnouncementBanner />);

    act(() => {
      announcementHandler?.({
        type: 'FAVORABLE_MARKET',
        message: 'LONG EDGE // BULL SIGNAL LOCKED',
        color: '#fbbf24',
        icon: '▲',
        duration: 5000,
        priority: 5,
      });
      vi.advanceTimersByTime(0);
    });

    act(() => {
      announcementHandler?.({
        type: 'LIQUIDATION_WARNING',
        message: 'MARGIN BREACH',
        color: '#fb7185',
        icon: '⚠',
        duration: 1000,
        priority: 10,
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('MARGIN BREACH')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(screen.queryByText('MARGIN BREACH')).not.toBeInTheDocument();
    expect(screen.queryByText('LONG EDGE')).not.toBeInTheDocument();
  });

  it('dismisses the aligned signal after 1.8 seconds', () => {
    render(<MarketAnnouncementBanner />);

    act(() => {
      announcementHandler?.({
        type: 'FAVORABLE_MARKET',
        message: 'LONG EDGE // BULL SIGNAL LOCKED',
        color: '#fbbf24',
        icon: '▲',
        duration: 1800,
        priority: 5,
      });
      vi.advanceTimersByTime(0);
    });

    act(() => {
      vi.advanceTimersByTime(1799);
    });
    expect(screen.getByText('LONG EDGE')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('LONG EDGE')).not.toBeInTheDocument();
  });

  it('presents alignment copy as a compact accessible combat signal', () => {
    render(<MarketAnnouncementBanner />);

    act(() => {
      announcementHandler?.({
        type: 'FAVORABLE_MARKET',
        message: 'LONG EDGE // BULL SIGNAL LOCKED',
        color: '#fbbf24',
        icon: '▲',
        duration: 1800,
        priority: 5,
      });
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('LONG EDGE')).toHaveClass('market-announcement-label');
    expect(screen.getByText('BULL SIGNAL LOCKED')).toHaveClass(
      'market-announcement-detail'
    );
  });
});
