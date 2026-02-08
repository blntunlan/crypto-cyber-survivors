# Specification: Volatility Shock Visual Feedback System

## Track Overview
**Track ID:** `volatility_shock_20260208`
**Goal:** Implement a high-impact visual feedback system that triggers during "Volatility Shocks" (ATR spikes) to reinforce the game's Cyber-Finance aesthetic and provide immediate sensory feedback for market changes.

## Functional Requirements
1. **Trigger Mechanism:** Listen to the `volatilityShock` and `shockDetected` events from the `EventBus`.
2. **Dynamic Screen Shake:** Scale screen shake intensity based on the player's current leverage (1x to 100x).
3. **Background Grid Shift:** Transition the background grid colors to neon variants (e.g., intense Cyan or Magenta) during a shock.
4. **HUD Glitch Effects:** Implement temporary visual artifacts (scan lines, flicker) on the HUD components (LiveFeed, AccountHealth).
5. **Cooldown & Duration:** Respect shock duration and intensity parameters passed in the event payload.

## Technical Requirements
- **Integration:** Must be handled primarily within `GameEngine.tsx` or a dedicated `VisualEffectService`.
- **Performance:** Glitch effects and grid shifts must be implemented using Canvas drawing operations or CSS classes to avoid re-render overhead.
- **Decoupling:** Use the existing `EventBus` to receive shock triggers.
- **Responsiveness:** Effects must scale and perform smoothly on both mobile and desktop.

## Success Criteria
- [ ] A Volatility Shock event triggers visible screen shake that feels "heavier" at high leverage.
- [ ] The background grid changes color immediately and smoothly returns to default.
- [ ] HUD elements flicker/glitch during the shock duration.
- [ ] No performance degradation (maintains 60 FPS).
- [ ] >80% code coverage for new visual logic.
