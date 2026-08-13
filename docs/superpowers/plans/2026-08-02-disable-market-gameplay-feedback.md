# Disable Market Gameplay Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide market/PnL gameplay announcements and market-driven canvas color overlays while preserving kill, time, level, combo, buff/debuff, liquidation-critical, and market-driven gameplay behavior.

**Architecture:** Make presentation-only changes at the existing routing and render boundaries. Keep market events and state generation intact, filter market milestone types before the center announcer, stop mounting the market banner, and stop invoking market overlay renderer methods.

**Tech Stack:** React 19, TypeScript 5.8, Canvas 2D, Vitest 4, Testing Library

## Global Constraints

- Do not change market-driven difficulty, enemies, rewards, telemetry, or EventBus production.
- Keep combo, kill, time, and level announcements unchanged.
- Keep buff/debuff indicators and liquidation-critical HUD feedback intact.
- Do not add React state or allocations to the gameplay RAF path.
- Use TDD: every behavior change must first fail for the expected reason.
- Do not create commits unless the user explicitly requests them.

---

### Task 1: Filter Market Milestones From Center Announcer

**Files:**
- Modify: `tests/hooks/useHUDEvents.test.tsx`
- Modify: `config/MilestoneConfig.ts:276`
- Modify: `hooks/useHUDEvents.ts:12`

**Interfaces:**
- Consumes: `MilestoneAchievedEvent.type` and `ANNOUNCER_MILESTONE_TYPES.has(type)`.
- Produces: `ANNOUNCER_MILESTONE_TYPES` containing only `kills`, `time`, and `level`, plus `HIDDEN_GAMEPLAY_MILESTONE_TYPES` containing `pnl`, `danger`, and `market`; combo continues through `comboMilestone`.

- [x] **Step 1: Replace the danger-announcement expectation with failing market-filter coverage**

```tsx
it.each([
  ['pnl', 'pnl_5', 'KÂRDASIN', 'glint'],
  ['danger', 'danger_10', 'DRAWDOWN ALERT', 'tension'],
])('should ignore %s milestones in gameplay announcements', (type, id, name, sound) => {
  const callbacks = captureCallbacks();
  const { result } = renderHook(() =>
    useHUDEvents(mockPlayer as Player, GameStatus.PLAYING)
  );

  act(() => {
    callbacks.get('milestoneAchieved')!({
      id,
      name,
      icon: '📈',
      color: '#22c55e',
      type,
      threshold: type === 'pnl' ? 0.05 : -0.1,
      severity: type === 'danger' ? 'danger' : 'celebration',
      sound,
    });
  });

  expect(result.current.announcement).toBeNull();
  expect(result.current.achievement).toBeNull();
  expect(audio.playAchievementGlint).not.toHaveBeenCalled();
  expect(audio.playSlowdownTension).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Run the hook test and verify RED**

Run: `npx vitest run tests/hooks/useHUDEvents.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because `pnl` and `danger` currently enter the center announcement queue and play their sounds.

- [x] **Step 3: Restrict announcer milestone types**

```ts
export const ANNOUNCER_MILESTONE_TYPES: ReadonlySet<string> = new Set<MilestoneType>([
  'kills',
  'time',
  'level',
]);

export const HIDDEN_GAMEPLAY_MILESTONE_TYPES: ReadonlySet<string> = new Set([
  'pnl',
  'danger',
  'market',
]);
```

Import `HIDDEN_GAMEPLAY_MILESTONE_TYPES` in `useHUDEvents.ts`, then place this guard after the announcer routing block and before the generic achievement popup path:

```ts
if (HIDDEN_GAMEPLAY_MILESTONE_TYPES.has(data.type)) {
  return;
}
```

- [x] **Step 4: Run the hook test and verify GREEN**

Run: `npx vitest run tests/hooks/useHUDEvents.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS, including existing combo, time, level, and queue tests; PnL, danger, and market milestones reach neither announcer nor achievement popup.

### Task 2: Remove Market Banner From Gameplay HUD

**Files:**
- Modify: `tests/components/GameHUD.test.tsx`
- Modify: `components/GameHUD.tsx:22`

**Interfaces:**
- Consumes: the HUD barrel exports from `components/hud/index.ts`.
- Produces: `GameHUD` without a mounted `MarketAnnouncementBanner`; the standalone component and market events remain available but unused in gameplay.

- [x] **Step 1: Add a failing HUD assertion**

Add this assertion to `should render all components when active`:

```tsx
expect(screen.queryByTestId('market-announcement-banner')).toBeNull();
```

- [x] **Step 2: Run the GameHUD test and verify RED**

Run: `npx vitest run tests/components/GameHUD.test.tsx --pool=forks --maxWorkers=1`

Expected: FAIL because `GameHUD` currently mounts the mocked market banner.

- [x] **Step 3: Remove the gameplay mount**

Remove `MarketAnnouncementBanner` from the HUD import list and delete:

```tsx
<MarketAnnouncementBanner />
```

Keep `MilestoneAnnouncer`, `AchievementPopup`, and all dedicated survival/buff HUD components unchanged.

- [x] **Step 4: Run the GameHUD test and verify GREEN**

Run: `npx vitest run tests/components/GameHUD.test.tsx --pool=forks --maxWorkers=1`

Expected: PASS and the market banner test id is absent.

### Task 3: Stop Market-Driven Canvas Tinting

**Files:**
- Modify: `tests/renderers/EffectRenderer.test.ts`
- Modify: `services/renderers/EffectRenderer.ts:44`

**Interfaces:**
- Consumes: `EffectRenderer.render(ctx, pool, state, player, opts)`.
- Produces: the same public renderer API without market overlay helpers; combat and entity-local layers remain unchanged.

- [x] **Step 1: Change render-pipeline expectations to the desired behavior**

Add a render behavior test with every market visual trigger active:

```ts
mockState.rsiVisualState = 'OVERSOLD';
mockState.marketPosition = 'LONG';
mockState.atrPercent = 5;
mockState.whaleEventTimer = 500;
mockState.spawnRateMultiplier = 1.5;

renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);

expect(mockCtx.fillRect).not.toHaveBeenCalledWith(0, 0, 800, 600);
expect(mockCtx.strokeRect).not.toHaveBeenCalled();
```

Remove direct characterization tests for the market drawing helpers because those helpers are deleted in Step 3.

- [x] **Step 2: Run the renderer test and verify RED**

Run: `npx vitest run tests/renderers/EffectRenderer.test.ts --pool=forks --maxWorkers=1`

Expected: FAIL because active RSI/ATR/whale state currently draws a full-screen fill or border tint.

- [x] **Step 3: Remove market overlay code from the RAF renderer**

Delete the market overlay calls from `EffectRenderer.render`, then remove the now-unused `drawMarketAmbiance`, `drawFlowPulse`, and `drawMomentumOverlay` helpers plus their unused imports.

```ts
if (!graphics.reducedMotion) {
  this.drawMomentumOverlay(ctx, width, height);
}

this.drawMarketAmbiance(ctx, width, height, state, graphics.reducedMotion === true);
```

Do not change `drawCritFlash`, particles, impact rings, floating text, speed lines, or any market state producer.

- [x] **Step 4: Run the renderer test and verify GREEN**

Run: `npx vitest run tests/renderers/EffectRenderer.test.ts --pool=forks --maxWorkers=1`

Expected: PASS; the renderer behavior test proves active market state cannot produce a full-screen fill or border tint.

### Task 4: Validate The Complete Presentation Change

**Files:**
- Verify: `config/MilestoneConfig.ts`
- Verify: `hooks/useHUDEvents.ts`
- Verify: `components/GameHUD.tsx`
- Verify: `services/renderers/EffectRenderer.ts`
- Verify: affected tests and existing `components/hud/LevelUpFlash.tsx` changes

**Interfaces:**
- Consumes: all deliverables from Tasks 1-3.
- Produces: verified presentation-only behavior with no market gameplay notifications or canvas tinting.

- [x] **Step 1: Run the affected test suites together**

Run: `npx vitest run tests/hooks/useHUDEvents.test.tsx tests/components/GameHUD.test.tsx tests/renderers/EffectRenderer.test.ts tests/components/hud/LevelUpFlash.test.tsx --pool=forks --maxWorkers=1`

Expected: all test files and tests PASS.

- [x] **Step 2: Run focused lint and type checking**

Run: `npx eslint config/MilestoneConfig.ts components/GameHUD.tsx services/renderers/EffectRenderer.ts tests/hooks/useHUDEvents.test.tsx tests/components/GameHUD.test.tsx tests/renderers/EffectRenderer.test.ts tests/components/hud/LevelUpFlash.test.tsx`

Expected: exit code 0 with no errors.

Run: `npm run typecheck`

Expected: exit code 0.

- [x] **Step 3: Run the UI contract and diff checks**

Run: `npm run check:ui-contract`

Expected: `UI contract: passed`.

Run: `git diff --check`

Expected: exit code 0.

- [x] **Step 4: Audit the requested behavior in source**

Run: `rg -n "MarketAnnouncementBanner|drawMomentumOverlay|drawMarketAmbiance" components/GameHUD.tsx services/renderers/EffectRenderer.ts`

Expected: no `MarketAnnouncementBanner` reference in `GameHUD` and no market drawing helpers in `EffectRenderer`.

Run: `rg -n "ANNOUNCER_MILESTONE_TYPES|'pnl'|'danger'|'kills'|'time'|'level'" config/MilestoneConfig.ts`

Expected: the announcer set contains only `kills`, `time`, and `level`; the hidden set contains `pnl`, `danger`, and `market`; PnL and danger milestone definitions remain available to non-presentation systems.
