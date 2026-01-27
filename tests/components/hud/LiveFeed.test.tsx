import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LiveFeed } from '../../../components/hud/LiveFeed';
import { screenService } from '../../../services/ScreenService';
import { EventBus } from '../../../services/EventBus';

// Mocks
vi.mock('../../../services/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rfs: (val: number) => val,
    isSmallDevice: false,
  }),
}));

vi.mock('../../../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
  },
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// Mock LiveTicker to just render the formatted value immediately
vi.mock('../../../components/themed/LiveTicker', () => ({
  LiveTicker: ({ valueKey, formatter: _formatter }: any) => {
    // We can't easily access the "real" value since it usually comes from a store/ref in LiveTicker.
    // However, LiveInfoRow passes "valueKey" which isn't the value itself.
    // But wait, the parent passes props to LiveTicker.
    // Actually, LiveTicker usually pulls from a centralized store or ref.
    // In the test, we want to see the values passed to LiveFeed props rendered.
    // But LiveFeed passes `valueKey` to LiveTicker, not the direct value for dynamic fields like price/pnl.

    // Wait, let's look at the component again.
    // <LiveTicker valueKey="price" ... />
    // It seems LiveTicker is responsible for fetching the value.
    // If I mock LiveTicker, I won't see the values unless I make the mock display something static or inspect props.

    // For this test, I'll mock it to render a placeholder so I can verify structure.
    return <span data-testid={`ticker-${valueKey}`}>[TICKER]</span>;
  },
}));

describe('LiveFeed', () => {
  const mockMarketData = {
    pair: 'BTC',
    price: 50000,
    pnl: 0.05,
    effectivePnl: 0.5, // 50%
    leverage: 10,
    difficulty: 1.5,
    liquidationPrice: 45000,
  };

  const mockServerState = {
    pair: 'BTC',
    price: 50000,
    rsi: 50,
    whaleTier: 0,
    trend: 'neutral',
    volatility: 1.0,
    volume24h: 1000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (screenService.isMobile as any).mockReturnValue(false);
    (EventBus.on as any).mockReturnValue(vi.fn());
  });

  it('should render Desktop mode correctly', () => {
    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    expect(screen.getByText('hud.live_feed')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('10X')).toBeInTheDocument();

    // Static info rows
    expect(screen.getByText('hud.entry')).toBeInTheDocument();
    expect(screen.getByText('$48,000.00')).toBeInTheDocument();

    expect(screen.getByText('hud.liquidation')).toBeInTheDocument();
    expect(screen.getByText('$45,000.00')).toBeInTheDocument();

    // Tickers should be present
    expect(screen.getAllByTestId('ticker-price')).toHaveLength(1);
    expect(screen.getAllByTestId('ticker-pnl')).toHaveLength(2); // pct and usd
  });

  it('should render Mobile mode correctly', () => {
    (screenService.isMobile as any).mockReturnValue(true);
    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();

    // Compact indicators
    expect(screen.getByText(/hud.entry_short/)).toBeInTheDocument();
    expect(screen.getByText(/48,000/)).toBeInTheDocument();
  });

  it('should update server state via EventBus', () => {
    let updateCallback: (data: any) => void;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'marketStateUpdated') updateCallback = cb;
      return vi.fn();
    });

    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    // Initial state has no RSI
    expect(screen.queryByText(/RSI/)).not.toBeInTheDocument();

    // Trigger update
    act(() => {
      updateCallback(mockServerState);
    });

    expect(screen.getByText(/RSI/)).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
  });

  it('should show Whale Warning when whale tier > 0', () => {
    let updateCallback: (data: any) => void;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'marketStateUpdated') updateCallback = cb;
      return vi.fn();
    });

    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    act(() => {
      updateCallback({ ...mockServerState, whaleTier: 2 });
    });

    expect(screen.getByText(/hud.whale_detected/)).toBeInTheDocument();
    expect(screen.getByText(/(T2)/)).toBeInTheDocument();
  });

  it('should format RSI color correctly', () => {
    let updateCallback: (data: any) => void;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'marketStateUpdated') updateCallback = cb;
      return vi.fn();
    });

    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    // Neutral
    act(() => {
      updateCallback({ ...mockServerState, rsi: 50 });
    });
    expect(screen.getByText('50.0')).toHaveClass('text-slate-200');

    // Overbought
    act(() => {
      updateCallback({ ...mockServerState, rsi: 75 });
    });
    expect(screen.getByText('75.0')).toHaveClass('text-red-400');

    // Oversold
    act(() => {
      updateCallback({ ...mockServerState, rsi: 25 });
    });
    expect(screen.getByText('25.0')).toHaveClass('text-green-400');
  });

  it('should show DEGEN badge for high leverage', () => {
    const degenData = { ...mockMarketData, leverage: 100 };
    render(
      <LiveFeed marketData={degenData} entryPrice={48000} priceColor="text-green-500" />
    );

    expect(screen.getByText(/DEGEN/)).toBeInTheDocument();
    expect(screen.getByText(/100X/)).toBeInTheDocument();
  });

  it('should handle retro theme styling', async () => {
    const useTheme = await import('../../../contexts/useTheme');
    (useTheme.useIsRetro as any).mockReturnValue(true);

    render(
      <LiveFeed
        marketData={mockMarketData}
        entryPrice={48000}
        priceColor="text-green-500"
      />
    );

    const title = screen.getByText('hud.live_feed');
    expect(title).toHaveClass('font-retro-text');
  });

  it('should handle Liquidation Warning color', () => {
    // Create market data close to liquidation (effectivePnl <= -0.7)
    const dangerousData = { ...mockMarketData, effectivePnl: -0.8 };

    render(
      <LiveFeed
        marketData={dangerousData}
        entryPrice={48000}
        priceColor="text-red-500"
      />
    );

    // The liquidation row should have red text and bold font
    // We look for the value since the row component applies class to the value
    const liqValue = screen.getByText('$45,000.00');
    expect(liqValue).toHaveClass('text-red-500');
    expect(liqValue).toHaveClass('font-bold');
  });
});
