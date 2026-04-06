# :Microscope: Testing & QA Strategy

> **Status** live

> Owner: QA Engineering

## Overview

Crypto Survivors is a complex real-time application with thousands of moving parts, relying on GC-free architectural constraints and live WebSocket data. To ensure stability and prevent regressions, the project employs a strict, multi-tiered testing strategy comprising Unit Tests, End-to-End (E2E) UI Tests, and Evolutionary AI balancing.

## 1. Unit & Integration Testing (Vitest)

The backbone of the testing suite relies on **Vitest** for blistering-fast execution. With over 2,100+ tests, it covers all game services, state management (Zustand), and utility functions.

**Configuration:** `vitest.config.ts`
- **Environment**: `jsdom`
- **Pool**: `forks` (Ensures isolated memory states for singleton testing)
- **Coverage Target**: > 70% globally

**Key Guidelines for Vitest**
- **Mocking Singletons**: Core game services (like `CombatSystem` or `DifficultyManager`) are heavily reliant on the Singleton pattern. Tests must correctly reset or mock these singletons in the `beforeEach` block.
- **Time Manipulation**: For testing the game loop, use `vi.useFakeTimers()` to artificially advance `deltaTime` without waiting.

```bash
## Run all unit tests
npm run test

## Run tests with coverage report
npm run test:coverage
```

## 2. End-to-End Testing (Playwright)

To verify that the Canvas engine renders correctly and that the UI handles interactions (especially on mobile layouts), we use **Playwright**. 

**Configuration:** `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit, and Mobile Chrome (Pixel 5 emulation).
- **Concurrency**: Fully parallel execution.
- **Artefacts**: Captures traces, screenshots, and videos on test failures for easier debugging.

**Playwright Scope**
Playwright tests are located in the `e2e/` directory. They focus on:
- Landing Page to Game Engine transitions.
- Authentication and Hub Navigation.
- Virtual Joystick and Drag-to-Move mobile control validation.
- Verifying the Canvas renders the player and enemies.

```bash
## Run E2E tests
npm run test:e2e

## Open Playwright UI for debugging
npm run test:e2e:ui
```

## 3. Evolutionary AI Balancing (Darwin)

Standard unit tests cannot easily verify if the game is "fun" or if the difficulty curve is balanced. For this, the engine includes a headless simulation mode powered by the **Darwin AI Engine**.

Darwin uses a NEAT (NeuroEvolution of Augmenting Topologies) genetic algorithm. It spawns hundreds of headless game instances in Node.js, forcing AI agents to play the game using only positional inputs. 

By analyzing how long these agents survive and what weapons they choose, the design team can balance weapon damage, enemy speed, and spawn rates without manual playtesting.

```bash
## Run the Darwin evolutionary trainer
npm run train:ai
```

## Summary
- **Logic & Math**: Vitest (Immediate feedback)
- **Rendering & Inputs**: Playwright (Browser realism)
- **Balancing & Difficulty**: Darwin AI (Long-term simulation)
