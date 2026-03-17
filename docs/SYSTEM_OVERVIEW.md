# :Layers: System Overview

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Core Game Design

## :Crosshair: Game Loop and Core Mechanics

Crypto Survivors operates on a heavily optimized, GC-free loop running at 60 FPS. The core system seamlessly merges top-down survival action (like Vampire Survivors) with live cryptocurrency market data (BTC/USD). 

### 1. Market-Driven Gameplay
The game's difficulty and pacing are fundamentally tied to real-world crypto fluctuations via the **Unified Director**:
- **Bull Markets:** Trigger high-reward, high-density enemy waves. Drop rates increase, but elite enemies spawn more frequently.
- **Bear Markets:** Introduce "stress" events. Survival becomes harder, health drops become scarce, and enemies gain aggressive modifiers.
- **Volatility:** Sudden market spikes or crashes trigger instant map events (e.g., "Flash Crash" damage over time or "Short Squeeze" speed boosts).

### 2. Combat & Survival Loop
- **Auto-Attack System:** Weapons fire automatically based on proximity and cooldowns.
- **Spatial Grid:** Efficient `O(1)` enemy lookup and collision detection using a 2D spatial hash grid.
- **Progression:** Defeating enemies drops XP gems. Leveling up grants players the choice to pick new weapons, upgrade existing ones, or boost passive stats (e.g., movement speed, magnetism).

## :Brain: Core Services

The backend logic of the client operates via decoupled Singleton services communicating through a central **EventBus**.

### :Swords: Combat System
Handles all physics, damage calculation, and weapon behavior.
- **Collision Detection:** Handled purely mathematically on the Canvas layer without heavy DOM manipulation.
- **Damage Numbers:** Emitted via the EventBus and rendered as temporary canvas elements.

### :Ghost: Entity Spawning
Controls how and when enemies appear on the screen.
- **Wave Manager:** Dictates enemy types based on elapsed time and current market phase.
- **Pool Manager:** Reuses enemy memory allocations (Object Pooling) to prevent garbage collection stutters.

### :Scale: Difficulty & Economy
- **XP/Loot Formula:** Scales non-linearly.
- **Lootboxes:** Players can extract extracted resources and open premium lootboxes with deterministic roll percentages, completely verified on the server (Supabase).

## :Link: System Integration Flow

1. **Market Server** (Railway/Node.js) streams live Binance/Coinbase data.
2. **Client `MarketService`** ingests WebSocket data, smoothing out noise.
3. **`UnifiedDirector`** translates smoothed prices into `Game Context` (Difficulty Multipliers, Wave Types).
4. **`GameEngine`** updates the state of all entities at 60Hz.
5. **React View** reads decoupled store state at a lower tick rate to render the UI (HUD, Damage overlays) without blocking the Canvas.

---
// END OF FILE
