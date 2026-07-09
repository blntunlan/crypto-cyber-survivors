# Quiet War Room HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the card-heavy in-run HUD and related overlays with the approved Quiet War Room language: transparent rails, a compact readable HP bar, concise market-to-gameplay signals, and one focused event surface at a time.

**Architecture:** Add a typed visual-token module and two presentation-only rail primitives. `GameUI` continues to supply market data and player data to existing components, while `GameHUD` and existing EventBus subscribers keep their behavior and only change visual composition. Blocking decision screens reuse a restrained `OverlayChrome` variant; no new singleton, EventBus event, market calculation, or RAF work is introduced.

**Tech Stack:** React 19, TypeScript 5.8 strict mode, Tailwind CSS 3, Lucide React, Vitest 4, Testing Library, existing i18n/theme contexts.

## Global Constraints

- Preserve all current market calculations, combat balance, EventBus contracts, notification queues, audio triggers, game-state transitions, and z-index semantics.
- Keep `ComboPanel` unmounted; existing milestone popups remain the sole in-run combo feedback.
- Do not add `useState` updates or allocations to the RAF loop.
- Keep `WaveTimer`’s `wave-timer-text`, accessible label, and pause-aware `TimeService` behavior.
- Keep all existing keyboard, focus, close-button, safe-area, and reduced-motion behavior; new decoration must not replace semantic content.
- Use typed config values for visual constants; do not hard-code repeated color, threshold, width, or spacing values in HUD components.
- Keep in-run surfaces transparent. Readability comes from contrast, rails, text shadow, and whitespace—not black cards or backdrop blur.
- Do not commit changes unless the user explicitly requests a commit.

---

## File Structure

| File | Responsibility |
|---|---|
| `config/HUDWarRoom.ts` | Typed palette, HP thresholds/dimensions, stat ids, and rail tone definitions. |
| `components/hud/HudGhostRail.tsx` | Presentation-only left/right/center rail and event-line primitives. |
| `tests/components/hud/HudGhostRail.test.tsx` | Contract tests for the new primitives and tokenized HP dimensions. |
| `components/hud/AccountHealthPremium.tsx` | Compact, unframed bottom-center HP rail. |
| `components/hud/LiveFeed.tsx` | Ghost Market Intel deck with price, P&L, and concise actionable indicators. |
| `components/hud/KernelStatus.tsx` | Ghost Operator deck with level, XP rail, Damage, Speed, and Crit. |
| `components/hud/WaveTimer.tsx` | Transparent centered Run timer treatment. |
| `components/GameUI.tsx` | Safe-area-aware desktop/mobile composition of the persistent deck. |
| `components/hud/BuffIndicator.tsx` / `components/hud/ChallengeProgressHUD.tsx` | Low-priority tactical rails rather than card or pill groups. |
| `components/hud/{AchievementPopup,ClutchAnnouncement,MarketAnnouncementBanner,MilestoneAnnouncer,NotificationSystem}.tsx` | Shared consequence-line treatment for non-blocking announcements. |
| `components/hud/LiquidationWarningOverlay.tsx` | Critical visual warning that remains higher priority than informational rails. |
| `components/ui/OverlayChrome.tsx` | Cut-corner, restrained decision-screen shell for modern theme. |
| `components/hud/{CycleDecisionScreen,ReplayOverlay,LeaderboardPanel}.tsx` | Consumers of the updated decision/utility shell. |
| `components/screens/GameOverScreen.tsx` | Game-over overlay aligned to the same decision-screen chrome. |
| `tests/components/hud/*.test.tsx` / `tests/components/GameUI.test.tsx` / `tests/screens/GameOverScreen.test.tsx` | Regression coverage for composition, priority, semantics, and interaction. |

## Task 1: Add Typed War Room Tokens and Rail Primitives

**Files:**
- Create: `config/HUDWarRoom.ts`
- Create: `components/hud/HudGhostRail.tsx`
- Create: `tests/components/hud/HudGhostRail.test.tsx`
- Modify: `components/hud/index.ts`

**Interfaces:**
- Consumes: no runtime service or hook.
- Produces: `HUD_WAR_ROOM`, `HudRailTone`, `HudGhostRail`, and `HudEventRail` for all visual-only HUD composition.

- [ ] **Step 1: Write the failing primitive contract test**

Create `tests/components/hud/HudGhostRail.test.tsx` with the intended public contract:

~~~tsx
import { render, screen } from '../../test-utils';
import { HUD_WAR_ROOM } from '../../../config/HUDWarRoom';
import { HudEventRail, HudGhostRail } from '../../../components/hud/HudGhostRail';

describe('HudGhostRail', () => {
  it('renders semantic tone and alignment without an opaque surface class', () => {
    render(
      <HudGhostRail testId="market-rail" side="left" tone="gold">
        Market Intel
      </HudGhostRail>
    );

    const rail = screen.getByTestId('market-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'gold');
    expect(rail).toHaveAttribute('data-hud-side', 'left');
    expect(rail).not.toHaveClass('bg-black');
    expect(rail).not.toHaveClass('backdrop-blur');
  });

  it('exposes an event rail and compact HP token values', () => {
    render(<HudEventRail tone="danger">Enemies +15% rage</HudEventRail>);

    expect(screen.getByText('Enemies +15% rage')).toHaveAttribute(
      'data-hud-tone',
      'danger'
    );
    expect(HUD_WAR_ROOM.hp.maxWidth).toBe(222);
    expect(HUD_WAR_ROOM.hp.height).toBe(8);
    expect(HUD_WAR_ROOM.hp.criticalThreshold).toBe(35);
  });
});
~~~

- [ ] **Step 2: Run the primitive test to verify it fails**

Run:

~~~powershell
npx vitest run tests/components/hud/HudGhostRail.test.tsx
~~~

Expected: FAIL because neither `HUDWarRoom` nor `HudGhostRail` exists.

- [ ] **Step 3: Implement the token module and primitives**

Create `config/HUDWarRoom.ts` with this exact public shape:

~~~ts
export const HUD_WAR_ROOM = {
  colors: {
    gold: '#D6B85C',
    crimson: '#B22222',
    mint: '#6EE7B7',
    dangerText: '#FF7777',
    value: '#F8FAFC',
    muted: '#AEB5C1',
  },
  textShadow: '0 2px 3px rgba(0,0,0,.9)',
  hp: {
    maxWidth: 222,
    height: 8,
    criticalThreshold: 35,
  },
  operatorStatIds: ['baseDamage', 'speed', 'critChance'] as const,
} as const;

export type HudRailTone = 'gold' | 'danger' | 'positive' | 'neutral';
~~~

Create `components/hud/HudGhostRail.tsx` with presentation-only props:

~~~tsx
export type HudGhostRailProps = {
  children: React.ReactNode;
  side: 'left' | 'right' | 'center';
  tone?: HudRailTone;
  className?: string;
  testId?: string;
};

export type HudEventRailProps = {
  children: React.ReactNode;
  tone?: HudRailTone;
  className?: string;
};
~~~

Map tones to a one- or two-pixel rail color and apply `HUD_WAR_ROOM.textShadow`. `HudGhostRail` must emit `data-hud-tone`, `data-hud-side`, and an optional `data-testid`; it must not apply `bg-*`, `backdrop-*`, rounded-card, or stateful behavior. `HudEventRail` emits `data-hud-tone`, a left rail, and the same text-shadow. Export both from `components/hud/index.ts`.

- [ ] **Step 4: Re-run the primitive test**

Run:

~~~powershell
npx vitest run tests/components/hud/HudGhostRail.test.tsx
~~~

Expected: PASS. The primitives expose semantic attributes and the typed HP values are stable.

## Task 2: Rebuild the Persistent Command Deck

**Files:**
- Modify: `components/hud/AccountHealthPremium.tsx`
- Modify: `components/hud/LiveFeed.tsx`
- Modify: `components/hud/KernelStatus.tsx`
- Modify: `components/hud/WaveTimer.tsx`
- Modify: `components/GameUI.tsx`
- Modify: `tests/components/hud/AccountHealthPremium.test.tsx`
- Modify: `tests/components/hud/LiveFeed.test.tsx`
- Modify: `tests/components/hud/KernelStatus.test.tsx`
- Modify: `tests/components/hud/WaveTimer.test.tsx`
- Modify: `tests/components/GameUI.test.tsx`

**Interfaces:**
- Consumes: existing `MarketData`, `Player`, `hudValuesUpdated`, `TimeService`, `screenService`, i18n, and responsive hooks.
- Produces: a transparent Market Intel rail, Run timer, Operator rail, and compact `war-room-hp-rail`; all existing data inputs and event subscriptions remain unchanged.

- [ ] **Step 1: Write failing persistent-HUD regressions**

Replace outdated assertions in `tests/components/hud/AccountHealthPremium.test.tsx` with compact-rail assertions:

~~~tsx
it('renders one compact HP value and no legacy terminal chrome', () => {
  render(<AccountHealthPremium hp={72} maxHp={100} hpPercent={72} />);

  const rail = screen.getByTestId('war-room-hp-rail');
  expect(rail).toHaveTextContent('HP');
  expect(rail).toHaveTextContent('72 / 100');
  expect(screen.queryByText('hud.system_phase')).not.toBeInTheDocument();
  expect(screen.queryByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')).not.toBeInTheDocument();
});

it('changes the compact rail to the danger tone at 35 percent', () => {
  render(<AccountHealthPremium hp={35} maxHp={100} hpPercent={35} />);
  expect(screen.getByTestId('war-room-hp-rail')).toHaveAttribute('data-hud-tone', 'danger');
});
~~~

Add equivalent tests that require `war-room-market-intel`, `war-room-operator`, and `wave-timer-text` to render with no opaque background classes. In `tests/components/GameUI.test.tsx`, preserve every pause-button test and add assertions that mocked `LiveFeed`, `KernelStatus`, `WaveTimer`, and `AccountHealthPremium` are mounted once while status is `PLAYING`.

- [ ] **Step 2: Run the persistent-HUD tests to verify they fail**

Run:

~~~powershell
npx vitest run tests/components/hud/AccountHealthPremium.test.tsx tests/components/hud/LiveFeed.test.tsx tests/components/hud/KernelStatus.test.tsx tests/components/hud/WaveTimer.test.tsx tests/components/GameUI.test.tsx
~~~

Expected: FAIL because the current HP panel still renders phase/status/terminal chrome and the deck components do not expose the new semantic rails.

- [ ] **Step 3: Implement the compact HP rail**

In `components/hud/AccountHealthPremium.tsx`:

1. Retain the `screenService.onChange()` subscription and safe-area positioning.
2. Remove `getStatusConfig`, phase/status copy, shimmer, tech decals, rounded panel, duplicate percentage, and the inline `@keyframes` block.
3. Render exactly one bottom-center `HudGhostRail` with `testId="war-room-hp-rail"`, `side="center"`, and `tone={hpPercent <= HUD_WAR_ROOM.hp.criticalThreshold ? 'danger' : 'gold'}`.
4. Render the accessible text `HP {Math.ceil(hp)} / {Math.ceil(maxHp)}`, a `height: HUD_WAR_ROOM.hp.height` track, a width driven by clamped `hpPercent`, and scale labels `0`, `25`, `50`, `75`, `100`.
5. Use gold fill above the threshold and crimson at/below it; preserve a short width transition but gate nonessential flashes with Tailwind `motion-reduce:transition-none` and `motion-reduce:animate-none`.

Use this structure for the central content:

~~~tsx
<HudGhostRail testId="war-room-hp-rail" side="center" tone={tone} className="w-full max-w-[222px]">
  <div className="flex items-baseline justify-between">
    <span>HP</span>
    <span className="tabular-nums">{currentHp} / {maximumHp}</span>
  </div>
  <div className="relative mt-1 h-2 border-y" aria-hidden="true">
    <div className="absolute inset-0 grid grid-cols-4">...</div>
    <div className="relative h-full motion-reduce:transition-none" style={{ width: `${clampedPercent}%` }} />
  </div>
  <div className="mt-1 flex justify-between" aria-hidden="true">...</div>
</HudGhostRail>
~~~

- [ ] **Step 4: Implement Market, Operator, Run, and composition rails**

Apply the shared primitives without changing data sources:

- In `LiveFeed`, wrap both desktop and mobile roots in `HudGhostRail` with `testId="war-room-market-intel"`, `side="left"`, and `tone="gold"`. Keep price, P&L, and the existing server indicators, but render only RSI, ATR, and normalized volume in the persistent detail set. Convert filled leverage/RSI pills to inline text; append existing gameplay-effect copy only when an indicator has a current effect.
- In `KernelStatus`, use `HudGhostRail` with `testId="war-room-operator"`, `side="right"`, and `tone="danger"`. Filter `STAT_DEFINITIONS` through `HUD_WAR_ROOM.operatorStatIds`; keep level and the event-driven `XpBar`, but make the XP rail thin and non-rounded.
- In `WaveTimer`, retain `WAVE_TIMER_TEST_ID`, `role="text"`, `aria-live="off"`, and the reducer. Change only its wrapper to a centered ghost treatment with `RUN`/translated survival-time label and no surface fill.
- In `GameUI`, retain the existing safe-area calculations, mobile timer centering, `z-[3005]` pause target, `LiquidationWarningOverlay`, and lerped values. Replace the existing max-width/gap classes with a three-anchor layout that leaves the center uncluttered and place the HP rail at the bottom using the component’s own fixed positioning.

- [ ] **Step 5: Re-run the persistent-HUD tests**

Run:

~~~powershell
npx vitest run tests/components/hud/AccountHealthPremium.test.tsx tests/components/hud/LiveFeed.test.tsx tests/components/hud/KernelStatus.test.tsx tests/components/hud/WaveTimer.test.tsx tests/components/GameUI.test.tsx
~~~

Expected: PASS. Existing pause interaction and timer contracts remain green while all persistent deck rails meet the new semantic contract.

## Task 3: Convert Tactical and Informational Overlays to Rail-Based Feedback

**Files:**
- Modify: `components/hud/BuffIndicator.tsx`
- Modify: `components/hud/ChallengeProgressHUD.tsx`
- Modify: `components/hud/AchievementPopup.tsx`
- Modify: `components/hud/ClutchAnnouncement.tsx`
- Modify: `components/hud/MarketAnnouncementBanner.tsx`
- Modify: `components/hud/MilestoneAnnouncer.tsx`
- Modify: `components/hud/NotificationSystem.tsx`
- Modify: `components/hud/hud-animations.css`
- Modify: `tests/components/hud/BuffIndicator.test.tsx`
- Modify: `tests/components/hud/AchievementPopup.test.tsx`
- Modify: `tests/components/hud/ClutchAnnouncement.test.tsx`
- Modify: `tests/components/hud/NotificationSystem.test.tsx`
- Create: `tests/components/hud/MarketAnnouncementBanner.test.tsx`
- Create: `tests/components/hud/MilestoneAnnouncer.test.tsx`

**Interfaces:**
- Consumes: existing EventBus listeners, notification queue, timeout handling, translation values, and public props.
- Produces: low-priority corner rails and one centered event rail; queueing and timing do not change.

- [ ] **Step 1: Write failing priority and semantic regressions**

Add a common expectation to each affected test:

~~~tsx
const rail = screen.getByTestId('hud-event-rail');
expect(rail).toHaveAttribute('data-hud-tone', 'gold');
expect(rail).not.toHaveClass('bg-black');
expect(rail).not.toHaveClass('rounded-lg');
~~~

Use the component’s actual tone in each test: achievement/milestone uses `gold`, clutch/market danger uses `danger`, and recovery/buff uses `positive`. In `NotificationSystem.test.tsx`, keep the close-button test and add `expect(screen.getByRole('button', { name: /close/i })).toBeEnabled()` so the rail refactor cannot remove interaction.

- [ ] **Step 2: Run tactical overlay tests to verify they fail**

Run:

~~~powershell
npx vitest run tests/components/hud/BuffIndicator.test.tsx tests/components/hud/AchievementPopup.test.tsx tests/components/hud/ClutchAnnouncement.test.tsx tests/components/hud/NotificationSystem.test.tsx tests/components/hud/MarketAnnouncementBanner.test.tsx tests/components/hud/MilestoneAnnouncer.test.tsx
~~~

Expected: FAIL because the current overlays use filled cards, pill backgrounds, rounded surfaces, or do not expose `hud-event-rail`.

- [ ] **Step 3: Apply the shared low-priority treatment**

- `BuffIndicator` and `ChallengeProgressHUD`: retain icons, remaining-duration logic, overflow count, and mobile wrapping. Replace rounded white-background pills with compact `HudGhostRail` rows; buffs use `positive`, debuffs use `danger`, and no item gets a fill surface.
- `AchievementPopup`, `ClutchAnnouncement`, `MarketAnnouncementBanner`, and `MilestoneAnnouncer`: preserve position, existing queues, sound, expiry, and text. Replace gradient/card backgrounds with `HudEventRail`; render the existing title plus a one-line consequence/subtitle. The visible center owner must receive `data-testid="hud-event-rail"`.
- `NotificationSystem`: keep the notification list and close button, but change each notification body to a rail with the existing `notification.color` mapped to semantic tone. Do not change its timeout or dismissal behavior.
- `hud-animations.css`: retain existing entrance/exit keyframes where used, remove long-lived pulse/shimmer effects from persistent HUD, and add `@media (prefers-reduced-motion: reduce)` overrides that set rail animation duration to `1ms` and iteration count to `1`.

- [ ] **Step 4: Re-run tactical overlay tests**

Run:

~~~powershell
npx vitest run tests/components/hud/BuffIndicator.test.tsx tests/components/hud/AchievementPopup.test.tsx tests/components/hud/ClutchAnnouncement.test.tsx tests/components/hud/NotificationSystem.test.tsx tests/components/hud/MarketAnnouncementBanner.test.tsx tests/components/hud/MilestoneAnnouncer.test.tsx
~~~

Expected: PASS. Existing queue/dismissal behavior passes while every non-blocking surface is rail-based and non-opaque.

## Task 4: Align Critical, Decision, and Utility Overlays

**Files:**
- Modify: `components/hud/LiquidationWarningOverlay.tsx`
- Modify: `components/ui/OverlayChrome.tsx`
- Modify: `components/hud/CycleDecisionScreen.tsx`
- Modify: `components/hud/ReplayOverlay.tsx`
- Modify: `components/hud/LeaderboardPanel.tsx`
- Modify: `components/screens/GameOverScreen.tsx`
- Modify: `tests/components/hud/LiquidationWarningOverlay.test.tsx`
- Modify: `tests/components/hud/CycleDecisionScreen.test.tsx`
- Modify: `tests/components/hud/LeaderboardPanel.test.tsx`
- Modify: `tests/screens/GameOverScreen.test.tsx`
- Create: `tests/components/ui/OverlayChrome.test.tsx`
- Create: `tests/components/hud/ReplayOverlay.test.tsx`

**Interfaces:**
- Consumes: existing difficulty/FOV state, decision callbacks, replay service state, leaderboard data, `OverlayChrome` focus/scroll behavior, and game-over props.
- Produces: priority-safe danger treatment and cut-corner decision surfaces without altering business or navigation behavior.

- [ ] **Step 1: Write failing critical/decision contract tests**

Create `tests/components/ui/OverlayChrome.test.tsx` proving the modern shell accepts a war-room class while retaining children:

~~~tsx
render(<OverlayChrome title="Cycle"><button type="button">Continue</button></OverlayChrome>);

expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute('data-overlay-style', 'war-room');
~~~

In liquidation, cycle, replay, leaderboard, and game-over tests, preserve all existing callbacks and add expectations for `data-overlay-priority`: `critical` for liquidation, `decision` for cycle/game-over, and `utility` for replay/leaderboard.

- [ ] **Step 2: Run critical/decision tests to verify they fail**

Run:

~~~powershell
npx vitest run tests/components/hud/LiquidationWarningOverlay.test.tsx tests/components/hud/CycleDecisionScreen.test.tsx tests/components/hud/LeaderboardPanel.test.tsx tests/components/ui/OverlayChrome.test.tsx tests/components/hud/ReplayOverlay.test.tsx tests/screens/GameOverScreen.test.tsx
~~~

Expected: FAIL because the new data attributes and war-room surface contract do not exist.

- [ ] **Step 3: Implement visual-only critical and decision updates**

- `LiquidationWarningOverlay`: retain all FOV, vignette, alert thresholds, and pointer-event behavior. Add `data-overlay-priority="critical"`; reduce its textual panel to a single crimson rail consequence and leave the screen-edge visual effect as the unique critical backdrop.
- `OverlayChrome`: add `data-testid="overlay-chrome-surface"` and `data-overlay-style="war-room"` to the modern `ThemedPanel`. Replace the modern rounded cyan glass framing with cut-corner geometry, gold/crimson rails, and a restrained dimmer. Preserve retro branches exactly.
- `CycleDecisionScreen` and `GameOverScreen`: pass decision tone classes to `OverlayChrome`, keep button semantics and copy unchanged, and mark their roots `data-overlay-priority="decision"`.
- `ReplayOverlay` and `LeaderboardPanel`: remove persistent rounded/slate card chrome, apply utility rails, retain all controls, loading/empty states, and desktop visibility rules, then mark their roots `data-overlay-priority="utility"`.

- [ ] **Step 4: Re-run critical/decision tests**

Run:

~~~powershell
npx vitest run tests/components/hud/LiquidationWarningOverlay.test.tsx tests/components/hud/CycleDecisionScreen.test.tsx tests/components/hud/LeaderboardPanel.test.tsx tests/components/ui/OverlayChrome.test.tsx tests/components/hud/ReplayOverlay.test.tsx tests/screens/GameOverScreen.test.tsx
~~~

Expected: PASS. Critical and decision interactions are preserved and visual priority is encoded in the DOM.

## Task 5: Run Cross-HUD Regression, Formatting, and Full Verification

**Files:**
- Verify: all files from Tasks 1–4
- Verify: `docs/superpowers/specs/2026-07-09-quiet-war-room-hud-design.md`
- Verify: `docs/superpowers/plans/2026-07-09-quiet-war-room-hud.md`

**Interfaces:**
- Consumes: completed rail primitives, persistent HUD, tactical overlays, and decision overlays.
- Produces: evidence that the visual refactor preserves gameplay behavior, responsiveness, type safety, and production build output.

- [ ] **Step 1: Format only changed files**

Run:

~~~powershell
npx prettier --write config/HUDWarRoom.ts components/hud/HudGhostRail.tsx components/hud/AccountHealthPremium.tsx components/hud/LiveFeed.tsx components/hud/KernelStatus.tsx components/hud/WaveTimer.tsx components/GameUI.tsx components/hud/BuffIndicator.tsx components/hud/ChallengeProgressHUD.tsx components/hud/AchievementPopup.tsx components/hud/ClutchAnnouncement.tsx components/hud/MarketAnnouncementBanner.tsx components/hud/MilestoneAnnouncer.tsx components/hud/NotificationSystem.tsx components/hud/LiquidationWarningOverlay.tsx components/ui/OverlayChrome.tsx components/hud/CycleDecisionScreen.tsx components/hud/ReplayOverlay.tsx components/hud/LeaderboardPanel.tsx components/screens/GameOverScreen.tsx tests/components/hud tests/components/ui/OverlayChrome.test.tsx tests/components/GameUI.test.tsx tests/screens/GameOverScreen.test.tsx
~~~

Expected: exit code 0.

- [ ] **Step 2: Run the focused HUD suite**

Run:

~~~powershell
npx vitest run tests/components/GameUI.test.tsx tests/components/GameHUD.test.tsx tests/GameHUD.test.tsx tests/components/hud tests/screens/GameOverScreen.test.tsx
~~~

Expected: PASS with no failures. Existing combo-milestone tests prove `ComboPanel` remains absent.

- [ ] **Step 3: Run static checks and the complete test suite**

Run:

~~~powershell
npm run typecheck
npm run lint
npm run test
~~~

Expected: each command exits 0.

- [ ] **Step 4: Run architecture/build and React review gates**

Run:

~~~powershell
npm run check:architecture
npm run check:reset-coverage
npm run build
npx -y react-doctor@latest . --verbose --diff
~~~

Expected: all project commands exit 0; React Doctor findings are reviewed and any newly introduced errors are fixed before handoff.

- [ ] **Step 5: Perform manual responsive acceptance**

Run `npm run dev`, then inspect an active game at desktop and mobile-landscape widths. Confirm:

1. Market, Run, and Operator float over the battlefield with no opaque black/card backgrounds.
2. HP is bottom-center, at most 222px wide on desktop, legible at mobile safe-area widths, and never blocks pause or movement controls.
3. HP turns crimson at 35% or lower without growing, while liquidation remains the only critical screen-edge warning.
4. A market event, milestone, buff, notification, and decision screen obey the documented priority ladder.
5. Reduced-motion preference removes nonessential rail animation without removing text, controls, or warnings.

Expected: all five checks pass before reporting implementation complete.
