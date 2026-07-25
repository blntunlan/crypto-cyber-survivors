# Main Menu Asset Selector Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Main Menu asset icons and labels readable on mobile and desktop while preserving selection behavior.

**Architecture:** Keep pair data and interaction logic in `CryptoSelector`, but move theme-specific presentation into a typed `ThemedSelectionCard` `asset` variant. Replace the floating controls with responsive equal-width themed cards and cover the contract with focused component and cross-theme primitive tests.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Vitest, Testing Library

## Global Constraints

- Preserve `selected`, `onSelect`, `disabled`, and pair-selection audio behavior.
- Keep all asset targets at least 56px high.
- Do not add direct `isRetro` presentation branches in `CryptoSelector`.
- Do not change Main Menu gameplay or keyboard navigation.

---

### Task 1: Readable Asset Cards

**Files:**
- Create: `tests/components/ui/CryptoSelector.test.tsx`
- Modify: `tests/components/themed/ThemedPrimitives.test.tsx`
- Modify: `config/ui/componentVariants.ts`
- Modify: `components/ui/CryptoSelector.tsx`

**Interfaces:**
- Consumes: `CryptoSelectorProps`, `CRYPTO_PAIRS`, and existing card icons.
- Produces: Typed `asset` selection-card variants and three accessible asset buttons with semantic selected state and readable icon/label sizing.

- [ ] **Step 1: Write the failing test**

Add a component test that renders BTC selected and asserts that BTC, ETH, and SOL are accessible buttons with `data-ui-variant="asset"`, that BTC exposes the selected state, every label uses the readable asset-label marker, and clicking ETH calls `onSelect('ETH')`. Add a themed primitive test that verifies the `asset` variant references the selection accent in both themes.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/ui/CryptoSelector.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because the typed `asset` variant and readability contract do not exist yet.

- [ ] **Step 3: Implement responsive asset cards**

Add `asset` to `SELECTION_CARD_VARIANTS` and to both themes' `variant` and `selectedVariant` maps. Use a three-column container, minimum 56px card height, 36–40px icons, 10px bold labels, and approximately 65% inactive opacity without grayscale. Preserve the selected accent surface, clear border, and signal rail through `ThemedSelectionCard`; remove direct `isRetro` presentation branches from `CryptoSelector`.

- [ ] **Step 4: Run focused validation**

Run: `npx vitest run tests/components/ui/CryptoSelector.test.tsx tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Run static checks**

Run: `npx eslint config/ui/componentVariants.ts components/ui/CryptoSelector.tsx tests/components/ui/CryptoSelector.test.tsx tests/components/themed/ThemedPrimitives.test.tsx tests/screens/MainMenu.test.tsx`

Run: `git diff --check -- config/ui/componentVariants.ts components/ui/CryptoSelector.tsx tests/components/ui/CryptoSelector.test.tsx tests/components/themed/ThemedPrimitives.test.tsx docs/superpowers/specs/2026-07-22-main-menu-asset-selector-readability-design.md docs/superpowers/plans/2026-07-22-main-menu-asset-selector-readability.md`

Expected: both commands exit successfully.
