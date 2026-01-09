import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('../../services/AudioService', () => ({
  audio: {
    playLevelUp: vi.fn(),
    playButton: vi.fn(),
  },
}));

// Mock CoinService
vi.mock('../../services/CoinService', () => ({
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
    coinsEarned: 1000,
    continueMultiplier: 1.5,
  };

  const mockOnCashOut = vi.fn();
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });
  });

  it('renders correctly in Cyberpunk (Modern) mode', () => {
    (useTheme as any).mockReturnValue({
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen data={mockData} onCashOut={mockOnCashOut} onContinue={mockOnContinue} />
    );

    expect(screen.getByText(/CYCLE 1 COMPLETE/i)).toBeInTheDocument();
    // Time formatted as 5:00
    expect(screen.getByText('5:00')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Kills
    expect(screen.getByText('+5.0%')).toBeInTheDocument(); // PnL
  });

  it('renders correctly in Retro mode', () => {
    (useTheme as any).mockReturnValue({
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: true,
    });

    render(
      <CycleCompleteScreen data={mockData} onCashOut={mockOnCashOut} onContinue={mockOnContinue} />
    );

    expect(screen.getByText(/CYCLE 1 COMPLETE/i)).toBeInTheDocument();
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('handles "Cash Out" click', () => {
    render(
      <CycleCompleteScreen data={mockData} onCashOut={mockOnCashOut} onContinue={mockOnContinue} />
    );

    const cashOutBtn = screen.getByText('Cash Out');
    fireEvent.click(cashOutBtn);
    expect(mockOnCashOut).toHaveBeenCalled();
  });

  it('handles "Continue" click', () => {
    render(
      <CycleCompleteScreen data={mockData} onCashOut={mockOnCashOut} onContinue={mockOnContinue} />
    );

    const continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);
    expect(mockOnContinue).toHaveBeenCalled();
  });

  // TODO: Fix mock setup for icons. These fail because CardIcons mock isn't rendering as expected in test env.
  it('displays correct icon for positive PnL', () => {
    (useTheme as any).mockReturnValue({
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen
        data={{ ...mockData, effectivePnl: 0.1 }}
        onCashOut={mockOnCashOut}
        onContinue={mockOnContinue}
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
      theme: { colors: { primary: '#0f0', surface: '#000', text: '#fff' } },
      isRetro: false,
    });

    render(
      <CycleCompleteScreen
        data={{ ...mockData, effectivePnl: -0.1 }}
        onCashOut={mockOnCashOut}
        onContinue={mockOnContinue}
      />
    );
    const icons = screen.getAllByTestId('icon-trend-down');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]).toBeInTheDocument();
  });
});
