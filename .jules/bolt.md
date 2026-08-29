## 2024-05-15 - [forEach removal in hot loops]
**Learning:** Found `.forEach` used inside hot loops like `MovementSystem.updateEnemies` and `EntityRenderer.drawEnemies` (called 60 times a second). The use of `.forEach` creates unnecessary function allocations leading to GC overhead in V8 which will hurt our 60 FPS target on mobile and low-end devices.
**Action:** Replace `.forEach` with standard `for` loops in hot loops per `Optimization Strategy` guidelines.
