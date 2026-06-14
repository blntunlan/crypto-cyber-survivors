import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../services/auth/ProfileService';
import { RailwayAuthTokenStore } from '../../../services/api/RailwayAuthTokenStore';

// Mock RailwayClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const { mockIsRailwayConfigured } = vi.hoisted(() => ({
  mockIsRailwayConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  isRailwayApiConfigured: mockIsRailwayConfigured,
  railwayClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

// Mock Logger
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function saveRailwayAuth(): void {
  RailwayAuthTokenStore.save({
    accessToken: 'railway-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
    account: { id: 'account-123', type: 'anonymous' },
    profile: { id: 'profile-123', displayName: 'Survivor' },
  });
}

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsRailwayConfigured.mockReturnValue(true);
    ProfileService.resetInstance();
    service = ProfileService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ProfileService.getInstance();
      const instance2 = ProfileService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should load profile for authenticated user', async () => {
      saveRailwayAuth();

      const profileData = {
        id: 'prof-123',
        auth_user_id: 'user-123',
        display_name: 'Survivor',
        nickname: 'Survivor',
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
      mockGet.mockResolvedValue(profileData);
      mockPatch.mockResolvedValue({});

      const result = await service.initialize();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/profile');
      expect(result.isValid).toBe(true);
      expect(result.profile?.displayName).toBe('Survivor');
      expect(service.getProfile()?.displayName).toBe('Survivor');
    });

    it('should handle missing profile by requiring nickname', async () => {
      saveRailwayAuth();

      // Railway GET /profile returns 404
      mockGet.mockRejectedValueOnce(new Error('404'));

      const result = await service.initialize();

      expect(result.isValid).toBe(false);
      expect(result.needsNickname).toBe(true);
    });
  });

  describe('createProfile', () => {
    it('should create a new profile successfully', async () => {
      saveRailwayAuth();
      const params = {
        userId: 'user-123',
        displayName: 'NewPlayer',
      };

      mockPost.mockResolvedValueOnce({
        id: 'prof-456',
        auth_user_id: 'user-123',
        display_name: 'NewPlayer',
        nickname: 'NewPlayer',
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });

      const result = await service.createProfile(params);

      expect(result.isValid).toBe(true);
      expect(result.profile?.displayName).toBe('NewPlayer');
      expect(mockPost).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'NewPlayer',
        avatar_url: undefined,
      });
    });

    it('should fail if nickname is taken', async () => {
      saveRailwayAuth();
      const params = { userId: 'user-123', displayName: 'Taken' };

      mockPost.mockRejectedValueOnce(new Error('409'));

      const result = await service.createProfile(params);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name successfully', async () => {
      // Setup initial profile
      (service as any).currentProfile = { id: 'prof-123', displayName: 'OldName' };

      mockPatch.mockResolvedValueOnce({
        id: 'prof-123',
        nickname: 'NewName',
        display_name: 'NewName',
      });

      const result = await service.updateDisplayName('NewName');

      expect(result.isValid).toBe(true);
      expect(service.getProfile()?.displayName).toBe('NewName');
      expect(mockPatch).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'NewName',
      });
    });
  });
});
