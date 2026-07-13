# Vertical Payline Level-Up Design

> **Status** approved design  
> Owner: Core Engineering  
> Created: 2026-07-12

## Purpose

Revise the in-run level-up presentation so it matches the current quiet war-room visual language while preserving the slot machine as the core interaction metaphor. The screen must retain the existing simultaneous spin, randomized staggered reel stops, synchronized slot audio, and post-spin upgrade selection behavior.

## Decisions

| Area | Decision |
|---|---|
| Core metaphor | Present the upgrade choices inside one vertical payline cabinet. |
| Choice layout | Keep one independently animated ticket row per upgrade choice inside the cabinet. |
| Spin start | Start every ticket row spinning together when the level-up screen opens. |
| Stop order | Preserve the existing randomized stop order on every level-up. |
| Reveal rhythm | Reveal cards one at a time as their rows stop; already stopped rows remain readable while other rows continue spinning. |
| Audio | Preserve tick, slowdown tension, per-reel stop, multiplier chime, final win fanfare, and their current timing relationships. |
| Selection | Enable selection only after all rows stop; retain pointer, touch, W/S, arrow-key, Enter, and Space behavior. |
| Theme support | Apply the new cabinet composition to both modern and retro themes without merging their rendering styles. |
| Gameplay | Do not change card generation, rarity, upgrade effects, timers, or level-up state transitions. |

## Visual System

### Composition

The modern screen uses a centered vertical cabinet rather than three disconnected card panels. The hierarchy is:

1. A compact protocol eyebrow containing the current level context.
2. A restrained `LEVEL UP` or localized equivalent display title.
3. A status line that reports spin, partial lock, or ready-to-select state.
4. One framed cabinet containing all upgrade ticket rows.
5. A compact footer containing navigation or competitive-timer information.

The cabinet is the signature element. Its outer frame uses cropped tactical corners, a thin casino-gold keyline, and three small lock indicators. The cabinet background stays uninterrupted so the moving rows remain the focus.

### Palette

The implementation must use existing centralized colors rather than service-local literals:

- Casino gold (`COLORS.CASINO_GOLD`) for the cabinet frame, active selection, and final payline.
- Electric blue (`COLORS.ELECTRIC_BLUE`) for rows that are still spinning.
- War-room mint (`HUD_WAR_ROOM.colors.mint`) for a row that has locked successfully.
- Casino crimson (`COLORS.CASINO_RED`) for restrained market-risk accents only.
- Slate/black surfaces for the cabinet body and overlay.

Card rarity colors remain the source of truth for each revealed card's icon, tier label, and secondary glow. Rarity color must not replace the global selection indicator.

### Typography

- Modern display labels continue to use `font-cyber` with condensed, italic, uppercase treatment.
- Utility labels, lock counters, and timer values use the existing mono/numeric typography.
- Retro mode continues to use the existing retro pixel and jersey families.
- Card descriptions remain sentence case and prioritize readability over decorative styling.

## Component Boundaries

### `LevelUpScreen`

`LevelUpScreen` remains responsible for screen-level state and orchestration:

- Generate and retain the randomized stop order once per screen mount.
- Track the number of stopped rows.
- Render the title, status, cabinet frame, lock indicators, and competitive timer.
- Keep keyboard navigation and selection guards unchanged.
- Trigger the final win sequence only after all rows stop.

The cabinet chrome should remain screen-level so individual rows do not duplicate frame decoration.

### `SlotReel`

`SlotReel` remains responsible for one independently animated upgrade row:

- Cycle through the existing card pool during spin.
- Enter the existing slowing phase based on its assigned randomized delay.
- Lock to `finalCard` and notify `LevelUpScreen` exactly once.
- Render distinct spinning, locked, selected, and unselected states.
- Preserve the existing audio callbacks and render throttling.

The visual revision may rename the component only if the rename provides clear value. No new runtime singleton or gameplay service is required.

## Motion and Audio Choreography

### Phase 1: Simultaneous Spin

All ticket rows begin cycling together. Spinning content uses limited directional blur and reduced opacity. Cyan reel accents and empty lock indicators communicate that the cabinet is active. Existing tick throttling remains unchanged.

### Phase 2: Randomized Locks

Each row stops according to the existing randomized `stopOrder`. When a row locks:

1. The row resolves to its final card.
2. Its border changes from spin cyan to lock mint plus the card rarity accent.
3. Its lock indicator illuminates.
4. The existing reel-stop and multiplier-chime sounds play.
5. Other rows continue their current spin or slowdown phase without being reset.

The UI must not imply a top-to-bottom stop order.

### Phase 3: Selection Ready

After the final row locks, the cabinet transitions from reveal mode to selection mode. The final win fanfare retains its existing settle delay. The currently keyboard-selected row receives the casino-gold side-rail treatment; non-selected rows stay stable and readable.

### Reduced Motion

When reduced motion is requested, remove repeated pulses, large translations, and continuous glow scaling. Preserve the timed reveal order and audio behavior so gameplay timing does not diverge. Card changes may use a short opacity transition instead of directional blur.

## Responsive Behavior

- The cabinet remains a single vertical column on mobile, tablet, and desktop.
- Desktop may show wider descriptions and peripheral protocol metadata, but must not change the choice order or interaction.
- Mobile ticket rows use a compact icon column and omit nonessential status badges before truncating card names or descriptions.
- The screen remains vertically scrollable for four-choice meta-upgrade configurations and short landscape viewports.
- Safe-area padding and existing overlay z-index behavior remain unchanged.

## Retro Theme

Retro mode uses the same composition and reveal sequence with theme-specific treatment:

- Hard pixel borders instead of glass or soft glow.
- Jackpot yellow, electric blue, and neon green from the existing retro palette.
- Stepped or short opacity changes instead of blur-heavy motion.
- No rounded cabinet corners or modern glass effects.

Retro mode must not become a separate interaction implementation.

## Performance Constraints

- Preserve the current `requestAnimationFrame`-driven reel timing and React render throttling.
- Do not add timers that affect the gameplay loop.
- Do not add per-frame layout measurement, canvas work, or unbounded particle allocation.
- Decorative motion must use transform and opacity where possible.
- The visual change must not add a new singleton or alter gameplay state ownership.

## Error and Edge Handling

- Zero choices continue to fall through the existing error-boundary behavior; the redesign does not invent a fallback reward.
- Four choices render inside the same cabinet and participate in the randomized stop order.
- Competitive auto-select starts only after every row stops, as it does now.
- Selection remains guarded so rapid touch, click, or keyboard input cannot apply more than one card.
- A row unmounted during spin cancels its animation frame and must not emit a late stop callback.

## Verification

- Component tests verify that all choice rows render inside one level-up cabinet.
- Component tests verify that rows remain disabled until their spin completes and selection still fires once with the chosen card.
- Component tests verify the all-stopped status and competitive timer behavior.
- Existing tests continue to cover three- and four-choice configurations.
- An interaction test verifies keyboard navigation after all rows stop.
- E2E coverage verifies that the level-up screen appears, reveals every choice, accepts a selection, and resumes gameplay.
- Visual verification covers modern desktop, modern mobile, retro desktop, and a four-choice short-viewport case.

## Out of Scope

- Changing upgrade odds, rarity rules, card copy, or card art.
- Adding rerolls, paid spins, skip actions, or gambling economy mechanics.
- Replacing the current slot audio composition.
- Changing level-up pause behavior or game-state transitions.
- Refactoring unrelated HUD, card-system, or progression services.
