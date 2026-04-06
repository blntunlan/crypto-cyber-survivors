# :Ghost: Enemy System

> **Status** live
> Owner: Combat Engineering

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Combat Engineering

## :Ghost: Core Enemy Architecture

The enemy system is designed to handle **1,000+ simultaneous units** on screen without dropping below 60 FPS. This is achieved entirely through memory pre-allocation and optimized math.

**1. Object Pooling**
Enemies are NEVER instantiated during combat.
- A pool of e.g. `1000` enemy objects is created on map load.
- `PoolManager.getInstance().spawn('enemy')` grabs an inactive enemy, resets its HP, Position, and Stats, and marks it `active`.
- On death, `release('enemy', instance)` sets it back to inactive, preventing Garbage Collection spikes.

**2. Spatial Hashing (Physics)**
To prevent O(N^2) loops (checking every enemy against every other enemy to prevent overlapping), the `SpatialGrid` is used.
- The map is divided into a grid (e.g., 100x100 pixels per cell).
- Enemies update their grid location every frame.
- Collision resolution only checks the specific cell an enemy is in and its 8 neighbors.

## :Brain: AI and Movement
Enemy movement is determined by simplified Boid algorithms and direct-line tracking.
- **Seek:** Enemies constantly calculate the vector towards the player.
- **Separation:** The Spatial Hash applies a small repulsion vector if two enemies are too close, preventing them from stacking perfectly on top of each other.

## :Chart: Market-Driven Spawning
The `WaveManager` controls enemy density, but is strictly modified by the `UnifiedDirector` (Market Data).
- **Bull Market:** Massive swarms of low-HP enemies (high dopamine, high XP).
- **Bear Market:** Slower, high-HP "Tank" enemies.
- **Volatility Spikes:** "Flash Crash" elites that move erratically and deal high damage.

---
// MAX ENTITIES: 2048
// POOL STATE: WARMED