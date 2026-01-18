import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketStateService } from '../../services/MarketStateService';
import { EventBus } from '../../services/EventBus';
import { supabase } from '../../services/Supabase';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../services/Supabase', () => {
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
vi.mock('../../services/EventBus', () => ({
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
    // Reset private fields if possible?
    // Since it's a singleton, we might need to be careful.
    // The service has a 'states' map. We can't easily clear it without a reset method or access to private.
    // However, init() calls fetchAll() which overwrites keys.
    MarketStateService.cleanup();
  });

  afterEach(() => {
    MarketStateService.cleanup();
  });

  it('should initialize and fetch initial state', async () => {
    const mockData = [
      {
        pair: 'BTC',
        price: '50000',
        volume: '1000',
        rsi: '45',
        rsi_state: 'NEUTRAL',
        atr: '500',
        atr_percent: '1',
        spawn_rate_multiplier: '1',
        normalized_volume: '0.5',
        volume_percentile: '0.5',
        whale_tier: 0,
        enemy_aggro_multiplier_long: 1,
        enemy_aggro_multiplier_short: 1,
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseResponse(mockData);

    await MarketStateService.init();

    expect(supabase!.from).toHaveBeenCalledWith('market_state');

    // Check if state is set
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

    // Get the callback passed to .on()
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

    // Simulate update
    updateCallback({ new: newData });

    const state = MarketStateService.getState('BTC');
    expect(state?.price).toBe(51000);
    expect(state?.whaleTier).toBe(1);
    expect(state?.rsiState).toBe('OVERBOUGHT');

    expect(EventBus.emit).toHaveBeenCalledWith(
      'marketStateUpdated',
      expect.objectContaining({
        pair: 'BTC',
        price: 51000,
        rsiState: 'OVERBOUGHT',
      })
    );
  });

  it('should cleanup on destroy', async () => {
    mockSupabaseResponse([]);
    await MarketStateService.init();

    MarketStateService.cleanup();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    mockSupabaseResponse(null, { message: 'Network error' });

    // Should not throw
    await MarketStateService.init();

    // Should verify it logged error but didn't crash
  });
});
