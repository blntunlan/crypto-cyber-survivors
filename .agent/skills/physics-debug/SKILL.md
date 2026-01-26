---
name: physics-debug
description: Debug collision, spatial grid, and movement issues in the game engine.
---

# Physics Debug Skill

Bu skill, oyunun fizik motorundaki çarpışma (collision), hareket (movement) ve performans sorunlarını analiz etmek ve çözmek için kullanılır.

## Usage

```
/physics-debug [issue-type]
```

**Issue Types:**
- `collision`: Çarpışma algılama sorunları
- `movement`: Titreme, takılma veya yanlış hareket
- `grid`: Spatial Grid performans sorunları
- `nan`: NaN/Infinity pozisyon hataları

## Architecture Overview

Fizik motoru `services/PhysicsSystem.ts` içinde yönetilir ve aşağıdaki bileşenleri içerir:
- **Spatial Grid**: Performans için ekranı hücrelere böler.
- **Collision Sytem**: Circle-Circle ve AABB çarpışmalarını kontrol eder.
- **Movement Integration**: Velocity ve acceleration tabanlı hareket güncellemesi.

## Workflow

### 1. Debug Modunu Aktif Et

Oyun içinde çarpışma sınırlarını (colliders) ve grid yapısını görmek için `GameEngine` debug flag'lerini kullan.
(Eğer UI'da yoksa, `GameEngine.tsx` içinde `DEBUG_PHYSICS = true` sabiti veya benzeri bir mekanizma olup olmadığını kontrol et).

### 2. Sık Karşılaşılan Sorunlar ve Çözümleri

#### 🛑 Çarpışmalar Algılanmıyor
- **Spatial Grid Update**: Objelerin `updateSpatialGrid` metodu her frame çağrılıyor mu?
- **Grid Cell Size**: `SpatialGrid` hücre boyutu en büyük objeden küçük mü? (Objeler birden fazla hücrede olabilir).
- **Collision Layers**: Doğru tipler birbirini kontrol ediyor mu? (Enemy vs Bullet, Player vs Gem).

#### 🏃 Hareket Sorunları (Jitter/Lag)
- **Delta Time**: Hareket hesaplamalarında `dt` (delta time) kullanılıyor mu?
- **Floating Point Errors**: Pozisyonlar `Math.round` ile pixel-perfect mi yapılmalı yoksa sub-pixel mi kalmalı? Canvas için sub-pixel genellikle daha iyidir.

#### 🔢 NaN / Infinity Hataları
- **Divide by Zero**: Velocity normalizasyonunda vector uzunluğu 0 olduğunda kontrol var mı?
- **Invalid Force**: `applyForce` metoduna `NaN` değer gönderiliyor mu?

### 3. Test İle Doğrulama

Fizik sistemi için özel testleri çalıştır:

```bash
# Sadece fizik testlerini çalıştır
npx vitest tests/services/PhysicsSystem.test.ts
npx vitest tests/services/CollisionSystem.test.ts
```

### 4. Inspector Kullanımı

Tarayıcı konsolunda canlı objeleri incele:

```javascript
// GameStore üzerinden entity'lere erişim
window.gameStore.getState().enemies
```

## Checklist

- [ ] `PhysicsSystem.update()` her frame çağrılıyor mu?
- [ ] Spatial Grid her kare temizlenip yeniden dolduruluyor mu?
- [ ] Objelerin yarıçapları (radius) doğru ayarlanmış mı?
- [ ] Frame rate bağımsız hareket (dt multiplication) var mı?
- [ ] `checkCollisions` döngüsü optimize edilmiş mi?
