# Responsive Overlay Back Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep overlay navigation controls proportional on desktop while preserving a 44 × 44 mobile touch target.

**Architecture:** `OverlayBackButton` remains the shared responsive sizing boundary for `Hub`, `Info`, and default back actions. A focused component test treats its mobile and desktop utility classes as a UI contract.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS utility classes, Vitest, Testing Library

## Global Constraints

- Preserve themed primitive colors, borders, typography, and focus behavior.
- Keep mobile touch targets at least 44 × 44 pixels.
- Do not introduce viewport state or per-screen presentation branches.

---

### Task 1: Responsive Overlay Navigation Sizing

**Files:**
- Modify: `components/ui/OverlayChrome.tsx:149`
- Test: `tests/components/ui/OverlayChrome.test.tsx:16`

**Interfaces:**
- Consumes: `OverlayBackButtonProps` and `ThemedButton` small-size styling.
- Produces: One shared responsive sizing contract for all `OverlayBackButton` consumers.

- [ ] **Step 1: Write the failing responsive contract test**

Render `<OverlayBackButton label="Hub" onClick={vi.fn()} />`, select the button by accessible name, and assert that it includes `h-11 w-11 px-0 sm:h-auto sm:w-auto sm:px-3`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run tests/components/ui/OverlayChrome.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because the desktop padding and explicit square mobile dimensions are absent.

- [ ] **Step 3: Implement the minimal responsive classes**

Replace the current layout override with:

```tsx
className={cn(
  'fixed h-11 w-11 px-0 active:scale-95 sm:h-auto sm:w-auto sm:px-3',
  className
)}
```

- [ ] **Step 4: Run focused and UI contract checks**

Run: `npx vitest run tests/components/ui/OverlayChrome.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS.

Run: `npm run check:ui-contract`

Expected: PASS with no themed primitive override violation.

- [ ] **Step 5: Run React diagnostics**

Run: `npx -y react-doctor@latest . --verbose --diff`

Expected: No new error attributable to the responsive button change.
