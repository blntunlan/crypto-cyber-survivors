import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marketStateService } from '../../services/MarketStateService';
import { EventBus } from '../../services/EventBus';
import { supabase } from '../../services/Supabase';

// Mock Supabase
vi.mock('../../services/Supabase', () => {
  const mockOn = vi.fn().mockReturnThis();
  const mockChannel = {
    on: mockOn,
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
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

describe('MarketStateService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await marketStateService.destroy();

    // Setup mock response for single()
    vi.mocked(((supabase as any).from().select().eq() as any).single).mockResolvedValue(
      {
        data: {
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
        error: null,
      } as any
    );
  });

  it('should initialize and fetch initial state', async () => {
    const state = await marketStateService.initialize('BTC', 'LONG');

    expect(supabase!.from).toHaveBeenCalledWith('market_state');
    expect(state).toBeDefined();
    expect(state?.price).toBe(50000);
    expect(EventBus.emit).toHaveBeenCalledWith('marketStateUpdated', state);
  });

  it('should subscribe to realtime updates after initialization', async () => {
    await marketStateService.initialize('BTC', 'LONG');

    expect(supabase!.channel).toHaveBeenCalledWith('market_state_changes');
    const mockChannel = vi.mocked((supabase as any).channel).mock.results[0].value;
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        table: 'market_state',
        filter: 'pair=eq.BTC',
      }),
      expect.any(Function)
    );
  });

  it('should handle realtime updates correctly', async () => {
    await marketStateService.initialize('BTC', 'LONG');

    const mockChannel = vi.mocked((supabase as any).channel).mock.results[0].value;
    const updateCallback = mockChannel.on.mock.calls[0][2];

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

    const state = marketStateService.getState();
    expect(state?.price).toBe(51000);
    expect(state?.whaleTier).toBe(1);

    expect(EventBus.emit).toHaveBeenCalledWith('whaleTierChanged', {
      tier: 1,
      percentile: 0.8,
    });
    expect(EventBus.emit).toHaveBeenCalledWith('rsiStateChanged', {
      state: 'OVERBOUGHT',
      rsi: 75,
    });
  });

  it('should cleanup on destroy', async () => {
    await marketStateService.initialize('BTC', 'LONG');
    await marketStateService.destroy();

    expect(supabase!.removeChannel).toHaveBeenCalled();
    expect(marketStateService.getState()).toBeNull();
  });

  it('should handle initialization errors gracefully', async () => {
    vi.mocked(((supabase as any).from().select().eq() as any).single).mockResolvedValue(
      {
        data: null,
        error: { message: 'Network error' } as any,
      } as any
    );

    const state = await marketStateService.initialize('BTC', 'LONG');
    expect(state).toBeNull();
  });
});
