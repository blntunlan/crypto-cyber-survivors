# 🎮 Game Admin Dashboard - Roadmap

## 📋 Proje Özeti

Fiyat verilerini analiz eden ve oyun parametrelerini (zorluk, spawn rate, item süreleri, ikonlar) yöneten bir admin dashboard.

---

## 🎯 Ana Özellikler

### 1. 📈 Fiyat Analiz Paneli
- **Canlı fiyat gösterimi** (BTC, ETH, SOL)
- **5 dakikalık değişim oranı** (% change)
- **10 dakikalık değişim oranı** (% change)
- **Volatilite skoru** (ATR bazlı)
- **Trend yönü** (bullish/bearish/sideways)
- **Grafik görselleştirme** (mini chart)

### 2. ⚡ Zorluk Yönetim Paneli
- **Base difficulty** ayarı (1-10)
- **Volatilite çarpanı** (fiyat değişimine göre)
- **Zaman bazlı zorluk artışı** (dakika başına)
- **Max difficulty cap**
- **Difficulty curve** (linear/exponential/logarithmic)

### 3. 👾 Spawn Rate Yönetimi
- **Enemy spawn interval** (ms)
- **Max enemies on screen**
- **Wave intensity** (calm/building/intense/peak)
- **Boss spawn timing**
- **Enemy type distribution** (%)

### 4. 💎 Item & Power-up Yönetimi
- **Drop rates** (gem, health, power-ups)
- **Power-up süreleri** (shield, speed boost, etc.)
- **Gem değerleri** (XP multipliers)
- **Rarity distribution**

### 5. 🎨 İkon & Görsel Yönetimi
- **Enemy ikonları** seçimi
- **Power-up ikonları**
- **Tema renkleri** (crypto pair bazlı)
- **Particle efektleri** (yoğunluk)

### 6. 📊 Analitik Panel
- **price_logs** tablosundan istatistikler
- **Son 1 saat / 24 saat özeti**
- **Fiyat dağılımı histogram**
- **Oyuncu performans korelasyonu**

---

## 🔌 GENİŞLETİLEBİLİR MİMARİ (Plugin System)

### Temel Prensipler

1. **Registry Pattern** - Tüm oyun öğeleri merkezi bir registry'de
2. **Schema-Driven** - JSON şemaları ile dinamik form üretimi
3. **Hot-Reload** - Yeni öğeler kod değişikliği olmadan eklenebilir
4. **Type-Safe** - TypeScript ile tip güvenliği

### Entity Registry

```typescript
// Her oyun öğesi bu interface'i implement eder
interface GameEntity {
  id: string;
  name: string;
  category: EntityCategory;
  icon: string;
  description: string;
  schema: EntitySchema;     // Dinamik form için
  defaultValues: Record<string, unknown>;
}

type EntityCategory = 
  | 'enemy' 
  | 'powerup' 
  | 'weapon' 
  | 'card'
  | 'boss'
  | 'hazard'
  | 'collectible';

// Örnek: Yeni enemy ekleme
const newEnemy: GameEntity = {
  id: 'crypto_whale',
  name: 'Crypto Whale',
  category: 'enemy',
  icon: '🐋',
  description: 'Büyük ve yavaş, yüksek HP',
  schema: {
    hp: { type: 'number', min: 50, max: 500, default: 200 },
    speed: { type: 'number', min: 0.5, max: 3, default: 0.8 },
    damage: { type: 'number', min: 5, max: 50, default: 25 },
    spawnWeight: { type: 'number', min: 0, max: 100, default: 10 },
    color: { type: 'color', default: '#3B82F6' },
    abilities: { type: 'array', items: 'ability' },
  },
  defaultValues: { hp: 200, speed: 0.8, damage: 25, spawnWeight: 10 }
};
```

### Schema-Driven Forms

```typescript
// Schema tanımı - Dashboard bu şemadan otomatik form üretir
interface EntitySchema {
  [key: string]: FieldSchema;
}

interface FieldSchema {
  type: 'number' | 'string' | 'boolean' | 'color' | 'select' | 'array' | 'icon';
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: unknown;
  options?: { value: string; label: string }[];  // select için
  items?: string;  // array için
  group?: string;  // Field grouping
  condition?: string;  // Conditional visibility
  tooltip?: string;
}

// Otomatik form örneği:
// Dashboard bu şemayı okur ve dinamik olarak form oluşturur
// Yeni bir alan eklemek = sadece şemaya yeni property eklemek
```

### Entity Registry Service

```typescript
// services/admin/EntityRegistry.ts
class EntityRegistry {
  private entities = new Map<string, Map<string, GameEntity>>();
  
  // Yeni entity ekle
  register(entity: GameEntity): void {
    const category = this.entities.get(entity.category) ?? new Map();
    category.set(entity.id, entity);
    this.entities.set(entity.category, category);
  }
  
  // Kategoriye göre listele
  getByCategory(category: EntityCategory): GameEntity[] {
    return Array.from(this.entities.get(category)?.values() ?? []);
  }
  
  // Tüm kategorileri listele
  getCategories(): EntityCategory[] {
    return Array.from(this.entities.keys()) as EntityCategory[];
  }
  
  // Entity'yi ID ile bul
  get(category: EntityCategory, id: string): GameEntity | undefined {
    return this.entities.get(category)?.get(id);
  }
  
  // Entity'yi güncelle
  update(category: EntityCategory, id: string, values: Record<string, unknown>): void {
    // Config'i güncelle ve oyuna sync et
  }
}

export const entityRegistry = new EntityRegistry();
```

### Kategori Yapısı

```
📁 Game Entities
├── 👾 Enemies
│   ├── basic_zombie      (HP: 30, Speed: 1.5, DMG: 10)
│   ├── fast_runner       (HP: 15, Speed: 3.0, DMG: 5)
│   ├── tank_golem        (HP: 100, Speed: 0.8, DMG: 20)
│   ├── crypto_whale      (HP: 200, Speed: 0.5, DMG: 25)  ⭐ NEW
│   └── [+ Add Enemy]
│
├── 🛡️ Power-ups
│   ├── shield            (Duration: 5s, Absorb: 50)
│   ├── speed_boost       (Duration: 3s, Multi: 1.5x)
│   ├── damage_up         (Duration: 10s, Multi: 2x)
│   └── [+ Add Power-up]
│
├── 🃏 Cards
│   ├── attack_speed      (Tier: Common, Effect: +10%)
│   ├── critical_hit      (Tier: Rare, Chance: 5%)
│   └── [+ Add Card]
│
├── 👹 Bosses
│   ├── bitcoin_bull      (HP: 1000, Phases: 3)
│   ├── bear_market       (HP: 800, Phases: 2)
│   └── [+ Add Boss]
│
└── 💎 Collectibles
    ├── gem_small         (XP: 5, Color: green)
    ├── gem_large         (XP: 25, Color: blue)
    └── [+ Add Collectible]
```

---

## 🏗️ Teknik Mimari (Extensible)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ENTITY BROWSER                           │  │
│  │  [Enemies] [Power-ups] [Cards] [Bosses] [+ Add New]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐  ┌────────────────────────────┐  │
│  │   ENTITY LIST       │  │   DYNAMIC FORM             │  │
│  │                     │  │   (Schema-driven)          │  │
│  │   👾 basic_zombie   │  │   ┌─────────────────────┐  │  │
│  │   👾 fast_runner    │  │   │ HP: [====|====] 100 │  │  │
│  │   👾 tank_golem  ◀──┼──│   │ Speed: [==|====] 0.8│  │  │
│  │   🐋 crypto_whale   │  │   │ Damage: [===|==] 20 │  │  │
│  │                     │  │   │ Color: [■] #3B82F6  │  │  │
│  │   [+ Add Enemy]     │  │   │ Icon: [🗿] Select   │  │  │
│  │                     │  │   └─────────────────────┘  │  │
│  └─────────────────────┘  │   [Save] [Delete] [Clone] │  │
│                           └────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LIVE PREVIEW                             │  │
│  │  [👾 tank_golem animasyonu]  Stats: HP 100, SPD 0.8  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE SYSTEMS                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ EntityRegistry│  │ SchemaParser  │  │ ConfigManager  │  │
│  │               │  │               │  │                │  │
│  │ • register()  │  │ • parseSchema │  │ • save()       │  │
│  │ • getAll()    │  │ • validate()  │  │ • load()       │  │
│  │ • update()    │  │ • generateForm│  │ • export()     │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ GameSync      │  │ Templates     │  │ Presets        │  │
│  │               │  │               │  │                │  │
│  │ • Hot reload  │  │ • enemyTpl    │  │ • Easy mode    │  │
│  │ • Real-time   │  │ • powerupTpl  │  │ • Hard mode    │  │
│  │               │  │ • bossTpl     │  │ • Custom       │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆕 Yeni Entity Ekleme Akışı

### 1. Dashboard'dan (Kod yazmadan)
```
1. [+ Add Enemy] butonuna tıkla
2. Template seç (Basic, Fast, Tank, Boss, Custom)
3. Formu doldur (isim, istatistikler, ikon)
4. [Save] - Anında oyunda aktif
```

### 2. Kod ile (Developer)
```typescript
// config/entities/enemies/cryptoWhale.ts
import { defineEnemy } from '@/lib/entityDefinitions';

export default defineEnemy({
  id: 'crypto_whale',
  name: 'Crypto Whale',
  icon: '🐋',
  
  // Temel stats
  stats: {
    hp: 200,
    speed: 0.5,
    damage: 25,
    xpValue: 50,
  },
  
  // Görsel
  visuals: {
    color: '#3B82F6',
    size: 2.0,  // normal enemy'nin 2 katı
    glowEffect: true,
  },
  
  // Davranış
  behavior: {
    type: 'chase',  // 'chase' | 'wander' | 'ambush' | 'ranged'
    aggroRange: 300,
    attackCooldown: 2000,
  },
  
  // Özel yetenekler (opsiyonel)
  abilities: [
    {
      id: 'splash_damage',
      trigger: 'onDeath',
      effect: { type: 'aoe_damage', radius: 100, damage: 30 },
    },
  ],
  
  // Spawn kuralları
  spawn: {
    minDifficulty: 5,
    weight: 10,  // düşük = nadir
    maxOnScreen: 3,
  },
});
```

### 3. Otomatik Yükleme
```typescript
// config/entities/index.ts
// Tüm entity dosyaları otomatik import edilir

const entityModules = import.meta.glob('./enemies/*.ts', { eager: true });
const powerupModules = import.meta.glob('./powerups/*.ts', { eager: true });
const bossModules = import.meta.glob('./bosses/*.ts', { eager: true });

// Registry'ye otomatik kayıt
Object.values(entityModules).forEach(module => {
  entityRegistry.register(module.default);
});
```

---

## 📋 Entity Templates

### Enemy Template
```typescript
const enemyTemplate: EntitySchema = {
  // === TEMEL ===
  hp: { type: 'number', min: 1, max: 1000, default: 30, group: 'stats' },
  speed: { type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.5, group: 'stats' },
  damage: { type: 'number', min: 1, max: 100, default: 10, group: 'stats' },
  xpValue: { type: 'number', min: 1, max: 200, default: 10, group: 'stats' },
  
  // === GÖRSEL ===
  icon: { type: 'icon', category: 'enemies', group: 'visuals' },
  color: { type: 'color', default: '#EF4444', group: 'visuals' },
  size: { type: 'number', min: 0.5, max: 3, step: 0.1, default: 1, group: 'visuals' },
  glowEffect: { type: 'boolean', default: false, group: 'visuals' },
  
  // === DAVRANŞ ===
  behaviorType: { 
    type: 'select', 
    options: [
      { value: 'chase', label: 'Takip Et' },
      { value: 'wander', label: 'Dolaş' },
      { value: 'ambush', label: 'Pusu' },
      { value: 'ranged', label: 'Uzaktan Saldır' },
    ],
    default: 'chase',
    group: 'behavior'
  },
  aggroRange: { type: 'number', min: 50, max: 500, default: 200, group: 'behavior' },
  attackCooldown: { type: 'number', min: 100, max: 5000, default: 1000, group: 'behavior' },
  
  // === SPAWN ===
  minDifficulty: { type: 'number', min: 1, max: 10, default: 1, group: 'spawn' },
  spawnWeight: { type: 'number', min: 1, max: 100, default: 50, group: 'spawn' },
  maxOnScreen: { type: 'number', min: 1, max: 50, default: 10, group: 'spawn' },
  
  // === ABILITIES (Advanced) ===
  abilities: { 
    type: 'array', 
    items: 'ability',
    group: 'advanced',
    tooltip: 'Özel yetenekler ekle (opsiyonel)'
  },
};
```

### Power-up Template
```typescript
const powerupTemplate: EntitySchema = {
  duration: { type: 'number', min: 1000, max: 30000, step: 500, default: 5000, group: 'stats' },
  effectType: {
    type: 'select',
    options: [
      { value: 'shield', label: 'Kalkan' },
      { value: 'speed', label: 'Hız' },
      { value: 'damage', label: 'Hasar' },
      { value: 'magnet', label: 'Mıknatıs' },
      { value: 'freeze', label: 'Dondur' },
    ],
    group: 'stats'
  },
  multiplier: { type: 'number', min: 1, max: 5, step: 0.1, default: 1.5, group: 'stats' },
  dropRate: { type: 'number', min: 0.01, max: 0.3, step: 0.01, default: 0.05, group: 'spawn' },
  icon: { type: 'icon', category: 'powerups', group: 'visuals' },
  color: { type: 'color', default: '#10B981', group: 'visuals' },
  particleEffect: { type: 'boolean', default: true, group: 'visuals' },
};
```
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ Railway       │  │ Supabase      │  │ LocalStorage   │  │
│  │ Market Server │  │ price_logs    │  │ Game Config    │  │
│  │               │  │               │  │                │  │
│  │ Live prices   │  │ Historical    │  │ User prefs     │  │
│  │ WebSocket     │  │ data          │  │                │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Dosya Yapısı

```
components/
├── admin/
│   ├── AdminDashboard.tsx       # Ana dashboard container
│   ├── panels/
│   │   ├── PriceAnalysisPanel.tsx
│   │   ├── DifficultyPanel.tsx
│   │   ├── SpawnRatePanel.tsx
│   │   ├── ItemsPanel.tsx
│   │   ├── IconsPanel.tsx
│   │   └── AnalyticsPanel.tsx
│   ├── charts/
│   │   ├── MiniPriceChart.tsx
│   │   ├── VolatilityGauge.tsx
│   │   └── DistributionChart.tsx
│   └── controls/
│       ├── SliderControl.tsx
│       ├── ToggleControl.tsx
│       ├── IconPicker.tsx
│       └── CurvePicker.tsx

services/
├── admin/
│   ├── PriceAnalyzer.ts         # 5m/10m değişim hesaplama
│   ├── ConfigManager.ts         # Config save/load
│   └── PriceLogService.ts       # Supabase price_logs query

types/
└── admin.ts                     # Dashboard type definitions

config/
└── GameParameterConfig.ts       # Default game parameters
```

---

## 🔢 Veri Modelleri

### PriceAnalysis
```typescript
interface PriceAnalysis {
  pair: 'BTC' | 'ETH' | 'SOL';
  currentPrice: number;
  
  // Zaman bazlı değişimler
  change5m: number;      // % değişim
  change10m: number;
  change30m: number;
  change1h: number;
  
  // Volatilite
  volatility: number;    // 0-1 arası skor
  atr: number;           // Average True Range
  
  // Trend
  trend: 'bullish' | 'bearish' | 'sideways';
  trendStrength: number; // 0-1
  
  // Meta
  timestamp: number;
  source: 'binance' | 'coinbase';
}
```

### GameConfig
```typescript
interface GameConfig {
  // Zorluk
  difficulty: {
    base: number;              // 1-10
    volatilityMultiplier: number; // 0.5-2.0
    timeMultiplier: number;    // dakika başına artış
    maxDifficulty: number;     // cap
    curve: 'linear' | 'exponential' | 'logarithmic';
  };
  
  // Spawn
  spawn: {
    baseInterval: number;      // ms
    minInterval: number;       // ms
    maxEnemies: number;
    waveIntensity: number;     // 0-1
    bossSpawnTime: number;     // ms
    enemyDistribution: {
      normal: number;          // %
      fast: number;
      tank: number;
      ranged: number;
    };
  };
  
  // Items
  items: {
    gemDropRate: number;       // 0-1
    healthDropRate: number;
    powerUpDropRate: number;
    gemValues: {
      small: number;
      medium: number;
      large: number;
    };
    powerUpDurations: {
      shield: number;          // ms
      speedBoost: number;
      damage: number;
    };
  };
  
  // Görsel
  visuals: {
    theme: 'btc' | 'eth' | 'sol' | 'custom';
    enemyIcons: string[];
    powerUpIcons: Record<string, string>;
    particleDensity: number;   // 0-1
  };
}
```

---

## 🗓️ Implementation Phases

### Phase 1: Temel Dashboard (8 saat)
- [ ] AdminDashboard.tsx skeleton
- [ ] PriceAnalysisPanel - canlı fiyat gösterimi
- [ ] 5m/10m değişim hesaplama (PriceAnalyzer.ts)
- [ ] Mini price chart
- [ ] Basit routing (/admin)

### Phase 2: Zorluk Yönetimi (6 saat)
- [ ] DifficultyPanel UI
- [ ] Slider kontrolleri
- [ ] Curve picker (linear/exp/log)
- [ ] Real-time preview
- [ ] Config save/load

### Phase 3: Spawn Yönetimi (6 saat)
- [ ] SpawnRatePanel UI
- [ ] Enemy distribution pie chart
- [ ] Wave intensity controls
- [ ] Boss timing slider
- [ ] Live game sync

### Phase 4: Items & Icons (4 saat)
- [ ] ItemsPanel - drop rates, durations
- [ ] IconsPanel - icon picker grid
- [ ] Theme color picker
- [ ] Particle density control

### Phase 5: Analytics (6 saat)
- [ ] AnalyticsPanel UI
- [ ] Supabase price_logs query
- [ ] Histogram chart
- [ ] Time-range selector
- [ ] Export functionality

### Phase 6: Polish & Integration (4 saat)
- [ ] Responsive design
- [ ] Save/Reset/Export buttons
- [ ] Auth protection (admin only)
- [ ] Keyboard shortcuts
- [ ] Documentation

---

## 📊 Supabase Queries

### Son 5 dakika fiyat değişimi
```sql
SELECT 
  pair,
  (SELECT price FROM price_logs 
   WHERE pair = p.pair 
   ORDER BY timestamp DESC LIMIT 1) as current_price,
  (SELECT price FROM price_logs 
   WHERE pair = p.pair 
   AND timestamp <= NOW() - INTERVAL '5 minutes'
   ORDER BY timestamp DESC LIMIT 1) as price_5m_ago,
  ROUND(
    ((current_price - price_5m_ago) / price_5m_ago * 100)::numeric, 
    2
  ) as change_5m_percent
FROM (SELECT DISTINCT pair FROM price_logs) p;
```

### Volatilite hesaplama (ATR)
```sql
SELECT 
  pair,
  AVG(high - low) as atr,
  STDDEV(price) as price_stddev
FROM price_logs
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY pair;
```

### Saat bazlı dağılım
```sql
SELECT 
  date_trunc('hour', timestamp) as hour,
  pair,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as data_points
FROM price_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY hour, pair
ORDER BY hour;
```

---

## 🎨 UI/UX Notları

### Tema
- **Dark mode** default (oyunla uyumlu)
- **Neon accent colors** (crypto theme)
- **Glassmorphism** panels
- **Smooth animations** (framer-motion)

### Layout
- **Grid system** - 6 panel, responsive
- **Collapsible panels** - alan tasarrufu
- **Sticky header** - Save/Reset butonları
- **Toast notifications** - Config değişiklikleri

### Erişim
- Admin route: `/admin` veya `/dashboard`
- Şifre korumalı (basit) veya sadece dev mode'da görünür
- Production'da gizli

---

## ⏱️ Tahmini Zaman

| Phase | Süre | Kümülatif |
|-------|------|-----------|
| Phase 1: Temel Dashboard | 8 saat | 8 saat |
| Phase 2: Zorluk Yönetimi | 6 saat | 14 saat |
| Phase 3: Spawn Yönetimi | 6 saat | 20 saat |
| Phase 4: Items & Icons | 4 saat | 24 saat |
| Phase 5: Analytics | 6 saat | 30 saat |
| Phase 6: Polish | 4 saat | **34 saat** |

---

## 🚀 MVP vs Full Version

### MVP (İlk versiyon - 12 saat)
- ✅ Canlı fiyat + 5m/10m değişim
- ✅ Zorluk sliderları
- ✅ Spawn rate kontrolü
- ✅ Config save/load

### Full Version (+22 saat)
- ✅ MVP özellikleri
- ✅ Analytics panel
- ✅ Icon picker
- ✅ Charts & visualizations
- ✅ Export/Import
- ✅ Real-time game sync

---

## 📝 Notlar

1. **Öncelik:** MVP ilk, sonra özellik ekleme
2. **Test:** Dashboard için unit test yazılmalı
3. **Güvenlik:** Admin paneli production'da korunmalı
4. **Performance:** Supabase sorguları optimize edilmeli
5. **UX:** Değişiklikler anında oyuna yansımalı

---

## 🔗 Bağımlılıklar

- `recharts` veya `chart.js` - Grafikler için
- `framer-motion` - Animasyonlar (zaten var)
- `@supabase/supabase-js` - DB queries (zaten var)
- `zustand` - State management (zaten var)

---

## 🚀 EKSTRA ÖZELLİKLER (Advanced Features)

### 1. 🎯 Fiyat Bazlı Event Trigger System

Fiyat hareketlerine göre otomatik oyun olayları tetikle:

```typescript
interface PriceEventTrigger {
  id: string;
  name: string;
  enabled: boolean;
  
  // Tetikleme koşulu
  condition: {
    type: 'price_change' | 'volatility_spike' | 'trend_reversal' | 'threshold';
    direction?: 'up' | 'down' | 'both';
    threshold: number;      // % değişim veya mutlak değer
    timeWindow: number;     // ms (örn: 5 dakika = 300000)
    cooldown: number;       // Tekrar tetiklenmeden önce bekleme (ms)
  };
  
  // Tetiklenince yapılacak aksiyon
  action: {
    type: 'spawn_boss' | 'gold_rush' | 'difficulty_spike' | 'power_up_rain' 
        | 'enemy_swarm' | 'slow_motion' | 'screen_shake' | 'bonus_xp';
    duration: number;       // ms
    intensity: number;      // 0-1
    message?: string;       // Ekranda gösterilecek mesaj
  };
}
```

**Örnek Eventler:**

| Trigger | Koşul | Aksiyon |
|---------|-------|---------|
| 🐻 Bear Raid | BTC -%5 (10dk) | Bear Boss spawn |
| 🐂 Bull Run | BTC +%5 (10dk) | Gold Rush (2x gems) |
| 🌪️ Volatility Storm | ATR > 2% | Enemy spawn ×2 |
| 💎 Diamond Hands | BTC stabil (30dk) | Bonus XP ×1.5 |
| 🚀 Moon Mission | BTC +%10 (1h) | Rainbow gems yağmuru |

**Dashboard UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 EVENT TRIGGERS                              [+ Add New] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🐻 Bear Raid                              [ON] [Edit]│   │
│  │ Trigger: BTC drops 5% in 10 minutes                 │   │
│  │ Action: Spawn Bear Market Boss                      │   │
│  │ Last triggered: 2 hours ago                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🐂 Bull Run                              [ON] [Edit] │   │
│  │ Trigger: BTC rises 5% in 10 minutes                 │   │
│  │ Action: Gold Rush (2x gems for 60s)                 │   │
│  │ Last triggered: Never                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. ⏱️ Zamanlı Event Calendar

```typescript
interface ScheduledEvent {
  id: string;
  name: string;
  type: 'recurring' | 'one_time' | 'date_range';
  
  // Zamanlama
  schedule: {
    // Recurring
    daysOfWeek?: number[];  // 0=Pazar, 6=Cumartesi
    startTime?: string;     // "14:00"
    endTime?: string;       // "16:00"
    
    // Date range
    startDate?: string;     // "2024-12-25"
    endDate?: string;       // "2024-12-27"
    
    // Timezone
    timezone: string;       // "Europe/Istanbul"
  };
  
  // Uygulanacak config değişiklikleri
  configOverrides: Partial<GameConfig>;
  
  // Görsel tema
  theme?: {
    name: string;
    colors: string[];
    specialEffects: boolean;
  };
}
```

**Event Calendar UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  📅 EVENT CALENDAR                         December 2024    │
├─────────────────────────────────────────────────────────────┤
│  Mo  Tu  We  Th  Fr  Sa  Su                                │
│  23  24  25🎄 26  27  28  29                               │
│  30  31🎆                                                   │
├─────────────────────────────────────────────────────────────┤
│  UPCOMING EVENTS:                                           │
│                                                             │
│  🎄 Dec 25-27: Christmas Event                             │
│     • Snow particles                                       │
│     • Holiday themed enemies                               │
│     • 2x XP boost                                          │
│                                                             │
│  🎆 Dec 31: New Year Event                                 │
│     • Firework effects                                     │
│     • Midnight boss rush                                   │
│     • Special drops                                        │
│                                                             │
│  🔄 Every Weekend: Double XP                               │
│     • Saturday 00:00 - Sunday 23:59                        │
│                                                             │
│  [+ Schedule New Event]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. 📊 Balance Calculator

Enemy ve oyuncu dengesini hesapla:

```typescript
interface BalanceCalculation {
  entity: GameEntity;
  
  // Hesaplanan metrikler
  metrics: {
    timeToKill: number;       // Oyuncunun bu enemy'yi öldürme süresi (s)
    dpsRequired: number;      // Gereken DPS
    threatLevel: 'low' | 'medium' | 'high' | 'extreme';
    xpEfficiency: number;     // XP/saniye oranı
    difficultyTier: number;   // Önerilen zorluk seviyesi
    balanceScore: number;     // 0-100 denge skoru
  };
  
  // Karşılaştırma
  comparison?: {
    vsEntity: GameEntity;
    relativeDifficulty: number;
  };
  
  // Öneriler
  suggestions: string[];
}
```

**Balance Calculator UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚖️ BALANCE CALCULATOR                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Entity: [tank_golem ▼]                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👾 tank_golem                                       │   │
│  │                                                     │   │
│  │ Stats: HP 100 | DMG 20 | Speed 0.8                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📈 CALCULATED METRICS                               │   │
│  │                                                     │   │
│  │ • Time to Kill:      8.5 seconds                   │   │
│  │ • DPS Required:      11.76                         │   │
│  │ • Threat Level:      ⚠️ MEDIUM                      │   │
│  │ • XP Efficiency:     1.2 (Good)                    │   │
│  │ • Suggested Diff:    4+                            │   │
│  │                                                     │   │
│  │ ⚖️ BALANCE SCORE: 78/100                            │   │
│  │ [████████████████░░░░] Well Balanced               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 SUGGESTIONS:                                            │
│  • Consider reducing HP to 80 for better flow              │
│  • XP value could be increased to 15 for balance           │
│                                                             │
│  [Compare with...]  [Auto-balance]  [Apply suggestions]    │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. 💾 Preset & Sharing System

```typescript
interface GamePreset {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  createdAt: number;
  
  // Tüm config
  config: GameConfig;
  entities: GameEntity[];
  eventTriggers: PriceEventTrigger[];
  
  // Meta
  tags: string[];           // ['hard', 'balanced', 'chaos']
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  
  // Community (opsiyonel)
  likes?: number;
  downloads?: number;
  rating?: number;
}
```

**Preset Manager UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  💾 PRESET MANAGER                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CURRENT: Default Balance v1.0                              │
│  [Save Current] [Save As New] [Reset to Default]           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SAVED PRESETS:                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎮 Vampire Survivors Classic              [Load]    │   │
│  │ Original balanced gameplay    ⭐⭐⭐⭐⭐ (4.8)        │   │
│  │ Tags: #balanced #classic                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 😈 Nightmare Mode                         [Load]    │   │
│  │ Extreme difficulty, fast spawns  ⭐⭐⭐⭐ (4.2)      │   │
│  │ Tags: #hard #chaos #expert                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🌈 Chill Mode                             [Load]    │   │
│  │ Relaxed gameplay, easy mode  ⭐⭐⭐⭐⭐ (4.9)         │   │
│  │ Tags: #easy #relaxing #casual                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Import from JSON]  [Export Current]  [Browse Community]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. 🧪 A/B Testing System

```typescript
interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  
  // Varyantlar
  variants: {
    control: Partial<GameConfig>;
    variant: Partial<GameConfig>;
  };
  
  // Trafik dağılımı
  distribution: {
    control: number;  // % (örn: 50)
    variant: number;  // % (örn: 50)
  };
  
  // Metrikler
  metrics: {
    primary: 'survival_time' | 'session_length' | 'retry_rate' | 'engagement';
    secondary?: string[];
  };
  
  // Sonuçlar
  results?: {
    control: MetricResults;
    variant: MetricResults;
    winner?: 'control' | 'variant' | 'no_difference';
    confidence: number;
  };
}
```

**A/B Testing UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  🧪 A/B TESTING                                 [+ New Test]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACTIVE TEST: Enemy Balance v2                    [RUNNING] │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │ CONTROL (50%)       │   │ VARIANT (50%)       │         │
│  │ Current balance     │   │ New balance         │         │
│  │ • Zombie HP: 30     │   │ • Zombie HP: 25     │         │
│  │ • Tank HP: 100      │   │ • Tank HP: 80       │         │
│  │ • Spawn rate: 2s    │   │ • Spawn rate: 1.8s  │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  📊 RESULTS (1,247 sessions)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Metric          │ Control │ Variant │ Winner       │   │
│  │─────────────────│─────────│─────────│──────────────│   │
│  │ Avg Survival    │ 4.2 min │ 5.1 min │ 🏆 Variant   │   │
│  │ Session Length  │ 6.5 min │ 7.2 min │ 🏆 Variant   │   │
│  │ Retry Rate      │ 45%     │ 52%     │ 🏆 Variant   │   │
│  │ Rage Quit Rate  │ 22%     │ 15%     │ 🏆 Variant   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Statistical Confidence: 94.2%                              │
│                                                             │
│  [Promote Variant] [Stop Test] [Extend] [View Details]     │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. 📜 History & Rollback

```typescript
interface ConfigHistory {
  id: string;
  timestamp: number;
  author: string;
  
  // Değişiklik
  change: {
    type: 'create' | 'update' | 'delete';
    category: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    description: string;
  };
  
  // Snapshot
  fullSnapshot?: GameConfig;
}
```

**History Panel UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  📜 CONFIG HISTORY                      [Create Snapshot]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 Filter: [All Changes ▼]  Search: [____________]        │
│                                                             │
│  📅 TODAY                                                   │
│  ├─ 21:45 Changed zombie HP (30 → 25)           [Rollback] │
│  ├─ 21:30 Added event trigger: Bear Raid        [Rollback] │
│  ├─ 20:15 Added new enemy: crypto_whale         [Rollback] │
│  └─ 19:00 Difficulty multiplier (1.0 → 1.2)     [Rollback] │
│                                                             │
│  📅 YESTERDAY                                               │
│  ├─ 18:30 Spawn rate adjustment                 [Rollback] │
│  ├─ 15:00 🔖 SNAPSHOT: Pre-holiday config        [Restore] │
│  └─ 14:00 Multiple changes (5 items)            [Rollback] │
│                                                             │
│  📅 LAST WEEK                                               │
│  └─ Dec 18 🔖 SNAPSHOT: Stable v1.0              [Restore] │
│                                                             │
│  [Compare Versions]  [Export History]  [Clear Old]         │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. 🔗 Dependency Visualization

**Dependency Graph UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 DEPENDENCY GRAPH                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Showing dependencies for: [Base Difficulty ▼]              │
│                                                             │
│                    ┌──────────────┐                        │
│                    │  DIFFICULTY  │                        │
│                    │  Base: 5     │                        │
│                    └──────┬───────┘                        │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │ Spawn Rate │   │ Enemy HP   │   │ Drop Rates │         │
│  │   ×1.5     │   │   ×1.2     │   │   ×0.8     │         │
│  └────────────┘   └──────┬─────┘   └────────────┘         │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    ▼           ▼                           │
│             ┌──────────┐ ┌──────────┐                      │
│             │ Zombie   │ │ Tank     │                      │
│             │ HP: 36   │ │ HP: 120  │                      │
│             └──────────┘ └──────────┘                      │
│                                                             │
│  ⚠️ Changing "Base Difficulty" will affect 12 settings      │
│                                                             │
│  Affected: Spawn Rate, Enemy HP (×4), Drop Rates,           │
│           Boss Timer, Wave Intensity, XP Values...          │
│                                                             │
│  [Show All] [Simulate Change] [Apply with Preview]         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 UPDATED IMPLEMENTATION PHASES

| Phase | İçerik | Süre | Kümülatif |
|-------|--------|------|-----------|
| **Phase 1** | Temel Dashboard + Fiyat Paneli | 8 saat | 8 saat |
| **Phase 2** | Zorluk Yönetimi | 6 saat | 14 saat |
| **Phase 3** | Spawn Yönetimi | 6 saat | 20 saat |
| **Phase 4** | Items & Icons | 4 saat | 24 saat |
| **Phase 5** | Entity Browser (Extensible) | 6 saat | 30 saat |
| **Phase 6** | Analytics | 6 saat | 36 saat |
| **Phase 7** | Price Event Triggers ⭐ | 6 saat | 42 saat |
| **Phase 8** | Balance Calculator ⭐ | 4 saat | 46 saat |
| **Phase 9** | Preset System | 4 saat | 50 saat |
| **Phase 10** | History & Rollback | 4 saat | 54 saat |
| **Phase 11** | Scheduled Events | 6 saat | 60 saat |
| **Phase 12** | A/B Testing | 8 saat | 68 saat |
| **Phase 13** | Dependency Graph | 6 saat | 74 saat |
| **Phase 14** | Polish & Testing | 6 saat | **80 saat** |

---

## 🎯 ÖNCELIK SIRASI

| Özellik | Değer | Zorluk | Öncelik |
|---------|-------|--------|---------|
| 📈 Price Event Triggers | 🔥🔥🔥 | Orta | **P0 - Must Have** |
| ⚖️ Balance Calculator | 🔥🔥🔥 | Kolay | **P0 - Must Have** |
| 💾 Preset System | 🔥🔥 | Kolay | **P1 - Should Have** |
| 📜 History/Rollback | 🔥🔥 | Orta | **P1 - Should Have** |
| 📅 Scheduled Events | 🔥🔥 | Orta | **P2 - Nice to Have** |
| 🧪 A/B Testing | 🔥 | Zor | **P3 - Future** |
| 🔗 Dependency Graph | 🔥 | Zor | **P3 - Future** |

---

## 🏁 MVP RECAP

**MVP (20 saat):**
- ✅ Fiyat analizi + 5m/10m değişim
- ✅ Zorluk sliderları
- ✅ Spawn rate kontrolü
- ✅ Entity browser (basic)
- ✅ Config save/load

**MVP+ (40 saat):**
- ✅ MVP özellikleri
- ✅ Price Event Triggers
- ✅ Balance Calculator
- ✅ Preset System
- ✅ History/Rollback

**Full Version (80 saat):**
- ✅ MVP+ özellikleri
- ✅ Scheduled Events
- ✅ A/B Testing
- ✅ Dependency Graph
- ✅ Analytics Dashboard
- ✅ Community Presets

