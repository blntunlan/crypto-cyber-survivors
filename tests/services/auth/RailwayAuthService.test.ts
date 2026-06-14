import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailwayAuthTokenStore } from '../../../services/api/RailwayAuthTokenStore';
import { RailwayAuthServiceClass } from '../../../services/auth/RailwayAuthService';

const { mockIsRailwayConfigured, mockRailwayClient } = vi.hoisted(() => ({
  mockIsRailwayConfigured: vi.fn().mockReturnValue(true),
  mockRailwayClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  isRailwayApiConfigured: mockIsRailwayConfigured,
  railwayClient: mockRailwayClient,
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function freshService(): InstanceType<typeof RailwayAuthServiceClass> {
  RailwayAuthServiceClass.resetInstance();
  return RailwayAuthServiceClass.getInstance();
}

function saveRailwayAuth(): void {
  RailwayAuthTokenStore.save({
    accessToken: 'railway-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
    account: { id: 'account-123', type: 'anonymous' },
    profile: { id: 'profile-123', displayName: 'Player1' },
  });
}

describe('RailwayAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsRailwayConfigured.mockReturnValue(true);
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const first = RailwayAuthServiceClass.getInstance();
      const second = RailwayAuthServiceClass.getInstance();
      expect(first).toBe(second);
    });

    it('resetInstance produces a new instance', () => {
      const first = RailwayAuthServiceClass.getInstance();
      RailwayAuthServiceClass.resetInstance();
      const second = RailwayAuthServiceClass.getInstance();
      expect(first).not.toBe(second);
    });
  });

  describe('anonymous sign-in', () => {
    it('creates Railway anonymous auth and stores token', async () => {
      mockRailwayClient.post.mockResolvedValue({
        accessToken: 'railway-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        account: { id: 'account-123', type: 'anonymous' },
        profile: { id: 'profile-123', displayName: 'Player1' },
        wallet: { id: 'wallet-123', balance: 0, currency: 'gold' },
      });

      const result = await freshService().signInAnonymously('Player1');

      expect(result.success).toBe(true);
      expect(result.session?.access_token).toBe('railway-token');
      expect(result.user?.id).toBe('profile-123');
      expect(RailwayAuthTokenStore.getAccessToken()).toBe('railway-token');
      expect(mockRailwayClient.post).toHaveBeenCalledWith('/api/v1/auth/anonymous', {
        display_name: 'Player1',
      });
    });

    it('returns not configured when Railway API is unavailable', async () => {
      mockIsRailwayConfigured.mockReturnValue(false);

      const result = await freshService().signInAnonymously('Player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth service not configured');
      expect(mockRailwayClient.post).not.toHaveBeenCalled();
    });

    it('returns API error when Railway anonymous auth fails', async () => {
      mockRailwayClient.post.mockRejectedValue(new Error('Nickname already taken'));

      const result = await freshService().signInAnonymously('Player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('session state', () => {
    it('maps stored Railway auth to session and user', async () => {
      saveRailwayAuth();

      const service = freshService();
      const session = await service.getSession();
      const user = await service.getUser();

      expect(session?.access_token).toBe('railway-token');
      expect(session?.user.id).toBe('profile-123');
      expect(user?.user_metadata?.account_id).toBe('account-123');
      expect(await service.isAuthenticated()).toBe(true);
    });

    it('returns null session and user when token is missing', async () => {
      const service = freshService();

      expect(await service.getSession()).toBeNull();
      expect(await service.getUser()).toBeNull();
      expect(await service.isAuthenticated()).toBe(false);
    });

    it('refreshSession returns current Railway token without network refresh', async () => {
      saveRailwayAuth();

      const result = await freshService().refreshSession();

      expect(result.success).toBe(true);
      expect(result.session?.access_token).toBe('railway-token');
      expect(mockRailwayClient.post).not.toHaveBeenCalled();
    });

    it('refreshSession fails without an active Railway session', async () => {
      const result = await freshService().refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active Railway session');
    });

    it('signOut clears Railway auth', async () => {
      saveRailwayAuth();

      const result = await freshService().signOut();

      expect(result.success).toBe(true);
      expect(RailwayAuthTokenStore.get()).toBeNull();
    });
  });

  describe('profile API', () => {
    it('loads current profile through Railway API', async () => {
      saveRailwayAuth();
      mockRailwayClient.get.mockResolvedValue({
        id: 'profile-123',
        nickname: 'Player1',
        created_at: '2026-01-01T00:00:00.000Z',
      });

      const profile = await freshService().getCurrentProfile();

      expect(profile?.id).toBe('profile-123');
      expect(profile?.displayName).toBe('Player1');
      expect(mockRailwayClient.get).toHaveBeenCalledWith('/api/v1/profile');
    });

    it('returns null profile without Railway token', async () => {
      expect(await freshService().getCurrentProfile()).toBeNull();
      expect(mockRailwayClient.get).not.toHaveBeenCalled();
    });

    it('validates username format before profile update', async () => {
      saveRailwayAuth();

      const result = await freshService().updateProfile({ username: 'x' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('3-16');
      expect(mockRailwayClient.patch).not.toHaveBeenCalled();
    });

    it('updates profile through Railway API', async () => {
      saveRailwayAuth();
      mockRailwayClient.patch.mockResolvedValue({});

      const result = await freshService().updateProfile({
        displayName: 'Updated',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(result.success).toBe(true);
      expect(mockRailwayClient.patch).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'Updated',
        avatar_url: 'https://example.com/avatar.png',
      });
    });

    it('updateProfileWithAuth maps returned Railway profile', async () => {
      saveRailwayAuth();
      mockRailwayClient.patch.mockResolvedValue({
        id: 'profile-123',
        nickname: 'Updated',
        created_at: '2026-01-01T00:00:00.000Z',
      });

      const result = await freshService().updateProfileWithAuth({
        displayName: 'Updated',
      });

      expect(result.success).toBe(true);
      expect(result.profile?.displayName).toBe('Updated');
    });
  });

  describe('unsupported legacy auth surfaces', () => {
    it('returns unsupported for email/password flows', async () => {
      const service = freshService();

      await expect(
        service.signIn({ email: 'a@b.c', password: 'pass' })
      ).resolves.toMatchObject({
        success: false,
        error: 'Email auth is not available in Railway-native auth yet',
      });
      await expect(
        service.signUp({ email: 'a@b.c', password: 'pass' })
      ).resolves.toMatchObject({
        success: false,
        error: 'Email auth is not available in Railway-native auth yet',
      });
    });

    it('returns unsupported for OAuth until Railway endpoints exist', async () => {
      const result = await freshService().signInWithOAuth({ provider: 'google' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth is not available in Railway-native auth yet');
    });

    it('returns unsupported for passwordless email actions', async () => {
      const service = freshService();

      await expect(service.sendMagicLink('a@b.c')).resolves.toMatchObject({
        success: false,
      });
      await expect(service.sendOtpCode('a@b.c')).resolves.toMatchObject({
        success: false,
      });
      await expect(service.verifyOtpCode('a@b.c', '123456')).resolves.toMatchObject({
        success: false,
      });
      await expect(service.resetPassword('a@b.c')).resolves.toMatchObject({
        success: false,
      });
      await expect(service.updatePassword('new-password')).resolves.toMatchObject({
        success: false,
      });
    });
  });
});
