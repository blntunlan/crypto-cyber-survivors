import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
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
    await waitFor(() => expect(screen.getByText('24H +20.00%')).toBeInTheDocument());
  });

  it('labels a short history span as WINDOW instead of claiming 24H', async () => {
    const now = Date.now();
    mocks.getHistory.mockResolvedValue([
      { price: 100, volume: 1, timestamp: now - 50 * 60 * 1000 },
      { price: 120, volume: 1, timestamp: now },
    ]);

    render(<LandingPriceFeed />);

    await waitFor(() => expect(screen.getByText('WINDOW +20.00%')).toBeInTheDocument());
  });
});
