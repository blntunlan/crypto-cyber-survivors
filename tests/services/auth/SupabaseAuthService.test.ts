import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockAuth, mockIsConfigured } = vi.hoisted(() => {
  const mockAuth = {
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInAnonymously: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    refreshSession: vi.fn(),
  };

  return {
    mockAuth,
    mockIsConfigured: vi.fn().mockReturnValue(true),
  };
});

vi.mock('../../../services/supabase/client', () => ({
  supabase: { auth: mockAuth },
  isSupabaseConfigured: mockIsConfigured,
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

import { SupabaseAuthServiceClass } from '../../../services/auth/SupabaseAuthService';
import { EventBus } from '../../../services/core/EventBus';

// ── Helpers ────────────────────────────────────────────────────────────────

function freshService(): InstanceType<typeof SupabaseAuthServiceClass> {
  SupabaseAuthServiceClass.resetInstance();
  return SupabaseAuthServiceClass.getInstance();
}

const fakeUser = { id: 'user-123', email: 'a@b.c' } as any;
const fakeSession = { user: fakeUser, access_token: 'tok-abc' } as any;

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SupabaseAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  // ── Singleton ──────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('returns the same instance', () => {
      const a = SupabaseAuthServiceClass.getInstance();
      const b = SupabaseAuthServiceClass.getInstance();
      expect(a).toBe(b);
    });

    it('resetInstance produces a new instance', () => {
      const a = SupabaseAuthServiceClass.getInstance();
      SupabaseAuthServiceClass.resetInstance();
      const b = SupabaseAuthServiceClass.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // ── Initialization ────────────────────────────────────────────────────

  describe('initialize', () => {
    it('sets up onAuthStateChange listener', () => {
      const svc = freshService();
      svc.initialize();
      expect(mockAuth.onAuthStateChange).toHaveBeenCalledOnce();
    });

    it('does not register duplicate listeners when initialized twice', () => {
      const svc = freshService();

      svc.initialize();
      svc.initialize();

      expect(mockAuth.onAuthStateChange).toHaveBeenCalledOnce();
    });

    it('skips init when Supabase is not configured', () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      svc.initialize();
      expect(mockAuth.onAuthStateChange).not.toHaveBeenCalled();
    });

    it('emits authStateChanged on SIGNED_IN', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('SIGNED_IN', fakeSession);

      expect(EventBus.emit).toHaveBeenCalledWith('authStateChanged', {
        type: 'signIn',
        user: fakeUser,
        session: fakeSession,
      });
    });

    it('emits authStateChanged on SIGNED_OUT', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('SIGNED_OUT', null);

      expect(EventBus.emit).toHaveBeenCalledWith('authStateChanged', {
        type: 'signOut',
        user: null,
        session: null,
      });
    });

    it('emits authStateChanged on TOKEN_REFRESHED', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('TOKEN_REFRESHED', fakeSession);

      expect(EventBus.emit).toHaveBeenCalledWith('authStateChanged', {
        type: 'tokenRefreshed',
        user: fakeUser,
        session: fakeSession,
      });
    });

    it('handles INITIAL_SESSION without emitting', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('INITIAL_SESSION', null);

      expect(EventBus.emit).not.toHaveBeenCalled();
    });

    it('emits authStateChanged on USER_UPDATED', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('USER_UPDATED', fakeSession);

      expect(EventBus.emit).toHaveBeenCalledWith('authStateChanged', {
        type: 'userUpdated',
        user: fakeUser,
        session: fakeSession,
      });
    });

    it('emits authStateChanged on PASSWORD_RECOVERY', () => {
      const svc = freshService();
      svc.initialize();

      const callback = mockAuth.onAuthStateChange.mock.calls[0]![0];
      callback('PASSWORD_RECOVERY', fakeSession);

      expect(EventBus.emit).toHaveBeenCalledWith('authStateChanged', {
        type: 'passwordRecovery',
        user: fakeUser,
        session: fakeSession,
      });
    });
  });

  // ── signUp ─────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('returns success with session', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: fakeUser, session: fakeSession },
        error: null,
      });

      const svc = freshService();
      const result = await svc.signUp({ email: 'a@b.c', password: '123456' });

      expect(result.success).toBe(true);
      expect(result.user).toBe(fakeUser);
      expect(result.session).toBe(fakeSession);
    });

    it('returns needsEmailConfirmation when no session', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: fakeUser, session: null },
        error: null,
      });

      const svc = freshService();
      const result = await svc.signUp({ email: 'a@b.c', password: '123456' });

      expect(result.success).toBe(true);
      expect(result.needsEmailConfirmation).toBe(true);
    });

    it('returns mapped error on failure', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const svc = freshService();
      const result = await svc.signUp({ email: 'a@b.c', password: '123456' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bu email zaten kayıtlı');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.signUp({ email: 'a@b.c', password: '123456' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth service not configured');
    });

    it('handles thrown exceptions', async () => {
      mockAuth.signUp.mockRejectedValue(new Error('Network down'));

      const svc = freshService();
      const result = await svc.signUp({ email: 'a@b.c', password: '123456' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection error');
    });
  });

  // ── signIn ─────────────────────────────────────────────────────────────

  describe('signIn', () => {
    it('returns success on valid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: fakeUser, session: fakeSession },
        error: null,
      });

      const svc = freshService();
      const result = await svc.signIn({ email: 'a@b.c', password: 'pass' });

      expect(result.success).toBe(true);
      expect(result.user).toBe(fakeUser);
    });

    it('returns mapped error on invalid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const svc = freshService();
      const result = await svc.signIn({ email: 'a@b.c', password: 'wrong' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email veya şifre hatalı');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.signIn({ email: 'a@b.c', password: 'pass' });

      expect(result.success).toBe(false);
    });

    it('handles thrown exceptions', async () => {
      mockAuth.signInWithPassword.mockRejectedValue(new Error('fail'));

      const svc = freshService();
      const result = await svc.signIn({ email: 'a@b.c', password: 'pass' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection error');
    });
  });

  // ── signInAnonymously ─────────────────────────────────────────────────

  describe('signInAnonymously', () => {
    it('returns success with session', async () => {
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: fakeUser, session: fakeSession },
        error: null,
      });

      const svc = freshService();
      const result = await svc.signInAnonymously('Player1');

      expect(result.success).toBe(true);
      expect(result.session).toBe(fakeSession);
      expect(mockAuth.signInAnonymously).toHaveBeenCalledWith({
        options: { data: { display_name: 'Player1', name: 'Player1' } },
      });
    });

    it('returns error on Supabase error', async () => {
      mockAuth.signInAnonymously.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Anonymous sign-ins are disabled' },
      });

      const svc = freshService();
      const result = await svc.signInAnonymously('Player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Anonymous sign-ins are disabled');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.signInAnonymously('Player1');

      expect(result.success).toBe(false);
    });

    it('handles thrown exceptions', async () => {
      mockAuth.signInAnonymously.mockRejectedValue(new Error('boom'));

      const svc = freshService();
      const result = await svc.signInAnonymously('Player1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection error');
    });
  });

  // ── signOut ────────────────────────────────────────────────────────────

  describe('signOut', () => {
    it('returns success', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.signOut();

      expect(result.success).toBe(true);
    });

    it('returns error on failure', async () => {
      mockAuth.signOut.mockResolvedValue({ error: { message: 'fail' } });

      const svc = freshService();
      const result = await svc.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.signOut();

      expect(result.success).toBe(false);
    });

    it('handles thrown exceptions', async () => {
      mockAuth.signOut.mockRejectedValue(new Error('fail'));

      const svc = freshService();
      const result = await svc.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign out');
    });
  });

  // ── Session Management ────────────────────────────────────────────────

  describe('getSession', () => {
    it('returns session when available', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: fakeSession },
      });

      const svc = freshService();
      const session = await svc.getSession();

      expect(session).toBe(fakeSession);
    });

    it('returns null when no session', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });

      const svc = freshService();
      expect(await svc.getSession()).toBeNull();
    });

    it('returns null when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      expect(await svc.getSession()).toBeNull();
    });

    it('returns null on exception', async () => {
      mockAuth.getSession.mockRejectedValue(new Error('fail'));

      const svc = freshService();
      expect(await svc.getSession()).toBeNull();
    });
  });

  describe('getUser', () => {
    it('returns user when available', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: fakeUser } });

      const svc = freshService();
      const user = await svc.getUser();

      expect(user).toBe(fakeUser);
    });

    it('returns null when no user', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });

      const svc = freshService();
      expect(await svc.getUser()).toBeNull();
    });

    it('returns null when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      expect(await svc.getUser()).toBeNull();
    });

    it('returns null on exception', async () => {
      mockAuth.getUser.mockRejectedValue(new Error('fail'));

      const svc = freshService();
      expect(await svc.getUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when session exists', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: fakeSession },
      });

      const svc = freshService();
      expect(await svc.isAuthenticated()).toBe(true);
    });

    it('returns false when no session', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });

      const svc = freshService();
      expect(await svc.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('returns success with refreshed session', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { session: fakeSession },
        error: null,
      });

      const svc = freshService();
      const result = await svc.refreshSession();

      expect(result.success).toBe(true);
      expect(result.session).toBe(fakeSession);
    });

    it('returns error on failure', async () => {
      mockAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'refresh failed' },
      });

      const svc = freshService();
      const result = await svc.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh failed');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.refreshSession();

      expect(result.success).toBe(false);
    });

    it('handles thrown exceptions', async () => {
      mockAuth.refreshSession.mockRejectedValue(new Error('fail'));

      const svc = freshService();
      const result = await svc.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to refresh session');
    });
  });

  // ── OAuth ──────────────────────────────────────────────────────────────

  describe('signInWithOAuth', () => {
    it('calls supabase with correct provider and scopes', async () => {
      mockAuth.signInWithOAuth.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.signInWithOAuth({ provider: 'google' });

      expect(result.success).toBe(true);
      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            scopes: 'email profile',
          }),
        })
      );
    });

    it('allows custom scopes override', async () => {
      mockAuth.signInWithOAuth.mockResolvedValue({ error: null });

      const svc = freshService();
      await svc.signInWithOAuth({ provider: 'github', scopes: 'repo' });

      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ scopes: 'repo' }),
        })
      );
    });

    it('returns error on failure', async () => {
      mockAuth.signInWithOAuth.mockResolvedValue({
        error: { message: 'OAuth error' },
      });

      const svc = freshService();
      const result = await svc.signInWithOAuth({ provider: 'twitter' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth error');
    });

    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.signInWithOAuth({ provider: 'discord' });

      expect(result.success).toBe(false);
    });
  });

  // ── Magic Link / OTP ──────────────────────────────────────────────────

  describe('sendMagicLink', () => {
    it('returns success', async () => {
      mockAuth.signInWithOtp.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.sendMagicLink('a@b.c');

      expect(result.success).toBe(true);
    });

    it('returns error on failure', async () => {
      mockAuth.signInWithOtp.mockResolvedValue({
        error: { message: 'Email rate limit exceeded' },
      });

      const svc = freshService();
      const result = await svc.sendMagicLink('a@b.c');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Çok fazla deneme yaptınız, lütfen bekleyin');
    });
  });

  describe('sendOtpCode', () => {
    it('returns success', async () => {
      mockAuth.signInWithOtp.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.sendOtpCode('a@b.c');

      expect(result.success).toBe(true);
    });
  });

  describe('verifyOtpCode', () => {
    it('returns success with session on valid code', async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { user: fakeUser, session: fakeSession },
        error: null,
      });

      const svc = freshService();
      const result = await svc.verifyOtpCode('a@b.c', '123456');

      expect(result.success).toBe(true);
      expect(result.user).toBe(fakeUser);
    });

    it('returns error on invalid code', async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const svc = freshService();
      const result = await svc.verifyOtpCode('a@b.c', 'wrong');

      expect(result.success).toBe(false);
    });
  });

  // ── Password Reset ────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('returns success', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.resetPassword('a@b.c');

      expect(result.success).toBe(true);
    });

    it('returns error on failure', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({
        error: {
          message:
            'For security purposes, you can only request this once every 60 seconds',
        },
      });

      const svc = freshService();
      const result = await svc.resetPassword('a@b.c');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Güvenlik nedeniyle 60 saniye beklemeniz gerekiyor');
    });
  });

  describe('updatePassword', () => {
    it('returns success', async () => {
      mockAuth.updateUser.mockResolvedValue({ error: null });

      const svc = freshService();
      const result = await svc.updatePassword('newpass');

      expect(result.success).toBe(true);
    });

    it('returns mapped error', async () => {
      mockAuth.updateUser.mockResolvedValue({
        error: {
          message: 'New password should be different from the old password',
        },
      });

      const svc = freshService();
      const result = await svc.updatePassword('samepass');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Yeni şifre eskisinden farklı olmalı');
    });
  });

  // ── Profile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns null when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      expect(await svc.getProfile()).toBeNull();
    });

    it('returns null when no user', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });

      const svc = freshService();
      expect(await svc.getProfile()).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('returns error when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      const result = await svc.updateProfile({ displayName: 'x' });
      expect(result.success).toBe(false);
    });

    it('validates username format', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: fakeUser } });

      const svc = freshService();
      const result = await svc.updateProfile({ username: 'a' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('3-16');
    });

    it('rejects special chars in username', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: fakeUser } });

      const svc = freshService();
      const result = await svc.updateProfile({ username: 'bad user!' });

      expect(result.success).toBe(false);
    });

    it('accepts valid username', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: fakeUser } });
      const { railwayClient } = await import('../../../services/api/RailwayClient');
      vi.mocked(railwayClient.patch).mockResolvedValue({});

      const svc = freshService();
      const result = await svc.updateProfile({ username: 'Valid_User1' });

      // Should not fail on validation (may fail on network but that's fine)
      expect(result.success).toBe(true);
    });
  });

  // ── Linked Providers ──────────────────────────────────────────────────

  describe('getLinkedProviders', () => {
    it('returns empty when not configured', async () => {
      mockIsConfigured.mockReturnValue(false);
      const svc = freshService();
      expect(await svc.getLinkedProviders()).toEqual([]);
    });

    it('returns provider list from user identities', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            ...fakeUser,
            identities: [
              { provider: 'google' },
              { provider: 'twitter' },
              { provider: 'unknown_provider' },
            ],
          },
        },
      });

      const svc = freshService();
      const providers = await svc.getLinkedProviders();

      expect(providers).toContain('google');
      expect(providers).toContain('twitter');
      expect(providers).not.toContain('unknown_provider');
    });
  });

  // ── Dispose ────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('unsubscribes auth listener', () => {
      const unsub = vi.fn();
      mockAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsub } },
      });

      const svc = freshService();
      svc.initialize();
      svc.dispose();

      expect(unsub).toHaveBeenCalledOnce();
    });

    it('is safe to call multiple times', () => {
      const svc = freshService();
      svc.dispose();
      svc.dispose(); // no throw
    });
  });

  // ── Error mapping ─────────────────────────────────────────────────────

  describe('error mapping', () => {
    const cases: Array<[string, string]> = [
      ['Invalid login credentials', 'Email veya şifre hatalı'],
      ['Email not confirmed', 'Lütfen email adresinizi doğrulayın'],
      ['User already registered', 'Bu email zaten kayıtlı'],
      ['Password should be at least 6 characters', 'Şifre en az 6 karakter olmalı'],
      ['Auth session missing!', 'Oturum bulunamadı, lütfen tekrar giriş yapın'],
      ['Some unknown error', 'Some unknown error'], // passthrough
    ];

    it.each(cases)('maps "%s" → "%s"', async (input, expected) => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: input },
      });

      const svc = freshService();
      const result = await svc.signIn({ email: 'a@b.c', password: 'x' });

      expect(result.error).toBe(expected);
    });
  });
});
