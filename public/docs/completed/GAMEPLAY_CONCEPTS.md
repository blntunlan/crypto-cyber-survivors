# 🧠 Crypto Cyber Survivors - Gameplay Concepts & Brainstorming

This document contains ideas developed to deepen the game's crypto theme and make gameplay more fun and addictive.

## 1. Real-Time Data Mechanics
Mechanics that directly link live exchange data (BTC/USD) to gameplay.

| Mechanic | Description | Impact / Risk |
|:---|:---|:---|
| **⚡ Leverage Mode** | Player temporarily opens "x100 Leverage" | Damage/Speed +500%. One hit = Liquidation (HP -90% or death) |
| **📈 Bull vs Bear Stance** | Character changes mode based on the live price trend | **Bull:** Attack speed/damage ↑, defense ↓. **Bear:** Defense ↑, speed ↓, AoE focused |
| **📊 Volatility Storms** | Triggered on sudden price spikes | Enemies speed up by 2x, but dropped rewards (XP/Gem) increase by 2x |

## 2. Thematic Weapon & Ability Ideas
Abilities that combine crypto terminology with mechanical counterparts.

| Ability | Description | Mechanical Counterpart |
|:---|:---|:---|
| **⛽ Gas Fee Zone (AoE)** | Ethereum logo burning area around the character | "Burn" effect. Damage increases as enemy density increases (Network congestion) |
| **📉 Panic Sell (Ultimate)** | Explosion that clears all enemies on screen | **Cost:** Deletes 20% of current XP (Selling at a loss) |
| **⛏️ Mining Rig (Turret)** | Fixed turret placed on the ground | Produces a small amount of XP per second (mining) while firing |
| **💸 Airdrop (Loot Box)** | Random crates dropping on the map | 70% Buff, 30% "Scam" (Deals damage by exploding) |

## 3. Enemy & Boss Concepts

| Enemy / Boss | Behavior | Special Effect |
|:---|:---|:---|
| **🐋 The Whale** | Slow and massive health bar | Stuns everything on screen by creating a "Market Crash" when killed |
| **👺 Rug Puller** | Leaves fake rewards on the map | Turns into a monster that ambushes when the player touches it |
| **🤖 KYC Bot** | Does not deal damage when hitting the player | Freezes the player for 2 seconds (Identity verification delay) |

## 4. Meta-Progression (Permanent Growth)

| System | Description | Gain |
|:---|:---|:---|
| **🏦 Staking System** | Staking earned points while the game is closed | Passive bonus gain in the next session |
| **📜 Paper vs Diamond Hands** | Bonus given according to the player's survival style | **Diamond:** Resisting without taking damage → Armor bonus. **Paper:** Lots of maneuvering → Speed bonus |

## 🛠️ Implementation Priority

| Priority | Feature | Development Note |
|:---|:---|:---|
| **1** | **Gas Fee Zone** | Can be added quickly with `CombatSystem.ts` AoE logic |
| **2** | **Bull/Bear Stance** | Stat multipliers will be adjusted with `MarketService` data |
| **3** | **Airdrop** | Random spawn and reward/penalty mechanic |

---

// END OF PROTOCOL
