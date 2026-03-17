# :User: Player & Character System

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Core Game Design

## :Swords: Character Logic
The player character is the central entity in the GameEngine. Due to the GC-Free architecture, the player's memory footprint is static during a session.

### State Management
The active player state is stored in `useGameStore` (Zustand) and synchronized with the Canvas loop. 
- **Coordinates:** `x`, `y` updated continuously via input handlers.
- **Velocity:** `vx`, `vy` affected by base speed and movement inputs (keyboard/touch).

## :Zap: Weapons and Attacks
Unlike traditional games where players press a button to shoot, Crypto Survivors relies on auto-attacking cooldowns.

### The Attack Loop
1. **Targeting:** The `CombatService` queries the `SpatialGrid` for enemies within the weapon's `range`.
2. **Execution:** If cooldown is ready and an enemy is in range, the weapon spawns a projectile (via `PoolManager`).
3. **Cooldown:** Resets and counts down based on `attackSpeed` modifiers.

### Weapon Types (Dynamic)
Weapons can scale with market volatility:
- **Bitcoin Blaster:** High single-target damage.
- **Ethereum Ethereum:** Chain lightning / AoE damage.
- **Altcoin Aura:** Short-range pulsing area of effect.

## :Star: Experience (XP) and Leveling
When enemies die, they spawn XP Gems.
1. **Magnetism:** If a gem is within the player's `magnetRange`, it interpolates towards the player.
2. **Collection:** Collecting a gem increases the `currentXP` in the `ExperienceConfig`.
3. **Level Up:** Hitting the threshold triggers a **Level Up Event** (`EventBus.emit('LEVEL_UP')`), pausing the game loop and presenting the player with 3 randomized upgrades.

---
// SYSTEM: ACTIVE
