---
name: test-freshness-auditor
description: Audit test freshness and adequacy by reviewing source files one by one, mapping each file to related tests, and updating or adding tests with minimal behavior-safe changes. Use when asked to check whether tests are up to date, find missing coverage after refactors, verify test sufficiency for changed files, or improve CI reliability by fixing stale tests.
---

# Test Freshness Auditor

## Overview

Audit source files systematically and keep tests current, sufficient, and passing. Prefer targeted updates over large rewrites and finish with verification commands.

## Workflow

1. Build a file-by-file inventory.
2. Map every source file to related tests.
3. Classify each file (`missing`, `stale`, `ok`).
4. Update tests and source code as needed.
5. Run targeted tests first, then baseline verification.

## Step 1: Inventory and Mapping

Run the bundled scanner first:

```bash
python .github/skills/test-freshness-auditor/scripts/test_gap_report.py --root .
```

Use this as a triage queue, then inspect files one by one.
For mapping details and path heuristics, read `references/mapping-rules.md`.

## Step 2: Judge Freshness and Adequacy

Apply the checklist in `references/checklist.md`.
Treat a test as stale if source behavior changed but assertions or edge cases were not updated.

Use this decision order:
- `missing`: Add new tests first.
- `stale`: Update expectations/mocks/setup to match intended behavior.
- `ok`: Keep unchanged unless risk is high.

## Step 3: Implement Minimal Safe Changes

For each prioritized file:
- Edit the closest existing test file if one exists.
- Add a new test file only when no realistic test exists.
- Cover behavior contracts, boundary cases, and failure paths.
- Avoid weakening assertions just to make tests pass.

Target patterns in this repository:
- React/hooks: `tests/**/*.test.tsx`
- Services/utils: `tests/**/*.test.ts`
- Integration flows: `tests/integration/**/*.test.tsx`
- E2E behavior: `e2e/**/*.spec.ts` (only when user asks for E2E scope)

## Step 4: Verify in Tight Loops

Run focused checks before full suite:

```bash
npx vitest run tests/path/to/target.test.ts
npm run lint
npm run test
```

When E2E is in scope:

```bash
npm run test:e2e -- --project=chromium -g "<target scenario>"
```

## Step 5: Report Clearly

Report:
- files reviewed
- missing tests added
- stale tests updated
- commands run and outcomes
- residual risks or untested areas

## Guardrails

- Prefer behavior-preserving fixes over invasive refactors.
- Keep tests deterministic; mock external IO where practical.
- Do not skip failing tests silently.
- Do not stop at diagnostics unless user explicitly asks for report-only mode.
