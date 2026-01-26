---
name: storage-persistence
description: Manage local storage, cloud saves, and state persistence logic
---

# Storage & Persistence Skill

Oyuncu verilerini (settings, high-scores, meta-progression) local storage ve cloud (Supabase) üzerinde yönet.

## Usage

```
/storage-persistence [data-type] [action]
```

**Data Types**: `settings`, `progress`, `session`.

## Architecture

1. **Local Storage**: Hızlı erişim, offline destek (Settings, simple high scores).
2. **Supabase**: Login olan kullanıcılar için kalıcı data, leaderboard ve sync support.

## Feature Mapping

- **Settings**: LocalStorage (Volume, graphics, keyboard bindings).
- **Player Stats**: Supabase `players` table.
- **Game History**: Supabase `game_sessions` table.

## Key Methods

```typescript
// Local storage save wrapper
StorageService.save('settings', { volume: 0.8 });

// Cloud sync
await SupabaseService.syncProgress(playerData);
```

## Guidelines

- **Versioning**: Kayıtlı verilerin formatı değişirse eski verilerin uyumlu kalmasını (migration) sağla.
- **Consistency**: Local ve cloud verisi çakışırsa hangisinin "truth" olduğunu belirle (Genelde cloud > local).
- **Encryption**: Gereksiz hassas bilgi saklama, leaderboard skorlarını server-side verify et.

## Checklist

- [ ] LocalStorage doluluk oranı kontrol edildi mi?
- [ ] Offline modda oyun stabil çalışıyor mu?
- [ ] `gameReset` durumunda persistence verileri (high score vb.) korunuyor mu?
- [ ] JSON parse hataları için try-catch blokları mevcut mu?

## Code Reference Example

```typescript
const SAVE_KEY = 'crypto_survivors_v1';

export const saveToLocal = (data: any) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    Logger.error('Storage', 'Failed to save', e);
  }
};
```

## Integration

Bu skill `/edge-function-dev` ile birlikte çalışarak server-side veri doğrulaması yapabilir.
