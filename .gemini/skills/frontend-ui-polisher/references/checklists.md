# UI/UX Checklists

## Visual Consistency
- [ ] **Colors**: Only use colors defined in `config/themes/`. Primary: Cyan (#00ffff), Secondary: Magenta (#ff00ff).
- [ ] **Spacing**: Use a consistent 4px or 8px grid system.
- [ ] **Borders**: Glassmorphism effect should be consistent across surfaces.
- [ ] **Icons**: Use icons from `components/icons/` and ensure uniform sizing.

## Typography
- [ ] **Headings**: Use "Audiowide" for H1-H3.
- [ ] **Body**: Use "Chakra Petch" for readable content.
- [ ] **Contrast**: Text should always be readable against the #0a0a0f background.

## Interactions & Transitions
- [ ] **Buttons**: Every button should have a hover/active state (glow/scale).
- [ ] **Page Transitions**: Use a fade or slide effect between major screens.
- [ ] **Loading States**: Skeletons or neon-themed spinners should appear during data fetches.

## Responsiveness
- [ ] **Desktop**: 1024px+ layout.
- [ ] **Tablet**: 768px-1023px layout.
- [ ] **Mobile**: <767px layout. Ensure no horizontal scrolling.
- [ ] **Safe Areas**: HUD elements should respect mobile notch/island safe areas.
