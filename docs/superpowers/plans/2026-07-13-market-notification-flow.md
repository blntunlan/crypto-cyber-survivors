# Market Notification Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stacked market-alignment notifications with one short, edge-triggered HUD signal.

**Architecture:** Consolidate aligned RSI detection in `MarketEventAnnouncer` so one transition produces one semantic event. Simplify `MarketAnnouncementBanner` to a latest-event slot for ordinary cues while preserving liquidation interruption.

**Tech Stack:** React 19, TypeScript 5.8, Vitest, Testing Library, Framer Motion

## Global Constraints

- Ordinary alignment cues last exactly `1800` milliseconds.
- Alignment state survives pause and level-up transitions.
- Announcer state resets on game over or menu only.
- Do not add new dependencies, singletons, commits, or sub-agents.
- Preserve the existing `marketAnnouncement` event contract.

---

### Task 1: Edge-Triggered Market Alignment

**Files:**
- Create: `tests/services/market/MarketEventAnnouncer.test.ts`
- Modify: `services/market/MarketEventAnnouncer.ts`
- Modify: `components/GameEngine.tsx`

**Interfaces:**
- Consumes: `MarketEventAnnouncer.update(data: MarketData, position: MarketPosition): void`
- Produces: one `marketAnnouncement` with type `FAVORABLE_MARKET` per unaligned-to-aligned transition

- [ ] **Step 1: Write the failing aligned-transition tests**

Create a fixture with `rsiState: 'OVERSOLD'`, call `update` with `MarketPosition.LONG`, and assert the emitted market events equal:

```ts
expect(marketEvents).toEqual([
  expect.objectContaining({
    type: 'FAVORABLE_MARKET',
    message: 'LONG EDGE // BULL SIGNAL LOCKED',
    icon: '▲',
    duration: 1800,
  }),
]);
```

Call `update` again while still aligned and assert no second event. Change to `NEUTRAL`, then back to `OVERSOLD`, and assert one new favorable event.

- [ ] **Step 2: Run the service test red**

Run: `npx vitest run tests/services/market/MarketEventAnnouncer.test.ts`

Expected: FAIL because the current transition emits both `RSI_OVERSOLD` and `FAVORABLE_MARKET`, uses legacy copy, and lasts `3000` milliseconds.

- [ ] **Step 3: Consolidate aligned transition emission**

In `checkRsiTransition`, calculate alignment first. Emit `FAVORABLE_MARKET` when aligned and skip the generic RSI announcement for that transition. Use position-specific payloads:

```ts
const favorablePayload =
  position === MarketPosition.LONG
    ? { message: 'LONG EDGE // BULL SIGNAL LOCKED', color: '#fbbf24', icon: '▲' }
    : { message: 'SHORT EDGE // BEAR SIGNAL LOCKED', color: '#fb7185', icon: '▼' };
```

Set `ANNOUNCER_CONFIG.DURATION.FAVORABLE` to `1800`. Keep `favorableMarketActive` false after an unaligned transition so re-entry emits once.

- [ ] **Step 4: Preserve state across temporary statuses**

Change the `GameEngine` effect so `MarketEventAnnouncer.reset()` runs only when status is `GAMEOVER` or `MENU`, not on `PAUSED` or `LEVEL_UP`.

- [ ] **Step 5: Run the service test green**

Run: `npx vitest run tests/services/market/MarketEventAnnouncer.test.ts`

Expected: PASS with three edge-transition assertions.

### Task 2: Latest-Event HUD Slot

**Files:**
- Modify: `tests/components/hud/MarketAnnouncementBanner.test.tsx`
- Modify: `components/hud/MarketAnnouncementBanner.tsx`

**Interfaces:**
- Consumes: `MarketAnnouncementEvent` from `EventBus`
- Produces: one visible ordinary rail; later ordinary events replace it; liquidation interrupts it

- [ ] **Step 1: Write failing banner lifecycle tests**

Emit two ordinary announcements in one `act` block and assert only the second message remains visible. Emit an alignment event with `duration: 1800`, advance fake timers by `1799`, assert it is visible, advance by `1`, and assert it is removed. Emit an ordinary event followed by `LIQUIDATION_WARNING` and assert the danger rail shows immediately.

- [ ] **Step 2: Run the component test red**

Run: `npx vitest run tests/components/hud/MarketAnnouncementBanner.test.tsx`

Expected: FAIL because ordinary announcements are currently queued instead of replaced.

- [ ] **Step 3: Replace the queue with one slot**

Remove `queueRef`, `expiresAt`, `pendingEventTimersRef`, and `showNext`. On each event, clear the active timer, set the new announcement immediately, and schedule dismissal with `data.duration`. This applies to ordinary events and ensures a liquidation event also interrupts immediately.

- [ ] **Step 4: Tighten the cyber-HUD presentation**

Keep `HudEventRail`; render the directional glyph in a compact accent cell and split messages containing ` // ` into a bold position label and muted signal detail. Add `role="status"` and `aria-live="polite"` to the fixed banner container.

- [ ] **Step 5: Run focused tests green**

Run: `npx vitest run tests/services/market/MarketEventAnnouncer.test.ts tests/components/hud/MarketAnnouncementBanner.test.tsx`

Expected: both files PASS with no failures.

### Task 3: Verification

**Files:**
- Verify only; no new files

**Interfaces:**
- Consumes: completed service and component behavior
- Produces: verification evidence for correctness, types, lint, and React health

- [ ] **Step 1: Run related GameEngine tests**

Run: `npx vitest run tests/components/GameEngine.test.tsx tests/hooks/useGameEngineEvents.test.ts`

Expected: PASS with announcer integration unchanged except reset timing.

- [ ] **Step 2: Run static checks**

Run: `npm run typecheck`

Expected: exit code `0`.

Run: `npx eslint services/market/MarketEventAnnouncer.ts components/hud/MarketAnnouncementBanner.tsx tests/services/market/MarketEventAnnouncer.test.ts tests/components/hud/MarketAnnouncementBanner.test.tsx`

Expected: exit code `0` with no errors.

- [ ] **Step 3: Run React Doctor**

Run: `npx -y react-doctor@latest . --verbose --diff`

Expected: no new diagnostics caused by the changed banner.

- [ ] **Step 4: Review the focused diff**

Run: `git diff -- services/market/MarketEventAnnouncer.ts components/GameEngine.tsx components/hud/MarketAnnouncementBanner.tsx tests/services/market/MarketEventAnnouncer.test.ts tests/components/hud/MarketAnnouncementBanner.test.tsx`

Expected: only the approved notification behavior, presentation, tests, and reset lifecycle are changed.
