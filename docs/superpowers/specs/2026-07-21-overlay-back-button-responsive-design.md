# Responsive Overlay Back Button Design

## Problem

The shared overlay navigation button applies zero horizontal padding at every viewport size. On desktop, labels such as `Hub` and `Info` therefore sit too close to the button edge and make the control look undersized. Mobile still needs a compact icon-only 44 × 44 target.

## Design

- Keep `OverlayBackButton` as the single owner of overlay back-navigation sizing.
- Render the mobile state as a fixed 44 × 44 icon button with no horizontal padding.
- At the `sm` breakpoint, switch to content-driven width and restore the themed small-button horizontal padding.
- Preserve the existing themed color, border, typography, focus, safe-area positioning, and click behavior.

## Verification

- Add a component test that locks the mobile square-target classes and desktop auto-width/padding classes.
- Run the focused OverlayChrome test, UI contract check, and React Doctor diff scan.
