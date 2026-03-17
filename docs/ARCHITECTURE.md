# :Cpu: General Architecture

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Core Engineering

## :Cpu: The "GC-Free" Philosophy
Crypto Survivors is built with a strict "Performance is Law" mindset. Because the game relies on HTML5 Canvas and React to render thousands of entities at 60 FPS, **Garbage Collection (GC)** spikes are the number one enemy of smooth gameplay.

### Core Tenets:
1. **Zero Allocations in the Render Loop**: Operations like `new Object()`, `Array.map()`, `Array.filter()`, or spreading arrays `[...arr]` are strictly forbidden inside the core `GameEngine.tsx` loop.
2. **Pre-Allocation**: Arrays and data structures used for logic (e.g., enemy lists, bullet tracking) are pre-allocated during initialization.
3. **Zustand for Decoupled React State**: React components do NOT rerender based on game loop state unless strictly necessary (e.g., updating health bars at a throttled rate). 

## :Repeat: The Object Pooling System
Creating and destroying memory is slow. Instead of `new Bullet()` or `new Enemy()`, the architecture uses the `PoolManager`.
- **Acquire:** `PoolManager.getInstance().spawn('bullet')` retrieves an inactive instance from the pool.
- **Release:** When an entity dies or goes off-screen, its properties are zeroed out, and it is marked `inactive`. It remains in memory, ready for reuse.

## :Network: Communication (EventBus)
The system avoids tight coupling between services (e.g., the `CombatService` does not need to import `AudioService` to play a hit sound). Instead, we use an **EventBus**.
- **Emitting:** `EventBus.emit({ type: 'ENEMY_DEATH', payload: { ... } })`
- **Listening:** Systems subscribe on initialization via `EventBus.on('ENEMY_DEATH', handleDeath)`.

## :Search: Spatial Hashing for Physics
An `O(N^2)` collision check for 500 bullets and 1,000 enemies would crash the browser. 
Instead, we divide the map into a 2D grid (`SpatialGrid`). Entities register their grid cell `[x/cellSize, y/cellSize]`. 
When checking for collisions, a bullet only checks the enemies residing in its specific cell and immediately adjacent cells.

## :Cloud: Tech Stack Overview
- **Client Render:** React 19 + HTML5 Canvas 2D
- **State Management:** Zustand 5 (Modular Slices)
- **Styling:** Tailwind CSS + Framer Motion
- **Build Tool:** Vite 6
- **Realtime / DB:** Supabase (PostgreSQL, Edge Functions)
- **Market Data:** Standalone Node.js WebSocket Aggregator (Railway)

---
// SYSTEM STATE: OPTIMIZED
