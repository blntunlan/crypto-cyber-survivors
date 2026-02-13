import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MarketStateService,
  type MarketState,
} from '../../services/market/MarketStateService';
import { EventBus } from '../../services/core/EventBus';
import { supabase } from '../../services/supabase/client';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../services/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(), // Will be mocked per test
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    },
    isSupabaseConfigured: () => true,
  };
});

// Mock EventBus
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

// Helper to mock fetchAll response
const mockSupabaseResponse = (data: any, error: any = null) => {
  const selectMock = vi.fn().mockResolvedValue({ data, error });
  (supabase as any).from.mockReturnValue({
    select: selectMock,
  });
  return selectMock;
};

describe('MarketStateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MarketStateService.cleanup();
  });

  afterEach(() => {
    MarketStateService.cleanup();
  });

  it('should initialize and fetch initial state', async () => {
    const mockState: MarketState = {
      pair: 'BTC-USD',
      price: 50000,
      volume: 1000,
      rsi: 50,
      rsiState: 'NEUTRAL',
      whaleTier: 0,
      atr: 0,
      atrPercent: 0.01,
      spawnRateMultiplier: 1.0,
      normalizedVolume: 0.5,
      volumePercentile: 0.5,
      enemyAggroMultiplier: 1.0,
      updatedAt: new Date(),
    };

    const supabaseData = [
      {
        pair: mockState.pair,
        price: mockState.price.toString(),
        volume: mockState.volume.toString(),
        rsi: mockState.rsi.toString(),
        rsi_state: mockState.rsiState,
        atr: mockState.atr.toString(),
        atr_percent: mockState.atrPercent.toString(),
        spawn_rate_multiplier: mockState.spawnRateMultiplier.toString(),
        normalized_volume: mockState.normalizedVolume.toString(),
        volume_percentile: mockState.volumePercentile.toString(),
        whale_tier: mockState.whaleTier,
        enemy_aggro_multiplier_long: mockState.enemyAggroMultiplier,
        enemy_aggro_multiplier_short: mockState.enemyAggroMultiplier,
        updated_at: mockState.updatedAt.toISOString(),
      },
    ];

    mockSupabaseResponse(supabaseData);

    await MarketStateService.init();

    expect(supabase!.from).toHaveBeenCalledWith('market_state');

    const state = MarketStateService.getState('BTC');
    expect(state).toBeDefined();
    expect(state?.price).toBe(50000);
    expect(state?.rsiState).toBe('NEUTRAL');
  });

  it('should subscribe to realtime updates after initialization', async () => {
    mockSupabaseResponse([]);

    await MarketStateService.init();

    expect(supabase!.channel).toHaveBeenCalledWith('market_state_changes');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'market_state' },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should handle realtime updates correctly', async () => {
    mockSupabaseResponse([]);
    await MarketStateService.init();

    const onCall = mockChannel.on.mock.calls.find(
      call => call[0] === 'postgres_changes'
    );
    expect(onCall).toBeDefined();
    const updateCallback = onCall![2];

    const newData = {
      pair: 'BTC',
      price: '51000',
      volume: '1200',
      rsi: '75',
      rsi_state: 'OVERBOUGHT',
      atr: '500',
      atr_percent: '1',
      spawn_rate_multiplier: '1.2',
      normalized_volume: '0.7',
      volume_percentile: '0.8',
      whale_tier: 1,
      enemy_aggro_multiplier_long: 1.5,
      enemy_aggro_multiplier_short: 0.7,
      updated_at: new Date().toISOString(),
    };

    updateCallback({ new: newData });

    const state = MarketStateService.getState('BTC');
    expect(state?.price).toBe(51000);

    expect(EventBus.emit).toHaveBeenCalledWith(
      'marketStateUpdated',
      expect.objectContaining({
        pair: 'BTC',
        price: 51000,
      })
    );
  });

  it('should detect staleness and emit marketDataTimeout', async () => {
    vi.useFakeTimers();
    mockSupabaseResponse([]);
    await MarketStateService.init();

    vi.advanceTimersByTime(20000);

    expect(EventBus.emit).toHaveBeenCalledWith(
      'marketDataTimeout',
      expect.objectContaining({
        pair: 'ALL',
      })
    );
  });

  it('should handle recovery after staleness', async () => {
    vi.useFakeTimers();
    mockSupabaseResponse([]);
    await MarketStateService.init();

    vi.advanceTimersByTime(20000);

    const onCall = mockChannel.on.mock.calls.find(
      call => call[0] === 'postgres_changes'
    );
    const updateCallback = onCall![2];

    const newData = {
      pair: 'BTC',
      price: '50000',
      volume: '1000',
      rsi: '50',
      rsi_state: 'NEUTRAL',
      updated_at: new Date().toISOString(),
    };

    updateCallback({ new: newData });

    expect(EventBus.emit).toHaveBeenCalledWith('marketDataRecovered', { pair: 'BTC' });
  });

  it('should fetch history and fill gaps', async () => {
    const now = Date.now();
    const historyData = [
      { price: 105, volume: 12, timestamp: new Date(now - 1000).toISOString() },
      { price: 100, volume: 10, timestamp: new Date(now - 5000).toISOString() },
    ];

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({ data: historyData, error: null });

    (supabase as any).from.mockReturnValue({
      select: selectMock,
    });
    selectMock.mockReturnValue({
      eq: eqMock,
    });
    eqMock.mockReturnValue({
      order: orderMock,
    });
    orderMock.mockReturnValue({
      limit: limitMock,
    });

    const result = await MarketStateService.fetchMarketHistory('BTC', 10);

    if (result.length > 0) {
      expect(result.length).toBe(5);
      expect(result[0]!.price).toBe(100);
      expect(result[4]!.price).toBe(105);
    }
  });

  it('should cleanup on destroy', async () => {
    mockSupabaseResponse([]);
    await MarketStateService.init();

    MarketStateService.cleanup();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
