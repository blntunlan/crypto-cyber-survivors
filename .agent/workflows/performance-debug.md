---
description: In-game performance debugging pipeline - FPS drops, memory leaks, GC pressure analysis
---

# 🎮 Performance Debug Pipeline

Bu workflow, oyun içi performans problemlerini sistematik olarak tespit etmek ve çözmek için kullanılır.

## Kullanım

```
/performance-debug [issue-type]
```

**Issue Types:**
- `fps-drop` - FPS düşüşü analizi
- `memory-leak` - Memory leak tespiti
- `gc-pressure` - Garbage Collection baskısı
- `render-bottleneck` - Render pipeline darboğazı
- `full` - Tüm analizleri çalıştır

---

## 🔍 Phase 1: Veri Toplama

### 1.1 FPS Monitor Verilerini Kontrol Et

```bash
# Dev server'ın çalıştığından emin ol
npm run dev
```

Oyun içinde `Ctrl+Shift+A` ile Admin Dashboard'u aç ve şunları not al:
- Current FPS
- Min/Max FPS
- Active Entities (enemies, bullets, particles, gems)
- Memory Usage (varsa)

### 1.2 Chrome DevTools Performance Profili

1. Oyunu tarayıcıda aç
2. `F12` → Performance sekmesi
3. ⏺️ Record butonuna bas
4. 30-60 saniye oyna (problemi tetikle)
5. ⏹️ Stop
6. Analiz et:
   - **Scripting** süresi → JS bottleneck
   - **Rendering** süresi → Draw call bottleneck
   - **Idle** süresi → İyi (CPU boşta)

### 1.3 Memory Snapshot

1. Chrome DevTools → Memory sekmesi
2. "Heap Snapshot" seç
3. 3 snapshot al:
   - Oyun başlangıcı
   - 2 dakika sonra
   - 5 dakika sonra
4. Karşılaştır: Büyüyen objeler = Potansiyel leak

---

## 🔬 Phase 2: Kod Analizi

### 2.1 Allocation Hotspots (Her Frame Obje Oluşturma)

// turbo
```bash
# Array allocation pattern'leri ara
npx grep-cli "\.slice\(\)" "\.filter\(\)" "\.map\(\)" "\.reduce\(\)" --include="*.ts" --exclude="node_modules" --exclude="*.test.ts"
```

**Kritik Dosyalar:**
- `services/renderers/*.ts` - Render loop
- `services/physics/*.ts` - Physics update
- `components/GameEngine.tsx` - Game loop

### 2.2 Per-Frame Object Creation

```typescript
// KÖTÜ: Her frame yeni obje
const position = { x: player.x, y: player.y };

// İYİ: Reuse existing veya primitive
const px = player.x;
const py = player.y;
```

Aranacak pattern'ler:
```bash
# Inline object literals in loops
grep -rn "forEach.*{.*:" --include="*.ts" services/
grep -rn "for.*{.*:" --include="*.ts" services/

# new Keyword in hot paths
grep -rn "new Array\|new Object\|new Map\|new Set" --include="*.ts" services/
```

### 2.3 Event Listener Leaks

```bash
# EventBus subscriptions without cleanup
grep -rn "EventBus.on\|addEventListener" --include="*.ts" --include="*.tsx"
```

Her `on()` veya `addEventListener` için karşılık gelen `off()` veya `removeEventListener` olmalı.

---

## 📊 Phase 3: Profiling Araçları

### 3.1 Custom Performance Markers

GameEngine.tsx içinde timing ekle:

```typescript
// Update loop başında
performance.mark('frame-start');

// Physics sonrası
performance.mark('physics-end');
performance.measure('physics', 'frame-start', 'physics-end');

// Render sonrası
performance.mark('render-end');
performance.measure('render', 'physics-end', 'render-end');
```

### 3.2 Entity Count Monitoring

```typescript
// Her 60 frame'de bir log
if (frameCount % 60 === 0) {
  console.table({
    enemies: pool.activeEnemies.length,
    bullets: pool.activeBullets.length,
    particles: pool.activeParticles.length,
    gems: pool.activeGems.length,
    floatingTexts: pool.activeFloatingTexts.length,
  });
}
```

---

## 🛠️ Phase 4: Yaygın Sorunlar ve Çözümleri

### 4.1 Particle Explosion

**Belirti:** Particle sayısı sürekli artıyor
**Kontrol:**
```bash
grep -rn "getParticle\|activeParticles" --include="*.ts" services/
```
**Çözüm:** `POOL.MAX_ACTIVE.PARTICLES` limitini kontrol et

### 4.2 Array Sorting Every Frame

**Belirti:** Scripting time'da spike'lar
**Kontrol:**
```bash
grep -rn "\.sort\(" --include="*.ts" services/renderers/
```
**Çözüm:** Sort'u kaldır veya throttle et (10 frame'de 1)

### 4.3 Gradient/Shadow Creation

**Belirti:** Rendering time yüksek
**Kontrol:**
```bash
grep -rn "createLinearGradient\|createRadialGradient\|shadowBlur" --include="*.ts" services/renderers/
```
**Çözüm:** Gradient'ları cache'le veya static texture kullan

### 4.4 Decorator Chain Rebuild

**Belirti:** Her frame "new Decorator()" çağrısı
**Kontrol:**
```bash
grep -rn "getDecoratedStats\|new.*Decorator" --include="*.ts" services/
```
**Çözüm:** Dirty flag pattern ile cache'le

### 4.5 Spatial Grid Overhead

**Belirti:** Collision detection yavaş
**Kontrol:**
```bash
# Grid cell size vs entity count
grep -rn "CELL_SIZE\|SpatialGrid" --include="*.ts" services/
```
**Çözüm:** Cell size'ı en büyük entity'den büyük yap

---

## 📋 Phase 5: Checklist

### Per-Frame Allocation Audit

- [ ] `slice()` kullanımı kaldırıldı mı?
- [ ] `filter()` yerine in-place loop kullanılıyor mu?
- [ ] `sort()` sadece gerektiğinde mi çağrılıyor?
- [ ] Object literals loop içinde oluşturulmuyor mu?
- [ ] `new` keyword hot path'te kullanılmıyor mu?

### Pool System Health

- [ ] Tüm entity tipleri için max limit var mı?
- [ ] `cleanup()` her frame çağrılıyor mu?
- [ ] Pre-warming yapılıyor mu?
- [ ] Swap-and-pop pattern kullanılıyor mu?

### Render Pipeline

- [ ] Viewport culling aktif mi?
- [ ] Batch rendering kullanılıyor mu?
- [ ] Context state değişiklikleri minimize mi?
- [ ] `save()`/`restore()` gereksiz yere çağrılmıyor mu?

### Event System

- [ ] Tüm listener'lar cleanup'ta temizleniyor mu?
- [ ] Throttling gereken event'ler throttle ediliyor mu?
- [ ] `emit()` her frame çağrılmıyor mu?

---

## 🧪 Phase 6: Doğrulama

### 6.1 Before/After Karşılaştırma

// turbo
```bash
# Test suite'i çalıştır
npm run test
```

### 6.2 Manual FPS Test

1. Oyunu başlat
2. 5 dakika oyna
3. FPS drop var mı kontrol et
4. Entity sayıları stabil mi?

### 6.3 Memory Growth Test

1. Chrome DevTools → Memory
2. Baseline snapshot al
3. 10 dakika oyna
4. İkinci snapshot al
5. Delta < %10 olmalı

---

## 📁 İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `services/PoolManager.ts` | Object pooling sistemi |
| `services/renderers/EffectRenderer.ts` | Particle rendering |
| `services/physics/MovementSystem.ts` | Entity hareket güncellemesi |
| `services/physics/CollisionSystem.ts` | Çarpışma tespiti |
| `components/GameEngine.tsx` | Ana game loop |
| `services/SpatialGrid.ts` | Spatial hashing |
| `services/patterns/decorators/BuffManager.ts` | Buff sistemi |

---

## 🚀 Quick Commands

```bash
# Sadece physics testlerini çalıştır
npx vitest tests/PhysicsSystem.test.ts tests/SpatialGrid.test.ts --run

# Allocation pattern'leri ara
grep -rn "slice\|filter\|map\|reduce" --include="*.ts" services/renderers/ services/physics/

# Memory-intensive operasyonları bul
grep -rn "new Array\|new Object\|\.push\|\.unshift" --include="*.ts" services/

# Event leak'leri kontrol et
grep -rn "EventBus.on" --include="*.ts" | wc -l
grep -rn "EventBus.off\|unsub\|unsubscribe" --include="*.ts" | wc -l
```

---

*Bu workflow, FPS düşüşü veya memory leak şüphesi olduğunda sistematik debug için kullanılır.*
