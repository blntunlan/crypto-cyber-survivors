# 🃏 Card System - Upgrade Reference Guide

## Tier Overview

| Tier | Icon | Base Chance | With Luck |
|------|------|-------------|-----------|
| ⬜ Common | Silver | 60% | - |
| 🔷 Rare | Cyan Neon | 25% | +luck×2% |
| 🟣 Epic | Purple Neon | 12% | +luck×3% |
| 🟡 Legendary | Casino Gold | 3% | +luck×5% |

---

## ⬜ Common Cards

| Icon | Name | Effect | Description |
|------|------|--------|-------------|
| 📊 | Market Order | +8 Base Damage | Temel hasar artışı |
| ⚡ | Quick Trade | +8% Attack Speed | Saldırı hızı |
| 🛡️ | Safety Net | +15 Max HP | Can artışı |
| 🧲 | Yield Farm | +30 Magnet | Toplama menzili |
| 🔒 | Stop Loss | +1 Armor | Hasar azaltma |

---

## 🔷 Rare Cards

| Icon | Name | Effect | Description |
|------|------|--------|-------------|
| 📈 | Limit Order | +15 Base Damage | Güçlü hasar artışı |
| ⚡ | High Frequency | +18% Attack Speed | HFT modunda saldırı |
| 🎯 | Insider Info | +5% Crit Chance | Kritik şansı |
| 🍀 | Alpha Leak | +0.8 Luck | Daha iyi droplar |
| 🌐 | Market Cap | +25% Projectile Size | Daha büyük mermiler |

---

## 🟣 Epic Cards

| Icon | Name | Effect | Description |
|------|------|--------|-------------|
| 💥 | Leverage Trade | +25 DMG, +10% Crit | Kaldıraçlı güç |
| 🩸 | Staking Rewards | +1.5 Luck | Ödül bonusu |
| 💨 | Flash Loan | +30% Speed, +15% AS | Hız patlaması |
| 🏦 | Cold Wallet | +40 HP, +3 Armor | Tank modu |

---

## 🟡 Legendary Cards

| Icon | Name | Effect | Trade-off |
|------|------|--------|-----------|
| 💎 | Diamond Hands | +40 DMG, +15% Crit | HP < 50% → 2x hasar |
| 🚀 | To The Moon | +30 DMG, +2 Luck | Kill başına +0.5% DMG (max 50%) |
| 🐋 | Whale Alert | +20 DMG, +0.5 Area | 20sn'de AoE hasar |
| 🦍 | Full Ape Mode | 2x Fire Rate | ⚠️ -20% Max HP |

---

## Player Stats

### ⚔️ Combat Stats

| Stat | Base | Max | Cap | Kart Etkisi |
|------|------|-----|-----|-------------|
| Damage | 25 | ∞ | - | Market Order: +8 |
| Fire Rate | 500ms | 50ms | 50ms min | Quick Trade: ×0.92 |
| Crit Chance | 5% | 95% | 95% cap | Insider Info: +5% |
| Crit Damage | 2x | 5x | - | Super Crit: 3x |
| Area | 1.0 | ∞ | - | Market Cap: +0.25 |
| Projectiles | 1 | 8 | 8 max | (Gelecek kart) |

### 🛡️ Defense Stats

| Stat | Base | Max | Cap | Etkisi |
|------|------|-----|-----|--------|
| HP | 100 | ∞ | - | Can havuzu |
| Max HP | 100 | ∞ | - | Safety Net: +15 |
| Armor | 0 | 15 | 75% reduction | Stop Loss: +1 |
| Regen | 0 | 5/s | - | (Gelecek kart) |
| Dodge | 0% | 50% | 50% max | (Gelecek kart) |

### 💰 Economy Stats

| Stat | Base | Max | Cap | Etkisi |
|------|------|-----|-----|--------|
| Luck | 0 | 15 | 15 cap | Tier bonus: +luck×% |
| Magnet | 0 | 300 | 300 cap | Yield Farm: +30 |
| Exp Mult | 1.0 | 3.0 | - | (Gelecek kart) |
| Gem Value | 1.0 | 2.0 | - | (Gelecek kart) |

### 🏃 Movement Stats

| Stat | Base | Max | Cap | Etkisi |
|------|------|-----|-----|--------|
| Speed | 4 | 12 | 12 cap | Flash Loan: +30% |
| Dash | ❌ | ✅ | - | (Gelecek kart) |

---

## 🎰 Özel Mekanikler

| Mekanik | Tetikleyici | Efekt |
|---------|-------------|-------|
| Super Crit | Crit + Luck > 3 | 3x damage, büyük parçacık |
| Near Death | HP < 20% | Zorluk %30 azalır |
| Kill Streak | 3sn içinde kill | Streak UI + zorluk bonus |
| Wave System | Zaman bazlı | Calm → Intense döngü |
| Diamond Hands | HP < 50% | 2x damage (legendary) |

---

## ✅ Yeni Eklenen Kartlar

### ⬜ Common
- [x] 🎯 Sniper Bot (+3% Crit)
- [x] 💫 DCA Mode (+0.3 Luck)
- [x] 🔄 Rebalance (+5% all stats)

### 🔷 Rare
- [x] 🎰 Double Down (+5 DMG placeholder)
- [x] 💹 Bull Run (+15% Speed)
- [x] 🧊 HODL Shield (+2 Armor, +10 HP)
- [x] 📉 Short Squeeze (+12 DMG, +3% Crit)

### 🟣 Epic
- [x] 🌀 Liquidation (+20 DMG, +0.3 Area)
- [x] ⚡ Lightning Network (+15 DMG, +8% Crit)
- [x] 🛡️ Smart Contract (+30 HP, +1 Luck)
- [x] 🎲 Degenerate (+35 DMG)

### 🟡 Legendary
- [x] 👑 Satoshi Mode (+50 DMG, -25% Fire Rate)
- [x] 💀 Rug Pull (+2.5 Luck, -15% Max HP)
- [x] 🌈 NFT Collection (+5 random stats)
- [x] ⏰ Time Lock (+35 DMG, +20 HP)
- [x] 🔥 Gas Fee Burn (+25 DMG, +0.4 Area)

---

## 🔮 Gelecek Özellikler (TODO)

### Synergy Kartları
- [ ] 🔗 Chain Reaction (Crit = AoE patlama)
- [ ] 💎 Whale Hunter (Whale'lara x3 hasar)
- [ ] 🚀 FOMO (Hız arttıkça AS artar)

### Risk/Reward Kartları
- [ ] 🎭 All In (-50% HP, +100% DMG)
- [ ] 🃏 Joker (Random nerf/buff)
- [ ] ⚖️ Leverage x10 (x2 alınan/verilen hasar)

### Pasif Etki Kartları
- [ ] 🌙 Moonboy (60s'de ekran hasarı)
- [ ] 🐂 Bull Market (P&L+ → +25% DMG)
- [ ] 🐻 Bear Trap (Slow aura)
- [ ] 🌊 Liquidity Pool (Gem → +1% DMG stack)

