/**
 * useUser - Hook for accessing UserContext
 */

import { useContext } from 'react';
import { UserContext, type UserContextType } from './UserContext';

/**
 * Hook to access user context.
 * Must be used within a UserProvider.
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
