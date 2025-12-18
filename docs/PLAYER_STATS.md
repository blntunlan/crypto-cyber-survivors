# 🏃 Player Stats - Complete Reference Guide

This document provides a detailed breakdown of all player attributes, their base values, maximum caps, and how they influence gameplay.

---

## ⚔️ Combat Stats

### 💥 Base Damage
- **Base Value:** 25
- **Cap:** ∞ (No limit)
- **Description:** The raw damage dealt by each projectile before critical multipliers.
- **Key Cards:** Market Order (+8), Limit Order (+15), Leverage Trade (+25), Satoshi Mode (+50).

### ⚡ Fire Rate (Attack Interval)
- **Base Value:** 500ms
- **Soft Cap:** 100ms (Common), 80ms (Rare/Epic)
- **Hard Cap:** 50ms (Full Ape Mode)
- **Description:** The delay between shots in milliseconds. Lower is faster.
- **Key Cards:** Quick Trade (×0.92), High Frequency (×0.82), Full Ape Mode (2x Speed).
- **Note:** Satoshi Mode increases this interval (slower firing) in exchange for massive damage.

### 🎯 Crit Chance
- **Base Value:** 5% (0.05)
- **Cap:** 95% (0.95)
- **Description:** The probability of a shot dealing critical damage.
- **Key Cards:** Sniper Bot (+3%), Insider Info (+5%), Leverage Trade (+10%), Diamond Hands (+15%).

### 🏹 Projectiles
- **Base Value:** 1
- **Cap:** 8
- **Description:** Number of bullets fired simultaneously in a spread pattern.
- **Key Cards:** Double Down (+1 Projectile).

### 🌐 Area (Projectile Size)
- **Base Value:** 1.0 (Scale)
- **Cap:** ∞
- **Description:** Multiplier for projectile size and local AoE effects.
- **Key Cards:** Market Cap (+0.5), Liquidation (+0.6), Gas Fee Burn (+0.4).

---

## 🛡️ Defense & Survival

### ❤️ Health (HP & Max HP)
- **Base Value:** 100 / 100
- **Cap:** ∞
- **Description:** Your survival pool. Reaching 0 HP leads to **LIQUIDATION**.
- **Mechanic:** Leveling up triggers a **Full Heal** (HP restored to Max HP).
- **Key Cards:** Safety Net (+15 Max HP), Cold Wallet (+40 Max HP), Smart Contract (+30 Max HP).

### 🔒 Armor
- **Base Value:** 0
- **Cap:** 15
- **Damage Reduction:** Each point reduces damage tick. Cap of 15 provides **~87.5% reduction** (limited by a minimum damage floor).
- **Key Cards:** Stop Loss (+1), HODL Shield (+2), Cold Wallet (+3).

### 🍀 Luck
- **Base Value:** 0
- **Cap:** 15
- **Description:** Influences "Super Crit" chances, Rare Gem drop rates, and significantly boosts the chance of rolling Rare, Epic, or Legendary cards on Level Up.
- **Key Cards:** DCA Mode (+0.3), Alpha Leak (+0.8), Staking Rewards (+1.5), Rug Pull (+2.5).

---

## 💰 Utility & Movement

### 🧲 Magnet (Collection Range)
- **Base Value:** 0
- **Cap:** 300
- **Description:** Increases the radius at which Gems are automatically pulled towards the player.
- **Key Cards:** Yield Farm (+30).

### 🏃 Speed
- **Base Value:** 4.0
- **Cap:** 12.0
- **Description:** How fast the player character moves across the screen.
- **Key Cards:** Bull Run (+15%), Flash Loan (+30%).

---

## 🎰 Advanced Mechanics

| Mechanic | Calculation / Logic | Effect |
|----------|---------------------|--------|
| **Super Crit** | `Crit + Luck > 3.0` | 3x Damage multiplier and enhanced visual effects. |
| **Near Death** | `HP < 20%` | Game difficulty is temporarily reduced by 30%. |
| **Kill Streak**| `3s kill window` | Increases XP multiplier up to 3.0x (Jackpot). |
| **Armor Floor**| `Math.max(0.1, ...)`| Ensures enemies always deal at least a tiny amount of damage. |
