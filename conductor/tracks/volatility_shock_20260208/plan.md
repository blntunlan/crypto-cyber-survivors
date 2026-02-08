# Implementation Plan: Volatility Shock Visual Feedback System

## Phase 1: Core Event Handling and Screen Shake Scaling

- [ ] Task: Set up the VisualEffectService to listen for shock events.
    - [ ] Write tests for `VisualEffectService` to verify it correctly subscribes to `volatilityShock`.
    - [ ] Implement `VisualEffectService` to handle the event and calculate intensity.
- [ ] Task: Implement leverage-aware screen shake logic.
    - [ ] Write tests for the intensity calculation formula (1x vs 100x leverage).
    - [ ] Integrate the scaled shake intensity into the `GameEngine` state.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Event Handling and Screen Shake Scaling' (Protocol in workflow.md)

## Phase 2: Dynamic Background Grid Shift

- [ ] Task: Implement grid color shifting in BackgroundRenderer.
    - [ ] Write tests for `BackgroundRenderer` to verify color state transitions during a shock.
    - [ ] Implement the neon shift logic in the canvas render loop.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Dynamic Background Grid Shift' (Protocol in workflow.md)

## Phase 3: HUD Glitch Effects and Polish

- [ ] Task: Implement CSS-based glitch effects for HUD components.
    - [ ] Write tests for the glitch state toggle logic.
    - [ ] Add glitch CSS classes to `LiveFeed` and `AccountHealthPremium` components.
- [ ] Task: Verify overall performance and mobile responsiveness.
    - [ ] Run benchmarks to ensure 60 FPS during shock events.
    - [ ] Verify touch controls remain responsive during screen shake.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: HUD Glitch Effects and Polish' (Protocol in workflow.md)
