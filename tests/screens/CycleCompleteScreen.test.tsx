import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { CycleCompleteScreen } from '../../components/screens/CycleCompleteScreen';
import { useTheme } from '../../contexts/useTheme';

// Mock dependencies
vi.mock('../../contexts/useTheme', () => ({
  useTheme: vi.fn(),
  useIsRetro: vi.fn(),
}));

vi.mock('../../hooks/useThemeSize', () => ({
  useThemeSize: vi.fn().mockReturnValue({
    heading: 'text-2xl',
    gap: 'gap-4',
    title: 'text-4xl',
    small: 'text-sm',
    buttonLg: 'p-4',
  }),
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
    playSlotTick: vi.fn(),
  },
}));

// Mock CoinService
vi.mock('../../services/gameplay/CoinService', () => ({
  CoinService: {
    calculateCycleReward: vi.fn().mockReturnValue({
      total: 1000,
      breakdown: {
        Base: 500,
        'Survival Bonus': 500,
      },
      multipliers: [],
    }),
  },
}));

// Mock CardIcons using external mock file to avoid JSX issues in factory
vi.mock('../../components/icons/CardIcons', async () => {
  return import('../mocks/CardIconsMock');
});

describe('CycleCompleteScreen', () => {
  const mockData = {
    cycleNumber: 1,
    survivalTimeSeconds: 300,
    totalKills: 150,
    level: 10,
    effectivePnl: 0.05, // 5% profit
    pnl: 0.05,
  };

  const issuedAtSeconds = Math.floor(Date.now() / 1_000);
  const mockOffer = {
    cycle: mockData,
    quote: {
      quoteId: 'quote-1',
      sessionId: 'session-1',
      canonicalSequence: 42,
      rewardPoints: 120,
      issuedAtSeconds,
      expiresAtSeconds: issuedAtSeconds + 15,
    },
    signature: 'a'.repeat(64),
    safeExitOnly: false,
    greedLevel: 0,
  };
  const mockOnCashOut = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({
      themeName: 'cyberpunk',
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });
  });

  it('renders the signed reward, expiry, and reject action', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('120 META')).toBeInTheDocument();
    expect(screen.getByText(/1[45]s/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.cycle_complete_screen.continue'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('renders correctly in Cyberpunk (Modern) mode', () => {
    (useTheme as any).mockReturnValue({
      themeName: 'cyberpunk',
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('common.cycle_complete_screen.title')).toBeInTheDocument();
    // Time formatted as 5:00
    expect(screen.getByText('5:00')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Kills
    expect(screen.getByText('+5.0%')).toBeInTheDocument(); // PnL
  });

  it('renders correctly in Retro mode', () => {
    (useTheme as any).mockReturnValue({
      themeName: 'retro-16bit',
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: true,
    });

    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('common.cycle_complete_screen.title')).toBeInTheDocument();
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('handles "Cash Out" click', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    const cashOutBtn = screen.getByText('common.cycle_complete_screen.cash_out');
    fireEvent.click(cashOutBtn);
    expect(mockOnCashOut).toHaveBeenCalled();
  });

  it('handles reject click', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    const continueBtn = screen.getByText('common.cycle_complete_screen.continue');
    fireEvent.click(continueBtn);
    expect(mockOnReject).toHaveBeenCalled();
  });

  it('selects Cash Out via Enter key (default selection is Cash Out)', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnCashOut).toHaveBeenCalledTimes(1);
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('navigates to reject with ArrowRight and selects via Enter', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnCashOut).not.toHaveBeenCalled();
  });

  it('navigates to reject with ArrowDown', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('wraps from Cash Out to reject with ArrowLeft', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('supports WASD navigation (d to reject)', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'd' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('selects reject with Space key', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it('prevents double activation on repeated Enter', () => {
    render(
      <CycleCompleteScreen
        offer={mockOffer}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockOnCashOut).toHaveBeenCalledTimes(1);
  });

  // TODO: Fix mock setup for icons. These fail because CardIcons mock isn't rendering as expected in test env.
  it('displays correct icon for positive PnL', () => {
    (useTheme as any).mockReturnValue({
      themeName: 'cyberpunk',
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen
        offer={{ ...mockOffer, cycle: { ...mockData, effectivePnl: 0.1 } }}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );
    // StatBox renders icon twice (once as watermark, once as visible content)
    // So we expect at least one, or verify both present
    const icons = screen.getAllByTestId('icon-trend-up');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]).toBeInTheDocument();
  });

  it('displays correct icon for negative PnL', () => {
    (useTheme as any).mockReturnValue({
      themeName: 'cyberpunk',
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen
        offer={{ ...mockOffer, cycle: { ...mockData, effectivePnl: -0.1 } }}
        onCashOut={mockOnCashOut}
        onReject={mockOnReject}
      />
    );
    const icons = screen.getAllByTestId('icon-trend-down');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]).toBeInTheDocument();
  });
});
