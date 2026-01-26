---
name: game-balance
description: Analyze and adjust game balance parameters (difficulty, spawning, progression)
---

# Game Balance Skill

Oyun dengeleme parametrelerini analiz et ve ayarla.

## Usage

```
/game-balance [aspect]
```

**Aspects:**
- `difficulty` - Zorluk seviyeleri
- `spawning` - Düşman spawn oranları
- `progression` - Level/XP progression
- `market` - Market-based difficulty
- `weapons` - Silah dengeleme

## Key Files

| File | Purpose |
|------|---------|
| `services/DifficultyManager.ts` | Zorluk yönetimi |
| `services/SpawnManager.ts` | Düşman spawn logic |
| `constants.ts` | Tüm sayısal sabitler |
| `config/weapons.ts` | Silah istatistikleri |
| `config/enemies.ts` | Düşman istatistikleri |

## Balance Parameters

### Difficulty Scaling

```typescript
// constants.ts içinde
GAME_ENGINE: {
  DIFFICULTY_SCALE_RATE: 0.1,    // Dakika başına artış
  MAX_DIFFICULTY_MULTIPLIER: 3,   // Maksimum çarpan
  BASE_ENEMY_HEALTH: 10,
  BASE_ENEMY_DAMAGE: 5,
}
```

### Spawn Rates

```typescript
// SpawnManager'da
SPAWN_INTERVAL_BASE: 2000,        // ms
SPAWN_INTERVAL_MIN: 500,          // ms
ENEMIES_PER_SPAWN_BASE: 1,
ENEMIES_PER_SPAWN_MAX: 5,
```

### Market Integration

```typescript
// DifficultyManager'da
VOLATILITY_DIFFICULTY_WEIGHT: 0.3,  // ATR etkisi
TREND_DIFFICULTY_WEIGHT: 0.2,       // Trend etkisi
```

## Analysis Process

### 1. Mevcut Değerleri Al

```typescript
// Constants'tan değerleri oku
import { GAME_ENGINE } from '../constants';
console.log(GAME_ENGINE);
```

### 2. Oyun İstatistiklerini Analiz Et

```typescript
// Admin panel ile:
// Ctrl+Shift+A -> Metrics panel
```

Key metrics:
- Average game duration
- Death causes (enemy type breakdown)
- XP gain rate
- Wave survival rates

### 3. Dengeleme Formülleri

**Effective Difficulty:**
```
effectiveDifficulty = baseDifficulty * (1 + timeMultiplier) * marketFactor
```

**Spawn Rate:**
```
spawnInterval = max(MIN_INTERVAL, BASE_INTERVAL / difficulty)
```

**Enemy Health:**
```
enemyHealth = BASE_HEALTH * (1 + 0.1 * waveNumber) * difficultyMultiplier
```

## Common Adjustments

### Oyun Çok Zor
- `DIFFICULTY_SCALE_RATE` düşür
- `SPAWN_INTERVAL_MIN` artır
- `BASE_ENEMY_DAMAGE` düşür

### Oyun Çok Kolay
- `DIFFICULTY_SCALE_RATE` artır
- `ENEMIES_PER_SPAWN_MAX` artır
- `BASE_ENEMY_HEALTH` artır

### Market Etkisi Çok Fazla
- `VOLATILITY_DIFFICULTY_WEIGHT` düşür
- `TREND_DIFFICULTY_WEIGHT` düşür

### Level Atlama Çok Yavaş
- XP gereksinimlerini düşür
- Gem değerlerini artır

## Testing Balance Changes

1. **Cheat Commands** (Dev mode):
   - `setDifficulty(float)` - Zorluk seviyesi
   - `setWave(int)` - Wave numarası
   - `godMode()` - Ölümsüzlük

2. **Metrics Tracking**:
   - Admin Dashboard > Metrics panel
   - Game session data in Supabase

3. **A/B Testing**:
   - Feature flags ile farklı değerler
   - Supabase'de session data analizi

## Balance Checklist

- [ ] İlk 30 saniye öğrenme alanı
- [ ] Wave 5'e kadar kademeli artış
- [ ] Wave 10+ survival challenge
- [ ] Market volatilite dönemlerinde heyecan
- [ ] Boss encounters fair ama challenging
- [ ] Oyuncu güçlenme hissiyatı
