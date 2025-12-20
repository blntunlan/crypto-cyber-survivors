# 🎮 Device Benchmark & Adaptive Performance System

> **Status:** IN PROGRESS  
> **Created:** 2025-12-20  
> **Priority:** HIGH

---

## 📋 Problem Tanımı

Farklı cihazlarda tutarlı oyun deneyimi sağlamak için:
- **Güçlü cihazlar** → Maksimum görsel kalite
- **Orta cihazlar** → Dengeli ayarlar  
- **Zayıf cihazlar** → Performans öncelikli

---

## 🎯 Hedefler

| Hedef | Açıklama |
|-------|----------|
| **Otomatik Profilleme** | Benchmark ile GPU/CPU skorlama |
| **Adaptif Ayarlar** | Sonuca göre otomatik ayar seçimi |
| **Manuel Override** | Kullanıcı isterse kendi seçebilmeli |
| **Gerçek Zamanlı İzleme** | Oyun içi FPS drop'larda dinamik ayarlama |

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVICE BENCHMARK SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  DeviceBenchmark │───▶│  DeviceProfile    │              │
│  │    Service       │    │  (LOW/MED/HIGH/   │              │
│  │                  │    │   ULTRA)          │              │
│  └──────────────────┘    └────────┬─────────┘              │
│         │                         │                         │
│         ▼                         ▼                         │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Benchmark Tests │    │ PerformanceConfig │              │
│  │  - GPU Draw      │    │  - candles: 50-150│              │
│  │  - CPU Loop      │    │  - shadows: on/off│              │
│  │  - Memory        │    │  - particles: on  │              │
│  │  - FPS Stress    │    │  - glow: on/off   │              │
│  └──────────────────┘    └──────────┬───────┘              │
│                                     │                       │
│                                     ▼                       │
│  ┌──────────────────────────────────────────┐              │
│  │           AdaptiveRenderer               │              │
│  │  - Applies config to all renderers       │              │
│  │  - Real-time FPS monitoring              │              │
│  │  - Dynamic quality adjustment            │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Roadmap

### Phase 1: Device Benchmark Service 🔬 ✅ COMPLETED
**Dosya:** `services/DeviceBenchmarkService.ts`

| # | Task | Açıklama | Öncelik | Durum |
|---|------|----------|---------|-------|
| 1.1 | GPU Stress Test | Canvas fillRect, arc, shadow benchmark | ⭐⭐⭐ | ✅ |
| 1.2 | CPU Loop Test | 1M iteration math timing | ⭐⭐⭐ | ✅ |
| 1.3 | Memory Detection | `navigator.deviceMemory` API | ⭐⭐ | ✅ |
| 1.4 | Hardware Concurrency | CPU core count detection | ⭐⭐ | ✅ |
| 1.5 | GPU Info | WebGL renderer string parsing | ⭐ | ✅ |
| 1.6 | Result Caching | localStorage ile benchmark sonucu kaydet | ⭐⭐⭐ | ✅ |

---

### Phase 2: Device Profile & Config 📊 ✅ COMPLETED
**Dosyalar:** `types/DeviceProfile.ts`, `config/PerformancePresets.ts`

| # | Task | Açıklama | Öncelik | Durum |
|---|------|----------|---------|-------|
| 2.1 | DeviceProfile Enum | LOW, MEDIUM, HIGH, ULTRA tanımları | ⭐⭐⭐ | ✅ |
| 2.2 | PerformanceConfig Interface | Tüm ayarlanabilir parametreler | ⭐⭐⭐ | ✅ |
| 2.3 | Preset Configs | Her profil için hazır config'ler | ⭐⭐⭐ | ✅ |
| 2.4 | Score Thresholds | Benchmark skoru → Profil mapping | ⭐⭐ | ✅ |

---

### Phase 3: Adaptive Renderer Integration 🎮 ✅ COMPLETED
**Dosyalar:** Tüm renderer dosyaları

| # | Task | Açıklama | Öncelik | Durum |
|---|------|----------|---------|-------|
| 3.1 | Dynamic Candle Count | Config'den mum sayısı al | ⭐⭐⭐ | ✅ |
| 3.2 | Shadow/Glow Toggle | Config'e göre efekt aç/kapa | ⭐⭐⭐ | ✅ |
| 3.3 | Particle Scaling | Partikül sayısını config ile kontrol | ⭐⭐ | ✅ |
| 3.4 | Gradient Toggle | Background gradient kompleksitesi | ⭐ | ✅ |
| 3.5 | Enemy Limit Scaling | Maksimum düşman sayısı kontrolü | ⭐⭐ | ✅ |

---

### Phase 4: Runtime FPS Monitor 📈 ✅ COMPLETED
**Dosya:** `services/FPSMonitor.ts`

| # | Task | Açıklama | Öncelik | Durum |
|---|------|----------|---------|-------|
| 4.1 | Rolling FPS Average | Son 60 frame ortalaması | ⭐⭐⭐ | ✅ |
| 4.2 | Drop Detection | <45 FPS algılama | ⭐⭐⭐ | ✅ |
| 4.3 | Auto Downgrade | FPS düşünce kalite düşür | ⭐⭐ | ✅ |
| 4.4 | Recovery Mode | FPS stabil olunca upgrade | ⭐ | ⬜ |

---

### Phase 5: UI Integration 🖥️
**Dosyalar:** SettingsPanel, LoadingScreen

| # | Task | Açıklama | Öncelik | Durum |
|---|------|----------|---------|-------|
| 5.1 | Loading Benchmark UI | Benchmark progress göster | ⭐⭐ | ⬜ |
| 5.2 | Quality Preset Dropdown | Settings'te preset seçimi | ⭐⭐⭐ | ⬜ |
| 5.3 | Auto/Manual Toggle | Otomatik mı manuel mi | ⭐⭐ | ⬜ |
| 5.4 | Profile Display | Tespit edilen profili göster | ⭐ | ⬜ |

---

## 🔧 Performance Presets

```typescript
export const PERFORMANCE_PRESETS = {
  ULTRA: {
    candleCount: 150,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.5,
    maxEnemies: 100,
    gradientBackground: true,
    targetFPS: 60,
  },
  HIGH: {
    candleCount: 120,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.0,
    maxEnemies: 80,
    gradientBackground: true,
    targetFPS: 60,
  },
  MEDIUM: {
    candleCount: 70,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.7,
    maxEnemies: 60,
    gradientBackground: true,
    targetFPS: 60,
  },
  LOW: {
    candleCount: 30,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.3,
    maxEnemies: 40,
    gradientBackground: false,
    targetFPS: 30,
  },
};
```

---

## 🧪 Benchmark Test Tasarımı

### GPU Test
```typescript
const gpuBenchmark = async (): Promise<number> => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  
  const start = performance.now();
  
  // Shadow + Arc test (GPU intensive)
  for (let i = 0; i < 1000; i++) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const elapsed = performance.now() - start;
  return Math.round(1000 / elapsed * 100); // Score: higher = better
};
```

### CPU Test
```typescript
const cpuBenchmark = (): number => {
  const start = performance.now();
  let sum = 0;
  
  // Heavy math operations
  for (let i = 0; i < 1000000; i++) {
    sum += Math.sin(i) * Math.cos(i) * Math.tan(i % 1000);
  }
  
  const elapsed = performance.now() - start;
  return Math.round(1000000 / elapsed); // ops/ms
};
```

### Combined Score
```typescript
const calculateProfile = (gpuScore: number, cpuScore: number): DeviceProfile => {
  const combined = (gpuScore * 0.7) + (cpuScore * 0.3); // GPU ağırlıklı
  
  if (combined >= 800) return DeviceProfile.ULTRA;
  if (combined >= 500) return DeviceProfile.HIGH;
  if (combined >= 200) return DeviceProfile.MEDIUM;
  return DeviceProfile.LOW;
};
```

---

## 📅 Uygulama Sırası

| Sıra | Phase | Tahmini Süre | Bağımlılık |
|------|-------|--------------|------------|
| 1 | Phase 2 (Types & Config) | 15 dk | - |
| 2 | Phase 1 (Benchmark Service) | 30 dk | Phase 2 |
| 3 | Phase 3 (Renderer Integration) | 30 dk | Phase 1 |
| 4 | Phase 5.1-5.2 (Basic UI) | 20 dk | Phase 3 |
| 5 | Phase 4 (FPS Monitor) | 20 dk | Phase 3 |
| 6 | Phase 5.3-5.4 (UI Polish) | 15 dk | Phase 4 |

**Toplam Tahmini Süre: ~2 saat**

---

## 📁 Dosya Yapısı

```
services/
├── DeviceBenchmarkService.ts   # Benchmark logic
├── FPSMonitor.ts               # Runtime FPS tracking
└── PerformanceManager.ts       # Config application

config/
└── PerformancePresets.ts       # Preset definitions

types/
└── DeviceProfile.ts            # Types & interfaces

components/
├── LoadingScreen.tsx           # Benchmark progress UI
└── SettingsPanel.tsx           # Quality settings (update)

stores/
└── gameStore.ts                # Performance config state (update)
```

---

## ✅ Başarı Kriterleri

- [ ] Benchmark 3 saniyeden kısa sürede tamamlanmalı
- [ ] Sonuçlar localStorage'da cache'lenmeli
- [ ] 4 farklı profil doğru çalışmalı
- [ ] FPS <45 olduğunda otomatik downgrade
- [ ] Settings'ten manuel override mümkün
- [ ] Tüm testler geçmeli

---

## 🔗 İlgili Dosyalar

- `services/ScreenService.ts` - Mevcut cihaz algılama
- `services/renderers/*.ts` - Güncellenecek renderer'lar
- `stores/gameStore.ts` - Settings state

---

*Bu roadmap onaylandığında Phase 1'den başlanacaktır.*
