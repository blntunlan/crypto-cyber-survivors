# Specification: Auth & Profile Coverage Boost (80%+)

## Overview
This track aims to drastically increase the test coverage of the authentication and user profile systems from <25% to over 80%. These systems are critical for player data integrity, security, and the Web3 ecosystem. We will implement a comprehensive suite of unit, integration, and component tests.

## Functional Requirements
### 1. Supabase Authentication (`SupabaseAuthService.ts`)
- Test anonymous sign-in, email/magic link flows, and session persistence.
- Mock Supabase client to simulate successful logins and various error codes (e.g., rate limits, invalid credentials).

### 2. Web3 / Phantom Solana (`PhantomAuthService.ts`)
- Test wallet connection, signature generation, and backend verification.
- Simulate Phantom wallet not being installed or user rejecting the signature.

### 3. Social & Social Auth (`TwitterAuthService.ts`, `AuthCallback.tsx`)
- Test the OAuth flow redirection and token exchange.
- Verify state maintenance during the redirect cycle.

### 4. Profile & Stats (`ProfileService.ts`, `ProfileStatsService.ts`)
- Validate leveling logic, stat aggregation (total kills, playtime), and balance updates (gold/gems).
- Ensure RLS (Row Level Security) logic is reflected in service-level error handling.

### 5. UI Components (`LoginScreen.tsx`, `ProfileSettings.tsx`)
- Verify loading states, error message displays, and successful transitions after login.
- Test responsive behavior and touch targets for mobile users.

## Non-Functional Requirements
- **Coverage Target:** Minimum 80% line coverage for all files in `services/auth/` and relevant components.
- **Performance:** Tests must execute within the current CI pipeline time constraints.
- **Reliability:** Use MSW (Mock Service Worker) to eliminate flakey network-dependent tests.

## Acceptance Criteria
- [ ] `SupabaseAuthService.ts` reaches >80% coverage.
- [ ] `PhantomAuthService.ts` reaches >80% coverage.
- [ ] `ProfileService.ts` and `ProfileStatsService.ts` reach >80% coverage.
- [ ] `LoginScreen.tsx` and `ProfileSettings.tsx` have full unit/component test suites.
- [ ] All tests pass in the local and CI environments.
- [ ] Zero regressions in existing authentication functionality.

## Out of Scope
- Implementation of new authentication providers.
- Backend database schema changes (only frontend service logic is being tested).
