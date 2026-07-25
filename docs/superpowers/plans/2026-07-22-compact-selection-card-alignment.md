# Compact Selection Card Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vertically and horizontally center compact selection-card labels across cyberpunk and retro themes.

**Architecture:** The shared `compact` size owns geometry for all compact selection cards. Theme tests lock the same alignment contract for both skin definitions without adding per-screen overrides.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS utilities, Vitest, Testing Library

## Global Constraints

- Preserve existing compact control dimensions and touch targets.
- Preserve theme colors, borders, focus behavior, and selected effects.
- Do not add `MainMenu`-specific transforms or viewport state.

---

### Task 1: Compact Selection Card Alignment

**Files:**
- Modify: `config/ui/componentVariants.ts:146`
- Test: `tests/components/themed/ThemedPrimitives.test.tsx:100`

**Interfaces:**
- Consumes: `UI_COMPONENT_SKINS` compact selection-card size classes.
- Produces: Shared `items-center justify-center leading-none` alignment for compact cards in both themes.

- [ ] **Step 1: Write the failing theme contract test**

Render compact `ThemedSelectionCard` instances under cyberpunk and retro theme providers, then assert both controls contain `items-center`, `justify-center`, and `leading-none`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npx vitest run tests/components/themed/ThemedPrimitives.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because `items-center` and `leading-none` are absent.

- [ ] **Step 3: Implement the shared alignment contract**

Update both compact size strings to:

```ts
compact: 'min-h-11 min-w-[50px] items-center justify-center px-3 py-2 text-xs leading-none',
```

- [ ] **Step 4: Run focused verification**

Run: `npx vitest run tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS.

Run: `npx eslint config/ui/componentVariants.ts tests/components/themed/ThemedPrimitives.test.tsx`

Expected: PASS.
