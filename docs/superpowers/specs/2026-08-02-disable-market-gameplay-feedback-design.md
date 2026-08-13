# Disable Market Gameplay Feedback Design

## Goal

Remove market-driven text announcements and full-screen market color changes from active gameplay while preserving gameplay mechanics and non-market progression feedback.

## In Scope

- Stop rendering the top-of-screen market announcement banner.
- Exclude PnL and drawdown milestones from the center-screen announcement queue.
- Keep combo, kill, time, and level announcements unchanged.
- Stop drawing RSI, volatility, whale, flow-pressure, and market-momentum screen overlays.
- Preserve market-driven difficulty, enemy behavior, rewards, audio systems unrelated to removed announcements, and all combat visual feedback.

## Out of Scope

- Removing market events from the runtime or EventBus.
- Changing market-driven gameplay balance.
- Removing liquidation-critical HUD elements that communicate immediate survival state.
- Removing buff or debuff indicators.
- Adding a player-facing setting for the removed presentation.

## Architecture

The change stays at the presentation boundary:

1. `GameHUD` no longer mounts `MarketAnnouncementBanner`.
2. `ANNOUNCER_MILESTONE_TYPES` accepts only non-market progression types: kills, time, and level. A separate hidden-type set drops PnL, danger, and market milestones before they can fall through to the generic achievement popup. Combo announcements continue through their existing dedicated event.
3. `EffectRenderer.render` no longer invokes market ambiance or momentum overlay drawing. Combat flashes, particles, damage text, speed lines, and other entity-local effects remain unchanged.
4. Market services continue producing their existing state and events so gameplay logic, telemetry, and future presentation choices remain decoupled from this UI decision.

## Behavior

- PnL milestones such as `KÂRDASIN`, `UP ONLY`, `MOONSHOT`, and `SUPERNOVA` never enter the gameplay announcer queue.
- Negative PnL announcements such as drawdown and liquidation-zone milestones also remain hidden.
- Market event banners such as favorable/unfavorable market and RSI transitions are not mounted.
- The canvas is not tinted or pulsed by market state, including green favorable-state washes.
- Kill, time, level, and combo announcements retain their existing timing, queueing, priority, sound, and animation behavior.
- Liquidation warnings that communicate direct player danger remain available through their dedicated HUD component.

## Testing

- Add a failing hook test proving PnL and danger milestones are ignored while kill, time, level, and combo announcements still display.
- Update the GameHUD component test to prove the market banner is not mounted.
- Add a renderer regression test proving the render pipeline does not call market ambiance or momentum overlay methods.
- Run the affected Vitest suites, ESLint on touched files, TypeScript type checking, the UI contract check, and diff validation.

## Acceptance Criteria

1. No market or PnL text notification appears during gameplay.
2. No market state changes the gameplay canvas color.
3. Kill, time, level, and combo announcements continue to work.
4. Buff/debuff and liquidation-critical feedback remain intact.
5. Market-driven gameplay behavior remains unchanged.
