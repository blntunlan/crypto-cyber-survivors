# Combo Milestone Feedback Design

> **Status** approved design
> Owner: Core Engineering
> Created: 2026-07-09

## Purpose

Replace the persistent in-run combo counter with short milestone popups and use projectile-trail color as the continuous indicator of an active combo. The change applies to mobile, tablet, and desktop HUDs.

## Decisions

| Area | Decision |
|---|---|
| Persistent HUD | Do not render `ComboPanel` on any platform. |
| Popup thresholds | Keep the existing `ComboSystem` milestones: 5, 10, 25, 50, and 100 kills. |
| Popup behavior | Reuse the existing center-screen combo announcement, including its queued priority, sound throttling, and timed dismissal. |
| Ongoing feedback | Default Quantum Bullet trails use the color of the highest active combo milestone. |
| Combo reset | Trails return to the default bullet color when the combo resets or has not reached a milestone. |
| New thresholds | Do not add recurring milestones after 100 kills. |

## Runtime Flow

1. `ComboSystem.recordKill()` updates the streak and emits the existing `comboMilestone` event when a threshold is crossed.
2. `useHUDEvents` forwards that event to `MilestoneAnnouncer`, which presents the transient popup.
3. `GameHUD` no longer mounts `ComboPanel`, so no streak count, multiplier badge, or timer bar occupies the screen between milestones.
4. `ProjectileRenderer` reads `ComboSystem.getComboColor()` once per frame and passes it into the default Quantum Bullet trail renderer.
5. `ComboSystem.getComboColor()` returns the default bullet color before the first milestone and after a reset, preserving the normal weapon appearance outside an active tier.

## Boundaries

- The combat economy, combo timeout, multiplier values, popup animation, and audio behavior remain unchanged.
- This change must not introduce React state updates in the request-animation-frame loop.
- Projectile rendering must not allocate per-frame data to determine the trail color.
- The existing milestone list remains the sole source of truth for tier colors and thresholds.

## Verification

- HUD tests verify that the persistent combo panel is absent while the milestone announcer remains available.
- Renderer tests verify that a trail uses the current combo color and falls back to the default bullet color after reset.
- Existing `ComboSystem` tests continue to cover threshold colors and reset behavior.
