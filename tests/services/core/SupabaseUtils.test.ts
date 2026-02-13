import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseUtils } from '../../../services/core/SupabaseUtils';
import { UserPersistenceService } from '../../../services/auth/UserPersistenceService';

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    onError: vi.fn(() => () => undefined),
  },
}));

vi.mock('../../../services/auth/UserPersistenceService', () => ({
  UserPersistenceService: {
    getLegacyStoredUser: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('SupabaseUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fetched data when query succeeds', async () => {
    const query = {
      maybeSingle: vi.fn(async () => ({ data: { id: 1 }, error: null })),
    };
    const result = await SupabaseUtils.safeFetchSingle<{ id: number }>(
      query,
      'Profile'
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 1 });
    }
  });

  it('returns failure and clears stale profile when critical resource is missing', async () => {
    // @ts-expect-error test mock
    UserPersistenceService.getLegacyStoredUser.mockReturnValue({
      profileId: 'abc',
      nickname: 'x',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    const query = {
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    const result = await SupabaseUtils.safeFetchSingle(query, 'Profile', true);

    expect(result.success).toBe(false);
    expect(UserPersistenceService.clear).toHaveBeenCalledTimes(1);
  });
});
