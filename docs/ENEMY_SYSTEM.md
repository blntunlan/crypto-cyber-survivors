# 👾 Enemy System Reference

This document provides a detailed breakdown of all enemy types, their base attributes, and how they scale with difficulty.

---

## Enemy Types (6 Total)

| Tipo | Icon | Color | Spawn Weight |
|-----|------|------|---------|
| Bear | 🐻 | Red (SHORT) | 60 |
| Bull | 🐂 | Green (LONG) | 25 |
| FUD | 📰 | Slate (Silver) | 10 |
| Whale | 🐋 | Neon Purple | 5 |
| Liquidator | 💣 | Neon Orange | 8 |
| PumpDump | 🌪️ | Neon Green | 6 |

---

## Detailed Stats (Base Level)

### 🐻 Bear (Standard Enemy)
| Stat | Value |
|------|-------|
| HP | 50 |
| Speed | 1.6 |
| Damage | 10 |
| Radius | 14 |
| EXP | 10 |
| Gems | 15 |
| Movement | Chase (Straight follow) |

### 🐂 Bull (Tanky)
| Stat | Value |
|------|-------|
| HP | 70 |
| Speed | 1.8 |
| Damage | 12 |
| Radius | 16 |
| EXP | 15 |
| Gems | 20 |
| Movement | Circle (Orbiting) |

### 📰 FUD (Fast & Fragile)
| Stat | Value |
|------|-------|
| HP | 30 |
| Speed | 2.2 |
| Damage | 5 |
| Radius | 10 |
| EXP | 8 |
| Gems | 10 |
| Movement | ZigZag |

### 🐋 Whale (Boss)
| Stat | Value |
|------|-------|
| HP | 300 |
| Speed | 0.8 |
| Damage | 25 |
| Radius | 35 |
| EXP | 100 |
| Gems | 100 |
| Movement | Slow Approach |

### 💣 Liquidator (Explosive)
| Stat | Value |
|------|-------|
| HP | 40 |
| Speed | 2.0 |
| Damage | 30 |
| Radius | 12 |
| EXP | 20 |
| Gems | 25 |
| Movement | Explosive (Accelerates) |

### 🌪️ PumpDump (Growing)
| Stat | Value |
|------|-------|
| HP | 80 |
| Speed | 1.2 |
| Damage | 15 |
| Radius | 18 |
| EXP | 25 |
| Gems | 30 |
| Movement | Growing (Wave) |

---

## Difficulty Scaling

The game difficulty multiplier affects enemy stats dynamically over time:

| Attribute | Scaling Formula | Effect |
|-----------|-----------------|--------|
| **HP** | `Base * (1 + (Diff - 1) * 0.2)` | +20% HP per difficulty level |
| **Speed** | `Base * Diff` | Direct multiplier (Hard scaling) |
| **Spawn Rate**| `2000 / (1 + (Diff - 1) * 0.5)`| ~33% faster spawns per level |

**Current Scaling Examples:**
*   **Difficulty 1x:** 100% Stats, 2000ms spawn delay.
*   **Difficulty 2x:** 120% HP, 200% Speed, 1333ms spawn delay.
*   **Difficulty 3x:** 140% HP, 300% Speed, 1000ms spawn delay.
*   **Difficulty 5x:** 180% HP, 500% Speed, 666ms spawn delay.

---

## Movement Strategies

| Strategy | User | Description |
|----------|-----------|----------|
| **Chase** | Bear | Direct line towards player |
| **ZigZag** | FUD | Moves in a back-and-forth wave pattern |
| **Circle** | Bull | Attempts to surround/orbit the player |
| **SlowApproach** | Whale | High-health, slow-moving threat |
| **Explosive** | Liquidator | Gains massive speed when close to player |
| **Growing** | PumpDump | Increases in size/radius over time |
