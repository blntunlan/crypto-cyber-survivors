import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../services/auth/AuthService';
import { supabase } from '../../../services/supabase/client';

// Mock Supabase client
vi.mock('../../../services/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

describe('AuthService - OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInWithOtp', () => {
    it('should call supabase.auth.signInWithOtp with email', async () => {
      const email = 'test@example.com';
      (supabase.auth.signInWithOtp as any).mockResolvedValue({ error: null });

      await AuthService.signInWithOtp(email);

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
    });

    it('should throw error if signInWithOtp fails', async () => {
      const error = { message: 'OTP failed' };
      (supabase.auth.signInWithOtp as any).mockResolvedValue({ error });

      await expect(AuthService.signInWithOtp('test@example.com')).rejects.toThrow(
        'OTP failed'
      );
    });
  });

  describe('verifyOtp', () => {
    it('should call supabase.auth.verifyOtp with email and token', async () => {
      const email = 'test@example.com';
      const token = '123456';
      const mockSession = { user: { id: '1' }, access_token: 'token' };

      (supabase.auth.verifyOtp as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await AuthService.verifyOtp(email, token);

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email,
        token,
        type: 'email',
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw error if verifyOtp fails', async () => {
      const error = { message: 'Invalid token' };
      (supabase.auth.verifyOtp as any).mockResolvedValue({ error });

      await expect(AuthService.verifyOtp('test@example.com', '123456')).rejects.toThrow(
        'Invalid token'
      );
    });
  });
});
