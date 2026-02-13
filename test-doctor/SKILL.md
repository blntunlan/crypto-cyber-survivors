---
name: test-doctor
description: Diagnose and fix chronic test failures in Crypto Survivors, specifically React 19 useEffect errors, Singleton mocking failures, and test isolation issues.
---

# Test Doctor (Crypto Survivors Edition)

## Overview
This skill is specialized in fixing the specific recurring test failures in the **Crypto Survivors** project. It addresses React 19 environment issues, Singleton pattern mocking, and global state contamination.

## Diagnosis & Treatment Guide

### 1. `ReferenceError: useEffect is not defined`
**Context**: Occurs in React 19 + Vitest + JSDOM when components use hooks but React isn't properly available in the test context.
**Treatment**:
- Ensure `import { useEffect, ... } from 'react'` is present in the component.
- In the test file, ensure `import React from 'react'` is present if using JSX.
- Verify `setupFiles` in `vitest.config.ts` includes the necessary polyfills.
- **Fix**: Often requires adding `global.React = React` or ensuring the `jsdom` environment is correctly bootstrapping React.

### 2. `TypeError: ...getInstance is not a function`
**Context**: Service mocks using `vi.mock` often fail to include the static `getInstance` method, causing runtime errors when the component tries to access the service.
**Treatment**:
- **Incorrect Mock**:
  ```typescript
  vi.mock('@/services/core/EventBus', () => ({
    EventBus: { emit: vi.fn(), on: vi.fn() }
  }))
  ```
- **Correct Mock**:
  ```typescript
  vi.mock('@/services/core/EventBus', () => {
    const mock = { emit: vi.fn(), on: vi.fn() };
    return {
      EventBus: {
        getInstance: () => mock,
        // Include other static methods if needed
      }
    };
  })
  ```

### 3. Test Isolation & Singleton State
**Context**: Tests fail because Singletons retain state between runs (e.g., `PlayerTracker` heartbeat, `DifficultyManager` streaks).
**Treatment**:
- Every Singleton MUST have a `reset()` or `destroy()` method.
- Add `afterEach(() => { SomeService.getInstance().reset(); })` to test files.
- **Example Fix**:
  ```typescript
  // PlayerTracker.ts
  public reset() {
    this.stop();
    this.data = [];
  }
  ```

### 4. `AssertionError: expected "vi.fn()" to be called`
**Context**: Event-driven services (`CombatResolutionService`) often fail because the `EventBus` isn't properly captured or the async event loop didn't finish.
**Treatment**:
- Use `await new Promise(resolve => setTimeout(resolve, 0))` to flush the microtask queue.
- Ensure the `EventBus` mock is shared so the test can inspect the same mock instance the service uses.

## Workflow

1. **Analysis**: Run `node parse-tests.cjs test-results.json` to identify the failing file.
2. **Investigation**: Read the failing test file and the corresponding source file.
3. **Draft Fix**: Identify which of the 4 patterns above matches the failure.
4. **Validation**: Run `npm test <path-to-test>` to verify the fix.
5. **Standardization**: Ensure the fix follows the project's architectural standards (GC-free, Singleton).

## References
- See `tests/setup.ts` for existing global mocks.
- See `GEMINI.md` for performance and architectural constraints.