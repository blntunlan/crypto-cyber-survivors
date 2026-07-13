# Vertical Payline Level-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected level-up card stack with one responsive vertical payline cabinet while preserving simultaneous spin, randomized staggered stops, synchronized slot audio, and existing selection behavior.

**Architecture:** `LevelUpScreen` will own cabinet chrome, progress indicators, randomized stop-order generation, and screen-level selection state. `SlotReel` will remain an independently animated row and expose its current visual state through semantic attributes and theme-aware styling. The payline remains a layout metaphor rather than a literal line across the cabinet background. No gameplay service, singleton, card-generation rule, or state-machine transition changes.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS, Framer Motion, Vitest, React Testing Library, Playwright.

## Global Constraints

- Preserve `requestAnimationFrame`-driven reel timing and current React render throttling.
- Preserve tick, slowdown, reel-stop, multiplier-chime, and final win audio timing.
- Preserve click, touch, W/S, arrow-key, Enter, and Space selection behavior.
- Keep competitive auto-select inactive until every reel stops.
- Support three- and four-choice configurations with a randomized order covering every choice.
- Keep one vertical cabinet composition on mobile, tablet, and desktop.
- Keep modern and retro visuals in the same interaction implementation.
- Do not add dependencies, gameplay services, singletons, card rules, or economy mechanics.
- Do not commit changes unless the user explicitly requests a commit.

## File Structure

- Modify `components/screens/LevelUpScreen/constants.ts`: provide the choice-count-aware Fisher-Yates stop-order helper while retaining animation/timing constants.
- Modify `components/screens/LevelUpScreen/LevelUpScreen.tsx`: render the cabinet frame, progress lights, and choice-count-aware randomized stop order.
- Modify `components/screens/LevelUpScreen/SlotReel.tsx`: render each reel as a compact ticket row with explicit spinning, slowing, locked, and selected visual states.
- Modify `tests/screens/LevelUpScreen.test.tsx`: verify cabinet structure, lock progress, audio reveal completion, and keyboard selection.
- Create `tests/screens/LevelUpScreen.constants.test.ts`: verify randomized stop-order completeness and deterministic shuffling.
- Modify `e2e/level-up.spec.ts`: target stable cabinet/reel semantics instead of presentation-only classes.

---

### Task 1: Choice-Count-Aware Random Stop Order

**Files:**
- Modify: `components/screens/LevelUpScreen/constants.ts:1`
- Modify: `components/screens/LevelUpScreen/LevelUpScreen.tsx:54`
- Create: `tests/screens/LevelUpScreen.constants.test.ts`

**Interfaces:**
- Produces: `createRandomStopOrder(choiceCount: number, random?: () => number): number[]`
- Consumes: `upgradeChoices.length` from `LevelUpScreenProps`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, expect, it } from 'vitest';
import { createRandomStopOrder } from '../../components/screens/LevelUpScreen/constants';

describe('createRandomStopOrder', () => {
  it('includes every choice exactly once for four-choice level ups', () => {
    const order = createRandomStopOrder(4, () => 0.5);
    expect([...order].sort((left, right) => left - right)).toEqual([0, 1, 2, 3]);
  });

  it('uses the provided random source to shuffle the stop sequence', () => {
    const values = [0, 0];
    let index = 0;
    expect(createRandomStopOrder(3, () => values[index++] ?? 0)).toEqual([1, 2, 0]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/screens/LevelUpScreen.constants.test.ts`

Expected: FAIL because `createRandomStopOrder` is not exported.

- [ ] **Step 3: Add the minimal Fisher-Yates helper**

```ts
export function createRandomStopOrder(
  choiceCount: number,
  random: () => number = Math.random
): number[] {
  const order = Array.from({ length: choiceCount }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = order[index];
    order[index] = order[swapIndex]!;
    order[swapIndex] = current!;
  }
  return order;
}
```

Use it once per screen mount:

```ts
const stopOrder = useMemo(
  () => createRandomStopOrder(upgradeChoices.length),
  [upgradeChoices.length]
);
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run tests/screens/LevelUpScreen.constants.test.ts`

Expected: 2 tests pass.

---

### Task 2: Vertical Payline Cabinet and Progress Semantics

**Files:**
- Modify: `components/screens/LevelUpScreen/LevelUpScreen.tsx:208`
- Modify: `tests/screens/LevelUpScreen.test.tsx:95`

**Interfaces:**
- Consumes: `stoppedCount`, `allStopped`, `upgradeChoices`, `selectedIndex`, `isCompetitive`, `timeRemaining`, `isRetro`
- Produces: `data-testid="level-up-payline-cabinet"`, `data-testid="level-up-lock-progress"`, and one `data-locked` indicator per choice

- [ ] **Step 1: Write the failing cabinet structure test**

```ts
it('renders every upgrade reel inside one vertical payline cabinet', () => {
  render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);

  const cabinet = screen.getByTestId('level-up-payline-cabinet');
  expect(within(cabinet).getAllByRole('button')).toHaveLength(3);

  const progress = screen.getByTestId('level-up-lock-progress');
  expect(progress.querySelectorAll('[data-locked="false"]')).toHaveLength(3);
});
```

Add `within` to the existing `tests/test-utils` import.

- [ ] **Step 2: Run the cabinet test and verify RED**

Run: `npx vitest run tests/screens/LevelUpScreen.test.tsx -t "vertical payline cabinet"`

Expected: FAIL because the cabinet and progress test IDs do not exist.

- [ ] **Step 3: Replace the disconnected panel with one cabinet**

Implement these structural elements inside `LevelUpScreen`:

```tsx
<div data-testid="level-up-payline-cabinet" className={cabinetClassName}>
  <div className="flex items-center justify-between border-b ...">
    <span>{renderStatusText()}</span>
    <div data-testid="level-up-lock-progress" className="flex gap-1.5">
      {upgradeChoices.map((card, index) => (
        <span
          key={card.id}
          data-locked={index < stoppedCount}
          className={index < stoppedCount ? lockedLightClass : idleLightClass}
        />
      ))}
    </div>
  </div>
  <div className="relative overflow-hidden border-y ...">
    <div className="relative z-10 flex flex-col gap-2">{reels}</div>
  </div>
</div>
```

Use `COLORS.CASINO_GOLD`, `COLORS.ELECTRIC_BLUE`, and existing retro CSS variables for the modern/retro split. Keep `MODERN_SCREEN_OVERLAY`, `Z_LAYERS.LEVEL_UP_SCREEN`, error boundary, title translation, and selection callbacks unchanged.

- [ ] **Step 4: Verify cabinet progress after the reveal completes**

Extend the existing all-stopped test:

```ts
const progress = screen.getByTestId('level-up-lock-progress');
expect(progress.querySelectorAll('[data-locked="true"]')).toHaveLength(3);
```

- [ ] **Step 5: Run the screen tests and verify GREEN**

Run: `npx vitest run tests/screens/LevelUpScreen.test.tsx`

Expected: all `LevelUpScreen` tests pass.

---

### Task 3: Ticket Reel Visual States and Interaction Preservation

**Files:**
- Modify: `components/screens/LevelUpScreen/SlotReel.tsx:144`
- Modify: `tests/screens/LevelUpScreen.test.tsx:46`
- Modify: `e2e/level-up.spec.ts:54`

**Interfaces:**
- Consumes: existing `phase`, `isStopped`, `isSelected`, `tierConfig`, `isRetro`, `finalCard`, and `displayCard`
- Produces: `data-reel-index`, `data-reel-state="spinning|slowing|locked|selected"`, stable `data-testid="level-up-reel"`

- [ ] **Step 1: Write the failing initial reel-state test**

```ts
it('marks each reward row as spinning before it locks', () => {
  render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => {}} />);
  const reels = screen.getAllByTestId('level-up-reel');
  expect(reels).toHaveLength(3);
  expect(reels.every(reel => reel.dataset.reelState === 'spinning')).toBe(true);
});
```

- [ ] **Step 2: Run the reel-state test and verify RED**

Run: `npx vitest run tests/screens/LevelUpScreen.test.tsx -t "marks each reward row"`

Expected: FAIL because `level-up-reel` does not exist.

- [ ] **Step 3: Add semantic reel state and ticket-row styling**

Derive the state once:

```ts
const reelState = isSelected && isStopped ? 'selected' : isStopped ? 'locked' : phase;
```

Add it to the button:

```tsx
<motion.button
  data-testid="level-up-reel"
  data-reel-index={reelIndex}
  data-reel-state={reelState}
  aria-label={`${tierConfig.name}: ${displayCard.name}`}
  ...
>
```

Restyle the button as a compact three-column ticket row: frameless icon/tier rail, flexible name/description content, and optional desktop status chip. Use cyan/low-opacity styling while spinning, mint plus rarity accent when locked, and casino gold when selected. Replace the current large translation/scale pulse with a restrained left-rail emphasis. Retain the existing animation loop, audio effects, click guard, `CardIcon`, and theme split unchanged.

- [ ] **Step 4: Add completion audio and keyboard regression tests**

Add `playButton: vi.fn()` to the audio mock, import the mocked `audio`, and verify:

```ts
it('keeps randomized reel audio and enables keyboard selection after all locks', async () => {
  vi.useRealTimers();
  const onSelect = vi.fn();
  render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={onSelect} />);

  await waitFor(
    () => expect(screen.getByText('levelup.choose_upgrade')).toBeDefined(),
    { timeout: 7000 }
  );

  expect(audio.playReelStop).toHaveBeenCalledTimes(3);
  expect(audio.playMultiplierChime).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(window, { key: 'ArrowDown' });
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledWith(mockChoices[1]);
});
```

- [ ] **Step 5: Update the E2E selectors**

Replace `page.locator('button.group')` with:

```ts
const cabinet = page.getByTestId('level-up-payline-cabinet');
await expect(cabinet).toBeVisible();
const cards = page.getByTestId('level-up-reel');
await expect(cards).toHaveCount(3);
```

Use `cards.first()` for selection.

- [ ] **Step 6: Run focused unit and E2E verification**

Run: `npx vitest run tests/screens/LevelUpScreen.constants.test.ts tests/screens/LevelUpScreen.test.tsx`

Expected: all focused tests pass.

Run: `npx playwright test e2e/level-up.spec.ts --project=chromium --workers=1 --reporter=list`

Expected: 2 E2E tests pass.

---

### Task 4: Quality Gates and Visual Review

**Files:**
- Verify: `components/screens/LevelUpScreen/LevelUpScreen.tsx`
- Verify: `components/screens/LevelUpScreen/SlotReel.tsx`
- Verify: `components/screens/LevelUpScreen/constants.ts`
- Verify: `tests/screens/LevelUpScreen.test.tsx`
- Verify: `tests/screens/LevelUpScreen.constants.test.ts`
- Verify: `e2e/level-up.spec.ts`

**Interfaces:**
- Consumes: completed Tasks 1-3
- Produces: verified production build and responsive level-up presentation

- [ ] **Step 1: Run formatting and lint checks on touched code**

Run: `npx prettier --check components/screens/LevelUpScreen/LevelUpScreen.tsx components/screens/LevelUpScreen/SlotReel.tsx components/screens/LevelUpScreen/constants.ts tests/screens/LevelUpScreen.test.tsx tests/screens/LevelUpScreen.constants.test.ts e2e/level-up.spec.ts`

Expected: all matched files use Prettier formatting.

Run: `npx eslint components/screens/LevelUpScreen/LevelUpScreen.tsx components/screens/LevelUpScreen/SlotReel.tsx components/screens/LevelUpScreen/constants.ts tests/screens/LevelUpScreen.test.tsx tests/screens/LevelUpScreen.constants.test.ts e2e/level-up.spec.ts`

Expected: zero ESLint errors.

- [ ] **Step 2: Run React-specific diagnostics**

Run: `npx -y react-doctor@latest . --verbose`

Expected: no new issue attributable to the level-up changes.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite production build exits with code 0.

- [ ] **Step 4: Inspect responsive variants**

Trigger the level-up screen through `window.GameHelpers.triggerLevelUp()` and inspect:

- Modern desktop at 1440×900.
- Modern mobile at 390×844.
- Retro desktop at 1440×900.
- Four-choice short viewport at 844×390.

Confirm one cabinet, readable descriptions, no clipped choice, visible focus, random staggered locks, and no overlap with safe areas.

- [ ] **Step 5: Review only the scoped diff**

Run: `git diff -- components/screens/LevelUpScreen tests/screens/LevelUpScreen.test.tsx tests/screens/LevelUpScreen.constants.test.ts e2e/level-up.spec.ts docs/superpowers/specs/2026-07-12-vertical-payline-level-up-design.md docs/superpowers/plans/2026-07-12-vertical-payline-level-up-plan.md .gitignore`

Expected: no unrelated gameplay, renderer, skin-system, or user-auth changes appear in the scoped diff.
