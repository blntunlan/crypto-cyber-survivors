import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from '../../services/gameplay/WalletService';
import { UserSessionService } from '../../services/auth/UserSessionService';

// Mock Dependencies
vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn(),
  },
}));

const mockRailwayClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('../../services/api/RailwayClient', () => ({
  railwayClient: mockRailwayClient,
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('WalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return 0 for anonymous players', async () => {
      vi.mocked(UserSessionService.getProfileId).mockReturnValue('anon_123');
      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(0);
    });

    it('should return balance from Railway API', async () => {
      vi.mocked(UserSessionService.getProfileId).mockReturnValue(
        '00000000-0000-0000-0000-000000000001'
      );
      mockRailwayClient.get.mockResolvedValue({
        wallet: { balance: 150 },
        ledger: [],
      });

      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(150);
      expect(mockRailwayClient.get).toHaveBeenCalledWith('/api/v1/economy/wallet');
    });

    it('should return 0 on error', async () => {
      vi.mocked(UserSessionService.getProfileId).mockReturnValue(
        '00000000-0000-0000-0000-000000000001'
      );
      mockRailwayClient.get.mockRejectedValue(new Error('Network error'));

      const balance = await WalletService.getInstance().getBalance();
      expect(balance).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return empty list for anonymous players', async () => {
      vi.mocked(UserSessionService.getProfileId).mockReturnValue('anon_123');
      const history = await WalletService.getInstance().getHistory();
      expect(history).toEqual([]);
    });

    it('should return empty array (server endpoint not yet implemented)', async () => {
      vi.mocked(UserSessionService.getProfileId).mockReturnValue(
        '00000000-0000-0000-0000-000000000001'
      );
      const history = await WalletService.getInstance().getHistory();
      expect(history).toEqual([]);
    });
  });
});
