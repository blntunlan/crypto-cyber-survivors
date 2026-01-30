# 🎮 Crypto Survivors - Gameplay Balancing & Mechanics Roadmap

This document contains the step-by-step development plan to balance the game's difficulty level, enemy mechanics, and market integration.

---

## 🚀 1. Focus: Pacing & Wave Cycle
**Goal:** Ensure that 5-minute (300s) cycles provide different tension every second without boring the player.

| Mechanic | Description | Target Impact |
|:---|:---|:---|
| **Dynamic Time Flow** | Game clock/cycle flows faster if market volatility (ATR) is high | Increase adrenaline feeling |
| **Boss Mechanic** | A "Market Maker" Boss arrives at the end of every 300-second cycle | Final challenge at the end of the cycle |
| **Phase Adjustments** | Shortening Warmup time and triggering phase transitions based on volatility | Keep the game pace dynamic |

---

## ⚖️ 2. Focus: Leverage Scaling
**Goal:** Make high leverage (50x-100x) feel like "high risk - high reward" rather than just "impossible."

| Feature | Description | Mechanic |
|:---|:---|:---|
| **Spawn Limit Optimization** | When the number of enemies on screen reaches the performance limit (150), HP/Damage increases instead of quantity | Performance-protected difficulty increase |
| **Leverage Buffs** | Small increases in player attributes (damage/speed) at high leverage | Reward the player taking risks |
| **Liquidation Zone** | Screen flashes red and enemies become aggressive as PnL approaches liquidation | Visual and mechanical tension |

---

## 👾 3. Focus: Enemy Archetypes
**Goal:** Enemies represent market events rather than just being objects.

| Enemy Type | Behavior / Feature | Represented State |
|:---|:---|:---|
| **FUD (Fear, Uncertainty, Doubt)** | A cloud swarm that narrows the field of vision (Light/Vision) by surrounding the player | Uncertainty and fear |
| **Whale** | A large target that leaves "Mini-Whales" or scatters plenty of Coins/Gems when killed | Market liquidity and abundance |
| **Rug Puller** | A sneaky enemy that speeds up suddenly, hits the player, and retreats | Sudden and destructive market movements |
| **Short Sellers** | Ranged enemies that throw projectiles | Market pressure from a distance |

---

## 📈 4. Focus: Market Influence
**Goal:** Live market data creates opportunities as well as difficulty.

| Market State | Effect | Game Mechanic |
|:---|:---|:---|
| **Green Candle Power** | Increased XP collection distance (Magnet) as price rises | Bull market opportunity |
| **Red Candle Pressure** | Decreased movement speed of the player as price falls | Bear market pressure |
| **Flash Crash Events** | Temporary "Stun" for the player when the market crashes suddenly | Sudden crash shock |

---

## 💰 5. Focus: Economy & Progression
**Goal:** Ensure players feel the return on their effort (and risk).

| Reward Type | Condition | Bonus |
|:---|:---|:---|
| **Profit Bonus** | If PnL is positive at the end of the game | 50% bonus to the amount of Coins earned |
| **Risk Reward** | Survival time with high leverage | Increased probability of Rare card drops |
| **Trading Shop** | In-game Coin expenditure | "Insurance" (saving from liquidation once), etc. |

---

## 🛠️ Decision Pending
| Question | Status | Notes |
|:---|:---|:---|
| **Ranged Enemies** | Under Discussion | Should the game remain melee-only? |
| **Dynamic Time** | Under Discussion | Does acceleration tire the player when the market is booming? |
| **Loot Boxes** | Under Discussion | Should we add risky (Coin-spent) crates? |

---

// END OF PROTOCOL
