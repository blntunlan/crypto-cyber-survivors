# Performance Profiling Guide

Bu döküman, oyunun performans analizi ve optimizasyon süreçlerini açıklar.

## 🔧 Profiling Araçları

### 1. Chrome DevTools Performance Tab

```bash
# Dev server'ı başlat
npm run dev

# Chrome'da aç: http://localhost:5173
# F12 -> Performance tab
# Record butonuna tıkla, oyunu oyna, durdur
```

**Kontrol Edilecekler:**
- Frame rate (60 FPS hedef)
- Main thread blocking
- Layout thrashing
- Scripting time

### 2. React DevTools Profiler

```bash
# React DevTools extension yükle
# Components -> Profiler tab
# Record seçeneğini aç
```

**Kontrol Edilecekler:**
- Unnecessary re-renders
- Component render times
- Commit phases

### 3. Memory Profiling

```bash
# Chrome DevTools -> Memory tab
# Heap snapshot al
# Oyun sırasında birkaç snapshot al
# Comparison view ile memory leak ara
```

**Dikkat Edilecekler:**
- Detached DOM nodes
- Event listener accumulation
- Closure references

## 📊 Mevcut Optimizasyonlar

### Implemented ✅

1. **Object Pooling** (`PoolManager.ts`)
   - Bullet pooling
   - Enemy pooling
   - Particle pooling
   - Gem pooling

2. **Lazy Loading** (`App.tsx`)
   - React.lazy() ile component splitting
   - Code splitting for heavy components

3. **Canvas Optimizations** (`GameCanvas.ts`)
   - RequestAnimationFrame
   - Off-screen rendering
   - Sprite batching

4. **Device Adaptive** (`DeviceBenchmarkService.ts`)
   - Auto quality adjustment
   - Mobile optimizations
   - Particle reduction on low-end devices

5. **Memo & Callbacks** (`hooks/`)
   - useMemo for expensive calculations
   - useCallback for event handlers

## 🎯 Hot Paths

En çok çağrılan ve optimize edilmesi gereken fonksiyonlar:

| Fonksiyon | Dosya | Çağrı/frame | Notlar |
|-----------|-------|-------------|--------|
| `update()` | GameEngine | 1 | Ana loop |
| `checkCollisions()` | CollisionSystem | 1 | O(n*m) complexity |
| `moveTowards()` | Enemy | n | Her düşman için |
| `draw()` | GameCanvas | 1 | Render call |

## 🚨 Known Issues

### Potansiyel Memory Leaks

1. **Event Listeners**
   - EventBus abonelikleri cleanup edilmeli
   - Mevcut: `eventUnsubscribers` array pattern ✅

2. **Timer Cleanup**
   - setTimeout/setInterval temizlenmeli
   - Mevcut: Component unmount'ta clear ✅

3. **Canvas Context**
   - Canvas reference tutulmamalı
   - Mevcut: Proper cleanup ✅

## 📈 Benchmark Sonuçları

### Hedef Metrikler

| Metrik | Hedef | Min Kabul |
|--------|-------|-----------|
| FPS | 60 | 30 |
| Frame Time | 16ms | 33ms |
| Memory | < 100MB | < 200MB |
| Load Time | < 3s | < 5s |

### Cihaz Profilleri

| Profil | Max Enemies | Particles | Quality |
|--------|-------------|-----------|---------|
| High | 100 | 500 | Full |
| Medium | 50 | 200 | Reduced |
| Low | 30 | 100 | Minimal |
| Ultra Low | 15 | 50 | Basic |

## 🔍 Profiling Checklist

### Başlamadan Önce

- [ ] Production build kullan: `npm run build && npm run preview`
- [ ] Browser extensions devre dışı
- [ ] Diğer tab'ları kapat
- [ ] DevTools açıkken profile alma (overhead)

### Profile Alırken

- [ ] 30-60 saniye kayıt
- [ ] Tipik gameplay senaryosu
- [ ] Level up, boss fight dahil
- [ ] High enemy count anları dahil

### Analiz

- [ ] Long tasks (>50ms) işaretle
- [ ] Garbage collection spikes
- [ ] Layout/Paint frequency
- [ ] JavaScript heap size trend

## 💡 Optimizasyon Önerileri

### Kısa Vadeli

1. **Collision Grid System**
   - Spatial hashing ile O(n) complexity

2. **Web Workers**
   - Collision detection off-thread

3. **Canvas Layering**
   - Static background layer
   - Dynamic entity layer

### Uzun Vadeli

1. **WebGL Renderer**
   - Pixi.js veya custom WebGL

2. **WASM Physics**
   - Rust/C++ compiled physics engine

3. **Offscreen Canvas**
   - Worker-based rendering

## 📝 Notlar

- Bundle size: ~881KB (gzipped: ~165KB)
- İlk yükleme için kritik path optimize edildi
- Lazy loading ile initial load azaltıldı
