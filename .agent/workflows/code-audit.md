---
description: A comprehensive workflow to scan, detect, and fix inconsistencies, bugs, and standard violations across the entire codebase.
---

# Codebase Audit and Quality Assurance Workflow

Use this workflow to systematically review the codebase, catch overlooked errors (like browser compatibility issues), enforce coding standards, and ensure overall project health.

## 1. Automated Static Analysis
First, let the tools do the heavy lifting to catch syntax errors, type mismatches, and basic style violations.

1.  **Type Check**: Run the TypeScript compiler to catch type errors.
    ```bash
    npx tsc --noEmit
    ```
2.  **Linting**: Run ESLint to catch style and potential logic errors.
    ```bash
    npm run lint
    ```
3.  **Dependency Check**: Ensure `package.json` and `package-lock.json` are in sync and no vulnerabilities exist.
    ```bash
    npm audit
    ```

## 2. Compatibility and Safety Scan
Manually search (using `grep_search`) for patterns that are known to cause runtime issues or security risks, especially in different environments (Railway vs Local vs Mobile).

1.  **Browser Compatibility**:
    *   Search for `crypto.randomUUID` (replace with `nanoid`).
    *   Search for `window.` usage without checking `typeof window !== 'undefined'` (for potential SSR/Test failures).
    *   Search for `localStorage` without try-catch blocks (can fail in some privacy modes).
2.  **Forbidden Patterns**:
    *   Search for `console.log` (should use `Logger.info/warn/error`).
    *   Search for `any` types (should be strictly typed).
    *   Search for `.env` usage directly in components (should use a Config service or strictly typed env object).
    *   Search for `eval()` or `innerHTML` (security risks).

## 3. Architectural and Standards Review
Review the code against the rules defined in `GEMINI.md`.

1.  **Naming Conventions**:
    *   Verify files in `components/` are **PascalCase** (e.g., `GameEngine.tsx`).
    *   Verify files in `services/` and `hooks/` are **PascalCase** or **camelCase** as appropriate.
    *   Ensure variable/function names are **camelCase**.
2.  **State Management**:
    *   Ensure no complex global state is stored outside of Zustand stores (`useGameStore`) or singleton services.
    *   Check for direct DOM manipulation (should be minimized in React).
3.  **Component Structure**:
    *   Verify React components are Functional Components (no Class Components except ErrorBoundary).
    *   Check `useEffect` and `useCallback` dependency arrays for completeness (ESLint usually catches this, but verify manual suppressions).

## 4. Logic and Consistency Check
Deep dive into specific modules to ensure they make logical sense.

1.  **Hook Integrity**:
    *   Review custom hooks in `hooks/` folder. Are they properly cleaning up side effects (event listeners, intervals)?
2.  **Service Singletons**:
    *   Verify all Services in `services/` correctly implement the Singleton pattern if intended.
    *   Check `EventBus` usage: Are events properly subscribed and **unsubscribed** to prevent memory leaks?

## 5. Test Suite Verification
Ensure the safety net is working.

1.  **Unit Tests**: Run the unit tests to check logic.
    ```bash
    npm run test
    ```
2.  **E2E Tests**: Run critical path E2E tests.
    ```bash
    npx playwright test e2e/game-flow.spec.ts
    ```

## 6. Remediation Plan
For every issue found in steps 1-5:

1.  **Document**: Note the file, line, and nature of the issue.
2.  **Fix**: Apply the fix.
    *   *If it's a style fix:* Auto-fix if possible (`npm run lint:fix`).
    *   *If it's a logic fix:* Write a minimal reproduction test if complex, then fix.
3.  **Verify**: Re-run the relevant test or build step to ensure the fix didn't break anything else.

## 7. Final Sanity Check
Before finishing the session:

// turbo
1.  Run a full build to ensure the application compiles for production.
    ```bash
    npm run build
    ```
