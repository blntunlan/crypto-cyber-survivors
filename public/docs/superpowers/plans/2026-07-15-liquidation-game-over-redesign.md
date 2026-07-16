# Liquidation Game Over Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the liquidation game-over screen as a restrained, mobile-first war-room result surface that keeps the collapsed result and return action visible at 375×667.

**Architecture:** Keep `GameOverScreen` as the only production component changed and retain `OverlayChrome` for safe areas, z-index, and scroll containment. Render a custom liquidation hierarchy inside that shell, calculate the synchronous reward before first paint, and keep presentation helpers local because no second consumer exists.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS, Framer Motion, Vitest + Testing Library, Playwright.

## Global Constraints

- Preserve the quiet war-room palette: near-black surface, crimson risk, gold reward, white values, muted labels.
- Use only existing runtime data; do not add price, position, leverage, or market-history fields.
- Fit the collapsed result and return action inside 375×667 with 47 px top and 34 px bottom safe areas.
- Keep the return action at least 52 px high.
- Use one non-interactive crimson decline trace; add no looping pulse, glow, scan-line, or scale animation.
- Respect reduced motion through the existing root `MotionConfig reducedMotion="user"` behavior.
- Preserve retro typography, sharp geometry, content order, and touch target sizes.
- Preserve result recording, reward calculation, verified coin override, audio, detail toggle, and restart behavior.
- Do not modify `LiquidationWarningOverlay` or unrelated overlay components.

## File Map

- Modify `components/screens/GameOverScreen.tsx`: result hierarchy, synchronous reward, responsive layout, motion, retro treatment, and sticky mobile action.
- Modify `tests/screens/GameOverScreen.test.tsx`: semantic order, streak, reward, verified override, detail toggle, restart, and retro contracts.
- Modify `e2e/mobile-touch-controls.spec.ts`: compact safe-area geometry, expanded reward reachability, and reduced-motion settling.

---

### Task 1: Liquidation Result Surface

**Files:**
- Modify: `tests/screens/GameOverScreen.test.tsx:1`
- Modify: `e2e/mobile-touch-controls.spec.ts:400`
- Modify: `components/screens/GameOverScreen.tsx:1`

**Interfaces:**
- Consumes: `GameOverScreenProps`, `CoinService.calculateCycleReward`, `ComboSystem.getMaxStreak(): number`, `useGameStore`, `useIsRetro`, `OverlayChrome`, and `ThemedButton`.
- Produces: the existing `GameOverScreen` export plus stable targets `liquidation-result`, `liquidation-heading`, `liquidation-pnl`, `liquidation-run-stats`, `liquidation-reward`, `liquidation-career`, `liquidation-primary-action`, and `liquidation-decline-trace`.

- [ ] **Step 1: Write failing component contracts**

Extend the Framer Motion mock with semantic `h1` support:

```tsx
h1: ({
  children,
  initial: _initial,
  animate: _animate,
  transition: _transition,
  ...props
}: any) => <h1 {...props}>{children}</h1>,
```

Add a mutable theme mock and deterministic streak:

```tsx
const themeState = vi.hoisted(() => ({ isRetro: false }));

vi.mock('../../contexts/useTheme', () => ({
  useIsRetro: () => themeState.isRetro,
}));

import { ComboSystem } from '../../services/combat/ComboSystem';

beforeEach(() => {
  vi.clearAllMocks();
  themeState.isRetro = false;
  vi.spyOn(ComboSystem, 'getMaxStreak').mockReturnValue(36);
});
```

Replace the shallow assertions with these contracts:

```tsx
it('renders the approved liquidation hierarchy in semantic order', () => {
  render(<GameOverScreen {...defaultProps} />);

  const heading = screen.getByTestId('liquidation-heading');
  const pnl = screen.getByTestId('liquidation-pnl');
  const runStats = screen.getByTestId('liquidation-run-stats');
  const reward = screen.getByTestId('liquidation-reward');
  const career = screen.getByTestId('liquidation-career');
  const action = screen.getByTestId('liquidation-primary-action');

  expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
    'data-overlay-priority',
    'decision'
  );
  expect(screen.getByTestId('liquidation-result')).toContainElement(heading);
  expect(heading).toHaveTextContent('common.game_over_screen.liquidated');
  expect(pnl).toHaveTextContent('50.00%');
  expect(runStats).toHaveTextContent('2:00');
  expect(runStats).toHaveTextContent('50');
  expect(runStats).toHaveTextContent('36');
  expect(heading.compareDocumentPosition(pnl)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(pnl.compareDocumentPosition(runStats)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(runStats.compareDocumentPosition(reward)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(reward.compareDocumentPosition(career)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(career.compareDocumentPosition(action)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

it('hides the decorative decline trace from assistive technology', () => {
  render(<GameOverScreen {...defaultProps} />);
  expect(screen.getByTestId('liquidation-decline-trace')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
});

it('renders reward immediately and prefers verified coins', () => {
  const { rerender } = render(<GameOverScreen {...defaultProps} />);
  expect(screen.getByTestId('liquidation-reward-value')).not.toHaveTextContent('+0');

  rerender(<GameOverScreen {...defaultProps} coinsEarned={1234} />);
  expect(screen.getByTestId('liquidation-reward-value')).toHaveTextContent('+1,234');
});

it('keeps reward details collapsed until requested', () => {
  render(<GameOverScreen {...defaultProps} />);
  expect(screen.queryByTestId('liquidation-reward-breakdown')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Details' }));
  expect(screen.getByTestId('liquidation-reward-breakdown')).toBeVisible();
});

it('keeps required content in retro mode', () => {
  themeState.isRetro = true;
  render(<GameOverScreen {...defaultProps} />);
  expect(screen.getByTestId('liquidation-result')).toHaveAttribute(
    'data-liquidation-theme',
    'retro'
  );
  expect(screen.getByTestId('liquidation-heading')).toBeVisible();
  expect(screen.getByTestId('liquidation-primary-action')).toBeVisible();
});

it('calls onRestart from the primary action', () => {
  const onRestart = vi.fn();
  render(<GameOverScreen {...defaultProps} onRestart={onRestart} />);
  fireEvent.click(screen.getByTestId('liquidation-primary-action'));
  expect(onRestart).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Write failing compact-mobile contracts**

In `keeps the liquidation decision surface inside a compact portrait viewport`, keep the current geometry checks and replace the final button-only assertion with:

```ts
const result = page.getByTestId('liquidation-result');
const heading = page.getByTestId('liquidation-heading');
const action = page.getByTestId('liquidation-primary-action');

await expect(result).toBeVisible();
await expect(heading).toBeInViewport();
await expect(action).toBeInViewport();

await page.getByRole('button', { name: /Details/i }).click();
await expect(page.getByTestId('liquidation-reward-breakdown')).toBeVisible();
await action.scrollIntoViewIfNeeded();
await expect(action).toBeInViewport();
```

Add the reduced-motion case immediately after it:

```ts
test('settles liquidation motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupMobileSession(page, { width: 375, height: 667 });
  await startGameFromMainMenu(page, 'LONG');
  await page.evaluate(() => window.GameHelpers?.triggerGameOver?.());

  await expect(page.getByTestId('liquidation-heading')).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(animation => animation.playState === 'running').length
      )
    )
    .toBe(0);
});
```

- [ ] **Step 3: Verify RED**

Run:

```bash
npx vitest run tests/screens/GameOverScreen.test.tsx
npx playwright test e2e/mobile-touch-controls.spec.ts --project=chromium --grep "liquidation"
```

Expected: Vitest and Playwright fail because the new `liquidation-*` targets and displayed maximum streak do not exist. Syntax and test setup must remain valid.

- [ ] **Step 4: Make reward data stable before first paint**

Remove the `coinCalc` state. Read streak once and calculate reward synchronously:

```tsx
const maxStreak = React.useMemo(() => ComboSystem.getMaxStreak(), []);
const coinCalc = React.useMemo(
  () =>
    CoinService.calculateCycleReward({
      survivalTimeSeconds: survivalTime,
      kills,
      level,
      pnl: finalPnl,
      maxStreak,
    }),
  [finalPnl, kills, level, maxStreak, survivalTime]
);
const displayedCoins = coinsEarned > 0 ? coinsEarned : coinCalc.total;
```

Keep the mount effect limited to result recording:

```tsx
React.useEffect(() => {
  if (hasRecordedRef.current) return;
  hasRecordedRef.current = true;
  const score = Math.floor(
    kills * 10 + survivalTime + (finalPnl > 0 ? finalPnl * 1000 : 0)
  );
  recordGameEnd(score, level, survivalTime, kills);
}, [kills, level, survivalTime, finalPnl, recordGameEnd]);
```

- [ ] **Step 5: Implement the restrained result hierarchy**

Remove `useThemeSize`, `CoinCalculation`, `OverlaySectionRail`, `StatItem`, and `MiniMetric`. Import `HUD_WAR_ROOM` and keep one short transition:

```tsx
const RESULT_ENTER_TRANSITION = { duration: 0.22, ease: 'easeOut' } as const;
```

Render `OverlayChrome` without its shared title slot:

```tsx
<OverlayChrome
  zIndex={Z_LAYERS.GAME_OVER}
  maxWidthClassName="max-w-4xl"
  accentColor={COLORS.CASINO_RED}
  overlayPriority="decision"
  panelClassName="flex max-h-full min-h-0 flex-col !p-0"
  contentClassName="flex min-h-0 flex-1"
>
  <m.div
    data-testid="liquidation-result"
    data-liquidation-theme={isRetro ? 'retro' : 'modern'}
    className={cn(
      'custom-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 sm:px-8 sm:py-7',
      isRetro ? 'font-retro-pixel' : 'font-cyber'
    )}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={RESULT_ENTER_TRANSITION}
  >
    <LiquidationHeader
      isRetro={isRetro}
      title={t('common.game_over_screen.liquidated') as string}
      subtitle={t('common.session_halted') as string}
    />
    {isNewHighScore && <CompactHighScore label={t('common.game_over_screen.new_high_score') as string} />}
    <LiquidationResult
      finalPnl={finalPnl}
      level={level}
      survivalTime={formatTime(survivalTime)}
      kills={kills}
      maxStreak={maxStreak}
      isRetro={isRetro}
    />
    <LiquidationReward
      coinCalc={coinCalc}
      displayedCoins={displayedCoins}
      isRetro={isRetro}
      expanded={showBreakdown}
      onToggle={() => setShowBreakdown(previous => !previous)}
    />
    <LiquidationCareer
      games={progress.totalGamesPlayed}
      totalKills={progress.totalKills}
      bestLevel={progress.highestLevel}
    />
    <div className="sticky bottom-0 z-20 mt-auto bg-gradient-to-t from-[#090C12] via-[#090C12] to-transparent pt-4">
      <ThemedButton
        data-testid="liquidation-primary-action"
        intent="primary"
        onClick={onRestart}
        className="min-h-[52px] w-full text-sm font-black uppercase tracking-[0.2em]"
      >
        {t('common.game_over_screen.back_to_menu') as string}
      </ThemedButton>
    </div>
  </m.div>
</OverlayChrome>
```

The result body is the only scroll container. The sticky action remains reachable after details expand.

- [ ] **Step 6: Add focused local presentation helpers**

Implement the header with one hidden decorative trace and no looping animation:

```tsx
const LiquidationHeader: React.FC<{
  isRetro: boolean;
  title: string;
  subtitle: string;
}> = ({ isRetro, title, subtitle }) => (
  <header className="relative border-b border-white/10 border-t border-t-[#B22222]/55 py-3 sm:py-4">
    {!isRetro && (
      <svg
        data-testid="liquidation-decline-trace"
        aria-hidden="true"
        viewBox="0 0 320 96"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-35"
      >
        <polyline
          points="0,18 42,24 78,19 114,35 151,31 188,48 224,44 258,64 286,59 320,88"
          fill="none"
          stroke={COLORS.CASINO_RED}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )}
    <m.h1
      data-testid="liquidation-heading"
      className={cn(
        'relative z-10 text-[clamp(2rem,10vw,4.75rem)] font-black leading-[0.88] tracking-[-0.055em] text-white',
        isRetro && 'font-retro-pixel tracking-normal text-[#FF5A5A]'
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={RESULT_ENTER_TRANSITION}
    >
      {title}
    </m.h1>
    <p className="relative z-10 mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF7777]">
      {subtitle}
    </p>
  </header>
);
```

Implement the dominant PnL and four equal-width run metrics:

```tsx
<section className="py-4 sm:py-5">
  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
    {t('common.game_over_screen.pnl') as string}
  </span>
  <p
    data-testid="liquidation-pnl"
    className="font-numbers text-[clamp(2rem,9vw,3.75rem)] font-black leading-none tracking-[-0.06em]"
    style={{ color: finalPnl >= 0 ? COLORS.PUMP_GREEN : HUD_WAR_ROOM.colors.dangerText }}
  >
    {(finalPnl * 100).toFixed(2)}%
  </p>
  <div
    data-testid="liquidation-run-stats"
    className="mt-4 grid grid-cols-4 divide-x divide-white/10 border-y border-white/10"
  >
    <RunMetric label={t('common.level_label') as string} value={`L${level}`} />
    <RunMetric label={t('common.game_over_screen.time') as string} value={survivalTime} />
    <RunMetric label={t('common.game_over_screen.kills') as string} value={kills.toLocaleString()} />
    <RunMetric label="Streak" value={maxStreak.toLocaleString()} />
  </div>
</section>
```

Use `min-w-0`, `truncate`, `font-numbers`, and `text-sm sm:text-lg` inside `RunMetric`. Render the reward as a gold left rail with a 44 px detail button, `liquidation-reward-value`, and conditional `liquidation-reward-breakdown`. Render career values in one wrapping `liquidation-career` row using the existing translated games, total-kills, and best-level labels. Render the high-score state as one compact gold left rail with `IconTrophy`; do not restore its old bordered card.

`LiquidationResult`, `LiquidationReward`, and `LiquidationCareer` each call `useLanguage()` internally for their own labels. Their public local props remain limited to the numeric/string values shown in Step 5, so the helper signatures and call sites stay consistent.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
npx vitest run tests/screens/GameOverScreen.test.tsx
npx playwright test e2e/mobile-touch-controls.spec.ts --project=chromium --grep "liquidation"
```

Expected: all `GameOverScreen` tests pass; compact portrait and reduced-motion liquidation E2E cases pass; collapsed heading and action are in the viewport; expanded details keep the action reachable.

- [ ] **Step 8: Format and run the focused gate**

Run:

```bash
npx prettier --write components/screens/GameOverScreen.tsx tests/screens/GameOverScreen.test.tsx e2e/mobile-touch-controls.spec.ts
npx eslint components/screens/GameOverScreen.tsx tests/screens/GameOverScreen.test.tsx e2e/mobile-touch-controls.spec.ts
npx vitest run tests/screens/GameOverScreen.test.tsx tests/components/ui/OverlayChrome.test.tsx
```

Expected: formatting is stable, ESLint exits zero, and both component suites pass.

- [ ] **Step 9: Commit the independently testable redesign**

Commit only the task files so unrelated worktree changes remain untouched:

```bash
git add components/screens/GameOverScreen.tsx tests/screens/GameOverScreen.test.tsx e2e/mobile-touch-controls.spec.ts
git commit --only -m "feat(ui): redesign liquidation game over screen" -- components/screens/GameOverScreen.tsx tests/screens/GameOverScreen.test.tsx e2e/mobile-touch-controls.spec.ts
```

Expected: one conventional commit containing only the result surface and its tests.

---

### Task 2: Repository Verification

**Files:**
- Verify: `components/screens/GameOverScreen.tsx`
- Verify: `tests/screens/GameOverScreen.test.tsx`
- Verify: `e2e/mobile-touch-controls.spec.ts`

**Interfaces:**
- Consumes: the completed `GameOverScreen` contract from Task 1.
- Produces: repository-level evidence for type, architecture, lint, unit, E2E, and production-build gates.

- [ ] **Step 1: Run focused UI checks**

Run:

```bash
git diff --check HEAD^ -- components/screens/GameOverScreen.tsx tests/screens/GameOverScreen.test.tsx e2e/mobile-touch-controls.spec.ts
npx vitest run tests/screens/GameOverScreen.test.tsx tests/components/ui/OverlayChrome.test.tsx
npx playwright test e2e/mobile-touch-controls.spec.ts --project=chromium --grep "liquidation"
```

Expected: no whitespace errors and all focused component and E2E checks pass.

- [ ] **Step 2: Run the required full baseline**

Run:

```bash
npm run check:baseline
```

Expected: typecheck, architecture check, reset coverage, lint, full Vitest suite, and production build pass. If an unrelated pre-existing file fails, record the exact command and file without modifying unrelated code.

- [ ] **Step 3: Inspect final scope**

Run:

```bash
git show --stat --oneline HEAD
git show --name-only --format= HEAD
git status --short
```

Expected: the redesign commit lists only the three Task 1 files. Existing unrelated worktree modifications remain present and unchanged.
