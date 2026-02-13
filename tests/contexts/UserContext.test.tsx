import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserProvider } from '../../contexts/UserContext';
import { useUser } from '../../contexts/useUser';

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
};

vi.mock('../../services/supabase/client', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-id-12345'),
}));

// Test component to access context
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

describe('UserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset mock chains
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.single.mockReset();
    mockSupabase.rpc.mockReset();

    // Mock hostname for local mode
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with loading true and then false', async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );

      // After initial render, loading should become false
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

  describe('Login', () => {
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

      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('crypto_survivors_user')!);
      expect(stored.nickname).toBe('TestNick');
    });
  });

  describe('Logout', () => {
    it('should clear user on logout', async () => {
      // Pre-populate storage
      const mockUser = {
        profileId: '550e8400-e29b-41d4-a716-446655440010', // Must be UUID
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
  });

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

