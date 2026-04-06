import { type ReactNode } from 'react';
import { useUser } from '@/contexts/useUser';

type AuthGuardProps = {
  children: ReactNode;
  /** Component to show while auth state is loading */
  loadingFallback?: ReactNode;
  /** Component to show when not authenticated */
  unauthenticatedFallback?: ReactNode;
  /** If true, allows unauthenticated access (renders children regardless) */
  optional?: boolean;
};

/**
 * AuthGuard — wraps content that requires authentication.
 *
 * Usage:
 *   <AuthGuard>
 *     <ProtectedContent />
 *   </AuthGuard>
 *
 *   <AuthGuard optional>
 *     <ContentWithOptionalAuth />
 *   </AuthGuard>
 */
export function AuthGuard({
  children,
  loadingFallback,
  unauthenticatedFallback,
  optional = false,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      )
    );
  }

  if (!isAuthenticated && !optional) {
    return unauthenticatedFallback ?? null;
  }

  return children;
}
