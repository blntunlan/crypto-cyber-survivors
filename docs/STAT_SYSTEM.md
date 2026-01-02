# 🎮 Stat System Architecture

This document describes the stat cap system and how buffs/cards are applied.

## 📊 Stat Caps (Defined in `config/PlayerConfig.ts`)

| Stat | Config Key | Value | Description |
| :--- | :--- | :---: | :--- |
| **Fire Rate** | `MAX_FIRE_RATE` | 50ms | Minimum delay between shots (20/sec max) |
| **Crit Chance** | `MAX_CRIT_CHANCE` | 95% | Maximum critical hit probability |
| **Armor** | `MAX_ARMOR` | 15 | Maximum damage reduction value |
| **Speed** | `MAX_SPEED` | 15 | Maximum movement speed |
| **Luck** | `MAX_LUCK` | 20 | Maximum luck stat |
| **Lifesteal** | `MAX_LIFESTEAL` | 50% | Maximum lifesteal proc chance |
| **Magnet** | `MAX_MAGNET` | 300 | Maximum gem collection range |
| **Area** | `MAX_AREA` | 3.0x | Maximum projectile size multiplier |
| **Projectiles** | `MAX_PROJECTILES` | 8 | Maximum bullets per shot |

---

## 🏗️ Cap Application Points (System-Level)

Caps are applied **at the system level**, NOT in card definitions. This prevents "cheap card nerf" bugs.

| Stat | Applied In | Function |
| :--- | :--- | :--- |
| Fire Rate | `CombatSystem.ts` | `processAutoFire()` |
| Crit Chance | `CombatSystem.ts` | `fireBullets()` |
| Armor | `CollisionSystem.ts` | `checkPlayerEnemyCollision()` |
| Speed | `GameEngine.tsx` | Player movement loop |
| Luck | `CombatResolutionService.ts` | `spawnGemForEnemy()` |
| Lifesteal | `CombatResolutionService.ts` | `processLifesteal()` |
| Magnet | `CollectionSystem.ts` | `update()` |
| Area | `CombatSystem.ts` | `fireBullets()` |
| Projectiles | `CombatSystem.ts` | `fireBullets()` |

---

## 🔄 Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Card Effect   │ ──▶ │   BuffManager    │ ──▶ │   System-Level     │
│   (No caps!)    │     │ getDecoratedStats│     │   Cap Application  │
└─────────────────┘     └──────────────────┘     └────────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
    p.speed * 1.2        stats.getSpeed()      Math.min(raw, MAX_SPEED)
```

### Example: Speed Stat Flow

1. **Card Effect** (no cap): `speed: p.speed * 1.2`
2. **BuffManager**: Stacks multiple card effects
3. **GameEngine**: `Math.min(rawSpeed, PLAYER_STATS.MAX_SPEED)`

---

## 🛡️ Armor Formula (Diminishing Returns)

```javascript
const armorReduction = armor / (armor + 10);
const damageMultiplier = Math.max(0.1, 0.8 * (1 - armorReduction));
```

| Armor | Damage Reduction | Notes |
| :---: | :---: | :--- |
| 0 | 0% | No reduction |
| 5 | 23% | Early game |
| 10 | 36% | Mid game |
| 15 | 43% | Cap (still meaningful) |
| 20+ | Still 43% | Capped at MAX_ARMOR |

---

## 🎲 Luck Effects

Luck affects gem drops, NOT crits:

```javascript
// Rare gem chance: 5% base + 3% per luck (capped at 50%)
const rareChance = Math.min(0.5, 0.05 + luck * 0.03);

// Bonus gem chance: 10% per luck (capped at 50%)
const bonusGemChance = Math.min(0.5, luck * 0.10);

// Gem value: +1% per luck
const luckValueBonus = 1 + luck * 0.01;
```

---

## 💉 Lifesteal Mechanics

```javascript
// Proc chance based on lifesteal stat (capped at 50%)
const cappedLifesteal = Math.min(lifesteal, MAX_LIFESTEAL);

if (Math.random() < cappedLifesteal) {
  const healAmount = enemy.type === 'whale' ? 8 : 3;
  // Heal up to maxHp
}
```

---

## ✅ Design Principles

1. **Single Source of Truth**: All caps defined in `PlayerConfig.ts`
2. **No Card-Level Caps**: Cards modify stats freely, system applies caps
3. **Consistent Application**: Each stat has ONE place where cap is enforced
4. **Diminishing Returns**: Armor uses non-linear formula for better balance
5. **Separation of Concerns**: Business logic in systems, data in config
