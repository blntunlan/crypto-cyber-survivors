# 🐛 Critical Bug Fix Roadmap

**Oluşturulma:** 2025-12-19
**Durum:** ✅ Tamamlandı

---

## Tespit Edilen Sorunlar

### 🔴 Yüksek Öncelikli (Hemen Düzeltilmeli)

| # | Sorun | Dosya | Etki | Durum |
|---|-------|-------|------|-------|
| 1 | Wave Phase deltaMs HARDCODED | `useMarketData.ts:101` | Wave döngüsü FPS'e bağlı | ✅ |
| 2 | Spawn Overflow (Enemy Limiti Yok) | `SpawnSystem.ts` | Performans çökmesi | ✅ |

### 🟡 Orta Öncelikli (İyileştirme)

| # | Sorun | Dosya | Etki | Durum |
|---|-------|-------|------|-------|
| 3 | Free List Memory Temizliği Yok | `poolManager.ts` | Uzun oyunlarda bellek | ✅ |
| 4 | Date.now() vs performance.now() karışıklığı | `EnemyBehaviors.ts` | Teorik senkronizasyon | ✅ |

---

## Uygulama Planı

### ✅ Adım 1: Wave Phase deltaMs Düzeltmesi
**Dosya:** `hooks/useMarketData.ts`
**Sorun:** Satır 101'de `16.67` sabit değer geçiriliyor
**Çözüm:** 
- ✅ WebSocket callback'inde deltaTime hesaplandı
- ✅ Son güncelleme zamanını takip eden ref eklendi
- ✅ Gerçek deltaTime DifficultyManager'a geçiriliyor
- ✅ 1 saniyelik cap eklendi (tab değiştirme durumunda)

### ✅ Adım 2: Spawn Overflow Limiti
**Dosya:** `services/SpawnSystem.ts`
**Sorun:** Maksimum düşman limiti yok
**Çözüm:**
- ✅ `MAX_ENEMIES = 150` constant eklendi
- ✅ Spawn öncesi limit kontrolü yapılıyor
- ✅ Limitte olunca timer sıfırlanıyor (düşman ölünce hemen spawn)
- ✅ Test güncellendi (activeEnemies mock eklendi)

### ✅ Adım 3: Pool Memory Optimizasyonu
**Dosya:** `services/poolManager.ts`
**Sorun:** Free list'ler sınırsız büyüyebilir
**Çözüm:**
- ✅ `trimFreeLists()` metodu eklendi
- ✅ Belirli bir eşiğin üzerindeki free objeleri siler
- ✅ `clearAll()` sonrası otomatik çağrılıyor

### ✅ Adım 4: Zaman API Standardizasyonu
**Dosya:** `strategies/EnemyBehaviors.ts`
**Sorun:** `Date.now()` animasyon için kullanılıyordu
**Çözüm:**
- ✅ `GrowingStrategy` internal phase counter kullanıyor
- ✅ Frame-rate independent wave animasyonu

---

## Test Stratejisi

Her düzeltme sonrası:
1. ✅ `npx vitest run` - 301 test geçti
2. ✅ Oyun içi test - Davranış doğru çalışıyor
3. ✅ Edge case testi - Extreme durumlar

---

## İlerleme Takibi

- [x] Bug analizi tamamlandı
- [x] Roadmap oluşturuldu
- [x] Adım 1: Wave Phase deltaMs ✅
- [x] Adım 2: Spawn Overflow Limiti ✅
- [x] Adım 3: Pool Memory ✅
- [x] Adım 4: Zaman API ✅

---

**Tahmini Toplam Süre:** 45 dakika
**Gerçekleşen:** ~20 dakika ✅
**Son Güncelleme:** 2025-12-20

