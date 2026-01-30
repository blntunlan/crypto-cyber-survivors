# Workflow Reference

## Complete Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TEST-LINT-FIX WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Initial Assessment                                              │
│ ─────────────────────────────────────────────────────────────────────── │
│ • Check current git status (any uncommitted changes?)                   │
│ • Note current branch                                                   │
│ • Quick scan for obvious issues                                         │
└─────────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: LINT PHASE                                                      │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  2.1 Run initial lint check                                             │
│      Command: npm run lint 2>&1                                         │
│      Capture: error count, file list, error details                     │
│                                                                         │
│  2.2 If errors found:                                                   │
│      ┌──────────────────────────────────────────────────────────┐       │
│      │ 2.2.1 Try auto-fix                                       │       │
│      │       Command: npm run lint:fix                          │       │
│      │                                                          │       │
│      │ 2.2.2 Re-run lint                                        │       │
│      │       Command: npm run lint 2>&1                         │       │
│      │                                                          │       │
│      │ 2.2.3 If still errors:                                   │       │
│      │       • Parse each error                                 │       │
│      │       • Categorize: type, file, line, rule               │       │
│      │       • Apply manual fix                                 │       │
│      │       • Verify fix                                       │       │
│      │                                                          │       │
│      │ 2.2.4 Repeat until clean or MAX_ATTEMPTS (3)             │       │
│      └──────────────────────────────────────────────────────────┘       │
│                                                                         │
│  2.3 Report lint phase results                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FORMAT PHASE                                                    │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Command: npm run format                                                │
│  Note: This is usually non-failing, just reformats files                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: TEST PHASE                                                      │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  4.1 Run full test suite                                                │
│      Command: npm run test 2>&1                                         │
│      Capture: pass/fail count, failure details                          │
│                                                                         │
│  4.2 If failures found:                                                 │
│      ┌──────────────────────────────────────────────────────────┐       │
│      │ For each failing test:                                   │       │
│      │                                                          │       │
│      │ 4.2.1 Extract failure info:                              │       │
│      │       • Test file path                                   │       │
│      │       • Test name/description                            │       │
│      │       • Error message                                    │       │
│      │       • Stack trace                                      │       │
│      │       • Expected vs Received values                      │       │
│      │                                                          │       │
│      │ 4.2.2 Analyze root cause:                                │       │
│      │       • Is the test wrong?                               │       │
│      │       • Is the source code wrong?                        │       │
│      │       • Is a mock missing/incorrect?                     │       │
│      │       • Is there a timing issue?                         │       │
│      │                                                          │       │
│      │ 4.2.3 Apply minimal fix:                                 │       │
│      │       • Edit test file OR source file                    │       │
│      │       • Make smallest possible change                    │       │
│      │                                                          │       │
│      │ 4.2.4 Verify fix:                                        │       │
│      │       Command: npm run test <specific-file>              │       │
│      │                                                          │       │
│      │ 4.2.5 If still failing:                                  │       │
│      │       • Try alternative approach                         │       │
│      │       • Check related tests for patterns                 │       │
│      │                                                          │       │
│      └──────────────────────────────────────────────────────────┘       │
│                                                                         │
│  4.3 Repeat until all pass or MAX_ATTEMPTS (5)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: FINAL VERIFICATION                                              │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                         │
│  5.1 Run complete check:                                                │
│      Command: npm run lint; npm run test                                │
│                                                                         │
│  5.2 Confirm all passing                                                │
│                                                                         │
│  5.3 Report summary:                                                    │
│      • Files modified                                                   │
│      • Errors fixed                                                     │
│      • Final status                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
  │
  ▼
END
```

## Iteration Limits

| Phase | Max Attempts | Reason |
|-------|--------------|--------|
| Lint | 3 | Most lint errors are auto-fixable |
| Test | 5 | Tests may have cascading dependencies |
| Total | 10 | Prevent infinite loops |

## Failure Escalation

If max attempts reached without success:

1. **Report clearly** what couldn't be fixed
2. **Provide analysis** of remaining errors
3. **Suggest manual steps** user can take
4. **Don't silently fail** or delete tests

## Parallel vs Sequential

```
PARALLEL (can run together):
├── Reading multiple error files
├── Analyzing multiple lint errors
└── Gathering context from multiple sources

SEQUENTIAL (must run in order):
├── lint → lint:fix → re-lint
├── Apply fix → Verify fix
└── Test → Fix → Re-test
```

## State Tracking

Track throughout workflow:

```typescript
interface WorkflowState {
  phase: 'lint' | 'format' | 'test' | 'verify';
  attempt: number;
  
  lint: {
    initialErrors: number;
    autoFixed: number;
    manualFixed: number;
    remaining: number;
  };
  
  test: {
    total: number;
    passed: number;
    failed: number;
    fixed: number;
  };
  
  filesModified: string[];
}
```
