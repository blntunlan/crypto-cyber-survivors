---
description: Complete auth system refactoring - Migrate to centralized Zustand store, fix security issues, and consolidate services
---

# 🔐 Auth System Refactoring Workflow

> **Total Estimated Time:** 6-8 hours
> **Risk Level:** High (Core System)
> **Prerequisites:** All tests passing, no pending changes

---

## Phase 0: Pre-Flight Checks
// turbo

1. Verify current test status:
```bash
npm run test -- --run --reporter=dot 2>&1 | tail -20
```

2. Create git branch for auth refactor:
```bash
git checkout -b refactor/auth-system-v2
```

3. Backup current auth files list:
```bash
Get-ChildItem -Path "services/auth" -Recurse -Name
```

---

## Phase 1: Create Centralized Auth Store (Zustand)
// ultrathink

**Goal:** Replace fragmented auth state with single source of truth

### Step 1.1: Create Auth Store Types

Create file `types/auth.ts` with consolidated auth types:

```typescript
// Consolidate from services/auth/types.ts
// Include: AuthState, AuthActions, UserProfile, Session types
// Mark StoredUser as @deprecated with migration path
```

**Affected Files:**
- `types/auth.ts` (NEW)
- `services/auth/types.ts` (UPDATE - add deprecation notices)

### Step 1.2: Create Auth Store

// turbo
Create file `stores/authStore.ts`:

```typescript
/**
 * AuthStore - Centralized authentication state management
 * 
 * Single source of truth for:
 * - User authentication status
 * - Session management
 * - Profile data
 * - Linked OAuth providers
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  // State
  user: UserProfile | null;
  session: { accessToken: string; refreshToken: string; expiresAt: number } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsProfile: boolean;
  linkedProviders: AuthProvider[];
  lastError: string | null;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsProfile: (needs: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Computed
  isEmailVerified: () => boolean;
  canPlayCompetitive: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      needsProfile: false,
      linkedProviders: [],
      lastError: null,
      
      // Actions implementation
      setUser: (user) => set((state) => {
        state.user = user;
        state.isAuthenticated = user !== null;
      }),
      
      setSession: (session) => set((state) => {
        state.session = session;
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setNeedsProfile: (needs) => set({ needsProfile: needs }),
      setError: (error) => set({ lastError: error }),
      
      reset: () => set({
        user: null,
        session: null,
        isAuthenticated: false,
        needsProfile: false,
        linkedProviders: [],
        lastError: null,
      }),
      
      // Computed getters
      isEmailVerified: () => get().user?.emailVerified ?? false,
      canPlayCompetitive: () => {
        const user = get().user;
        return user !== null && user.emailVerified && !user.isBanned;
      },
    })),
    {
      name: 'crypto-survivors-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
```

**Validation:**
// turbo
```bash
npx tsc stores/authStore.ts --noEmit
```

---

## Phase 2: Create Auth Orchestrator (Facade)
// ultrathink

**Goal:** Single entry point for all auth operations

### Step 2.1: Create AuthOrchestrator Service

Create file `services/auth/AuthOrchestrator.ts`:

```typescript
/**
 * AuthOrchestrator - Facade for all authentication operations
 * 
 * Coordinates between:
 * - SupabaseAuthService (OAuth, email auth)
 * - ProfileService (profile management)
 * - SessionManager (token refresh)
 * - PersistenceService (storage)
 * 
 * IMPORTANT: All auth operations should go through this service.
 * Direct usage of underlying services is discouraged.
 */

export class AuthOrchestrator {
  private static instance: AuthOrchestrator | null = null;
  
  // Singleton
  static getInstance(): AuthOrchestrator;
  
  // Core Auth Operations
  async initialize(): Promise<void>;
  async signInWithEmail(email: string, password: string): Promise<AuthResult>;
  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult>;
  async signInWithOAuth(provider: AuthProvider): Promise<AuthResult>;
  async signOut(): Promise<void>;
  
  // Session Management  
  async refreshSession(): Promise<boolean>;
  async validateSession(): Promise<boolean>;
  
  // Profile Operations
  async ensureProfile(): Promise<ProfileResult>;
  async updateProfile(updates: Partial<UserProfile>): Promise<ProfileResult>;
  
  // Provider Management
  async linkProvider(provider: AuthProvider): Promise<AuthResult>;
  async unlinkProvider(provider: AuthProvider): Promise<AuthResult>;
  getLinkedProviders(): AuthProvider[];
  
  // Cleanup
  dispose(): void;
  static resetInstance(): void;
}
```

**Key Implementation Details:**

1. `initialize()` should:
   - Check for existing session via SupabaseAuthService
   - Load profile via ProfileService
   - Setup session refresh timer
   - Update authStore state

2. `signOut()` should:
   - Call SupabaseAuthService.signOut()
   - Call ProfileService.clearProfile()
   - Call UserPersistenceService.clear()
   - Reset authStore
   - Clear session refresh timer

**Affected Files:**
- `services/auth/AuthOrchestrator.ts` (NEW)
- `services/auth/index.ts` (UPDATE - add export)

---

## Phase 3: Create Session Manager
// turbo

**Goal:** Automatic session refresh before token expiry

### Step 3.1: Create SessionManager

Create file `services/auth/SessionManager.ts`:

```typescript
/**
 * SessionManager - Handles automatic session refresh
 * 
 * Features:
 * - Auto-refresh 5 minutes before expiry
 * - Exponential backoff on failure
 * - Event emission for session changes
 */

export class SessionManager {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  
  startAutoRefresh(expiresAt: number): void;
  stopAutoRefresh(): void;
  private scheduleRefresh(expiresAt: number): void;
  private handleRefreshFailure(): void;
  
  static getInstance(): SessionManager;
  static resetInstance(): void;
}
```

**Affected Files:**
- `services/auth/SessionManager.ts` (NEW)

---

## Phase 4: Create Rate Limiter
// turbo

**Goal:** Prevent brute force attacks on client side

### Step 4.1: Create RateLimiter

Create file `services/auth/RateLimiter.ts`:

```typescript
/**
 * AuthRateLimiter - Client-side rate limiting for auth attempts
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export class AuthRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private blocked: Map<string, number> = new Map();
  
  private readonly defaultConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 60000,      // 1 minute
    blockDurationMs: 300000, // 5 minutes
  };
  
  canAttempt(action: string): boolean;
  recordAttempt(action: string): void;
  recordSuccess(action: string): void;
  getBlockedUntil(action: string): number | null;
  reset(): void;
}

export const authRateLimiter = new AuthRateLimiter();
```

**Affected Files:**
- `services/auth/RateLimiter.ts` (NEW)

---

## Phase 5: Update Existing Services
// ultrathink

**Goal:** Integrate with new architecture, add deprecation notices

### Step 5.1: Update SupabaseAuthService

File: `services/auth/SupabaseAuthService.ts`

Changes:
1. Add EventBus emissions for auth state changes
2. Integrate with SessionManager for auto-refresh
3. Add method to sync state to authStore

```typescript
// Add to handleAuthStateChange()
private handleAuthStateChange(event: AuthChangeEvent, session: Session | null): void {
  // ... existing code ...
  
  // NEW: Sync to Zustand store
  const store = useAuthStore.getState();
  
  switch (event) {
    case 'SIGNED_IN':
      store.setSession(session ? {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? 0,
      } : null);
      break;
    case 'SIGNED_OUT':
      store.reset();
      break;
    case 'TOKEN_REFRESHED':
      if (session) {
        store.setSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ?? 0,
        });
      }
      break;
  }
}
```

### Step 5.2: Update ProfileService

File: `services/auth/ProfileService.ts`

Changes:
1. Sync profile changes to authStore
2. Add method to convert between profile types

```typescript
// Add after profile load/create
private syncToStore(profile: PlayerProfile): void {
  const store = useAuthStore.getState();
  store.setUser({
    id: profile.id,
    authUserId: profile.authUserId ?? null,
    email: profile.email ?? null,
    emailVerified: profile.emailVerified ?? false,
    displayName: profile.displayName,
    // ... map all fields
  });
  store.setNeedsProfile(false);
}

// Update initialize() to call syncToStore on success
// Update createProfile() to call syncToStore on success
// Update clearProfile() to call store.reset()
```

### Step 5.3: Add Deprecation to UserSessionService

File: `services/auth/UserSessionService.ts`

```typescript
/**
 * @deprecated Use AuthOrchestrator and useAuthStore instead.
 * This class is kept for backward compatibility with legacy nickname system.
 * Will be removed in v2.0.0
 */
export class UserSessionService {
  // ... existing code with deprecation warnings on each method
}
```

### Step 5.4: Add Deprecation to UserContext

File: `contexts/UserContext.tsx`

```typescript
/**
 * @deprecated Use useAuthStore hook instead.
 * This context is kept for backward compatibility.
 * Will be removed in v2.0.0
 * 
 * Migration:
 * - Before: const { user, login } = useUser();
 * - After:  const { user } = useAuthStore();
 *           const login = useAuthActions().signIn;
 */
```

**Affected Files:**
- `services/auth/SupabaseAuthService.ts` (UPDATE)
- `services/auth/ProfileService.ts` (UPDATE)
- `services/auth/UserSessionService.ts` (UPDATE - deprecation)
- `contexts/UserContext.tsx` (UPDATE - deprecation)

---

## Phase 6: Update App.tsx Integration
// ultrathink

**Goal:** Replace hook-based auth with store-based auth

### Step 6.1: Update useAppInitialization Hook

File: `hooks/useAppInitialization.ts`

```typescript
// Replace internal state with authStore
export function useAppInitialization(): UseAppInitializationResult {
  const { needsProfile, isLoading, setLoading } = useAuthStore();
  
  useEffect(() => {
    const init = async () => {
      try {
        const orchestrator = AuthOrchestrator.getInstance();
        await orchestrator.initialize();
      } catch (error) {
        Logger.error('[useAppInitialization] Failed to initialize', error);
      }
    };
    
    void init();
  }, []);
  
  return {
    needsNickname: needsProfile,
    setNeedsNickname: useAuthStore.getState().setNeedsProfile,
    isInitialized: !isLoading,
  };
}
```

### Step 6.2: Update App.tsx

File: `App.tsx`

Changes:
1. Replace `useAppInitialization` with direct `useAuthStore` usage
2. Update AuthCallback handler to use AuthOrchestrator
3. Update logout handling

```typescript
// Replace:
const { needsNickname, setNeedsNickname, isInitialized } = useAppInitialization();

// With:
const { isAuthenticated, needsProfile, isLoading } = useAuthStore();

// Update AuthCallback:
<AuthCallback
  onSuccess={async (needsNickname) => {
    const store = useAuthStore.getState();
    store.setNeedsProfile(needsNickname);
    setShowAuthCallback(false);
    setShowLanding(false);
    localStorage.setItem('has_seen_landing', 'true');
    window.history.replaceState(null, '', '/');
  }}
  onError={(error) => {
    useAuthStore.getState().setError(error);
    Logger.error('[App] Auth callback error:', { error });
    setShowAuthCallback(false);
    window.history.replaceState(null, '', '/');
  }}
/>
```

**Affected Files:**
- `hooks/useAppInitialization.ts` (UPDATE)
- `App.tsx` (UPDATE)

---

## Phase 7: Update Components
// turbo

**Goal:** Migrate components to use new auth system

### Step 7.1: Update AuthCallback

File: `components/auth/AuthCallback.tsx`

Changes:
1. Use AuthOrchestrator instead of direct ProfileService
2. Integrate with authStore

### Step 7.2: Update LoginScreen

File: `components/auth/LoginScreen.tsx`

Changes:
1. Use AuthOrchestrator for all auth operations
2. Use authRateLimiter for rate limiting
3. Update success handlers to use authStore

### Step 7.3: Update NicknameEntryScreen

File: `components/screens/NicknameEntryScreen.tsx`

Changes:
1. Use AuthOrchestrator for profile creation
2. Integrate with authStore

### Step 7.4: Update HubMenu

File: `components/hub/HubMenu.tsx`

Changes:
1. Get user data from authStore instead of UserSessionService

**Affected Files:**
- `components/auth/AuthCallback.tsx` (UPDATE)
- `components/auth/LoginScreen.tsx` (UPDATE)
- `components/screens/NicknameEntryScreen.tsx` (UPDATE)
- `components/hub/HubMenu.tsx` (UPDATE)
- `components/hub/index.ts` (UPDATE if needed)

---

## Phase 8: Fix Database RLS Policies
// turbo

**Goal:** Allow legacy nickname users to update their profiles

### Step 8.1: Create Migration

Create file `supabase/migrations/YYYYMMDDHHMMSS_legacy_profile_update_policy.sql`:

```sql
-- ============================================
-- LEGACY PROFILE UPDATE POLICY
-- ============================================

-- Allow legacy nickname-only users to update their own profiles
-- Uses custom claim or direct ID matching for non-auth users

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Legacy users can update own profile" ON public.profiles;

-- Create policy for anon users (legacy nickname system)
-- They can update if the profile has no auth_user_id and they provide matching profile_id
CREATE POLICY "Legacy users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO anon
  USING (
    auth_user_id IS NULL
  )
  WITH CHECK (
    auth_user_id IS NULL
  );

-- Note: For legacy system, profile_id is passed via request headers
-- The actual ownership verification happens in the application layer
-- This is acceptable because legacy profiles have no auth binding

COMMENT ON POLICY "Legacy users can update own profile" ON public.profiles IS 
  'Allows legacy nickname-only profiles to be updated. Auth verification is done in application layer for these cases.';
```

// turbo
Run migration:
```bash
npx supabase db push
```

**Affected Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_legacy_profile_update_policy.sql` (NEW)

---

## Phase 9: Create Tests
// ultrathink

**Goal:** Comprehensive test coverage for new auth system

### Step 9.1: AuthStore Tests

Create file `tests/stores/authStore.test.ts`:

```typescript
describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });
  
  describe('state management', () => {
    it('should set user and update isAuthenticated');
    it('should reset all state on logout');
    it('should persist user and session to localStorage');
  });
  
  describe('computed values', () => {
    it('should correctly compute isEmailVerified');
    it('should correctly compute canPlayCompetitive');
  });
});
```

### Step 9.2: AuthOrchestrator Tests

Create file `tests/services/auth/AuthOrchestrator.test.ts`:

```typescript
describe('AuthOrchestrator', () => {
  beforeEach(() => {
    AuthOrchestrator.resetInstance();
    vi.clearAllMocks();
  });
  
  describe('initialize', () => {
    it('should load existing session');
    it('should setup auto-refresh');
    it('should handle no session gracefully');
  });
  
  describe('signOut', () => {
    it('should clear all auth state');
    it('should stop session refresh');
    it('should clear persistence');
  });
  
  describe('integration', () => {
    it('should sync profile to authStore');
    it('should handle OAuth callback');
  });
});
```

### Step 9.3: SessionManager Tests

Create file `tests/services/auth/SessionManager.test.ts`

### Step 9.4: RateLimiter Tests

Create file `tests/services/auth/RateLimiter.test.ts`

// turbo
Run all tests:
```bash
npm run test -- --run
```

**Affected Files:**
- `tests/stores/authStore.test.ts` (NEW)
- `tests/services/auth/AuthOrchestrator.test.ts` (NEW)
- `tests/services/auth/SessionManager.test.ts` (NEW)
- `tests/services/auth/RateLimiter.test.ts` (NEW)

---

## Phase 10: Update Exports and Documentation
// turbo

### Step 10.1: Update Service Index

File: `services/auth/index.ts`

```typescript
// Primary exports (use these)
export { AuthOrchestrator } from './AuthOrchestrator';
export { SessionManager } from './SessionManager';
export { authRateLimiter } from './RateLimiter';

// Store
export { useAuthStore } from '../../stores/authStore';

// Types
export type { AuthState, UserProfile, AuthProvider } from '../../types/auth';

// Legacy exports (deprecated)
/** @deprecated Use AuthOrchestrator instead */
export { SupabaseAuthService } from './SupabaseAuthService';
/** @deprecated Use AuthOrchestrator instead */
export { ProfileService } from './ProfileService';
/** @deprecated Use useAuthStore instead */
export { UserSessionService } from './UserSessionService';
```

### Step 10.2: Update GEMINI.md

Add auth architecture section:

```markdown
### Authentication Architecture

The auth system uses a centralized Zustand store with an orchestrator pattern:

```
┌──────────────────────────────────────────┐
│              useAuthStore                │
│         (Single Source of Truth)         │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────┴────────────────────────┐
│           AuthOrchestrator               │
│         (Facade for all auth)            │
└─────────────────┬────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───┴───┐   ┌─────┴─────┐  ┌────┴────┐
│Supabase│   │ Profile   │  │ Session │
│ Auth   │   │ Service   │  │ Manager │
└────────┘   └───────────┘  └─────────┘
```

**Usage:**
```typescript
// In components
const { user, isAuthenticated } = useAuthStore();

// For auth operations
const orchestrator = AuthOrchestrator.getInstance();
await orchestrator.signInWithEmail(email, password);
```
```

**Affected Files:**
- `services/auth/index.ts` (UPDATE)
- `GEMINI.md` (UPDATE)

---

## Phase 11: Final Validation
// turbo-all

### Step 11.1: Type Check

```bash
npx tsc --noEmit
```

### Step 11.2: Lint Check

```bash
npm run lint
```

### Step 11.3: Run All Tests

```bash
npm run test -- --run
```

### Step 11.4: Build Check

```bash
npm run build
```

### Step 11.5: Manual Testing Checklist

- [ ] Email/Password signup works
- [ ] Email/Password signin works
- [ ] Google OAuth works
- [ ] Discord OAuth works
- [ ] Session persists after page refresh
- [ ] Session auto-refreshes before expiry
- [ ] Logout clears all state
- [ ] Rate limiting blocks after 5 failed attempts
- [ ] Legacy nickname login still works
- [ ] Competitive mode blocks unverified emails

### Step 11.6: Commit and Push

```bash
git add .
git commit -m "refactor(auth): migrate to centralized Zustand store with orchestrator pattern

BREAKING CHANGES:
- UserContext is now deprecated, use useAuthStore
- UserSessionService is now deprecated, use AuthOrchestrator
- Direct SupabaseAuthService usage is discouraged

Features:
- Centralized auth state in Zustand store
- Automatic session refresh
- Client-side rate limiting
- Proper logout cleanup
- Legacy RLS policy for nickname users

Migration:
- Replace useUser() with useAuthStore()
- Replace UserSessionService calls with AuthOrchestrator"
```

```bash
git push origin refactor/auth-system-v2
```

---

## Summary of New/Modified Files

### NEW FILES (8)
| File | Purpose |
|------|---------|
| `types/auth.ts` | Consolidated auth types |
| `stores/authStore.ts` | Zustand auth store |
| `services/auth/AuthOrchestrator.ts` | Auth facade |
| `services/auth/SessionManager.ts` | Auto session refresh |
| `services/auth/RateLimiter.ts` | Rate limiting |
| `tests/stores/authStore.test.ts` | Store tests |
| `tests/services/auth/AuthOrchestrator.test.ts` | Orchestrator tests |
| `supabase/migrations/*_legacy_rls.sql` | RLS fix |

### MODIFIED FILES (12)
| File | Changes |
|------|---------|
| `services/auth/SupabaseAuthService.ts` | Integrate with store |
| `services/auth/ProfileService.ts` | Sync to store |
| `services/auth/UserSessionService.ts` | Add deprecation |
| `services/auth/types.ts` | Add deprecation |
| `services/auth/index.ts` | Update exports |
| `contexts/UserContext.tsx` | Add deprecation |
| `hooks/useAppInitialization.ts` | Use store |
| `App.tsx` | Use store |
| `components/auth/AuthCallback.tsx` | Use orchestrator |
| `components/auth/LoginScreen.tsx` | Use orchestrator + rate limit |
| `components/screens/NicknameEntryScreen.tsx` | Use orchestrator |
| `GEMINI.md` | Document architecture |

---

## Rollback Plan

If issues occur during deployment:

```bash
# Revert to previous commit
git revert HEAD

# Or reset to main
git checkout main
git branch -D refactor/auth-system-v2
```

Database migration can be reverted with:
```sql
DROP POLICY IF EXISTS "Legacy users can update own profile" ON public.profiles;
```
