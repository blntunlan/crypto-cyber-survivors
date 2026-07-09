# Combo Milestone Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent combo HUD with existing milestone popups and retain projectile-trail color as the continuous combo indicator.

**Architecture:** ComboSystem remains the sole source for the existing five thresholds (5, 10, 25, 50, 100) and their colors. useHUDEvents continues to queue comboMilestone announcements, while GameHUD no longer mounts or subscribes state for the persistent ComboPanel. ProjectileRenderer reads ComboSystem.getComboColor() once per frame and passes it to the default Quantum Bullet trail renderer.

**Tech Stack:** React 19, TypeScript 5.8, Vitest 4, Canvas 2D renderer, EventBus.

## Global Constraints

- Do not add recurring milestones after 100 kills.
- Do not alter combo multipliers, timeouts, popup timing, sounds, or queue priority.
- Do not add React state updates to the request-animation-frame loop.
- Preserve the zero-allocation per-frame combo-color lookup in ProjectileRenderer.
- Do not commit changes unless the user explicitly requests a commit.

---

## File Structure

| File | Responsibility |
|---|---|
| components/GameHUD.tsx | Stops mounting the persistent combo counter while retaining the milestone announcer. |
| hooks/useHUDEvents.ts | Removes stale counter metadata state and its comboUpdate/comboEnd subscriptions; preserves popup handling. |
| tests/GameHUD.test.tsx | Verifies the live HUD has no persistent counter and still displays a milestone popup. |
| tests/components/GameHUD.test.tsx | Verifies isolated HUD composition excludes ComboPanel regardless of layout data. |
| tests/hooks/useHUDEvents.test.tsx | Verifies the hook no longer exposes counter metadata and continues to announce milestones. |
| tests/ComboSystem.test.ts | Existing proof that thresholds select colors and reset restores COLORS.BULLET. |
| tests/renderers/ProjectileRenderer.test.ts | Proves the default Quantum Bullet trail uses ComboSystem.getComboColor(). |

## Task 1: Apply Combo Color to the Default Quantum Bullet Trail

**Files:**
- Test: tests/ComboSystem.test.ts
- Test: tests/renderers/ProjectileRenderer.test.ts

**Interfaces:**
- Consumes: ComboSystem.getComboColor(): string.
- Produces: A default Quantum Bullet trail that uses the active tier color and returns to the default bullet color after reset.

- [ ] **Step 1: Write the failing Quantum Bullet trail regression**

Run:

~~~powershell
vi.mocked(ComboSystem.getComboColor).mockReturnValue('#FF6600');

expect(mockCtx.strokeStyle).toBe('#FF6600');
~~~

Expected: FAIL with the hard-coded cyan value `rgba(34,211,238,0.7)` until the Quantum renderer accepts the combo color.

- [ ] **Step 2: Pass the per-frame combo color into the Quantum renderer**

Retain the single per-frame combo-color lookup and send it to the Quantum branch:

~~~typescript
const comboColor = ComboSystem.getComboColor();

case 'quantum':
  this.renderQuantum(ctx, bullet, comboColor);
  return;
~~~

Set the Quantum trail stroke to comboColor and use Canvas globalAlpha for its existing fade without allocating an RGBA string per segment:

~~~typescript
const previousAlpha = ctx.globalAlpha;
ctx.globalAlpha = previousAlpha * alpha * 0.7;
ctx.strokeStyle = comboColor;
// Draw the segment, then restore ctx.globalAlpha after the loop.
~~~

## Task 2: Remove the Persistent Combo Panel

**Files:**
- Modify: tests/GameHUD.test.tsx
- Modify: tests/components/GameHUD.test.tsx
- Modify: components/GameHUD.tsx

**Interfaces:**
- Consumes: useHUDEvents(player, status), returning flash, announcement, clutchActive, and achievement.
- Produces: GameHUD with no combo counter, timer bar, multiplier badge, or ComboPanel child; MilestoneAnnouncer remains mounted when enabled by layout.

- [ ] **Step 1: Write the failing live-HUD regression test**

Replace the persistent-counter assertions in tests/GameHUD.test.tsx with:

~~~tsx
it('does not render a persistent combo counter', () => {
  render(<GameHUD status={GameStatus.PLAYING} />);

  expect(screen.queryByText('hud.combo')).not.toBeInTheDocument();
  expect(document.getElementById('combo-streak-count')).toBeNull();
  expect(document.getElementById('combo-multiplier-badge')).toBeNull();
  expect(document.getElementById('combo-timer-bar')).toBeNull();
});
~~~

Keep the existing comboMilestone test unchanged so it proves thresholds still show the center-screen popup.

- [ ] **Step 2: Write the failing isolated-composition test**

In tests/components/GameHUD.test.tsx, keep the existing ComboPanel mock during the red phase so the assertion fails specifically because the panel is still rendered. Add this to the active-HUD test:

~~~tsx
expect(screen.queryByTestId('combo-panel')).toBeNull();
expect(screen.getByTestId('milestone-announcer')).toBeTruthy();
~~~

- [ ] **Step 3: Run both tests and verify the expected failure**

Run:

~~~powershell
npx vitest run tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx
~~~

Expected: FAIL because GameHUD still imports and renders ComboPanel.

- [ ] **Step 4: Remove the panel mount with the smallest production change**

In components/GameHUD.tsx, remove ComboPanel from the HUD barrel import. Replace the hook result and refs with:

~~~tsx
const pointerContainerRef = useRef<HTMLDivElement>(null);

const { flash, announcement, clutchActive, achievement } = useHUDEvents(player, status);
~~~

Delete the complete conditional block below; do not replace it with another persistent combo element:

~~~tsx
{layout.elements.comboPanel.visible && (
  <ComboPanel
    containerRef={containerRef}
    maxStreak={uiMeta.maxStreak}
    totalBonusXp={uiMeta.totalBonusXp}
  />
)}
~~~

After the production change is green, remove the now-unused ComboPanel mock and comboPanel layout fixture from tests/components/GameHUD.test.tsx.

- [ ] **Step 5: Re-run the HUD tests**

Run:

~~~powershell
npx vitest run tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx
~~~

Expected: PASS. The no-counter tests pass and the existing milestone popup test remains green.

## Task 3: Remove Obsolete HUD Counter State

**Files:**
- Modify: tests/hooks/useHUDEvents.test.tsx
- Modify: hooks/useHUDEvents.ts

**Interfaces:**
- Consumes: EventBus events comboMilestone, milestoneAchieved, levelUpStart, and gameReset.
- Produces: UseHUDEventsReturn containing flash, announcement, clutchActive, and achievement; it no longer exposes uiMeta.

- [ ] **Step 1: Write the failing hook-contract test**

In tests/hooks/useHUDEvents.test.tsx, remove the initialization assertion for uiMeta and replace the comboUpdate test with:

~~~tsx
import { GameStatus, type Player } from '../../types';

it('does not expose persistent combo counter metadata', () => {
  const { result } = renderHook(() =>
    useHUDEvents(mockPlayer as Player, GameStatus.PLAYING)
  );

  expect(result.current).not.toHaveProperty('uiMeta');
});
~~~

Keep the comboMilestone test directly after it to prove popup behavior survives without persistent metadata.

- [ ] **Step 2: Run the hook test and verify the expected failure**

Run:

~~~powershell
npx vitest run tests/hooks/useHUDEvents.test.tsx
~~~

Expected: FAIL because the return object still includes uiMeta.

- [ ] **Step 3: Delete only stale counter state and subscriptions**

In hooks/useHUDEvents.ts, remove:
- the ComboSystem import;
- the ComboUIState declaration;
- uiMeta state initialization;
- uiMeta from UseHUDEventsReturn and the returned object;
- the comboUpdate and comboEnd event subscriptions and their cleanup calls;
- setUiMeta({ maxStreak: 0, totalBonusXp: 0 }) from the gameReset listener.

The top imports must reduce to:

~~~tsx
import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../services/core/EventBus';
~~~

Preserve the comboMilestone listener, including its active-popup replacement, timed dismissal, and queue priority.

- [ ] **Step 4: Re-run the hook test**

Run:

~~~powershell
npx vitest run tests/hooks/useHUDEvents.test.tsx
~~~

Expected: PASS. Milestone popup tests remain green and comboUpdate no longer causes a HUD React state update.

## Task 4: Validate the Complete Feedback Loop

**Files:**
- Verify: components/GameHUD.tsx
- Verify: hooks/useHUDEvents.ts
- Verify: services/renderers/ProjectileRenderer.ts
- Verify: services/combat/ComboSystem.ts

**Interfaces:**
- Consumes: completed HUD and existing renderer contracts.
- Produces: verified mobile/desktop behavior with popup-only milestones and colored normal bullet trails.

- [ ] **Step 1: Format the changed source and tests**

Run:

~~~powershell
npx prettier --write components/GameHUD.tsx hooks/useHUDEvents.ts tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx tests/hooks/useHUDEvents.test.tsx
~~~

Expected: exit code 0.

- [ ] **Step 2: Run all directly affected tests**

Run:

~~~powershell
npx vitest run tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx tests/hooks/useHUDEvents.test.tsx tests/ComboSystem.test.ts tests/renderers/ProjectileRenderer.test.ts
~~~

Expected: PASS with no failures.

- [ ] **Step 3: Run static and documentation validation**

Run:

~~~powershell
npm run typecheck
npm run lint -- --quiet components/GameHUD.tsx hooks/useHUDEvents.ts tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx tests/hooks/useHUDEvents.test.tsx
npm run docs:check
~~~

Expected: every command exits 0.

- [ ] **Step 4: Inspect the final diff**

Run:

~~~powershell
git diff --check
git diff -- components/GameHUD.tsx hooks/useHUDEvents.ts tests/GameHUD.test.tsx tests/components/GameHUD.test.tsx tests/hooks/useHUDEvents.test.tsx
~~~

Expected: no whitespace errors and no changes to combo thresholds, multiplier values, or renderer hot-path allocations.
