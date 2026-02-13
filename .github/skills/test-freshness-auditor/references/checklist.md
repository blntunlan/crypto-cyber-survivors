# Test Freshness and Adequacy Checklist

Use this checklist while reviewing each source file.

## 1) Freshness

- Does a related test file exist?
- Was the source file modified after the latest related test?
- Did public behavior (output, side effects, error handling) change?
- Did dependencies, hooks, or service contracts change?

## 2) Adequacy

- Does the test cover the main success path?
- Does the test cover failure or boundary paths?
- Do assertions verify behavior, not only implementation details?
- Are mocks aligned with current API/contracts?
- Are async cases awaited and deterministic?

## 3) Action Rules

- If no related test exists, add one.
- If test exists but misses changed behavior, update it.
- If change is risky (state, async, integration path), add at least one extra edge-case test.
- If tests fail due real regressions, fix source code first, then expectations.

## 4) Completion Gate

Before marking a file complete:

- Related tests pass locally.
- Lint passes for touched files.
- No intentionally weakened assertions.
- Residual risks are documented.
