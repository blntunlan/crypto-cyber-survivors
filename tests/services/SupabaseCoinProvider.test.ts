import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseCoinProvider } from '../../services/gameplay/SupabaseCoinProvider';
import { UserSessionService } from '../../services/auth/UserSessionService';

const { railwayGetMock } = vi.hoisted(() => ({
  railwayGetMock: vi.fn(),
}));

vi.mock('../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: railwayGetMock,
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
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

    railwayGetMock.mockResolvedValue({ balance: 500 });

    const balance = await provider.getBalance();
    expect(balance).toBe(500);
    expect(railwayGetMock).toHaveBeenCalledWith('/api/v1/wallet/balance');
  });

  it('should return 0 for anonymous players', async () => {
    vi.mocked(UserSessionService.getProfileId).mockReturnValue('anon_123');
    const balance = await provider.getBalance();
    expect(balance).toBe(0);
    expect(railwayGetMock).not.toHaveBeenCalled();
  });

  it('should optimistically credit coins and return true', async () => {
    vi.mocked(UserSessionService.getProfileId).mockReturnValue(
      '550e8400-e29b-41d4-a716-446655440001'
    );

    const success = await provider.credit(50, 'achievement', { referenceId: 'ach-1' });

    expect(success).toBe(true);
    // No API call — optimistic only
    expect(railwayGetMock).not.toHaveBeenCalled();
  });
});
