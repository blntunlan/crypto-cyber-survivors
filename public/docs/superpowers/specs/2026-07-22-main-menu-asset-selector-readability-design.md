# Main Menu Asset Selector Readability Design

## Goal

Make BTC, ETH, and SOL immediately readable in the Main Menu asset selector on desktop and mobile without changing selection behavior.

## Design

- Render the three assets as equal-width compact cards instead of small floating icons.
- Increase coin icons from 28px to 36px on compact screens and 40px from the small breakpoint.
- Increase asset labels from 7px to 10px, using a strong weight and restrained letter spacing.
- Keep unselected assets readable with approximately 65% opacity and no grayscale filter.
- Distinguish the selected asset with its market color, a tinted surface, a clear border, and the existing bottom signal rail.
- Keep the selector in one row with three equal columns and at least a 56px interaction height.

## Architecture

- Add a typed `asset` variant to `ThemedSelectionCard` for both cyberpunk and retro skins.
- Theme-specific border, surface, opacity, selected emphasis, and typography remain in `config/ui/componentVariants.ts`.
- `CryptoSelector` supplies only responsive layout, icon, label, selection state, and pair accent color; it must not branch presentation on `isRetro`.
- Existing `selected`, `onSelect`, `disabled`, audio, keyboard, and pair configuration behavior remains unchanged.
- Tests describe the card structure and readable sizing through stable data attributes, semantic selection state, and accessible button names.

## Responsive Behavior

- Mobile: the selector fills the available width with three equal cards and compact gaps.
- Desktop: the selector remains centered but uses the same equal-card rhythm, preventing tiny isolated labels.
- Both themes retain their visual identity while using the same readable hierarchy.

## Validation

- Add a focused `CryptoSelector` component test before implementation.
- Verify all three buttons expose `data-ui-variant="asset"`, readable asset-label markers, selected state, and `onSelect` behavior.
- Add cross-theme themed-primitive coverage for the typed `asset` variant.
- Run the focused selector and Main Menu tests, ESLint, and diff whitespace checks.
