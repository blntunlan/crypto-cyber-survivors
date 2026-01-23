import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from '../../services/WalletService';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { supabase } from '../../services/Supabase';

// Mock Dependencies
vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getPlayerId: vi.fn(),
  },
}));

vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('WalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return 0 for anonymous players', async () => {
      vi.mocked(UserSessionService.getPlayerId).mockReturnValue('anon-123');
      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(0);
    });

    it('should return gold_balance from Supabase', async () => {
      vi.mocked(UserSessionService.getPlayerId).mockReturnValue('real-id');
      (supabase!.from as any)()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { gold_balance: 150 },
          error: null,
        });

      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(150);
    });

    it('should return 0 on error', async () => {
      vi.mocked(UserSessionService.getPlayerId).mockReturnValue('real-id');
      (supabase!.from as any)()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'DB Error' },
        });

      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return empty list for anonymous players', async () => {
      vi.mocked(UserSessionService.getPlayerId).mockReturnValue('anon-123');
      const history = await WalletService.getInstance().getHistory();
      expect(history).toEqual([]);
    });

    it('should map DB transactions to WalletTransactions', async () => {
      vi.mocked(UserSessionService.getPlayerId).mockReturnValue('real-id');
      const mockData = [
        {
          id: '1',
          amount: 50,
          balance_after: 100,
          type: 'LOOT',
          created_at: '2024-01-01',
        },
      ];
      (supabase!.from as any)().select().eq().order().limit.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const history = await WalletService.getInstance().getHistory();
      expect(history[0]).toEqual({
        id: '1',
        amount: 50,
        balanceAfter: 100,
        type: 'LOOT',
        createdAt: '2024-01-01',
      });
    });
  });
});
