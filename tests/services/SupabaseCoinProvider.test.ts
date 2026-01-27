import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseCoinProvider } from '../../services/SupabaseCoinProvider';
import { supabase } from '../../services/Supabase';
import { UserSessionService } from '../../services/auth/UserSessionService';

vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn(),
  },
}));

describe('SupabaseCoinProvider', () => {
  let provider: SupabaseCoinProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SupabaseCoinProvider();
  });

  it('should fetch balance for logged in player', async () => {
    vi.mocked(UserSessionService.getProfileId).mockReturnValue(
      '550e8400-e29b-41d4-a716-446655440001'
    );

    const mockSingle = vi.fn().mockResolvedValue({
      data: { gold_balance: 500 },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    } as any);

    const balance = await provider.getBalance();
    expect(balance).toBe(500);
    expect(supabase.from).toHaveBeenCalledWith('virtual_accounts');
  });

  it('should return 0 for anonymous players', async () => {
    vi.mocked(UserSessionService.getProfileId).mockReturnValue('anon-123');
    const balance = await provider.getBalance();
    expect(balance).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should credit coins via RPC', async () => {
    vi.mocked(UserSessionService.getProfileId).mockReturnValue(
      '550e8400-e29b-41d4-a716-446655440001'
    );
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: true, new_balance: 100 },
      error: null,
    });

    const success = await provider.credit(50, 'achievement', { referenceId: 'ach-1' });

    expect(success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('credit_coins', {
      p_profile_id: '550e8400-e29b-41d4-a716-446655440001',
      p_amount: 50,
      p_transaction_type: 'achievement',
      p_reference_id: 'ach-1',
      p_metadata: expect.any(Object),
    });
  });
});
