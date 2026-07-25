# Main Menu Position Tickets Design

## Intent

Replace the tall, centered Long/Short cards with restrained trading-terminal tickets that match the leverage ladder and main panel. The controls remain immediate run-start actions, so both choices must stay equally prominent and unmistakably clickable.

## Visual Direction

- Use two equal-width horizontal tickets with a compact 88px minimum height.
- Place the direction icon and `LONG`/`SHORT` label on the left, with the selected leverage aligned on the right.
- Use one restrained signature detail: a thin directional signal rail along the lower edge.
- Limit green/red to the semantic accent border, subtle tinted surface, text, and signal rail.
- Remove floating icon stacks, glow-heavy hover effects, and scale animation.
- Preserve the current copy; do not add explanatory labels.

## Theme Ownership

- Add a typed `position` selection-card variant.
- Cyberpunk uses rounded corners, a low-opacity accent tint, and a soft selected shadow.
- Retro uses square corners, a two-pixel accent border, black surface, and a compact pixel shadow.
- `MainMenu` supplies only layout, icon, label, leverage, and accent color; it must not branch presentation on `isRetro` inside the position controls.

## Interaction And Responsive Behavior

- Preserve immediate `onStart` behavior, disabled behavior, keyboard selection, focus visibility, and 44px minimum target size.
- Keep two columns on mobile and desktop.
- Keep label and leverage readable without wrapping at narrow widths.
- Respect reduced motion by using color transitions only.

## Verification

- Add a MainMenu contract test for two `position` variants and leverage content.
- Add themed primitive coverage for cyberpunk and retro position variants.
- Run focused MainMenu and themed primitive tests, ESLint, UI contract checks, and React Doctor.
