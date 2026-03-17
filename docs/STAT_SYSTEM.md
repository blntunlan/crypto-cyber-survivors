# :Activity: Stat System

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Game Balancing

## :Activity: Overview
The Stat System governs both the Player and Enemies. It is centrally managed to allow easy scaling and market-driven modifiers. All stats are structured to prevent infinite loops and cap out at defined engine limits.

### Core Player Stats
1. **MaxHP:** Total health pool.
2. **Regen:** Health recovered per second.
3. **MoveSpeed:** Base velocity scalar.
4. **Damage:** Global multiplier applied to all weapons.
5. **AttackSpeed:** Cooldown reduction percentage (caps at 90%).
6. **MagnetRange:** Radius for pulling XP gems.
7. **CritChance:** Percentage chance to deal double damage.

## :TrendingUp: Market Modifiers
Because the game reads live crypto data, stats are dynamically multiplied.

`FinalStat = BaseStat * ProgressionModifier * MarketMultiplier`

*Example:* During extreme volatility, `MoveSpeed` might receive a temporary `1.15x` multiplier, making the game feel faster and more dangerous.

## :Repeat: Meta-Progression
Players can permanently increase base stats between runs using Gold extracted from gameplay.
These upgrades are loaded from `Supabase` on login and injected into the initial `useGameStore` state before the `GameEngine` mounts.

### Upgrade Path Example
- **Magnetism Lv.1:** +15% Range (Cost: 100g)
- **Magnetism Lv.2:** +35% Range (Cost: 250g)
- **Magnetism Lv.3:** +60% Range (Cost: 600g)

*Values are tracked securely to ensure offline alterations cannot cheat the server's expected baseline.*

---
// STATS: NORMALIZED
// ENGINE CAPS: ENFORCED