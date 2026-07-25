# Compact Selection Card Alignment Design

## Problem

Compact selection cards center content horizontally but do not explicitly center it vertically. Cyber and pixel font metrics therefore make short labels such as `SPOT`, `2x`, and `10x` appear slightly high inside equal-height controls.

## Design

- Keep alignment ownership in the shared `compact` selection-card size, not `MainMenu`.
- Add `items-center` for explicit cross-axis centering and `leading-none` to remove surplus line-box space.
- Apply the same contract to cyberpunk and retro skins.
- Preserve dimensions, colors, borders, focus behavior, and selection effects.

## Verification

- Extend the themed primitive test to assert the compact alignment contract in both themes.
- Run the focused primitive and MainMenu tests, ESLint, and React Doctor.
