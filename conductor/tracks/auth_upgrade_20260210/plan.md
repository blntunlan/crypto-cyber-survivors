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

- [x] Task: Implement OTP Authentication Logic (c400d82)
    - [x] Create `tests/services/auth/AuthService.otp.test.ts`.
    - [x] Write failing tests for `signInWithOtp` and `verifyOtp`.
    - [x] Implement `AuthService.signInWithOtp(email)` using Supabase.
    - [x] Implement `AuthService.verifyOtp(email, token)`.
    - [x] Refactor and ensure tests pass.
- [x] Task: Implement Password & OAuth Logic (0267b4b)
    - [x] Create `tests/services/auth/AuthService.general.test.ts`.
    - [x] Write failing tests for `signInWithPassword`.
    - [x] Implement `signInWithPassword`.
    - [x] Implement `signInWithOAuth` (wrapper for Supabase `signInWithOAuth`).
    - [x] Refactor and ensure tests pass.
- [x] Task: Conductor - User Manual Verification 'Authentication Service Layer' (Protocol in workflow.md) [checkpoint: 0dd93f9]

## Phase 3: Themed UI Implementation
Build the visual components for the Auth system, strictly adhering to the "Neon-Cyber" aesthetic of the Main Menu/Hub.

- [x] Task: Create Shared Auth UI Components (920f809)
    - [x] Create `components/auth/ui/AuthInput.tsx` (styled like Hub inputs).
    - [x] Create `components/auth/ui/AuthButton.tsx` (Neon hover effects).
    - [x] Create `components/auth/ui/AuthCard.tsx` (Framer motion container).
- [x] Task: Implement Main Auth Screen (6f3cdd4)
    - [x] Create `components/auth/AuthScreen.tsx`.
    - [x] Implement tab switching (Email/Password vs OTP).
    - [x] Integrate `SocialAuthButtons` with neon icons.
    - [x] Apply Framer Motion entry animations.
- [x] Task: Conductor - User Manual Verification 'Themed UI Implementation' (Protocol in workflow.md) [checkpoint: 73ed9ba]

## Phase 4: Onboarding & Nickname Flow
Implement the logic to enforce nickname creation for new users before they can access the game Hub.

- [x] Task: Implement Profile Service (Nickname Logic) (48092e6)
    - [x] Create `tests/services/profile/ProfileService.test.ts`.
    - [x] Write failing tests for `getProfile` and `updateNickname`.
    - [x] Implement `ProfileService.getProfile(userId)` to check existence.
    - [x] Implement `ProfileService.updateNickname(userId, nickname)` with uniqueness check.
    - [x] Refactor and ensure tests pass.
- [x] Task: Implement Nickname Setup UI (d0d6d38)
    - [x] Create `components/auth/NicknameSetup.tsx`.
    - [x] Implement validation (length, allowed characters).
    - [x] Connect to `ProfileService` to save nickname.
- [x] Task: Conductor - User Manual Verification 'Onboarding & Nickname Flow' (Protocol in workflow.md) [checkpoint: 03c26d3]

## Phase 5: Integration & PWA Polish
Connect all pieces: Landing -> Auth -> Nickname -> Hub, and verify PWA behavior.

- [x] Task: Integrate Auth Flow into App Root (070fc43)
    - [x] Update `App.tsx` or Main Router to handle conditional rendering based on `authStage`.
    - [x] Ensure seamless transition from Landing Page "Enter Game" to Auth Screen.
- [ ] Task: PWA & Mobile Optimization
    - [ ] Verify `manifest.json` settings for standalone mode.
    - [ ] Add "Safe Area" padding to Auth screens for notched phones.
    - [ ] Verify keyboard handling (avoid UI shifting/breaking on mobile input).
- [ ] Task: Conductor - User Manual Verification 'Integration & PWA Polish' (Protocol in workflow.md)
