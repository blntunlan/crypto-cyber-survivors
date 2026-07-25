# Main Menu Position Tickets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MainMenu Long/Short cards with simple, aesthetic horizontal position tickets that match both game skins.

**Architecture:** Add a typed `position` variant to the shared selection-card skin and keep all theme visuals there. MainMenu composes semantic accent colors with layout-only classes and existing icons/copy.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS utilities, Vitest, Testing Library

## Global Constraints

- Preserve immediate `onStart`, disabled, keyboard, and focus behavior.
- Keep two equal columns and minimum 44px touch targets on mobile and desktop.
- Use color transitions only; do not add scale or glow-heavy hover animation.
- Do not add new user-facing copy or direct `isRetro` presentation branches in the position controls.
- Preserve all unrelated uncommitted UI refactor work.

---

### Task 1: Main Menu Position Tickets

**Files:**
- Modify: `config/ui/componentVariants.ts`
- Modify: `components/screens/MainMenu.tsx:450`
- Test: `tests/components/themed/ThemedPrimitives.test.tsx`
- Test: `tests/screens/MainMenu.test.tsx`

**Interfaces:**
- Consumes: `ThemedSelectionCard`, `IconTrendUp`, `IconTrendDown`, `selectedLeverage`, and `onStart`.
- Produces: `UiSelectionCardVariant` value `position` with cross-theme styles and two MainMenu position tickets.

- [ ] **Step 1: Write failing position-ticket tests**

In `tests/screens/MainMenu.test.tsx`, render MainMenu and assert the Long and Short buttons expose `data-ui-variant="position"`, retain their direction labels, and each show the selected `10x` leverage. In `tests/components/themed/ThemedPrimitives.test.tsx`, render `variant="position"` cards in cyberpunk and retro themes and assert each class list references `var(--ui-selection-accent)`.

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because `position` is not a valid variant and MainMenu does not expose it.

- [ ] **Step 3: Add the typed shared variant**

Add `position` to `SELECTION_CARD_VARIANTS`, `selectedVariant`, and `variant` for both skins. Use `var(--ui-selection-accent)` for border, text, tinted surface, and selected emphasis; cyberpunk remains rounded and soft, retro remains square and pixel-sharp.

- [ ] **Step 4: Restructure both MainMenu actions**

Set both cards to `variant="position"`, remove position-control `isRetro` branches, and use this shared child structure:

```tsx
<span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
  <IconTrendUp className="size-7 shrink-0 sm:size-8" color="currentColor" />
  <span className="truncate text-sm font-black uppercase leading-none tracking-[0.08em]">
    {t('common.long')}
  </span>
</span>
<span className="font-numbers shrink-0 text-xs font-bold leading-none opacity-75 sm:text-sm">
  {selectedLeverage}x
</span>
<span aria-hidden="true" className="absolute inset-x-3 bottom-2 h-px bg-current opacity-35" />
```

Mirror the icon and label for Short. Keep card `className` layout-only: `items-center justify-between gap-3 landscape:min-h-[64px]`.

- [ ] **Step 5: Run focused verification**

Run: `npx vitest run tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS.

Run: `npx eslint config/ui/componentVariants.ts components/screens/MainMenu.tsx tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx`

Expected: PASS.
