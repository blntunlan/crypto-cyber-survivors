---
description: Performance Optimization and Testing Workflow
---

# Performance Optimization and Testing Workflow

This workflow outlines the process for implementing and verifying performance, stability, and compatibility tests for the Crypto Cyber Survivors game.

## 1. Performance (FPS & Stress) Testing
Focus: Ensure the game maintains acceptable frame rates under high load (e.g., thousands of entities).

1.  **Create Performance Test Specs**
    -   Create `e2e/performance/fps.spec.ts`.
    -   Implement logic to inject an FPS counter via `page.evaluate()`.
    -   Define thresholds:
        -   **Baseline:** >55 FPS in menus.
        -   **Stress:** >30 FPS with 500+ entities.

2.  **Implement Stress Scenarios**
    -   Use debug commands or URL parameters to jump to high-density waves (e.g., `?wave=5&difficulty=hard`).
    -   Measure memory usage using `performance.memory` (if available) to detect leaks.
- [x] **Step 1: Setup Performance Test Environment**
  - Create `e2e/performance` and `e2e/stability` directories.
  - Configure Playwright projects for `chromium`, `firefox`, and `webkit`. (Done in `playwright.config.ts`)

- [x] **Step 2: Implement FPS & Memory Tests**
  - Create `e2e/performance/fps.spec.ts`.
  - Measure average FPS under load (e.g., spawn enemies).
  - Measure JS Heap size before/after to check for leaks.
  - **Goal**: >30 FPS avg (Desktop), No significant memory growth.

- [x] **Step 3: Implement "Chaos Monkey" Stability Test**
  - Create `e2e/stability/chaos.spec.ts`.
  - Inject a script to simulate random clicks/touches/keys for 30s.
  - Listen for `window.onerror` and `unhandledrejection`.
  - **Goal**: Zero crashes/unhandled errors under chaos.

- [x] **Step 4: Cross-Browser Validation**
  - Run tests on Firefox and WebKit.
  - Fix any browser-specific rendering or input issues.

3.  **Run Performance Tests**
    // turbo
    -   `npx playwright test e2e/performance/fps.spec.ts`

## 2. "Chaos Monkey" Stability Testing
Focus: Random inputs to detect crashes and unhandled exceptions.

4.  **Create Chaos Test Spec**
    -   Create `e2e/stability/chaos.spec.ts`.
    -   Implement a "gremlin" function that randomly triggers:
        -   Movement keys (WASD).
        -   Mouse clicks/taps.
        -   Pause/Resume toggles.
    -   Run for a fixed duration (e.g., 60 seconds).

5.  **Assert Stability**
    -   Verify no unhandled console errors.
    -   Ensure the game loop is still active after the chaos period.

## 3. Cross-Browser Compatibility
Focus: Verify rendering and logic on non-Chromium engines.

6.  **Configure Playwright Projects**
    -   Update `playwright.config.ts` to enable **Firefox** and **WebKit**.
    -   Ensure `webGL` compatibility flags are set if needed.

7.  **Run Cross-Browser Suite**
    // turbo
    -   `npx playwright test --project=firefox`
    -   `npx playwright test --project=webkit`

## 4. Accessibility (A11y) Checks
Focus: Ensure UI is usable and compliant.

8.  **Setup Axe-Core**
    -   Install `@axe-core/playwright`.
    -   Create `e2e/a11y/menu.spec.ts`.

9.  **Audit Key Screens**
    -   Run accessibility scans on:
        -   Main Menu
        -   Pause Menu
        -   Game Over Screen
    -   Fix critical violations (colors, labels).

## 5. Reporting & Analysis

10. **Generate Report**
    // turbo
    -   `npx playwright show-report`

11. **Optimize & Iterate**
    -   If FPS is low: Profile `CanvasRenderer`.
    -   If crashes occur: Check React Error Boundaries.
