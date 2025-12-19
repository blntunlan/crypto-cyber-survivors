# 🏗️ Architectural Robustness Roadmap

This roadmap focuses on eliminating "logic bugs" (like persistent timers, desynced states, and pause-related issues) by modernizing the core engine architecture.

---

## 📅 Phase 1: Centralized Time Management (Priority: HIGH) ✅ COMPLETE
**Goal:** Eliminate all pause/resume bugs by decoupling game time from real-world time.

- [x] **Create `TimeService.ts`**:
    - Manage `totalGameTime` (only advances when unpaused).
    - Manage `deltaTime` (scaled by game speed or paused state).
    - Provide a single source of truth for "current frame time".
- [x] **Refactor `GameEngine.tsx`**:
    - Drive the main loop using `TimeService`.
- [x] **Refactor `ComboSystem.ts`**:
    - Remove local `totalPausedTime` logic and use `TimeService.gameTime`.
- [x] **Refactor `DifficultyManager.ts`**:
    - Base wave progress on `TimeService.gameTime`.

---

## 🚦 Phase 2: Unified Game State Machine
**Goal:** Prevent invalid state transitions (e.g., leveling up while dead) and simplify pause logic.

- [ ] **Implement `GameStateMachine.ts`**:
    - Define strict transitions: `MENU` -> `PLAYING`, `PLAYING` -> `PAUSED`, `PLAYING` -> `LEVEL_UP`.
    - Automatically trigger `TimeService.pause()` on all menu states.
- [ ] **Event Handlers**:
    - Move logic out of `App.tsx` into the state machine for cleaner orchestration.

---

## 🔍 Phase 3: Developer Tools & Observability
**Goal:** Make hidden bugs visible and easy to report.

- [ ] **State Snapshot Tool**:
    - Create a hidden command or button to export the current status of all services (Zustand, Combo, Physics) to JSON.
- [ ] **Enhanced Debug Logs**:
    - Standardize logging for state transitions and milestone triggers.
- [ ] **Performance Monitor**:
    - Real-time tracking of logic vs. render frame times.

---

## 🧪 Phase 4: Logic Verification (Unit Testing)
**Goal:** Ensure that bug fixes stay fixed.

- [ ] **Setup `Vitest` or `Jest`**:
    - Target pure logic services (`CardSystem`, `ComboSystem`).
- [ ] **Create Automated Scenarios**:
    - "Test: Combo should reset exactly after 3 seconds of game time, regardless of real-world pauses."

---

## 📈 Success Metrics
- 0% "Timer drift" after long pause sessions.
- Consistency across mobile and desktop input processing.
- Reduced complexity in `App.tsx`.
