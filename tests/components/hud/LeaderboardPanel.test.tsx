import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LeaderboardPanel from '../../../components/hud/LeaderboardPanel';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="icon-trophy" />,
  Crown: () => <div data-testid="icon-crown" />,
  Medal: () => <div data-testid="icon-medal" />,
  Clock: () => <div data-testid="icon-clock" />,
  TrendingUp: () => <div data-testid="icon-trending" />,
  ChevronUp: () => <div data-testid="icon-up" />,
  ChevronDown: () => <div data-testid="icon-down" />,
  RefreshCw: ({ className }: any) => (
    <div data-testid="icon-refresh" className={className} />
  ),
}));

// Mock Supabase
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase as any,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Mock UserSessionService
vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn().mockReturnValue('Player1'),
  },
}));

// Mock Logger
vi.mock('../../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LeaderboardPanel', () => {
  const mockEntries = [
    {
      id: '1',
      player_name: 'Player1',
      score: 10000,
      survival_time_ms: 300000,
      created_at: '2023-01-01',
    },
    {
      id: '2',
      player_name: 'Player2',
      score: 5000,
      survival_time_ms: 150000,
      created_at: '2023-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockSupabase.limit as any).mockResolvedValue({ data: mockEntries, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render leaderboard entries after fetching', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    // Header should be visible - text is "Data Leaderboard" in the component
    expect(screen.getByText('Data Leaderboard')).toBeInTheDocument();

    // Entries should appear
    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
    });

    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();

    // Check for "You" badge for Player1 (mocked as current user)
    const youBadge = screen.getByText('You');
    expect(youBadge).toBeInTheDocument();
  });

  it('should toggle collapse when header is clicked', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
    });

    // Click header to collapse - text is "Data Leaderboard" in the component
    const header = screen.getByText('Data Leaderboard').parentElement?.parentElement;
    if (!header) throw new Error('Header not found');

    fireEvent.click(header);

    // Entries should be hidden (check queryByText)
    expect(screen.queryByText('Player1')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(header);
    expect(await screen.findByText('Player1')).toBeInTheDocument();
  });

  it('should refresh when refresh button is clicked', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(mockSupabase.limit).toHaveBeenCalled();
    });

    const refreshButton = screen.getByTitle('Refresh Pool');
    fireEvent.click(refreshButton);

    expect(mockSupabase.limit).toHaveBeenCalledTimes(2);
  });

  it('should show "No scores yet" when list is empty', async () => {
    (mockSupabase.limit as any).mockResolvedValueOnce({ data: [], error: null });

    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(screen.getByText('No scores yet')).toBeInTheDocument();
    });
  });

  it('should format survival time correctly', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      // 300000ms = 5:00
      expect(screen.getByText('5:00')).toBeInTheDocument();
      // 150000ms = 2:30
      expect(screen.getByText('2:30')).toBeInTheDocument();
    });
  });

  it('should not render when isVisible is false', () => {
    const { container } = render(<LeaderboardPanel isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });
});
