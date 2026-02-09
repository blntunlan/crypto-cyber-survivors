---
name: test-autofix
description: Autonomously run tests, analyze failures, and fix broken code or tests in the Crypto Survivors project. Use when tests are failing, coverage is low, or when a "fix and verify" cycle is required.
---

# Test Autofix: The Autonomous Repair Protocol

This skill enables a systematic "Test-Analyze-Fix" loop to ensure 100% test pass rates and high code integrity.

## Core Mandates (No Workarounds)

- **Fix the Root Cause:** Never skip tests (`.skip`), comment out failing assertions, or use `any` to silence type errors in tests unless explicitly instructed.
- **Maintain Architectural Integrity:** Follow project patterns (Singleton services, EventBus, Zustand stores).
- **Test the Fix:** A fix is only complete when the relevant tests pass.
- **Efficiency:** Use parallel execution for independent tests.

## Workflow: The Test-Analyze-Fix Cycle

### 1. Discovery & Execution
Run the full test suite or a specific subset to identify failures.

```bash
# Run all unit tests
npm run test

# Run a specific test file
npx vitest tests/path/to/test.test.ts

# Run E2E tests
npm run test:e2e
```

### 2. Failure Analysis
For each failing test, identify the reason:
- **Regression:** A code change broke existing logic.
- **Environment/Mocking:** The test environment (mocks, timers, globals) is incorrectly set up.
- **Stale Test:** The test expectation is no longer valid due to a deliberate requirement change.
- **Type Mismatch:** TypeScript errors in either code or test.

### 3. Implementation of Fixes
Apply fixes iteratively. 
- If the **code** is wrong: Fix it using the `replace` tool.
- If the **test** is wrong/stale: Update the test to reflect the new correct behavior.
- If **mocking** is missing: Use patterns from [common-mocks.md](references/common-mocks.md).

### 4. Verification
Rerun the failing test. If it passes, run the full suite to ensure no new regressions were introduced.

---

## Fixing Strategies

### Vitest (Unit/Integration)
- **Singleton Reset:** Ensure `Service.initialize()` and `Service.dispose()` are called in `beforeEach`/`afterEach`.
- **Timer Management:** Use `vi.useFakeTimers()` for testing time-based logic (e.g., game loop, cooldowns).
- **EventBus:** Verify listeners are cleaned up to prevent memory leaks and cross-test interference.

### Playwright (E2E)
- **Wait for State:** Use `page.waitForSelector()` or `expect(locator).toBeVisible()` instead of hardcoded timeouts.
- **Debug UI:** Use `npx playwright test --ui` or `PWDEBUG=1` if running locally to see the failure.

### Common Mocking Patterns
See [common-mocks.md](references/common-mocks.md) for standard project mocks:
- `useGameStore` (Zustand)
- `EventBus`
- `Logger`
- `Canvas API` (CanvasRenderingContext2D)