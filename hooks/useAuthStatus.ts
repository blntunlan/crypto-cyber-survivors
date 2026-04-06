import { useMemo } from 'react';
import { useUser } from '@/contexts/useUser';

/**
 * Lightweight hook that exposes derived auth state.
 * Use this when you only need to know auth status, not the full user object.
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user, nickname } = useUser();

  return useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      hasNickname: !!nickname,
      /** Profile ID if authenticated, otherwise null */
      profileId: user?.profileId ?? null,
    }),
    [isAuthenticated, isLoading, nickname, user?.profileId]
  );
}
