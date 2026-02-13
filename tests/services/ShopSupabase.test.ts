import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../../services/gameplay/ShopService';
import { supabase } from '../../services/supabase/client';

// Mock Supabase
vi.mock('../../services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock UserSessionService
vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn(() => '00000000-0000-0000-0000-000000000001'),
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
                id: '00000000-0000-0000-0000-000000000002',
                name: 'Cool Skin',
                description: 'A very cool skin',
                category: 'cosmetic',
                cost_gold: 100,
                effect_type: 'none',
                effect_value: 0,
                max_purchases: 1,
                icon_key: 'item1',
              },
            ],
            error: null,
          }),
        })),
      })),
    });

    const items = await service.getItems();
    expect(items).toHaveLength(1);
    expect(items![0]!.id).toBe('00000000-0000-0000-0000-000000000002');
    expect(items![0]!.costGold).toBe(100);
  });

  it('should call purchase_item RPC and handle success', async () => {
    // @ts-expect-error: testing
    supabase.rpc.mockResolvedValue({
      data: { success: true, balance_after: 50 },
      error: null,
    });

    const result = await service.purchaseItem('00000000-0000-0000-0000-000000000002');

    expect(supabase!.rpc).toHaveBeenCalledWith('purchase_item', {
      p_profile_id: '00000000-0000-0000-0000-000000000001',
      p_item_id: '00000000-0000-0000-0000-000000000002',
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

    const result = await service.purchaseItem('00000000-0000-0000-0000-000000000002');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient funds');
  });
});
