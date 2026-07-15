# Liquidation Game Over Redesign

**Date:** 2026-07-15

## Goal

Redesign the liquidation game-over screen so it feels native to Crypto Survivors' quiet war-room aesthetic, remains legible during the transition out of combat, and fits compact portrait mobile viewports without forcing the primary action off-screen.

## Design Direction

The screen is a restrained liquidation report, not a decorative cyberpunk dashboard. It uses the existing dark war-room surface, crimson risk color, gold reward accent, and compact terminal typography. The design avoids concept labels, invented telemetry, stacked cards, persistent glow, and ornamental interface chrome.

One signature visual is retained: a thin descending crimson trace behind the liquidation heading. It communicates the failed position without pretending to be real market history or competing with the result data.

## Information Hierarchy

The screen presents information in this order:

1. `LIQUIDATED` heading and the existing halted-session subtitle.
2. Final PnL as the dominant run result.
3. Run metrics: level, survival time, kills, and maximum streak from existing runtime data.
4. Coins earned in one gold-accented reward row.
5. Career totals in one subdued inline row.
6. The existing return-to-terminal action.

No fabricated price, position, leverage, or market-event data is added. The design uses only values already available to `GameOverScreen` or already exposed by the services it currently consumes.

## Responsive Layout

### Mobile

- Target the existing 375×667 compact portrait gate first.
- Keep the collapsed result state and primary button visible together without page scrolling.
- Respect top and bottom safe-area insets through `OverlayChrome`.
- Use separators rather than independent statistic cards to reduce vertical height and visual noise.
- Keep the return action at least 52 px high and positioned above the bottom safe area.
- Keep reward details collapsed by default. If opened, only the inner content region scrolls; the action remains reachable.
- Allow labels and values to contract without wrapping into unusable multi-line blocks.

### Desktop

- Preserve the same reading order and visual language rather than switching to a different dashboard.
- Use the additional width for spacing and grouping, not for extra content.
- Keep the result surface centered and narrower than the gameplay viewport.

## Visual System

- Background: existing near-black `OverlayChrome` war-room surface.
- Risk accent: `COLORS.CASINO_RED` or the established war-room crimson token.
- Reward accent: `HUD_WAR_ROOM.colors.gold` or the existing jackpot-gold token.
- Text: existing value and muted war-room colors.
- Structure: thin rules, left rails, and deliberate whitespace instead of rounded metric cards.
- Typography: existing cyber and number font roles; retro mode keeps its current pixel typography and sharp geometry.
- Signature: one restrained descending crimson trace behind the heading.

## Motion

- Use one short entrance sequence for the heading, final PnL, and result content.
- Do not use perpetual pulse, scale loops, flashing glows, or repeated scan-line animation.
- Respect reduced-motion preferences by rendering the final state without movement.
- Preserve the existing death and achievement audio behavior.

## Component Scope

The implementation remains focused on `components/screens/GameOverScreen.tsx` and its direct tests.

- Keep `OverlayChrome` for safe-area, z-index, and scroll containment behavior.
- Omit the shared title slot and render the custom liquidation hierarchy inside the surface.
- Keep small presentation helpers local to `GameOverScreen.tsx` unless reuse becomes concrete during implementation.
- Do not refactor unrelated overlays or the shared HUD architecture.

## Data and Behavior

- Preserve `recordGameEnd`, score calculation, death audio, high-score audio, coin reward calculation, reward-detail toggling, and `onRestart` behavior.
- Compute the synchronous coin result without an initial empty reward area so the layout does not jump after mount.
- Preserve the server-verified `coinsEarned` override when it is greater than zero.
- Keep the new-high-score state visible but compact enough not to displace the primary action on the minimum viewport.
- Read maximum streak from the already-consumed `ComboSystem` service so the compact run-metric row contains level, survival time, kills, and maximum streak without expanding the screen contract.

## Error and Edge States

- Very large coin and career totals may use locale formatting but must remain within their row.
- Negative, zero, and positive final PnL values keep their established semantic colors.
- Missing optional reward data must not remove the primary action or leave an empty framed section.
- Long translated labels may wrap within their own label area without overlapping adjacent values.
- Retro and modern themes must preserve the same content order and touch target sizes.

## Testing

Follow test-driven development for the implementation.

### Component Tests

- Verify the liquidation heading, final PnL, run metrics, reward, career summary, and return action render in the intended semantic order.
- Verify the overlay retains `data-overlay-priority="decision"`.
- Verify reward details are collapsed initially and can be toggled.
- Verify the server-provided `coinsEarned` value overrides the local calculation.
- Verify reduced-motion and retro variants do not remove required content or the primary action.

### Mobile E2E

- Preserve the existing 375×667 safe-area test.
- Verify the surface stays inside the root viewport with simulated top and bottom safe areas.
- Verify the return-to-terminal button is visible and in the viewport in the collapsed state.
- Verify expanding reward details keeps the button reachable through the inner scroll container.

## Non-Goals

- Redesigning the in-game liquidation warning overlay.
- Changing liquidation gameplay, rewards, anti-cheat verification, or game-over routing.
- Adding market history, exit price, position, or leverage data to the result contract.
- Redesigning other game-over, cycle-complete, pause, replay, or leaderboard surfaces.
