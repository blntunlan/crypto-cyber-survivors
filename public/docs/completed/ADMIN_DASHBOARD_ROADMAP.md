# 🎮 Game Admin Dashboard - Roadmap

## 📋 Project Summary

An admin dashboard that analyzes price data and manages game parameters (difficulty, spawn rate, item durations, icons).

---

## 🎯 Key Features

### 1. 📈 Price Analysis Panel
- **Live price display** (BTC, ETH, SOL)
- **5-minute change rate** (% change)
- **10-minute change rate** (% change)
- **Volatility score** (ATR based)
- **Trend direction** (bullish/bearish/sideways)
- **Chart visualization** (mini chart)

### 2. ⚡ Difficulty Management Panel
- **Base difficulty** setting (1-10)
- **Volatility multiplier** (based on price change)
- **Time-based difficulty increase** (per minute)
- **Max difficulty cap**
- **Difficulty curve** (linear/exponential/logarithmic)

### 3. 👾 Spawn Rate Management
- **Enemy spawn interval** (ms)
- **Max enemies on screen**
- **Wave intensity** (calm/building/intense/peak)
- **Boss spawn timing**
- **Enemy type distribution** (%)

### 4. 💎 Item & Power-up Management
- **Drop rates** (gem, health, power-ups)
- **Power-up durations** (shield, speed boost, etc.)
- **Gem values** (XP multipliers)
- **Rarity distribution**

### 5. 🎨 Icon & Visual Management
- **Enemy icons** selection
- **Power-up icons**
- **Theme colors** (crypto pair based)
- **Particle effects** (density)

### 6. 📊 Analytics Panel
- **Statistics from price_logs** table
- **Last 1 hour / 24 hours summary**
- **Price distribution histogram**
- **Player performance correlation**

---

## 🔌 EXTENSIBLE ARCHITECTURE (Plugin System)

### Core Principles

1. **Registry Pattern** - All game items in a central registry
2. **Schema-Driven** - Dynamic form generation via JSON schemas
3. **Hot-Reload** - New items can be added without code changes
4. **Type-Safe** - Type safety with TypeScript

### Entity Registry

```typescript
// Every game item implements this interface
interface GameEntity {
  id: string;
  name: string;
  category: EntityCategory;
  icon: string;
  description: string;
  schema: EntitySchema;     // For dynamic form
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

// Example: Adding a new enemy
const newEnemy: GameEntity = {
  id: 'crypto_whale',
  name: 'Crypto Whale',
  category: 'enemy',
  icon: '🐋',
  description: 'Large and slow, high HP',
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
// Schema definition - Dashboard automatically generates forms from this schema
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
  options?: { value: string; label: string }[];  // for select
  items?: string;  // for array
  group?: string;  // Field grouping
  condition?: string;  // Conditional visibility
  tooltip?: string;
}

// Automatic form example:
// Dashboard reads this schema and dynamically creates the form
// Adding a new field = just adding a new property to the schema
```

### Entity Registry Service

```typescript
// services/admin/EntityRegistry.ts
class EntityRegistry {
  private entities = new Map<string, Map<string, GameEntity>>();
  
  // Add new entity
  register(entity: GameEntity): void {
    const category = this.entities.get(entity.category) ?? new Map();
    category.set(entity.id, entity);
    this.entities.set(entity.category, category);
  }
  
  // List by category
  getByCategory(category: EntityCategory): GameEntity[] {
    return Array.from(this.entities.get(category)?.values() ?? []);
  }
  
  // List all categories
  getCategories(): EntityCategory[] {
    return Array.from(this.entities.keys()) as EntityCategory[];
  }
  
  // Find Entity by ID
  get(category: EntityCategory, id: string): GameEntity | undefined {
    return this.entities.get(category)?.get(id);
  }
  
  // Update Entity
  update(category: EntityCategory, id: string, values: Record<string, unknown>): void {
    // Update config and sync with game
  }
}

export const entityRegistry = new EntityRegistry();
```

### Category Structure

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

## 🏗️ Technical Architecture (Extensible)

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
│  │  [Delete] [Edit]    │  │   [Save] [Delete] [Clone] │  │
│  └─────────────────────┘  └────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LIVE PREVIEW                             │  │
│  │  [👾 tank_golem animation]  Stats: HP 100, SPD 0.8   │  │
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

## 🆕 New Entity Addition Flow

### 1. From Dashboard (No Coding)
```
1. Click [+ Add Enemy]
2. Select Template (Basic, Fast, Tank, Boss, Custom)
3. Fill the form (name, stats, icon)
4. [Save] - Instantly active in game
```

### 2. Via Code (Developer)
```typescript
// config/entities/enemies/cryptoWhale.ts
import { defineEnemy } from '@/lib/entityDefinitions';

export default defineEnemy({
  id: 'crypto_whale',
  name: 'Crypto Whale',
  icon: '🐋',
  
  // Basic stats
  stats: {
    hp: 200,
    speed: 0.5,
    damage: 25,
    xpValue: 50,
  },
  
  // Visuals
  visuals: {
    color: '#3B82F6',
    size: 2.0,  // 2x normal enemy size
    glowEffect: true,
  },
  
  // Behavior
  behavior: {
    type: 'chase',  // 'chase' | 'wander' | 'ambush' | 'ranged'
    aggroRange: 300,
    attackCooldown: 2000,
  },
  
  // Special abilities (optional)
  abilities: [
    {
      id: 'splash_damage',
      trigger: 'onDeath',
      effect: { type: 'aoe_damage', radius: 100, damage: 30 },
    },
  ],
  
  // Spawn rules
  spawn: {
    minDifficulty: 5,
    weight: 10,  // low = rare
    maxOnScreen: 3,
  },
});
```

### 3. Automatic Loading
```typescript
// config/entities/index.ts
// All entity files are automatically imported

const entityModules = import.meta.glob('./enemies/*.ts', { eager: true });
const powerupModules = import.meta.glob('./powerups/*.ts', { eager: true });
const bossModules = import.meta.glob('./bosses/*.ts', { eager: true });

// Auto-register to registry
Object.values(entityModules).forEach(module => {
  entityRegistry.register(module.default);
});
```

---

## 📋 Entity Templates

### Enemy Template
```typescript
const enemyTemplate: EntitySchema = {
  // === BASIC ===
  hp: { type: 'number', min: 1, max: 1000, default: 30, group: 'stats' },
  speed: { type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.5, group: 'stats' },
  damage: { type: 'number', min: 1, max: 100, default: 10, group: 'stats' },
  xpValue: { type: 'number', min: 1, max: 200, default: 10, group: 'stats' },
  
  // === VISUALS ===
  icon: { type: 'icon', category: 'enemies', group: 'visuals' },
  color: { type: 'color', default: '#EF4444', group: 'visuals' },
  size: { type: 'number', min: 0.5, max: 3, step: 0.1, default: 1, group: 'visuals' },
  glowEffect: { type: 'boolean', default: false, group: 'visuals' },
  
  // === BEHAVIOR ===
  behaviorType: { 
    type: 'select', 
    options: [
      { value: 'chase', label: 'Chase' },
      { value: 'wander', label: 'Wander' },
      { value: 'ambush', label: 'Ambush' },
      { value: 'ranged', label: 'Ranged Attack' },
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
    tooltip: 'Add special abilities (optional)'
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
      { value: 'shield', label: 'Shield' },
      { value: 'speed', label: 'Speed' },
      { value: 'damage', label: 'Damage' },
      { value: 'magnet', label: 'Magnet' },
      { value: 'freeze', label: 'Freeze' },
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

---

## 🏗️ Architecture Layers

```
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

## 📁 File Structure

```
components/
├── admin/
│   ├── AdminDashboard.tsx       # Main dashboard container
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
│   ├── PriceAnalyzer.ts         # 5m/10m change calculation
│   ├── ConfigManager.ts         # Config save/load
│   └── PriceLogService.ts       # Supabase price_logs query

types/
└── admin.ts                     # Dashboard type definitions

config/
└── GameParameterConfig.ts       # Default game parameters
```

---

## 🔢 Data Models

### PriceAnalysis
```typescript
interface PriceAnalysis {
  pair: 'BTC' | 'ETH' | 'SOL';
  currentPrice: number;
  
  // Time-based changes
  change5m: number;      // % change
  change10m: number;
  change30m: number;
  change1h: number;
  
  // Volatility
  volatility: number;    // Score 0-1
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
  // Difficulty
  difficulty: {
    base: number;              // 1-10
    volatilityMultiplier: number; // 0.5-2.0
    timeMultiplier: number;    // Increase per minute
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
  
  // Visuals
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

### Phase 1: Basic Dashboard (8 hours)
- [ ] AdminDashboard.tsx skeleton
- [ ] PriceAnalysisPanel - live price display
- [ ] 5m/10m change calculation (PriceAnalyzer.ts)
- [ ] Mini price chart
- [ ] Simple routing (/admin)

### Phase 2: Difficulty Management (6 hours)
- [ ] DifficultyPanel UI
- [ ] Slider controls
- [ ] Curve picker (linear/exp/log)
- [ ] Real-time preview
- [ ] Config save/load

### Phase 3: Spawn Management (6 hours)
- [ ] SpawnRatePanel UI
- [ ] Enemy distribution pie chart
- [ ] Wave intensity controls
- [ ] Boss timing slider
- [ ] Live game sync

### Phase 4: Items & Icons (4 hours)
- [ ] ItemsPanel - drop rates, durations
- [ ] IconsPanel - icon picker grid
- [ ] Theme color picker
- [ ] Particle density control

### Phase 5: Analytics (6 hours)
- [ ] AnalyticsPanel UI
- [ ] Supabase price_logs query
- [ ] Histogram chart
- [ ] Time-range selector
- [ ] Export functionality

### Phase 6: Polish & Integration (4 hours)
- [ ] Responsive design
- [ ] Save/Reset/Export buttons
- [ ] Auth protection (admin only)
- [ ] Keyboard shortcuts
- [ ] Documentation

---

## 📊 Supabase Queries

### Last 5 minute price change
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

### Volatility calculation (ATR)
```sql
SELECT 
  pair,
  AVG(high - low) as atr,
  STDDEV(price) as price_stddev
FROM price_logs
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY pair;
```

### Hourly distribution
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

## 🎨 UI/UX Notes

### Theme
- **Dark mode** default (matches game)
- **Neon accent colors** (crypto theme)
- **Glassmorphism** panels
- **Smooth animations** (framer-motion)

### Layout
- **Grid system** - 6 panel, responsive
- **Collapsible panels** - save space
- **Sticky header** - Save/Reset buttons
- **Toast notifications** - Config changes

### Access
- Admin route: `/admin` or `/dashboard`
- Password protected (simple) or only visible in dev mode
- Hidden in Production

---

## ⏱️ Estimated Time

| Phase | Duration | Cumulative |
|-------|------|-----------|
| Phase 1: Basic Dashboard | 8 hours | 8 hours |
| Phase 2: Difficulty Management | 6 hours | 14 hours |
| Phase 3: Spawn Management | 6 hours | 20 hours |
| Phase 4: Items & Icons | 4 hours | 24 hours |
| Phase 5: Analytics | 6 hours | 30 hours |
| Phase 6: Polish | 4 hours | **34 hours** |

---

## 🚀 MVP vs Full Version

### MVP (First version - 12 hours)
- ✅ Live price + 5m/10m change
- ✅ Difficulty sliders
- ✅ Spawn rate control
- ✅ Config save/load

### Full Version (+22 hours)
- ✅ MVP features
- ✅ Analytics panel
- ✅ Icon picker
- ✅ Charts & visualizations
- ✅ Export/Import
- ✅ Real-time game sync

---

## 📝 Notes

1. **Priority:** MVP first, then add features
2. **Test:** Unit tests should be written for Dashboard
3. **Security:** Admin panel must be protected in production
4. **Performance:** Supabase queries must be optimized
5. **UX:** Changes should be reflected in game instantly

---

## 🔗 Dependencies

- `recharts` or `chart.js` - For charts
- `framer-motion` - Animations (already present)
- `@supabase/supabase-js` - DB queries (already present)
- `zustand` - State management (already present)

---

## 🚀 EXTRA FEATURES (Advanced Features)

### 1. 🎯 Price Based Event Trigger System

Trigger automatic game events based on price movements:

```typescript
interface PriceEventTrigger {
  id: string;
  name: string;
  enabled: boolean;
  
  // Trigger condition
  condition: {
    type: 'price_change' | 'volatility_spike' | 'trend_reversal' | 'threshold';
    direction?: 'up' | 'down' | 'both';
    threshold: number;      // % change or absolute value
    timeWindow: number;     // ms (e.g., 5 minutes = 300000)
    cooldown: number;       // Wait before triggering again (ms)
  };
  
  // Action to perform when triggered
  action: {
    type: 'spawn_boss' | 'gold_rush' | 'difficulty_spike' | 'power_up_rain' 
        | 'enemy_swarm' | 'slow_motion' | 'screen_shake' | 'bonus_xp';
    duration: number;       // ms
    intensity: number;      // 0-1
    message?: string;       // Message to show on screen
  };
}
```

**Example Events:**

| Trigger | Condition | Action |
|---------|-------|---------|
| 🐻 Bear Raid | BTC -%5 (10min) | Bear Boss spawn |
| 🐂 Bull Run | BTC +%5 (10min) | Gold Rush (2x gems) |
| 🌪️ Volatility Storm | ATR > 2% | Enemy spawn ×2 |
| 💎 Diamond Hands | BTC stable (30min) | Bonus XP ×1.5 |
| 🚀 Moon Mission | BTC +%10 (1h) | Rainbow gems rain |

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

### 2. ⏱️ Scheduled Event Calendar

```typescript
interface ScheduledEvent {
  id: string;
  name: string;
  type: 'recurring' | 'one_time' | 'date_range';
  
  // Scheduling
  schedule: {
    // Recurring
    daysOfWeek?: number[];  // 0=Sunday, 6=Saturday
    startTime?: string;     // "14:00"
    endTime?: string;       // "16:00"
    
    // Date range
    startDate?: string;     // "2024-12-25"
    endDate?: string;       // "2024-12-27"
    
    // Timezone
    timezone: string;       // "Europe/Istanbul"
  };
}
```

// END OF PROTOCOL
