import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserProvider } from '../../contexts/UserContext';
import { useUser } from '../../contexts/useUser';
import { UserPersistenceService } from '../../services/auth/UserPersistenceService';
import { nanoid } from 'nanoid';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockIsRailwayApiConfigured,
  mockSupabaseAuth,
  mockRailwayClient,
} = vi.hoisted(
  () => ({
    mockIsRailwayApiConfigured: vi.fn().mockReturnValue(false),
    mockSupabaseAuth: {
      initialize: vi.fn(),
      dispose: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      getUser: vi.fn().mockResolvedValue(null),
      signOut: vi.fn().mockResolvedValue({ success: true }),
      signInAnonymously: vi.fn().mockResolvedValue({
        success: true,
        session: { access_token: 'test-tok' },
      }),
    },
    mockRailwayClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      del: vi.fn(),
    },
  })
);

vi.mock('../../services/auth/RailwayAuthService', () => ({
  RailwayAuthService: mockSupabaseAuth,
}));

vi.mock('../../services/api/RailwayClient', () => ({
  isRailwayApiConfigured: mockIsRailwayApiConfigured,
  railwayClient: mockRailwayClient,
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-id-12345'),
}));

// ── Helper component ───────────────────────────────────────────────────────

const TestConsumer: React.FC<{
  onRender?: (ctx: ReturnType<typeof useUser>) => void;
}> = ({ onRender }) => {
  const ctx = useUser();
  onRender?.(ctx);
  return (
    <div>
      <span data-testid="authenticated">{ctx.isAuthenticated.toString()}</span>
      <span data-testid="loading">{ctx.isLoading.toString()}</span>
      <span data-testid="nickname">{ctx.nickname ?? 'null'}</span>
      <span data-testid="profileId">{ctx.profileId}</span>
      <button data-testid="login" onClick={() => void ctx.login('TestNick')}>
        Login
      </button>
      <button data-testid="logout" onClick={ctx.logout}>
        Logout
      </button>
    </div>
  );
};

function saveRailwayAuth(profileId = '550e8400-e29b-41d4-a716-446655440000'): void {
  localStorage.setItem(
    'crypto-survivors-railway-auth',
    JSON.stringify({
      accessToken: 'railway-token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 60_000,
      account: { id: 'account-123', type: 'anonymous' },
      profile: { id: profileId, displayName: 'ValidUser' },
    })
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    UserPersistenceService.clear();
    mockIsRailwayApiConfigured.mockReturnValue(false);

    // Default: local mode (hostname = localhost)
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', origin: 'http://localhost:3000' },
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Initial State
  // ────────────────────────────────────────────────────────────────────────

  describe('Initial State', () => {
    it('should dispose Supabase auth listener on unmount', async () => {
      const { unmount } = render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      unmount();

      expect(mockSupabaseAuth.dispose).toHaveBeenCalledOnce();
    });

    it('should start with loading true and then false', async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });

    it('should not be authenticated when no user in storage', async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('nickname').textContent).toBe('null');
      });
    });

    it('should return anon-ID when not authenticated', async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profileId').textContent).toMatch(/^anon_/);
      });
    });

    it('should keep anon-ID stable across rerenders', async () => {
      vi.mocked(nanoid)
        .mockReturnValueOnce('first-anon-id')
        .mockReturnValueOnce('second-anon-id');

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      const firstProfileId = screen.getByTestId('profileId').textContent;

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const secondProfileId = screen.getByTestId('profileId').textContent;

      expect(firstProfileId).toBe('anon_first-anon-id');
      expect(secondProfileId).toBe(firstProfileId);
    });

    it('should load user from localStorage on mount', async () => {
      const mockUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'StoredUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('nickname').textContent).toBe('StoredUser');
        expect(screen.getByTestId('profileId').textContent).toBe(
          '550e8400-e29b-41d4-a716-446655440000'
        );
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Local Mode Login
  // ────────────────────────────────────────────────────────────────────────

  describe('Login (local mode)', () => {
    it('should login in local mode and save to localStorage', async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('nickname').textContent).toBe('TestNick');
      });

      const stored = JSON.parse(localStorage.getItem('crypto_survivors_user')!);
      expect(stored.nickname).toBe('TestNick');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Remote Mode Login
  // ────────────────────────────────────────────────────────────────────────

  describe('Login (remote mode)', () => {
    beforeEach(() => {
      // Switch to remote mode: configured + non-local hostname
      mockIsRailwayApiConfigured.mockReturnValue(true);
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'crypto-survivors.com',
          origin: 'https://crypto-survivors.com',
        },
        configurable: true,
      });
    });

    it('should authenticate via Railway and create profile', async () => {
      // No existing user/session
      mockSupabaseAuth.getUser.mockResolvedValue(null);
      mockSupabaseAuth.getSession.mockResolvedValue(null);
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'new-tok' },
      });

      // Profile doesn't exist → GET fails, POST creates
      mockRailwayClient.get.mockRejectedValue(new Error('Not found'));
      mockRailwayClient.post.mockResolvedValue({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        nickname: 'TestNick',
      });

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('nickname').textContent).toBe('TestNick');
        expect(screen.getByTestId('profileId').textContent).toBe(
          'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
        );
      });

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(mockSupabaseAuth.signInAnonymously).toHaveBeenCalledWith('TestNick');
      expect(mockRailwayClient.post).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'TestNick',
      });
    });

    it('should validate nickname before creating remote session', async () => {
      let loginResult: { success: boolean; error?: string } | null = null;

      const LoginButton: React.FC = () => {
        const { login, isLoading } = useUser();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <button
              data-testid="login-btn"
              onClick={() => {
                void login('ab').then(r => {
                  loginResult = r;
                });
              }}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <UserProvider>
          <LoginButton />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login-btn'));
      });

      expect(loginResult).toEqual({
        success: false,
        error: 'Nickname must be at least 3 characters',
      });
      expect(mockSupabaseAuth.signInAnonymously).not.toHaveBeenCalled();
      expect(mockRailwayClient.post).not.toHaveBeenCalled();
    });

    it('should trim nickname before anonymous auth and profile creation', async () => {
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'new-tok' },
      });
      mockRailwayClient.get.mockRejectedValue(new Error('Not found'));
      mockRailwayClient.post.mockResolvedValue({
        id: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f7a',
        nickname: 'TrimNick',
      });

      let loginResult: { success: boolean; error?: string } | null = null;

      const LoginButton: React.FC = () => {
        const { login, isLoading } = useUser();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <button
              data-testid="login-btn"
              onClick={() => {
                void login('  TrimNick  ').then(r => {
                  loginResult = r;
                });
              }}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <UserProvider>
          <LoginButton />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login-btn'));
      });

      expect(loginResult).toEqual({ success: true });
      expect(mockSupabaseAuth.signInAnonymously).toHaveBeenCalledWith('TrimNick');
      expect(mockRailwayClient.post).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'TrimNick',
      });

      const stored = JSON.parse(localStorage.getItem('crypto_survivors_user')!);
      expect(stored.nickname).toBe('TrimNick');
    });

    it('should start fresh when nickname setup has no local identity', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ id: 'stale-user-id' });
      mockSupabaseAuth.getSession.mockResolvedValue({ access_token: 'stale-tok' });
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'fresh-tok' },
      });

      mockRailwayClient.get.mockRejectedValue(new Error('Not found'));
      mockRailwayClient.post.mockResolvedValue({
        id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
        nickname: 'TestNick',
      });

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(mockSupabaseAuth.getUser).not.toHaveBeenCalled();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(mockSupabaseAuth.signInAnonymously).toHaveBeenCalledWith('TestNick');
      expect(mockRailwayClient.post).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'TestNick',
      });
    });

    it('should create Railway session when no local auth token exists', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue(null);

      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'fresh-tok' },
      });

      mockRailwayClient.get.mockRejectedValue(new Error('Not found'));
      mockRailwayClient.post.mockResolvedValue({
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        nickname: 'TestNick',
      });

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      // Should sign out stale session and create fresh one
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(mockSupabaseAuth.signInAnonymously).toHaveBeenCalledWith('TestNick');
    });

    it('should return error when signInAnonymously fails', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue(null);
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: false,
        error: 'Anonymous sign-ins are disabled',
      });

      let loginResult: { success: boolean; error?: string } | null = null;

      const LoginButton: React.FC = () => {
        const { login, isLoading } = useUser();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <button
              data-testid="login-btn"
              onClick={() => {
                void login('TestNick').then(r => {
                  loginResult = r;
                });
              }}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <UserProvider>
          <LoginButton />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login-btn'));
      });

      expect(loginResult).toEqual({
        success: false,
        error: 'Anonymous sign-ins are disabled',
      });
    });

    it('should return Nickname already taken error', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue(null);
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'tok' },
      });

      mockRailwayClient.get.mockRejectedValue(new Error('Not found'));
      mockRailwayClient.post.mockRejectedValue(new Error('Nickname already taken'));

      let loginResult: { success: boolean; error?: string } | null = null;

      const LoginButton: React.FC = () => {
        const { login, isLoading } = useUser();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <button
              data-testid="login-btn"
              onClick={() => {
                void login('TakenNick').then(r => {
                  loginResult = r;
                });
              }}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <UserProvider>
          <LoginButton />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login-btn'));
      });

      expect(loginResult).toEqual({
        success: false,
        error: 'Nickname already taken',
      });
    });

    it('should return connection error on fetch failure', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue(null);
      mockSupabaseAuth.signInAnonymously.mockResolvedValue({
        success: true,
        session: { access_token: 'tok' },
      });

      // Both GET and POST fail with fetch error
      mockRailwayClient.get.mockRejectedValue(new TypeError('fetch failed'));
      mockRailwayClient.post.mockRejectedValue(new TypeError('fetch failed'));

      let loginResult: { success: boolean; error?: string } | null = null;

      const LoginButton: React.FC = () => {
        const { login, isLoading } = useUser();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <button
              data-testid="login-btn"
              onClick={() => {
                void login('Player').then(r => {
                  loginResult = r;
                });
              }}
            >
              Login
            </button>
          </div>
        );
      };

      render(
        <UserProvider>
          <LoginButton />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('login-btn'));
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toContain('Connection to server failed');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Remote Mode Init (session validation)
  // ────────────────────────────────────────────────────────────────────────

  describe('Init (remote mode — session validation)', () => {
    beforeEach(() => {
      mockIsRailwayApiConfigured.mockReturnValue(true);
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'crypto-survivors.com',
          origin: 'https://crypto-survivors.com',
        },
        configurable: true,
      });
    });

    it('should keep user when Railway token + profile are valid', async () => {
      const storedUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'ValidUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(storedUser));
      saveRailwayAuth(storedUser.profileId);

      mockRailwayClient.get.mockResolvedValue({ id: storedUser.profileId });

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('nickname').textContent).toBe('ValidUser');
    });

    it('should clear user when Railway auth token is missing', async () => {
      const storedUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'ExpiredUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(storedUser));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      expect(localStorage.getItem('crypto_survivors_user')).toBeNull();
    });

    it('should clear user when Railway profile not found', async () => {
      const storedUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'OrphanUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(storedUser));
      saveRailwayAuth(storedUser.profileId);

      mockRailwayClient.get.mockRejectedValue(new Error('Profile not found'));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should keep user on network error (offline support)', async () => {
      const storedUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'OfflineUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(storedUser));
      saveRailwayAuth(storedUser.profileId);

      mockRailwayClient.get.mockRejectedValue(new TypeError('Failed to fetch'));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Should keep the user (offline support)
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('nickname').textContent).toBe('OfflineUser');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Logout
  // ────────────────────────────────────────────────────────────────────────

  describe('Logout', () => {
    it('should clear user on logout', async () => {
      const mockUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440010',
        nickname: 'LogoutUser',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('nickname').textContent).toBe('null');
      });

      expect(localStorage.getItem('crypto_survivors_user')).toBeNull();
    });

    it('should call RailwayAuthService.signOut on logout', async () => {
      const mockUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440010',
        nickname: 'LogoutUser2',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('logout'));
      });

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('should regenerate anon-ID after logout', async () => {
      const mockUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440010',
        nickname: 'LogoutUser3',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      };
      localStorage.setItem('crypto_survivors_user', JSON.stringify(mockUser));

      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      // While authenticated, profileId = the stored user's UUID
      expect(screen.getByTestId('profileId').textContent).toBe(
        '550e8400-e29b-41d4-a716-446655440010'
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('logout'));
      });

      await waitFor(() => {
        // After logout, profileId should be an anon_* string
        expect(screen.getByTestId('profileId').textContent).toMatch(/^anon_/);
        // And should not be the old UUID
        expect(screen.getByTestId('profileId').textContent).not.toBe(
          '550e8400-e29b-41d4-a716-446655440010'
        );
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // useUser hook
  // ────────────────────────────────────────────────────────────────────────

  describe('useUser hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useUser must be used within a UserProvider');

      consoleError.mockRestore();
    });
  });
});
