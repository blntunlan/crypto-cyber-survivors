# Implementation Plan: Auth & Profile Coverage Boost (80%+)

This plan follows the TDD-heavy workflow to increase coverage from <25% to >80% for the authentication and profile stack.

## Phase 1: Infrastructure & Shared Mocks
Prepare the testing environment with robust handlers for Supabase, Solana, and Twitter APIs.

- [ ] Task: Audit and Expand MSW Handlers for Auth
    - [ ] Create `tests/mocks/handlers/auth.ts` with comprehensive Supabase Auth API mocks.
    - [ ] Create `tests/mocks/handlers/solana.ts` to simulate RPC responses for wallet interactions.
- [ ] Task: Create Shared Auth Test Utilities
    - [ ] Implement `tests/utils/auth-test-utils.ts` for common setup/teardown of auth states.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure' (Protocol in workflow.md)

## Phase 2: Core Auth Services
Focus on the primary login and session management services.

- [ ] Task: Increase Coverage for `SupabaseAuthService.ts`
    - [ ] Write failing tests for email/magic link and logout flows.
    - [ ] Implement fixes/enhancements to pass tests and hit >80%.
- [ ] Task: Increase Coverage for `UserPersistenceService.ts` & `UserSessionService.ts`
    - [ ] Add edge case tests for storage failure and corrupted sessions.
    - [ ] Ensure persistence logic is fully covered.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Auth' (Protocol in workflow.md)

## Phase 3: Web3 & Social Integration
Testing the more complex third-party integration points.

- [ ] Task: Increase Coverage for `PhantomAuthService.ts`
    - [ ] Write tests for wallet detection, connection, and signature signing.
    - [ ] Mock window.solana and simulate various user rejections.
- [ ] Task: Increase Coverage for `TwitterAuthService.ts`
    - [ ] Implement unit tests for the OAuth login flow and state persistence.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Web3 & Social' (Protocol in workflow.md)

## Phase 4: Profile & User Statistics
Ensure player progression and balance data is accurately handled.

- [ ] Task: Increase Coverage for `ProfileService.ts`
    - [ ] Write tests for profile fetching, nickname updates, and avatar management.
- [ ] Task: Increase Coverage for `ProfileStatsService.ts`
    - [ ] Validate leveling math, stat aggregation (kills/time), and gold/gem balance logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Profiles' (Protocol in workflow.md)

## Phase 5: Auth & Profile UI
Verify the user experience and state transitions in the React layer.

- [ ] Task: Component Tests for `LoginScreen.tsx` & `AuthCallback.tsx`
    - [ ] Test form validation, provider selection, and error toast displays.
- [ ] Task: Component Tests for `ProfileSettings.tsx`
    - [ ] Verify stat displays and nickname change constraints.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: UI' (Protocol in workflow.md)
