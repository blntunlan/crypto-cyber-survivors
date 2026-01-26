---
name: cheat-engine
description: Dev-only cheats, manual state overrides, and game testing tools
---

# Cheat Engine Skill

Geliştirme aşamasında oyunun farklı senaryolarını test etmek için cheat'leri yönet.

## Usage

```
/cheat-engine [cheat-name]
```

## Available Cheats (Dev Mode Only)

### Player Stats
- `godMode(bool)`: Ölümsüzlük.
- `infAmmo(bool)`: Sınırsız mermi.
- `setHealth(val)`: Canı set et.
- `setSpeed(val)`: Hareket hızını değiştir.

### Game Progression
- `addExp(val)`: Tecrübe puanı ekle.
- `levelUp()`: Anında level atlat.
- `spawnEnemy(type, count)`: Belirli bir düşmanı doğur.
- `clearEnemies()`: Tüm düşmanları temizle.

### Economy & Items
- `addGold(val)`: Kripto/Gold ekle.
- `unlockAllWeapons()`: Tüm silahları aç.

## Controls

- **Console Keys**: Browser konsolunda `window.cheats` üzerinden erişilebilir.
- **Admin Panel**: `Ctrl+Shift+A` ile görsel cheat menüsüne ulaş.

## Implementation

Cheat'ler `CheatManager.ts` servisinde toplanır:

```typescript
class CheatManager {
  public static activate(name: string, payload?: any) {
    if (!import.meta.env.DEV) return; // Prod'da çalışmaz!
    
    switch(name) {
      case 'god': 
        useGameStore.getState().setPlayerGodMode(true);
        break;
      // ...
    }
  }
}
```

## Safety Rules

1. **PROD LOCK**: Cheat kodları asla `if (import.meta.env.DEV)` kontrolü olmadan çalışmamalı.
2. **Logging**: Bir cheat aktif edildiğinde `Logger.warn` ile bildirilmelidir.
3. **Reset**: `gameReset` event'i tüm cheat'leri (godMode vb.) deaktif etmelidir.

## Testing Scenarios

- **Max Difficulty Test**: `setDifficulty(5)` yaparak oyunun kırılıp kırılmadığını kontrol et.
- **Late Game Performance**: `spawnEnemy('ZOMBIT', 200)` yaparak FPS düşüşünü izle.
- **Visual Feedback**: `infAmmo` ile seri ateş edip animasyon laglerini kontrol et.

## Checklist

- [ ] Cheat logic'i `PRODUCTION` build'e sızıyor mu?
- [ ] Cheat tetiklendiğinde UI'da (Admin Panel) durum güncelleniyor mu?
- [ ] Cheat aktifken achievement/leaderboard logic'i devre dışı kalıyor mu?
