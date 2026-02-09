# Responsiveness Guidelines

Based on `config/UILayout.ts`, the UI must adapt to different screen sizes.

## Breakpoints
- **Mobile Small**: < 360px (`SMALL_MOBILE_LAYOUT`)
- **Mobile Standard**: 360px - 767px (`MOBILE_LAYOUT`)
- **Tablet**: 768px - 1023px (`TABLET_LAYOUT`)
- **Desktop**: > 1024px (`DESKTOP_LAYOUT`)

## Scaling Rules
- **Global Scale**: Mobile uses `0.85x`, Small Mobile uses `0.75x`.
- **Visibility**: 
  - FPS Counter: Hide on mobile.
  - Combo Panel: Hide on Small Mobile (< 360px).
- **Max Entities**: Reduce enemy count on mobile (100 vs 150) to maintain 60 FPS.

## Component Implementation
Use Tailwind CSS responsive prefixes:
- `text-base md:text-lg lg:text-xl`
- `flex-col md:flex-row`
- `hidden md:block`

## Touch Targets
- Ensure all interactive elements (buttons, toggles) are at least **44x44px** on mobile devices to prevent mis-clicks.
- Use `useDevice` hook or media queries to adjust padding/margins for touch interaction.
