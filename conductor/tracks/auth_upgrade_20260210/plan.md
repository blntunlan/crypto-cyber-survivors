# Implementation Plan - Auth System Upgrade

## Phase 1: Infrastructure & State Management
This phase establishes the foundational services and state management required for the new auth system, ensuring aggressive persistence settings are correctly applied.

- [x] Task: Configure Supabase Client for PWA Persistence (6c130ca)
    - [x] Create/Update `services/supabase/client.ts` to use `localStorage` with explicit persistence settings.
    - [x] Verify `autoRefreshToken` and `persistSession` are enabled.
- [x] Task: Create Auth Store (Zustand) (7bb6fd5)
    - [x] Create `stores/useAuthStore.ts`.
    - [x] Define state: `user`, `session`, `loading`, `error`, `authStage` (e.g., 'LOGIN', 'OTP_VERIFY', 'NICKNAME_SETUP', 'COMPLETE').
    - [x] Implement actions: `setSession`, `setError`, `setStage`, `logout`.
- [x] Task: Conductor - User Manual Verification 'Infrastructure & State Management' (Protocol in workflow.md) [checkpoint: fac42d8]

## Phase 2: Authentication Service Layer (TDD)
Implement the core logic for different authentication methods. This phase is purely functional (headless).

- [ ] Task: Implement OTP Authentication Logic
    - [ ] Create `tests/services/auth/AuthService.otp.test.ts`.
    - [ ] Write failing tests for `signInWithOtp` and `verifyOtp`.
    - [ ] Implement `AuthService.signInWithOtp(email)` using Supabase.
    - [ ] Implement `AuthService.verifyOtp(email, token)`.
    - [ ] Refactor and ensure tests pass.
- [ ] Task: Implement Password & OAuth Logic
    - [ ] Create `tests/services/auth/AuthService.general.test.ts`.
    - [ ] Write failing tests for `signInWithPassword`.
    - [ ] Implement `signInWithPassword`.
    - [ ] Implement `signInWithOAuth` (wrapper for Supabase `signInWithOAuth`).
    - [ ] Refactor and ensure tests pass.
- [ ] Task: Conductor - User Manual Verification 'Authentication Service Layer' (Protocol in workflow.md)

## Phase 3: Themed UI Implementation
Build the visual components for the Auth system, strictly adhering to the "Neon-Cyber" aesthetic of the Main Menu/Hub.

- [ ] Task: Create Shared Auth UI Components
    - [ ] Create `components/auth/ui/AuthInput.tsx` (styled like Hub inputs).
    - [ ] Create `components/auth/ui/AuthButton.tsx` (Neon hover effects).
    - [ ] Create `components/auth/ui/AuthCard.tsx` (Framer motion container).
- [ ] Task: Implement Main Auth Screen
    - [ ] Create `components/auth/AuthScreen.tsx`.
    - [ ] Implement tab switching (Email/Password vs OTP).
    - [ ] Integrate `SocialAuthButtons` with neon icons.
    - [ ] Apply Framer Motion entry animations.
- [ ] Task: Conductor - User Manual Verification 'Themed UI Implementation' (Protocol in workflow.md)

## Phase 4: Onboarding & Nickname Flow
Implement the logic to enforce nickname creation for new users before they can access the game Hub.

- [ ] Task: Implement Profile Service (Nickname Logic)
    - [ ] Create `tests/services/profile/ProfileService.test.ts`.
    - [ ] Write failing tests for `getProfile` and `updateNickname`.
    - [ ] Implement `ProfileService.getProfile(userId)` to check existence.
    - [ ] Implement `ProfileService.updateNickname(userId, nickname)` with uniqueness check.
    - [ ] Refactor and ensure tests pass.
- [ ] Task: Implement Nickname Setup UI
    - [ ] Create `components/auth/NicknameSetup.tsx`.
    - [ ] Implement validation (length, allowed characters).
    - [ ] Connect to `ProfileService` to save nickname.
- [ ] Task: Conductor - User Manual Verification 'Onboarding & Nickname Flow' (Protocol in workflow.md)

## Phase 5: Integration & PWA Polish
Connect all pieces: Landing -> Auth -> Nickname -> Hub, and verify PWA behavior.

- [ ] Task: Integrate Auth Flow into App Root
    - [ ] Update `App.tsx` or Main Router to handle conditional rendering based on `authStage`.
    - [ ] Ensure seamless transition from Landing Page "Enter Game" to Auth Screen.
- [ ] Task: PWA & Mobile Optimization
    - [ ] Verify `manifest.json` settings for standalone mode.
    - [ ] Add "Safe Area" padding to Auth screens for notched phones.
    - [ ] Verify keyboard handling (avoid UI shifting/breaking on mobile input).
- [ ] Task: Conductor - User Manual Verification 'Integration & PWA Polish' (Protocol in workflow.md)
