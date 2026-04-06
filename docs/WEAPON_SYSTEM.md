# :Swords: Weapon & Skill System

> **Status** live

> Owner: Combat Engineering

## Overview

The Weapon System is a core gameplay pillar responsible for managing the player's arsenal, handling weapon cooldowns, computing damage multipliers, and triggering projectile spawns via the EventBus. It is deeply integrated with the live market data, meaning weapon performance dynamically scales based on real-time crypto metrics like ATR (Volatility), RSI, and PnL.

The system is composed of three main parts:
- **`types/weapons.ts`**: Strict type definitions for weapons and the market context.
- **`config/WeaponRegistry.ts`**: The static configuration dictionary (Registry Pattern) defining the base stats and market behaviors of every weapon.
- **`services/combat/WeaponSystem.ts`**: The runtime singleton that manages inventory, upgrades, cooldowns, and evolution checks.

## Architecture

**1. The Registry Pattern**

All weapons are statically defined in `WEAPON_REGISTRY`. This avoids hardcoding magic numbers in the combat logic and makes balancing easier.

```typescript
export interface WeaponConfig {
  id: WeaponId;
  name: string;
  baseDamage: number;
  baseCooldown: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileCount: number;
  damagePerLevel: number;
  cooldownPerLevel: number;
  marketBonus: (ctx: WeaponMarketContext) => number;
  evolutionPair?: WeaponId;
  evolutionResult?: string;
}
```

**2. Market-Driven Damage (`marketBonus`)**

Each weapon has a unique `marketBonus` function that receives the current `WeaponMarketContext` (ATR, RSI, PnL, Volume) and returns a damage multiplier.

- **Spread Shot**: Gains a bonus when `volumeNorm > 0.7`.
- **Volatility Laser**: Damage scales linearly with the `atrPercent` (market volatility).
- **AOE Nuke**: Deals 1.5x damage when the player's `pnl` drops below -30%.

**3. The Runtime Loop**

`WeaponSystem.update()` is called every frame by the `GameEngine`. It decrements cooldown timers for all acquired weapons. When a cooldown reaches zero, it calculates the final damage and emits a `weaponFired` event.

> The WeaponSystem **does not** instantiate or draw projectiles. It only emits the event. The `ProjectileSystem` or `ProjectileRenderer` listens to `weaponFired` and spawns the actual entities using the `PoolManager` to maintain the GC-free architecture.

```typescript
EventBus.emit('weaponFired', {
  weaponId: weapon.id,
  x: playerX,
  y: playerY,
  damage,
  level: weapon.level,
});
```

## Weapon Evolution

When the player maxes out two specific weapons (Level 5), the system automatically triggers an evolution. 

The `checkEvolution()` method runs every time a weapon is upgraded:
- It checks if the player holds the required pair (e.g., `quantum_bullet` and `laser`).
- If both are Level 5, it emits a `weaponEvolution` event, combining them into a powerful ultimate weapon (e.g., `hyper_cannon`).

## How to Add a New Weapon

1. **Add ID**: Add the new weapon ID to the `WeaponId` union type in `types/weapons.ts`.
2. **Configure Registry**: Add a new entry to `WEAPON_REGISTRY` in `config/WeaponRegistry.ts` with its base stats and `marketBonus` logic.
3. **Implement Visuals**: Add the corresponding rendering logic in `ProjectileRenderer.ts` (listening for its `weaponId` on spawn).
