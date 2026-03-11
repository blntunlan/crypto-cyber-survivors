import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurfaceState } from '../../hooks/useSurfaceState';
import { UserPersistenceService } from '../../services/auth/UserPersistenceService';
import { UserSessionService } from '../../services/auth/UserSessionService';

vi.mock('../../services/auth/UserPersistenceService', () => ({
  UserPersistenceService: {
    initialize: vi.fn(),
  },
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(),
  },
}));

type StoredUser = Awaited<ReturnType<typeof UserPersistenceService.initialize>>;

describe('useSurfaceState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    vi.mocked(UserPersistenceService.initialize).mockResolvedValue(null);
    vi.mocked(UserSessionService.getNickname).mockReturnValue(null);
  });

  it('skips landing when has_seen_landing is true', () => {
    localStorage.setItem('has_seen_landing', 'true');

    const { result } = renderHook(() => useSurfaceState());

    expect(result.current.showLanding).toBe(false);
  });

  it('syncs legal route from URL path', async () => {
    window.history.pushState(null, '', '/docs');

    const { result } = renderHook(() => useSurfaceState());

    await waitFor(() => {
      expect(result.current.showDocs).toBe(true);
    });
    expect(result.current.showPrivacy).toBe(false);
    expect(result.current.showTerms).toBe(false);
  });

  it('falls back to session nickname when persistence initialize fails', async () => {
    vi.mocked(UserPersistenceService.initialize).mockRejectedValue(
      new Error('storage_unavailable')
    );
    vi.mocked(UserSessionService.getNickname).mockReturnValue('BackupNick');

    const { result } = renderHook(() => useSurfaceState());

    await waitFor(() => {
      expect(result.current.isIdentityReady).toBe(true);
    });
    expect(result.current.hasNickname).toBe(true);
  });

  it('persists hub screen to session storage when setHubScreen is called', async () => {
    const user: StoredUser = {
      profileId: '00000000-0000-0000-0000-000000000000',
      nickname: 'Neo',
      createdAt: 1,
      lastSeenAt: 1,
    };
    vi.mocked(UserPersistenceService.initialize).mockResolvedValue(user);

    const { result } = renderHook(() => useSurfaceState());

    act(() => {
      result.current.setHubScreen('play');
    });

    await waitFor(() => {
      expect(result.current.hubScreen).toBe('play');
    });
    expect(sessionStorage.getItem('ui_hub_screen')).toBe('play');
  });

  it('handleLaunchGame hides landing and persists active surface', () => {
    const { result } = renderHook(() => useSurfaceState());

    expect(result.current.showLanding).toBe(true);

    act(() => {
      result.current.handleLaunchGame();
    });

    expect(result.current.showLanding).toBe(false);
    expect(localStorage.getItem('has_seen_landing')).toBe('true');
    expect(sessionStorage.getItem('ui_active_surface')).toBe('app');
  });

  it('handleReturnToLanding resets legal route and returns to root path', async () => {
    window.history.pushState(null, '', '/privacy');

    const { result } = renderHook(() => useSurfaceState());

    await waitFor(() => {
      expect(result.current.showPrivacy).toBe(true);
    });

    act(() => {
      result.current.handleReturnToLanding();
    });

    await waitFor(() => {
      expect(result.current.showLanding).toBe(true);
    });
    expect(result.current.showPrivacy).toBe(false);
    expect(result.current.showTerms).toBe(false);
    expect(result.current.showDocs).toBe(false);
    expect(window.location.pathname).toBe('/');
    expect(localStorage.getItem('has_seen_landing')).toBeNull();
    expect(sessionStorage.getItem('ui_active_surface')).toBe('landing');
  });
});
