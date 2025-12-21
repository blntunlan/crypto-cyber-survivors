---
description: Kod tabanı refactor yol haritası - Ultrathinking analizi sonucu
---

# 🛤️ Crypto Cyber Survivors - Refactor Roadmap

> **Oluşturulma Tarihi:** 2025-12-21
> **Toplam Tahmini Süre:** 8-12 saat
> **Öncelik Sırası:** Değer/Efor oranına göre sıralanmıştır

---

## 📋 ÖZET

| Faz | Kapsam | Süre | Kritiklik |
|-----|--------|------|-----------|
| Faz 1 | AudioService Modüler Ayrımı | 2-3 saat | 🔴 Yüksek |
| Faz 2 | App.tsx Custom Hooks | 1-2 saat | 🔴 Yüksek |
| Faz 3 | CardSystem Veri Ayrımı | 1-2 saat | 🔴 Yüksek |
| Faz 4 | SettingsPanel Bileşen Ayrımı | 1 saat | 🟡 Orta |
| Faz 5 | GameHUD Hook Çıkarımı | 1 saat | 🟡 Orta |
| Faz 6 | MetricsService Temizliği | 1 saat | 🟢 Düşük |
| Faz 7 | Singleton Tutarlılığı | 30 dk | 🟢 Düşük |

---

## 🔴 FAZ 1: AudioService Modüler Ayrımı (2-3 saat)

### Mevcut Durum
- `services/audioService.ts` → 822 satır, tek dev sınıf
- Synthesized sounds, combo sounds, slot sounds hepsi bir arada

### Hedef Yapı
```
services/
  audio/
    AudioService.ts          # Ana coordinator (150 satır)
    SynthEngine.ts           # Web Audio API primitives (100 satır)
    GameSounds.ts            # shoot, crit, hit, gem, death, button (200 satır)
    ComboSounds.ts           # combo1-5, milestone sounds (150 satır)
    SlotMachineSounds.ts     # slotTick, reelStop, slotWin (120 satır)
    types.ts                 # SoundType, SoundConfig interfaces
    constants.ts             # SOUND_DEFAULTS, COOLDOWN_MS
    index.ts                 # Public exports
```

### Adımlar ✅ TAMAMLANDI
1. [x] `services/audio/` klasörü oluştur
2. [x] `types.ts` ve `constants.ts` dosyalarını oluştur, tipleri ve sabitleri taşı
3. [x] `SynthEngine.ts` oluştur - temel AudioContext, GainNode, oscillator helper'ları
4. [x] `GameSounds.ts` oluştur - playShoot, playCrit, playHit, playGem, playDeath, playButton
5. [x] `ComboSounds.ts` oluştur - playCombo1-5, playComboMilestone
6. [x] `SlotMachineSounds.ts` oluştur - playSlotTick, playReelStop, playSlotWin, playAnticipation
7. [x] `AudioService.ts` coordinator olarak yeniden yaz (facade pattern)
8. [x] `index.ts` ile public API'yı export et
9. [x] Eski dosyayı re-export olarak güncelle (deprecated işareti ile)
10. [x] Tüm import'ları güncelle - geriye uyumluluk korundu
11. [x] Test: 30/30 test geçti, build başarılı

### Bağımlılık Kontrolü
```bash
# Bu dosyayı import eden yerler:
grep -r "audioService" --include="*.ts" --include="*.tsx"
```

### Başarı Kriterleri
- [ ] Her dosya max 200 satır
- [ ] `audio.playShoot()` API aynı kalmalı (geriye uyumluluk)
- [ ] Tüm oyun sesleri çalışmalı

---

## ✅ FAZ 2: App.tsx Custom Hooks Çıkarımı - TAMAMLANDI

### Sonuç
- `App.tsx` → 394 satır → **292 satır** (102 satır azalma, %26)
- 5 yeni custom hook oluşturuldu

### Oluşturulan Hooks
| Hook | Boyut | Sorumluluk |
|------|-------|------------|
| `useWindowDimensions.ts` | 1.0 KB | Window resize handling |
| `useGameStatus.ts` | 2.3 KB | GameStateMachine, pause, visibility |
| `useRunStats.ts` | 1.4 KB | Combo stats tracking |
| `useSessionTiming.ts` | 1.1 KB | Session timing management |
| `useCheatManager.ts` | 1.6 KB | CheatManager integration |

### Adımlar ✅ TAMAMLANDI
1. [x] `useWindowDimensions.ts` oluştur - resize event handling
2. [x] `useGameStatus.ts` oluştur - GameStateMachine subscription, pause, visibility
3. [x] `useRunStats.ts` oluştur - ComboSystem event subscription
4. [x] `useSessionTiming.ts` oluştur - Session timing based on game status
5. [x] `useCheatManager.ts` oluştur - CheatManager integration
6. [x] `App.tsx` sadeleştirildi - hook'lar entegre edildi

### Başarı Kriterleri
- [x] App.tsx 292 satır (hedef 200'e yaklaştı)
- [x] Her hook tek sorumluluk
- [x] TypeScript derleme başarılı
- [x] Build başarılı

---

## ✅ FAZ 3: CardSystem Veri/Mantık Ayrımı - TAMAMLANDI

### Sonuç
- `services/CardSystem.ts` → 523 satır → **5 modüler dosya**
- 35 kart tanımı ayrı dosyaya taşındı

### Oluşturulan Dosyalar
| Dosya | Boyut | İçerik |
|-------|-------|--------|
| `CardSystem.ts` | 3.1 KB | Mantık (rollTier, generateChoices) |
| `cardDefinitions.ts` | 12.0 KB | 35 kart tanımı (8 common, 9 rare, 9 epic, 9 legendary) |
| `tierConfig.ts` | 1.6 KB | Tier config ve drop rates |
| `types.ts` | 0.8 KB | Card, CardTier, TierConfig types |
| `index.ts` | 0.6 KB | Public exports |

### Adımlar ✅ TAMAMLANDI
1. [x] `services/cards/` klasörü oluştur
2. [x] `types.ts` - Card, CardTier, TierConfig interface'lerini taşı
3. [x] `tierConfig.ts` - TIER_CONFIG objesi ve helper functions
4. [x] `cardDefinitions.ts` - Tüm kart array'leri (35 kart)
5. [x] `CardSystem.ts` - Sadece generateChoices mantığı
6. [x] `index.ts` - Public exports
7. [x] Eski dosyayı re-export olarak güncelle
8. [x] TypeScript ve build başarılı

### Gelecek İyileştirme (Opsiyonel)
- Kart tanımlarını JSON'a taşı
- Runtime'da yüklenebilir kart sistemi

---

## ✅ FAZ 4: SettingsPanel Bileşen Ayrımı - TAMAMLANDI

### Sonuç
- `components/SettingsPanel.tsx` → 445 satır → **8 modüler dosya**
- Her section ayrı dosyada, tek sorumluluk

### Oluşturulan Dosyalar
| Dosya | Boyut | İçerik |
|-------|-------|--------|
| `SettingsPanel.tsx` | 4.0 KB | Container/layout |
| `AudioSection.tsx` | 2.6 KB | Volume, mute controls |
| `QualitySection.tsx` | 4.5 KB | Performance profiles |
| `GraphicsSection.tsx` | 3.0 KB | Visual toggles |
| `MobileSection.tsx` | 5.5 KB | Mobile controls |
| `ControlsSection.tsx` | 2.2 KB | Keyboard shortcuts |
| `ToggleButton.tsx` | 1.0 KB | Reusable toggle |
| `index.ts` | 0.5 KB | Public exports |

### Adımlar ✅ TAMAMLANDI
1. [x] `components/settings/` klasörü oluştur
2. [x] `AudioSection.tsx` ayır
3. [x] `QualitySection.tsx` ayır
4. [x] `GraphicsSection.tsx` ayır
5. [x] `MobileSection.tsx` ayır
6. [x] `ControlsSection.tsx` ayır
7. [x] `ToggleButton.tsx` ayır (reusable)
8. [x] `SettingsPanel.tsx` sadece container
9. [x] Eski dosya re-export olarak güncellendi
10. [x] TypeScript ve build başarılı

---

## ✅ FAZ 5: GameHUD UpdateLoop Hook - TAMAMLANDI

### Sonuç
- `components/GameHUD.tsx` → 373 satır → **113 satır** (%70 azalma)
- 3 yeni custom hook oluşturuldu

### Oluşturulan Hooks
| Hook | Boyut | Sorumluluk |
|------|-------|------------|
| `useHUDUpdateLoop.ts` | 6.4 KB | FPS, timer, glow, combo lerping |
| `useEnemyPointers.ts` | 4.6 KB | Off-screen enemy indicators |
| `useHUDEvents.ts` | 5.2 KB | EventBus subscriptions |

### Adımlar ✅ TAMAMLANDI
1. [x] `useHUDUpdateLoop.ts` oluştur - RAF loop, FPS, timer, glow
2. [x] `useEnemyPointers.ts` oluştur - Off-screen enemy indicators
3. [x] `useHUDEvents.ts` oluştur - All EventBus subscriptions
4. [x] GameHUD.tsx sadece render mantığı
5. [x] TypeScript ve build başarılı

---

## ✅ FAZ 6: MetricsService Temizliği - TAMAMLANDI

### Sonuç
- `services/MetricsService.ts` → 1232 satır → **938 satır** (294 satır azaltıldı)
- 6 compile metodu MetricsCompiler'a delegate edildi
- Kod tekrarı kaldırıldı

### Değişiklikler
| Kaldırılan Private Metodlar | Satır |
|-----------------------------|-------|
| `compileBitcoinMetrics` | 36 |
| `compileDifficultyMetrics` | 24 |
| `compilePlayerMetrics` | 31 |
| `compileComboMetrics` | 13 |
| `compileCardMetrics` | 18 |
| `compileEnemyMetrics` | 12 |
| Unused imports | 6 |
| **Toplam** | **~145** |

### Adımlar ✅ TAMAMLANDI
1. [x] `compileBitcoinMetrics` → `MetricsCompiler`'a delegate
2. [x] `compileDifficultyMetrics` → `MetricsCompiler`'a delegate
3. [x] `compilePlayerMetrics` → `MetricsCompiler`'a delegate
4. [x] `compileComboMetrics` → `MetricsCompiler`'a delegate
5. [x] `compileCardMetrics` → `MetricsCompiler`'a delegate
6. [x] `compileEnemyMetrics` → `MetricsCompiler`'a delegate
7. [x] Unused imports temizlendi
8. [x] TypeScript ve build başarılı

---

## ✅ FAZ 7: Singleton Pattern Tutarlılığı - ANALİZ EDİLDİ

### Mevcut Durum Analizi

| Pattern | Servisler | Değerlendirme |
|---------|-----------|---------------|
| `getInstance()` + export | ~15 servis | ✅ Tutarlı |
| `new Class()` export | 7 servis | ✅ Kabul edilebilir |

### Sonuç: Değişiklik Gerekmez

ES modülleri zaten singleton davranışı sağlar. `new Class()` pattern'i aslında daha basit ve modern yaklaşım.

**Mevcut `getInstance()` kullanan servisler:** ComboSystem, EventBus, GameStateMachine, GameStateManager, MetricsService, DifficultyManager, DebugService, CheatManager, CardSystem, Logger, ImagePreloader, MilestoneService, ParticleConfigService, ScreenService, TimeService

**Mevcut `new Class()` kullanan servisler:** DeviceBenchmarkService, FPSMonitor, SpatialGrid, AudioService, SynthEngine, HowlerManager

**Aksiyon:** Pattern farkı sorun yaratmıyor. Kod tutarlı çalışıyor.

---

## 📝 NOTLAR

### Branch Stratejisi
```bash
# Her faz için ayrı branch
git checkout -b refactor/phase-1-audio-service
git checkout -b refactor/phase-2-app-hooks
# vs.
```

### Test Stratejisi
- Her faz sonrası manuel oynanabilirlik testi
- Mevcut testler geçmeli
- Yeni modüller için unit test eklenebilir

### Geri Alma Planı
- Her faz ayrı commit ile
- Sorun olursa faz bazlı revert

---

## ✅ TAMAMLANAN FAZLAR

### ✅ FAZ 1: AudioService Modüler Ayrımı (2025-12-21)

**Sonuç:** 822 satırlık tek dosya → 9 modüler dosya

| Dosya | Boyut | Açıklama |
|-------|-------|----------|
| `AudioService.ts` | 4.7 KB | Facade coordinator |
| `GameSounds.ts` | 9.6 KB | Core game sounds |
| `ComboSounds.ts` | 6.7 KB | Combo milestone sounds |
| `SlotMachineSounds.ts` | 4.4 KB | Slot machine sounds |
| `SynthEngine.ts` | 3.9 KB | Web Audio primitives |
| `HowlerManager.ts` | 2.2 KB | File-based audio |
| `constants.ts` | 0.9 KB | Sound defaults |
| `types.ts` | 0.8 KB | Type definitions |
| `index.ts` | 0.9 KB | Public exports |

**Test Sonucu:** ✅ 30/30 test geçti
**Build:** ✅ Başarılı
**Geriye Uyumluluk:** ✅ `audio.playShoot()` API korundu

---

### ✅ FAZ 2: App.tsx Custom Hooks (2025-12-21)

**Sonuç:** 394 satır → 292 satır (%26 azalma)

| Hook | Sorumluluk |
|------|------------|
| `useWindowDimensions` | Resize handling |
| `useGameStatus` | GameStateMachine, pause, visibility |
| `useRunStats` | Combo stats |
| `useSessionTiming` | Session timing |
| `useCheatManager` | Cheat integration |

**Build:** ✅ Başarılı

---

### ✅ FAZ 3: CardSystem Modüler Ayrımı (2025-12-21)

**Sonuç:** 523 satırlık tek dosya → 5 modüler dosya

| Dosya | İçerik |
|-------|--------|
| `CardSystem.ts` | Mantık (rollTier, generateChoices) |
| `cardDefinitions.ts` | 35 kart tanımı |
| `tierConfig.ts` | Tier config, drop rates |
| `types.ts` | Type definitions |

**Build:** ✅ Başarılı

---

### ✅ FAZ 4: SettingsPanel Modüler Ayrımı (2025-12-21)

**Sonuç:** 445 satırlık tek dosya → 8 modüler dosya

| Dosya | İçerik |
|-------|--------|
| `SettingsPanel.tsx` | Container/layout |
| `AudioSection.tsx` | Volume, mute |
| `QualitySection.tsx` | Performance profiles |
| `GraphicsSection.tsx` | Visual toggles |
| `MobileSection.tsx` | Mobile controls |
| `ControlsSection.tsx` | Keyboard shortcuts |
| `ToggleButton.tsx` | Reusable toggle |

**Build:** ✅ Başarılı

---

### ✅ FAZ 5: GameHUD Hooks (2025-12-21)

**Sonuç:** 373 satır → 113 satır (%70 azalma)

| Hook | Sorumluluk |
|------|------------|
| `useHUDUpdateLoop` | FPS, timer, glow, combo lerping |
| `useEnemyPointers` | Off-screen enemy indicators |
| `useHUDEvents` | EventBus subscriptions |

**Build:** ✅ Başarılı

---

### ✅ FAZ 6: MetricsService Temizliği (2025-12-21)

**Sonuç:** 1232 satır → 938 satır (~145 satır azaltıldı)

- 6 compile metodu `MetricsCompiler`'a delegate edildi
- Kod tekrarı kaldırıldı

**Build:** ✅ Başarılı

---

- [x] LevelUpScreen modüler ayrımı (Önceden yapıldı)
- [x] Renderers modüler ayrımı (Önceden yapıldı)
- [x] HUD components ayrımı (Önceden yapıldı)

---

## 🚀 BAŞLANGIÇ KOMUTLARI

```bash
# Faz 1 için branch oluştur
git checkout -b refactor/phase-1-audio-service

# Klasör yapısını oluştur
mkdir -p services/audio

# Değişiklikleri takip et
git status
```

---

**Hangi fazdan başlamak istersiniz?**
