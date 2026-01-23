import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../../services/ShopService';
import { supabase } from '../../services/Supabase';

// Mock Supabase
vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock UserSessionService
vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getPlayerId: vi.fn(() => 'real-player-123'),
  },
}));

describe('ShopService Supabase Integration', () => {
  const service = ShopService.getInstance();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and map shop items correctly', async () => {
    // @ts-expect-error: testing
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'item-1',
                name: 'Cool Skin',
                cost_gold: 100,
                category: 'cosmetic',
              },
            ],
            error: null,
          }),
        })),
      })),
    });

    const items = await service.getItems();
    expect(items).toHaveLength(1);
    expect(items).toHaveLength(1);
    expect(items![0]!.id).toBe('item-1');
    expect(items![0]!.costGold).toBe(100);
  });

  it('should call purchase_item RPC and handle success', async () => {
    // @ts-expect-error: testing
    supabase.rpc.mockResolvedValue({
      data: { success: true, balance_after: 50 },
      error: null,
    });

    const result = await service.purchaseItem('item-1');

    expect(supabase!.rpc).toHaveBeenCalledWith('purchase_item', {
      p_player_id: 'real-player-123',
      p_item_id: 'item-1',
    });
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(50);
  });

  it('should return error when RPC fails', async () => {
    // @ts-expect-error: testing
    supabase.rpc.mockResolvedValue({
      data: { success: false, error: 'Insufficient funds' },
      error: null,
    });

    const result = await service.purchaseItem('item-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient funds');
  });
});
