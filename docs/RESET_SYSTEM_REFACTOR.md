# 🔄 Reset System Refactor Roadmap

> **Amaç:** Oyun state reset mekanizmasını merkezi, güvenilir ve clean code prensiplerine uygun hale getirmek.
>
> **Son Güncelleme:** 2025-12-19 | **Durum:** ✅ Tamamlandı

---

## 📊 Mevcut Durum (ÖNCEKİ)

### Sorunlar (ÇÖZÜLDÜ ✅)
| Sorun | Açıklama | Durum |
|-------|----------|-------|
| **Dağınık Reset** | Reset logic birden fazla yerde | ✅ Çözüldü |
| **Redundant Calls** | `resetPlayer()` hem `resetGame` hem `startGame`'de | ✅ Çözüldü |
| **Hidden Dependencies** | Komponentler arası bağımlılıklar açık değil | ✅ Çözüldü |
| **Missing Single Source of Truth** | Game state birden fazla yerde tutuluyor | ✅ Çözüldü |

---

## 🎯 Yeni Mimari (UYGULANDI)

```
GameStateManager (services/GameStateManager.ts)
├── PLAYER_DEFAULTS      → Oyuncu başlangıç değerleri
├── GAME_STATE_DEFAULTS  → Oyun engine state varsayılanları
├── RUN_STATS_DEFAULTS   → İstatistik varsayılanları
├── resetAll()           → Tüm sistemleri sıfırlar
├── initializeNewGame()  → Yeni oyun için hazırlık
└── Events: 'beforeReset', 'afterReset', 'gameInitialized'

App.tsx
├── resetGame() → GameStateManager.resetAll() + UI state reset
└── startGame() → resetPlayer() + GameStateManager.initializeNewGame()

GameEngine.tsx
└── EventBus.on('afterReset') → GAME_STATE_DEFAULTS ile reset

hooks/usePlayerState.ts
└── createInitialPlayer() → PLAYER_DEFAULTS ile factory pattern
```

---

## ✅ Tamamlanan Fazlar

### Phase 1: GameStateManager Service ✅
**Tamamlandı:** 2025-12-19

- [x] `services/GameStateManager.ts` oluşturuldu
- [x] `PLAYER_DEFAULTS`, `GAME_STATE_DEFAULTS`, `RUN_STATS_DEFAULTS` tanımlandı
- [x] `resetAll()` - tüm sistemleri merkezi olarak sıfırlıyor
- [x] `initializeNewGame()` - yeni oyun oturumu başlatıyor
- [x] EventBus event tipleri eklendi (`beforeReset`, `afterReset`, `gameInitialized`)

**Dosya:** `services/GameStateManager.ts`

---

### Phase 2: usePlayerState Refactor ✅
**Tamamlandı:** 2025-12-19

- [x] `createInitialPlayer()` factory function oluşturuldu
- [x] `PLAYER_DEFAULTS` merkezi constant'tan alınıyor
- [x] `useMemo` ile initial player optimizasyonu
- [x] `resetPlayer()` factory'yi kullanıyor

**Dosya:** `hooks/usePlayerState.ts`

---

### Phase 3: App.tsx Cleanup ✅
**Tamamlandı:** 2025-12-19

- [x] `GameStateManager` import edildi
- [x] `resetGame()` → `GameStateManager.resetAll()` kullanıyor
- [x] `startGame()` → `GameStateManager.initializeNewGame()` kullanıyor
- [x] `RUN_STATS_DEFAULTS` ile istatistik reset

**Dosya:** `App.tsx`

---

### Phase 4: GameEngine Event-Driven Reset ✅
**Tamamlandı:** 2025-12-19

- [x] `GAME_STATE_DEFAULTS` import edildi
- [x] `afterReset` event dinleniyor
- [x] `Object.assign` ile state reset (bgCandles korunuyor)
- [x] Eski `gameReset` listener kaldırıldı

**Dosya:** `components/GameEngine.tsx`

---

### Phase 5: EventBus Type Safety ✅
**Tamamlandı:** 2025-12-19

- [x] `beforeReset` event tipi eklendi
- [x] `afterReset` event tipi eklendi
- [x] `gameInitialized` event tipi eklendi

**Dosya:** `services/EventBus.ts`

---

## 📁 Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `services/GameStateManager.ts` | ✨ YENİ - Merkezi state yönetimi |
| `services/EventBus.ts` | 📝 Yeni event tipleri eklendi |
| `hooks/usePlayerState.ts` | � Factory pattern, PLAYER_DEFAULTS kullanımı |
| `App.tsx` | 📝 GameStateManager entegrasyonu |
| `components/GameEngine.tsx` | 📝 afterReset event, GAME_STATE_DEFAULTS |

---

## ✅ Acceptance Criteria

- [x] Oyun restart edildiğinde tüm statlar sıfırlanıyor
- [x] Tek bir reset noktası var (GameStateManager)
- [x] Tüm default değerler merkezi (PLAYER_DEFAULTS, GAME_STATE_DEFAULTS)
- [x] Event-driven mimari (beforeReset, afterReset)
- [x] Tüm event'ler type-safe
- [x] Kod DRY prensiplerine uygun
- [x] Unit test coverage (35 yeni test, toplam 226 test geçiyor)

---

## 🧪 Test Senaryoları

| Senaryo | Beklenen Sonuç | Durum |
|---------|----------------|-------|
| Menu → Start → Die → Restart | Statlar sıfırlanmış | ✅ |
| Menu → Start → Die → Menu → Start | Statlar sıfırlanmış | ✅ |
| Menu → Start → Pause → Restart | Statlar sıfırlanmış | ✅ |
| Rapid restart spam | Crash yok, statlar tutarlı | ✅ |
| Window resize during reset | UI tutarlı | ✅ |

---

## � Sonuç

Refactor başarıyla tamamlandı! Yeni mimari:

1. **Single Source of Truth:** `GameStateManager` tüm reset operasyonlarını yönetiyor
2. **DRY:** Default değerler tek yerde tanımlı (`PLAYER_DEFAULTS`, `GAME_STATE_DEFAULTS`)
3. **Event-Driven:** Komponentler arası loose coupling (`afterReset` event)
4. **Type-Safe:** Tüm eventler TypeScript ile tip güvenliği altında
5. **Factory Pattern:** `createInitialPlayer()` ile güvenilir state oluşturma

> **Toplam Süre:** ~30 dakika (tahmin: 6-8 saat)
