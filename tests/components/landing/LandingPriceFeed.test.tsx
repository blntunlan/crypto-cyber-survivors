import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { LandingPriceFeed } from '../../../components/screens/landing/LandingPriceFeed';

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('../../../services/api/MarketApiClient', () => ({
  marketApiClient: {
    getHistory: mocks.getHistory,
  },
}));

vi.mock('../../../services/market/SSEMarketService', () => ({
  SSEMarketService: class {
    connect = mocks.connect;
    disconnect = mocks.disconnect;
  },
}));

describe('LandingPriceFeed', () => {
  beforeEach(() => {
    mocks.getHistory.mockReset();
    mocks.connect.mockReset();
    mocks.disconnect.mockReset();
  });

  it('starts without fabricated prices and renders the real 24H history', async () => {
    const now = Date.now();
    mocks.getHistory.mockResolvedValue([
      { price: 100, volume: 1, timestamp: now - 24 * 60 * 60 * 1000 },
      { price: 120, volume: 1, timestamp: now },
    ]);

    render(<LandingPriceFeed />);

    expect(screen.getByTestId('landing-btc-price')).toHaveTextContent('SYNCING');
    // The window matters, not the row count: the server buckets `limit` points
    // across it, so requesting fewer rows must not shrink the span to minutes.
    await waitFor(() =>
      expect(mocks.getHistory).toHaveBeenCalledWith('BTC', expect.any(Number), 24)
    );
    await waitFor(() =>
      expect(screen.getByTestId('landing-window-change')).toHaveTextContent(
        '24H +20.00%'
      )
    );
  });

  it('labels a short history span as WINDOW instead of claiming 24H', async () => {
    const now = Date.now();
    mocks.getHistory.mockResolvedValue([
      { price: 100, volume: 1, timestamp: now - 50 * 60 * 1000 },
      { price: 120, volume: 1, timestamp: now },
    ]);

    render(<LandingPriceFeed />);

    await waitFor(() =>
      expect(screen.getByTestId('landing-window-change')).toHaveTextContent(
        'WINDOW +20.00%'
      )
    );
  });

  it('updates state on market shock simulations', async () => {
    const now = Date.now();
    mocks.getHistory.mockResolvedValue([
      { price: 60000, volume: 100, timestamp: now - 24 * 60 * 60 * 1000 },
      { price: 65000, volume: 150, timestamp: now },
    ]);

    render(<LandingPriceFeed />);

    const pumpBtn = screen.getByText('▲ PUMP (+5%)');
    fireEvent.click(pumpBtn);

    await waitFor(() =>
      expect(screen.getByTestId('landing-feed-status')).toHaveTextContent('SIM: PUMP')
    );
    expect(screen.getByTestId('landing-btc-price')).not.toHaveTextContent('SYNCING');
  });

  it('anchors daily change to UTC 00:00 open when crossing the daily boundary', async () => {
    const d = new Date();
    const nowUtc = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      14,
      0,
      0,
      0
    );
    const utc0 = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      0,
      0,
      0,
      0
    );
    const yesterday = nowUtc - 24 * 60 * 60 * 1000;

    mocks.getHistory.mockResolvedValue([
      { price: 50000, volume: 10, timestamp: yesterday },
      { price: 60000, volume: 20, timestamp: utc0 },
      { price: 66000, volume: 30, timestamp: nowUtc },
    ]);

    render(<LandingPriceFeed />);

    await waitFor(() => expect(screen.getByText('UTC 0 OPEN')).toBeInTheDocument());
    expect(screen.getByText('$60,000.00')).toBeInTheDocument();
    expect(screen.getByTestId('landing-window-change')).toHaveTextContent(
      '24H +10.00%'
    );
  });
});
