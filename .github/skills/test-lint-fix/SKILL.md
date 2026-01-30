---
name: test-lint-fix
description: Automated workflow that runs tests and lint, automatically fixes errors in a smart loop until all pass. Triggers on "test and fix", "lint and fix", "run tests fix errors", "quality check", or CI/CD pipeline failures.
---

# Test & Lint Auto-Fix Skill

Bu skill, testleri ve lint'i çalıştırıp hataları otomatik olarak düzelten akıllı bir döngü sağlar.

## When to Apply This Skill

Apply this skill when the user:

- Asks to **run tests and fix errors**
- Asks to **lint and fix** the codebase
- Mentions **quality check** or **CI fix**
- Wants to **prepare for commit** (pre-commit quality)
- Has **failing tests** and wants them fixed
- Has **lint errors** and wants them fixed
- Mentions **test-lint-fix**, **auto-fix**, or **fix all errors**

**Do NOT apply** when:

- User only wants to see test/lint results without fixing
- User is asking about test writing (use `frontend-testing` skill)
- User wants manual review of specific errors

## Quick Reference

### Available Commands

```bash
# Tests
npm run test              # Run all unit tests (Vitest)
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Lint
npm run lint              # Check lint errors
npm run lint:fix          # Auto-fix lint errors

# Format
npm run format            # Prettier format

# Combined (project specific)
npm run lint:fix; npm run format   # Fix lint + format
```

## Workflow Algorithm (CRITICAL)

### Main Loop: Test → Fix → Lint → Fix → Verify

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART FIX WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LINT PHASE (First - catches syntax errors early)            │
│     ├─→ Run: npm run lint 2>&1                                  │
│     ├─→ If errors:                                              │
│     │     ├─→ Try: npm run lint:fix                             │
│     │     ├─→ Re-check: npm run lint                            │
│     │     └─→ If still errors → MANUAL FIX (analyze & edit)     │
│     └─→ If clean → Continue to Step 2                           │
│                                                                 │
│  2. FORMAT PHASE                                                │
│     └─→ Run: npm run format                                     │
│                                                                 │
│  3. TEST PHASE                                                  │
│     ├─→ Run: npm run test 2>&1                                  │
│     ├─→ If failures:                                            │
│     │     ├─→ Parse error output                                │
│     │     ├─→ Identify failing test file & line                 │
│     │     ├─→ Analyze root cause:                               │
│     │     │     • Test assertion wrong?                         │
│     │     │     • Source code bug?                              │
│     │     │     • Mock/setup issue?                             │
│     │     ├─→ Apply minimal fix                                 │
│     │     └─→ Re-run specific test: npm run test <file>         │
│     └─→ If all pass → Continue to Step 4                        │
│                                                                 │
│  4. VERIFY PHASE                                                │
│     ├─→ Run full suite: npm run lint; npm run test              │
│     └─→ Report final status                                     │
│                                                                 │
│  MAX_ITERATIONS = 5 per phase (prevent infinite loops)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Tree for Test Failures

```
Test Failed
    │
    ├─→ AssertionError (expect failed)
    │     ├─→ Is expected value outdated? → Update test expectation
    │     ├─→ Is source code wrong? → Fix source code
    │     └─→ Is mock returning wrong data? → Fix mock
    │
    ├─→ TypeError / ReferenceError
    │     ├─→ Missing import? → Add import
    │     ├─→ Wrong prop type? → Fix type
    │     └─→ Undefined variable? → Initialize or fix scope
    │
    ├─→ Timeout Error
    │     ├─→ Async not awaited? → Add await
    │     ├─→ Missing act()? → Wrap in act()
    │     └─→ Infinite loop? → Fix logic
    │
    └─→ Module Not Found
          ├─→ Wrong import path? → Fix path
          ├─→ Missing dependency? → npm install
          └─→ Missing mock? → Add mock
```

### Decision Tree for Lint Errors

```
Lint Error
    │
    ├─→ Auto-fixable (--fix handles it)
    │     └─→ Run: npm run lint:fix
    │
    ├─→ unused-vars
    │     ├─→ Actually unused? → Remove variable
    │     └─→ Used but not detected? → Prefix with _ or add eslint-disable
    │
    ├─→ no-explicit-any
    │     └─→ Add proper TypeScript type
    │
    ├─→ react-hooks/exhaustive-deps
    │     ├─→ Missing dependency? → Add to deps array
    │     └─→ Intentionally omitted? → Add eslint-disable comment with reason
    │
    └─→ import/order
          └─→ Usually auto-fixed by lint:fix
```

## Execution Strategy

### Phase 1: Lint Fix

```typescript
// Pseudo-code for lint fix loop
let lintAttempts = 0;
const MAX_LINT_ATTEMPTS = 3;

while (lintAttempts < MAX_LINT_ATTEMPTS) {
  const lintResult = runCommand('npm run lint 2>&1');
  
  if (lintResult.success) {
    log('✅ Lint passed');
    break;
  }
  
  // Try auto-fix first
  runCommand('npm run lint:fix');
  
  // Re-check
  const recheck = runCommand('npm run lint 2>&1');
  if (recheck.success) {
    log('✅ Lint auto-fixed');
    break;
  }
  
  // Parse remaining errors and fix manually
  const errors = parseLintErrors(recheck.output);
  for (const error of errors) {
    manuallyFixLintError(error);
  }
  
  lintAttempts++;
}
```

### Phase 2: Test Fix

```typescript
// Pseudo-code for test fix loop
let testAttempts = 0;
const MAX_TEST_ATTEMPTS = 5;

while (testAttempts < MAX_TEST_ATTEMPTS) {
  const testResult = runCommand('npm run test 2>&1');
  
  if (testResult.success) {
    log('✅ All tests passed');
    break;
  }
  
  // Parse failures
  const failures = parseTestFailures(testResult.output);
  
  for (const failure of failures) {
    // Analyze and fix each failure
    const fix = analyzeTestFailure(failure);
    applyFix(fix);
    
    // Run only the affected test to verify
    const verify = runCommand(`npm run test ${failure.file}`);
    if (!verify.success) {
      // Try alternative fix
      tryAlternativeFix(failure);
    }
  }
  
  testAttempts++;
}
```

## Output Format

### Progress Reporting

```
🔍 Starting Quality Check...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 1: LINT CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Running: npm run lint
  ❌ Found 3 errors
  
  Attempting auto-fix...
  ✅ Fixed 2 errors automatically
  
  Manual fix needed for:
  • services/GameEngine.ts:42 - no-explicit-any
    → Adding type annotation
  
  Re-running lint...
  ✅ Lint passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 2: FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Running: npm run format
  ✅ Formatted 12 files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 3: TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Running: npm run test
  ❌ 2 tests failed
  
  Fixing: tests/services/CombatSystem.spec.ts
  • Line 45: Expected 100, received 99
  • Root cause: Rounding error in damage calculation
  • Fix: Update expectation to use toBeCloseTo()
  ✅ Test fixed
  
  Fixing: tests/hooks/usePlayer.spec.ts
  • Line 23: Cannot read property 'x' of undefined
  • Root cause: Missing mock for PlayerService
  • Fix: Added mock setup
  ✅ Test fixed
  
  Re-running all tests...
  ✅ All 1431 tests passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FINAL VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Lint: PASS
  ✅ Format: PASS  
  ✅ Tests: PASS (1431/1431)

🎉 All quality checks passed!
```

## Important Rules

### DO

1. ✅ Always run lint BEFORE tests (catches syntax errors early)
2. ✅ Use `npm run lint:fix` before manual fixes
3. ✅ Parse error output carefully to understand root cause
4. ✅ Fix ONE error at a time and verify
5. ✅ Run specific test file after fix, not full suite
6. ✅ Report progress clearly with phases
7. ✅ Stop after MAX_ITERATIONS to prevent infinite loops

### DON'T

1. ❌ Don't skip the lint phase
2. ❌ Don't fix multiple unrelated errors at once
3. ❌ Don't delete tests to make them pass
4. ❌ Don't add `// @ts-ignore` unless absolutely necessary
5. ❌ Don't add `eslint-disable` without clear reason
6. ❌ Don't change expected behavior to match wrong implementation

## Error Pattern Recognition

### Common Test Failure Patterns

| Pattern | Likely Cause | Fix Strategy |
|---------|--------------|--------------|
| `Expected X, received Y` | Value mismatch | Check if test or code is wrong |
| `Cannot read property 'x' of undefined` | Missing mock/setup | Add proper mock |
| `Timeout - Async callback` | Missing await | Add await/act() |
| `Module not found` | Wrong import | Fix path or add mock |
| `Type 'X' is not assignable` | Type mismatch | Fix types |
| `act() warning` | State update outside act | Wrap in act() |

### Common Lint Error Patterns

| Rule | Auto-fixable | Manual Fix |
|------|--------------|------------|
| `semi` | ✅ | - |
| `quotes` | ✅ | - |
| `indent` | ✅ | - |
| `no-unused-vars` | ❌ | Remove or prefix with _ |
| `no-explicit-any` | ❌ | Add proper type |
| `react-hooks/exhaustive-deps` | ❌ | Add deps or disable with reason |

## References

- `references/workflow.md` - Detailed workflow steps
- `references/error-patterns.md` - Common error patterns and fixes
- `references/commands.md` - Available npm commands

## Integration with CI/CD

This skill can be used to fix CI failures:

1. Check GitHub Actions failure logs
2. Identify lint/test errors
3. Apply this skill's workflow
4. Push fixes

```bash
# Typical CI fix flow
npm run lint:fix
npm run format
npm run test
git add -A
git commit -m "fix: resolve lint and test errors"
git push
```
