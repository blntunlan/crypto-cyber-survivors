---
name: validate-stability
description: Comprehensive validation of project stability, performance, and code quality without workarounds.
---

# Validate Project Stability & Performance

This skill ensures the project is stable, performant, and correctly tested. It strictly forbids "workarounds" (checking for suppressed errors, skipped tests, or disabled lint rules).

## Usage

```
/validate-stability
```

## Workflow

### 1. Code Quality & Linting (Strict)

Ensure no linting errors exist and no "quick fixes" were applied to suppress them.

```bash
# turbo
npm run lint
```

**Refuse Workarounds:**
- Do NOT use `// eslint-disable` or `// @ts-ignore` to silence errors.
- Fix types properly instead of casting to `any`.
- If `npm run lint` fails, the validation fails.

### 2. Type Checking

Verify TypeScript compilation without emitting files to ensure total type safety.

```bash
# turbo
npm run build
```

*Note: The build process usually runs type checks. If it fails, fix the type errors.*

### 3. Unit & Integration Tests

Run the full test suite.

```bash
# turbo
npm run test
```

**Validation Checks:**
- Ensure NO tests are skipped (`test.skip`, `describe.skip`) without a valid ticket/reason.
- Ensure tests are not just "happy path" (check edge cases).
- If tests fail, fix the *code*, don't change the test to pass unless the requirement changed.

### 4. End-to-End (E2E) & Performance Tests

Run Playwright tests, including performance specs.

```bash
# turbo
npx playwright test e2e/performance/fps.spec.ts
```

*If specific performance tests don't exist yet, run the general E2E suite:*

```bash
# turbo
npm run test:e2e
```

**Performance Criteria:**
- **FPS:** Must maintain >55 FPS in valid gameplay scenarios.
- **Memory:** No significant leaks after scene transitions.
- **Bundle Size:** Check build output. Warning if `index.js` > 500KB (gzip).

### 5. Manual "No Workaround" Audit

Scan critical files for signs of instability or hacks:

1.  **Search for suppressions:**
    - `grep "ts-ignore" . -r`
    - `grep "eslint-disable" . -r`
    - `grep "any" . -r --include="*.ts" --include="*.tsx"` (Allowable in some generic constraints, but suspicious in business logic).
2.  **Search for disabled tests:**
    - `grep ".skip" tests/ -r`
    - `grep ".only" tests/ -r` (Should not be committed).

### 6. Stability Report

If all steps pass, confirm:
- [x] Linting Clean
- [x] Build Successful
- [x] Unit Tests Passed (100%)
- [x] E2E/Perf Tests Passed
- [x] No "Workarounds" Detected

If any step fails, using this skill implies **fixing the root cause**, not patching the symptom.
