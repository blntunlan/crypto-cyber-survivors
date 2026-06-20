import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LeaderboardPanel from '../../../components/hud/LeaderboardPanel';
import { LeaderboardService } from '../../../services/leaderboard/LeaderboardService';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const motionMock = {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: any) => <div {...props}>{children}</div>,
  };
  return {
    motion: motionMock,
    m: motionMock,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

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
  AtSign: () => <div data-testid="icon-at-sign" />,
  Search: () => <div data-testid="icon-search" />,
  Disc: () => <div data-testid="icon-disc" />,
  Code2: () => <div data-testid="icon-code2" />,
  Apple: () => <div data-testid="icon-apple" />,
  Mail: () => <div data-testid="icon-mail" />,
  Tv: () => <div data-testid="icon-tv" />,
  User: () => <div data-testid="icon-user" />,
}));

// Mock Railway Client
const mockRailwayGet = vi.fn();

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: (...args: any[]) => mockRailwayGet(...args),
  },
  isRailwayApiConfigured: vi.fn(() => true),
}));

// Mock UserSessionService
vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn().mockReturnValue('1'),
    getNickname: vi.fn().mockReturnValue('Player1'),
  },
}));

// Mock Theme
const mockUseTheme = vi.fn().mockReturnValue({ isRetro: false });
vi.mock('../../../contexts/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock Language
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'hud.anonymous' ? 'Anonymous' : key),
  }),
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('LeaderboardPanel', () => {
  const formatScore = (score: number) => score.toLocaleString();

  const mockEntries = [
    {
      profile_id: '1',
      display_name: 'Player1',
      high_score: 10000,
      max_survival_time: 300,
      total_sessions: 10,
    },
    {
      profile_id: '2',
      display_name: 'Player2',
      high_score: 5000,
      max_survival_time: 150,
      total_sessions: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    LeaderboardService.invalidateCache();
    mockRailwayGet.mockResolvedValue({ entries: mockEntries });
    mockUseTheme.mockReturnValue({ isRetro: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render leaderboard entries after fetching', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    // Header should be visible
    expect(screen.getByText('hud.leaderboard_title')).toBeInTheDocument();

    // Entries should appear
    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
    });

    expect(screen.getByText(formatScore(10000))).toBeInTheDocument();
    expect(screen.getByText(formatScore(5000))).toBeInTheDocument();

    // Check for "You" badge for Player1 (mocked as current user)
    const youBadge = screen.getByText('hud.you');
    expect(youBadge).toBeInTheDocument();
  });

  it('should toggle collapse when header is clicked', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
    });

    // Click header to collapse
    const header = screen.getByText('hud.leaderboard_title').parentElement
      ?.parentElement;
    if (!header) throw new Error('Header not found');

    fireEvent.click(header);

    // Entries should be hidden
    expect(screen.queryByText('Player1')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(header);
    expect(await screen.findByText('Player1')).toBeInTheDocument();
  });

  it('should refresh when refresh button is clicked', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(mockRailwayGet).toHaveBeenCalled();
    });

    const refreshButton = screen.getByTitle('hud.refresh_pool');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRailwayGet).toHaveBeenCalledTimes(2);
    });
  });

  it('should show mock data when API returns empty list', async () => {
    mockRailwayGet.mockResolvedValueOnce({ entries: [] });

    render(<LeaderboardPanel isVisible={true} />);

    // Mock entries should appear instead of "no scores"
    await waitFor(() => {
      expect(screen.getByText('SatoshiSlayer')).toBeInTheDocument();
    });
  });

  it('should format survival time correctly', async () => {
    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      // max_survival_time is in seconds (300s = 5:00, 150s = 2:30)
      // Component converts to ms (* 1000) then formats
      expect(screen.getByText('5:00')).toBeInTheDocument();
      expect(screen.getByText('2:30')).toBeInTheDocument();
    });
  });

  it('should not render when isVisible is false', () => {
    const { container } = render(<LeaderboardPanel isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render in retro mode', async () => {
    mockUseTheme.mockReturnValue({ isRetro: true });

    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
    });

    expect(screen.getByText(formatScore(10000))).toBeInTheDocument();
  });

  it('should handle anonymous players correctly', async () => {
    const anonymousEntries = [
      {
        profile_id: 'anon-1',
        display_name: null,
        high_score: 100,
        max_survival_time: 10,
      },
    ];
    mockRailwayGet.mockResolvedValueOnce({ entries: anonymousEntries });

    render(<LeaderboardPanel isVisible={true} />);

    await waitFor(() => {
      // Should show "Anonymous" for null names
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });
  });
});
