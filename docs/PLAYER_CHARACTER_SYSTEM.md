# Player Character System Design

> **Status:** Planning
> **Created:** 2025-12-30
> **Related:** [ENEMY_SYSTEM.md](./ENEMY_SYSTEM.md)

## Overview

Bu doküman, farklı oynanabilir karakter tiplerinin eklenmesi için tasarım kararlarını içerir. Mevcut Enemy sistemiyle tutarlılık sağlamak için **Config-Driven + Factory Pattern** yaklaşımı önerilmektedir.

---

## Current State

### Mevcut Player Yapısı

```typescript
// types.ts
export interface Player extends Omit<Entity, 'active'> {
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  nextLevelExp: number;
  speed: number;
  fireRate: number;
  critChance: number;
  baseDamage: number;
  luck: number;
  magnet: number;
  armor: number;
  area: number;
  projectiles: number;
}
```

### İlgili Dosyalar

| Dosya | Rol |
|-------|-----|
| `types.ts` | Player interface tanımı |
| `config/PlayerConfig.ts` | Base stats ve caps |
| `services/patterns/decorators/PlayerStatsAdapter.ts` | Decorator pattern adapter |
| `services/patterns/decorators/IPlayerStats.ts` | Stats interface |

---

## Proposed Architecture

### Design Pattern: Config-Driven + Factory

Enemy sistemindeki başarılı pattern'i takip ediyoruz:

```
┌─────────────────────────────────────────────────────────────┐
│                    CHARACTER SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │ CharacterConfig  │────▶│ CharacterFactory │              │
│  │  (Data Layer)    │     │  (Creation)      │              │
│  └──────────────────┘     └────────┬─────────┘              │
│                                    │                         │
│                                    ▼                         │
│  ┌──────────────────┐     ┌──────────────────┐              │
│  │ AbilityStrategy  │────▶│   GamePlayer     │              │
│  │  (Behaviors)     │     │  (Runtime)       │              │
│  └──────────────────┘     └──────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Character Concepts

### Planned Characters

| ID | Name | Theme | Playstyle |
|----|------|-------|-----------|
| `trader` | **Trader** | Balanced | Default, versatile |
| `whale` | **Whale** | Tank | High HP, slow, high damage |
| `daytrader` | **Day Trader** | Glass Cannon | Fast fire rate, low HP |
| `hodler` | **HODLer** | Defensive | High regen, armor focus |
| `degen` | **Degen** | Risk/Reward | High crit, volatile |
| `bot` | **Trading Bot** | Automation | Auto-aim, consistent |

### Character Stats Blueprint

```typescript
export interface CharacterStats {
  hp: number;
  maxHp: number;
  speed: number;
  baseDamage: number;
  fireRate: number;      // ms between shots
  critChance: number;    // 0-1
  armor: number;
  luck: number;
  magnet: number;
  area: number;
  projectiles: number;
}
```

### Character Config Interface

```typescript
export type CharacterType = 'trader' | 'whale' | 'daytrader' | 'hodler' | 'degen' | 'bot';

export interface CharacterConfig {
  type: CharacterType;
  name: string;
  description: string;
  
  // Base stats (before upgrades)
  baseStats: CharacterStats;
  
  // Special ability
  ability: AbilityType;
  abilityCooldown: number;  // ms
  
  // Visual
  color: string;
  icon: string;            // emoji or icon path
  
  // Unlock condition
  unlockCondition?: UnlockCondition;
}
```

---

## Character Definitions

### 1. Trader (Default)

```typescript
trader: {
  type: 'trader',
  name: 'Trader',
  description: 'Balanced approach to the market. Jack of all trades.',
  baseStats: {
    hp: 100,
    maxHp: 100,
    speed: 5,
    baseDamage: 25,
    fireRate: 500,
    critChance: 0.05,
    armor: 0,
    luck: 0,
    magnet: 0,
    area: 1.0,
    projectiles: 1,
  },
  ability: 'dash',
  abilityCooldown: 3000,
  color: '#00D4FF',
  icon: '📈',
  unlockCondition: null,  // Default unlocked
}
```

### 2. Whale

```typescript
whale: {
  type: 'whale',
  name: 'Whale',
  description: 'Massive capital means massive power. Slow but unstoppable.',
  baseStats: {
    hp: 200,
    maxHp: 200,
    speed: 3,
    baseDamage: 40,
    fireRate: 800,
    critChance: 0.03,
    armor: 3,
    luck: 0,
    magnet: 2,
    area: 1.5,
    projectiles: 1,
  },
  ability: 'shockwave',
  abilityCooldown: 8000,
  color: '#B026FF',
  icon: '🐋',
  unlockCondition: { type: 'score', value: 50000 },
}
```

### 3. Day Trader

```typescript
daytrader: {
  type: 'daytrader',
  name: 'Day Trader',
  description: 'Speed is everything. In and out before they know it.',
  baseStats: {
    hp: 60,
    maxHp: 60,
    speed: 8,
    baseDamage: 15,
    fireRate: 250,
    critChance: 0.08,
    armor: 0,
    luck: 2,
    magnet: 1,
    area: 0.8,
    projectiles: 2,
  },
  ability: 'timeWarp',
  abilityCooldown: 5000,
  color: '#39FF14',
  icon: '⚡',
  unlockCondition: { type: 'games', value: 10 },
}
```

### 4. HODLer

```typescript
hodler: {
  type: 'hodler',
  name: 'HODLer',
  description: 'Diamond hands. Never sells, never dies.',
  baseStats: {
    hp: 150,
    maxHp: 150,
    speed: 4,
    baseDamage: 20,
    fireRate: 600,
    critChance: 0.02,
    armor: 5,
    luck: 0,
    magnet: 0,
    area: 1.0,
    projectiles: 1,
  },
  ability: 'diamondShield',
  abilityCooldown: 10000,
  color: '#FFD700',
  icon: '💎',
  unlockCondition: { type: 'survive', value: 300 },  // 5 minutes
}
```

### 5. Degen

```typescript
degen: {
  type: 'degen',
  name: 'Degen',
  description: 'High risk, high reward. Embrace the volatility.',
  baseStats: {
    hp: 80,
    maxHp: 80,
    speed: 6,
    baseDamage: 35,
    fireRate: 450,
    critChance: 0.25,
    armor: 0,
    luck: 5,
    magnet: 3,
    area: 1.2,
    projectiles: 1,
  },
  ability: 'leverage',
  abilityCooldown: 4000,
  color: '#FF6600',
  icon: '🎰',
  unlockCondition: { type: 'critKills', value: 100 },
}
```

### 6. Trading Bot

```typescript
bot: {
  type: 'bot',
  name: 'Trading Bot',
  description: 'No emotions. Pure algorithms. Consistent execution.',
  baseStats: {
    hp: 90,
    maxHp: 90,
    speed: 5,
    baseDamage: 22,
    fireRate: 400,
    critChance: 0.10,
    armor: 2,
    luck: 0,
    magnet: 0,
    area: 1.0,
    projectiles: 1,
  },
  ability: 'autoTarget',
  abilityCooldown: 0,  // Passive
  color: '#00FF88',
  icon: '🤖',
  unlockCondition: { type: 'kills', value: 1000 },
}
```

---

## Special Abilities

### Ability Interface

```typescript
export type AbilityType = 
  | 'dash'
  | 'shockwave'
  | 'timeWarp'
  | 'diamondShield'
  | 'leverage'
  | 'autoTarget';

export interface AbilityStrategy {
  readonly name: string;
  readonly description: string;
  readonly isPassive: boolean;
  
  // Execute the ability
  execute(player: Player, enemies: Enemy[], deltaTime: number): void;
  
  // Check if ability is ready (for cooldown UI)
  isReady(): boolean;
  
  // Reset ability state
  reset(): void;
}
```

### Ability Descriptions

| Ability | Type | Effect |
|---------|------|--------|
| **Dash** | Active | Hızlı hareket + kısa i-frames |
| **Shockwave** | Active | AoE damage, knockback |
| **Time Warp** | Active | Düşmanları yavaşlatır |
| **Diamond Shield** | Active | X saniye tam immunity |
| **Leverage** | Active | Damage 2x AMA hasar da 2x |
| **Auto Target** | Passive | En yakın düşmana otomatik ateş |

---

## Unlock System

### Unlock Conditions

```typescript
export type UnlockConditionType = 
  | 'score'       // Reach X high score
  | 'games'       // Play X games
  | 'survive'     // Survive X seconds in one game
  | 'kills'       // Total enemy kills
  | 'critKills'   // Kills with critical hits
  | 'level';      // Reach player level X in one game

export interface UnlockCondition {
  type: UnlockConditionType;
  value: number;
}
```

### Persistence

Unlock durumu şurada saklanır:
- **Local:** `localStorage` (offline play)
- **Cloud:** Supabase `player_unlocks` table

---

## Implementation Plan

### Phase 1: Foundation
- [ ] Create `config/CharacterConfig.ts`
- [ ] Create `factories/CharacterFactory.ts`
- [ ] Update `types.ts` with Character types
- [ ] Add `characterType` to Player interface

### Phase 2: Abilities
- [ ] Create `strategies/CharacterAbilities.ts`
- [ ] Implement base abilities (dash exists)
- [ ] Add ability cooldown system

### Phase 3: UI
- [ ] Character selection screen
- [ ] Character preview with stats
- [ ] Unlock progress display

### Phase 4: Persistence
- [ ] Local storage for unlocks
- [ ] Supabase sync for unlocks

### Phase 5: Balance & Polish
- [ ] Playtesting each character
- [ ] Stat adjustments
- [ ] Visual polish (unique projectiles, effects)

---

## File Structure

```
crypto-cyber-survivors/
├── config/
│   ├── PlayerConfig.ts          # Keep for legacy/defaults
│   └── CharacterConfig.ts       # NEW: Character definitions
├── factories/
│   ├── EnemyFactory.ts          # Existing
│   └── CharacterFactory.ts      # NEW: Character creation
├── strategies/
│   ├── EnemyBehaviors.ts        # Existing
│   └── CharacterAbilities.ts    # NEW: Ability strategies
├── types/
│   └── character.ts             # NEW: Character types
└── stores/
    └── characterStore.ts        # NEW: Unlock state
```

---

## Comparison: OOP vs Config-Driven

| Aspect | OOP (Class Hierarchy) | Config-Driven ✅ |
|--------|----------------------|------------------|
| New character | New class file | Add to config object |
| Balance tweaks | Code change | Data change |
| Hot reload | No | Possible |
| Type safety | Strong | Strong (with TS) |
| Complexity | Higher | Lower |
| Consistency | Varies | Enemy system ile aynı |

**Decision:** Config-Driven yaklaşım, Enemy sistemiyle tutarlılık ve kolay genişletilebilirlik sağlar.

---

## Notes

- Ability sistemi mevcut `dash` mekanizmasını genelleştirir
- Decorator pattern (`PlayerStatsAdapter`) karakter başlangıç statları için uyarlanabilir
- Karakter seçimi Main Menu'de asset seçiminden sonra olabilir

---

## References

- [Enemy System Documentation](./ENEMY_SYSTEM.md)
- [Card System](../services/cards/CardSystem.ts)
- [Player Stats Decorator](../services/patterns/decorators/PlayerStatsAdapter.ts)
