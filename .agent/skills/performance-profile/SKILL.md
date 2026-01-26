---
name: performance-profile
description: Profile game performance, analyze FPS drops, and optimize render loops
---

# Performance Profiling Skill

Oyunun 60 FPS hedefini koruması için performansı analiz et ve optimize et.

## Usage

```
/performance-profile [component-or-service]
```

## Monitoring Tools

### 1. In-game Monitoring
- **Admin Dashboard** (`Ctrl+Shift+A`) -> **Metrics Panel**
- **FPS Monitor**: UI üzerinde aktifse FPS ve frame time değerlerini izle.

### 2. Browser DevTools
- **Performance Tab**: CPU profili al, scripting/rendering darboğazlarını bul.
- **Memory Tab**: Heap snapshot ile memory leak ara.
- **Render Tab**: Paint flashing ve layout shifts kontrol et.

## Common Bottlenecks

### Render Loop (GameEngine)
- **Problem**: Her frame'de aşırı heap allocation.
- **Fix**: Object Registry/Pooling kullan. Nesneleri `new` ile oluşturmak yerine pool'dan al.

### Collision System
- **Problem**: O(n²) karmaşıklığı (her mermi her düşmana).
- **Fix**: `SpatialGrid` veya `Quadtree` kullan. Sadece yakın nesneleri kontrol et.

### React Re-renders
- **Problem**: Oyun her update olduğunda tüm React HUD'ın render olması.
- **Fix**: 
  - `React.memo` kullan.
  - State'i atomik tut (Zustand shallow checks).
  - Canvas render loop'u React state'inden ayır (Ref use).

## Optimization Techniques

### 1. Memory Management
- Pool size'larını ayarla: `PoolManager.prewarm('ENEMY', 50)`.
- Event listener'ları `dispose()` metodunda temizle.

### 2. Asset Optimization
- Spritesheet kullan, her frame'de yeni `Image` objesi yükleme.
- Offscreen canvas kullanarak static katmanları önceden render et.

### 3. Math Optimization
- `Math.sqrt` yerine squared distance (`distSq`) karşılaştırması yap.
- Sık kullanılan sin/cos değerlerini lookup table'a al (Eğer çok yoğunsa).

## Checklist

- [ ] FPS stabil 60 mı?
- [ ] Memory kullanımı lineer mi artıyor (leak var mı)?
- [ ] Render loop'ta `any` logic var mı (type casting performansı etkiler)?
- [ ] Mobil cihazlarda (Throttle CPU) performans kabul edilebilir mi?

## Implementation Reference

- `services/PhysicsSystem.ts`: Spatial partitioning logic.
- `services/PoolManager.ts`: Object pooling patterns.
- `components/GameEngine.tsx`: Main requestAnimationFrame loop.
