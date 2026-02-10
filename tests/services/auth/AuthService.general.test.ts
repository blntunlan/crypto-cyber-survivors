import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../services/auth/AuthService';
import { supabase } from '../../../services/supabase/client';

// Mock Supabase client
vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('AuthService - General', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithPassword', () => {
    it('should call supabase.auth.signInWithPassword with credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockSession = { user: { id: '1' }, access_token: 'token' };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await AuthService.signInWithPassword(email, password);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw error if signInWithPassword fails', async () => {
      const error = { message: 'Invalid credentials' };
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ error });

      await expect(
        AuthService.signInWithPassword('test@example.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signInWithOAuth', () => {
    it('should call supabase.auth.signInWithOAuth with provider', async () => {
      const provider = 'google';
      (supabase.auth.signInWithOAuth as any).mockResolvedValue({ error: null });

      await AuthService.signInWithOAuth(provider);

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: expect.stringContaining(window.location.origin),
        },
      });
    });

    it('should throw error if signInWithOAuth fails', async () => {
      const error = { message: 'OAuth failed' };
      (supabase.auth.signInWithOAuth as any).mockResolvedValue({ error });

      await expect(AuthService.signInWithOAuth('google')).rejects.toThrow(
        'OAuth failed'
      );
    });
  });
});
