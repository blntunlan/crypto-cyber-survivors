# Quiet War Room HUD Design

> **Status:** approved design
> **Created:** 2026-07-09

## Purpose

Rebuild the in-run HUD and its transient overlays as a quiet, market-literate “War Room.” The player must read market conditions and combat readiness in one glance without a card-heavy dashboard obscuring the battlefield.

## Scope

- Persistent in-run HUD: Market Intel, Run timer, Operator status, buffs, and player HP.
- Tactical and transient overlays: market alerts, milestones, achievements, clutch feedback, notifications, combo feedback, and liquidation risk.
- Decision and utility overlays used during play: cycle decision, replay controls, challenge progress, and leaderboard chrome.
- Desktop, tablet, landscape mobile, safe-area, reduced-motion, keyboard-focus, and screen-reader behavior.

## Non-goals

- Do not change market calculations, combat balance, EventBus contracts, rewards, audio triggers, or game-state transitions.
- Do not add React state updates inside the RAF loop.
- Do not replace the existing cyberpunk/retro theme system or introduce a new singleton.
- Do not redesign hub, settings, landing, or authentication screens.

## Visual System

### Quiet War Room rules

1. Persistent HUD is a ghost layer, not a collection of opaque cards. It uses text shadows, thin rails, whitespace, and high-contrast values over the battlefield.
2. Gold expresses stable system value and objectives; crimson expresses danger and loss; mint expresses favorable market movement; cyan remains the player/current-position color only.
3. White is reserved for the value the player must read first. Muted slate supports labels and units.
4. Rounded, fully filled panels, repeated values, decorative scanlines, and permanent pulse effects are removed from in-run HUD surfaces.
5. An event explains a consequence, not a raw metric: for example, `RSI OVERHEAT · ENEMIES +15% RAGE`.

### Shared tokens

| Token | Value | Use |
|---|---:|---|
| `WAR_ROOM_GOLD` | `#D6B85C` | Stable status, rails, HP above caution threshold |
| `WAR_ROOM_CRIMSON` | `#B22222` | Risk rails, liquidation, low HP |
| `WAR_ROOM_MINT` | `#6EE7B7` | Positive P&L and beneficial signal |
| `WAR_ROOM_DANGER_TEXT` | `#FF7777` | Critical warning copy |
| `WAR_ROOM_VALUE` | `#F8FAFC` | Primary values |
| `WAR_ROOM_MUTED` | `#AEB5C1` | Labels and contextual copy |
| `WAR_ROOM_TEXT_SHADOW` | `0 2px 3px rgba(0,0,0,.9)` | Battlefield legibility without panel fills |
| `WAR_ROOM_HP_MAX_WIDTH` | `222px` | Persistent HP dock width cap |
| `WAR_ROOM_HP_HEIGHT` | `8px` | Persistent HP track height |

Tokens live in a typed configuration module; no component hard-codes these values.

## Persistent Layout

### Desktop and tablet

```text
MARKET INTEL                RUN                 OPERATOR
$84,617 · P&L              08:43               LV. 12
RSI / ATR / VOL                                  DMG / SPD / CRT

                         [ battlefield ]

                         HP 72 / 100
                    ────────────────▏
```

- **Market Intel** is top-left: price, effective P&L, and up to three compact signals (RSI, ATR, volume) with their gameplay effect.
- **Run timer** is unboxed at top-center. It retains its accessible label and `wave-timer-text` test id.
- **Operator** is top-right: level plus exactly Damage, Speed, and Crit in the persistent deck. XP remains as a thin rail; all remaining stats remain available in existing deeper surfaces rather than occupying the battle HUD.
- **HP** is bottom-center, with no panel container. It shows `HP`, one `current / maximum` value, an 8px track, and 0/25/50/75/100 scale labels. It never duplicates a status title or percentage.

### Mobile

- Preserve safe-area offsets and pause-button hit area.
- Keep price/P&L plus the most actionable market signal; condense the remaining signals to an accessible details affordance.
- Keep level and Damage visible; show Speed/Crit in a non-blocking horizontal detail row only when space allows.
- HP width is `min(222px, calc(100vw - safe-area-left - safe-area-right - 2rem))`; it remains above controls and is never wider than 52vw in landscape.

## HP Behavior

- HP is calm and functional: it has no opaque background, tech decal, phase display, duplicate percentage, shimmering layer, or always-on pulse.
- Above 35%, fill is `WAR_ROOM_GOLD`. At or below 35%, fill and the `HP` label become crimson. The track does not grow or cover more screen space in a critical state.
- A damage update changes the fill with the existing short transition and flashes the rail crimson once. Healing flashes mint once. Under `prefers-reduced-motion`, these become instant color changes.
- Screen-edge liquidation effects stay in `LiquidationWarningOverlay`; the HP bar does not duplicate its copy or urgency.

## Overlay Hierarchy

| Priority | Surface | Behavior |
|---|---|---|
| 1 | Liquidation / critical risk | Only central high-priority warning; preempts queued informational feedback. |
| 2 | Cycle, level-up, game-over decisions | Only blocking modal; dims the battlefield and preserves keyboard focus. |
| 3 | Market events and milestones | One centered, rail-bounded consequence sentence; events queue instead of stacking. |
| 4 | Buffs, healing, combo, achievement, challenge progress, notification | Corner rail or queued toast; never owns the center while a priority 1–3 surface is visible. |

### Shared treatment

- Transient surfaces use a two-pixel side rail and no opaque card body during gameplay.
- Gold milestones, crimson risk, mint positive recovery, and white primary copy reuse the shared token system.
- Existing event timing, EventBus subscriptions, queues, sound behavior, and z-index ordering remain intact unless visual overlap requires a documented class-only change.
- Full-screen decision surfaces use a restrained dimmer plus a cut-corner, gold/crimson rail treatment. They retain their existing interaction and focus behavior.

## Component Boundaries and Data Flow

```text
GameUI
  marketData ──> LiveFeed (Market Intel)
  player ──────> KernelStatus (Operator)
  player HP ───> AccountHealthPremium (compact HP rail)
  TimeService/EventBus ──> WaveTimer (Run)

GameHUD / GameScreenRouter
  EventBus ──> MarketAnnouncementBanner / MilestoneAnnouncer /
                 AchievementPopup / ClutchAnnouncement / NotificationSystem
  Difficulty state ──> LiquidationWarningOverlay
  Game-flow state ──> CycleDecisionScreen / ReplayOverlay / LeaderboardPanel
```

Create presentation-only `HudGhostRail` and `HudEventRail` primitives plus a typed `HUD_WAR_ROOM` configuration. They accept class names and semantic tone; they do not subscribe to state, calculate market values, or create global services.

## Accessibility and Resilience

- Keep existing `aria-label`, live-region, button, focus, and close-control behavior unchanged.
- Contrast must remain readable against bright combat effects through text shadow and token contrast rather than opaque backgrounds.
- Honor `prefers-reduced-motion` for new flashes, transitions, and event emphasis.
- Missing market-server indicator data falls back to existing price/P&L content and does not render empty rails.
- If translation returns an array, retain the project’s current `text()` normalization pattern.

## Verification

- Component tests assert semantic labels, key values, compact HP geometry, thresholds, and absence of removed opaque/duplicate HUD content.
- Integration tests assert GameUI preserves pause touch behavior and composes the new surfaces for mobile and desktop.
- Existing overlay tests verify current event contracts, queues, and decision interactions remain intact.
- Run affected Vitest files first, then `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npx -y react-doctor@latest . --verbose --diff` before claiming completion.
