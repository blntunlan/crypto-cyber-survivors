# 🏛️ Crypto Cyber Survivors - Mimari Doküman

**Tarih**: 2026-01-18  
**Versiyon**: 0.1.0 (Beta)

---

## 📊 Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              React 19 + TypeScript                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │    │
│  │  │   App.tsx    │  │  GameEngine  │  │   GameUI     │  │   Screens    │    │    │
│  │  │  (677 lines) │  │  (Canvas)    │  │  (React HUD) │  │  (Menu etc)  │    │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘    │    │
│  │         │                 │                 │                               │    │
│  │         └────────────────┬┴─────────────────┘                               │    │
│  │                          │                                                   │    │
│  │  ┌───────────────────────▼───────────────────────────────────────────────┐  │    │
│  │  │                         42 SERVICES                                    │  │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │    │
│  │  │  │MarketService│ │PoolManager  │ │MetricsServ. │ │AntiCheat    │     │  │    │
│  │  │  │(WebSocket)  │ │(O(1) alloc) │ │(Analytics)  │ │(Detection)  │     │  │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │    │
│  │  │  │DifficultyMgr│ │CombatSystem │ │EventBus     │ │SpatialGrid  │     │  │    │
│  │  │  │(Market-based)│ │(Damage)    │ │(Pub/Sub)    │ │(Collision)  │     │  │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │    │
│  │  └───────────────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│                     ┌───────────────────┴───────────────────┐                       │
│                     │            Supabase JS Client          │                       │
│                     └───────────────────┬───────────────────┘                       │
└─────────────────────────────────────────┼───────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
┌───────────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│        SUPABASE           │ │      RAILWAY        │ │      BINANCE        │
│  ┌─────────────────────┐  │ │ ┌─────────────────┐ │ │  ┌───────────────┐  │
│  │   PostgreSQL DB     │  │ │ │ market-server   │ │ │  │  WebSocket    │  │
│  │   (17 tables)       │  │ │ │ (price logger)  │ │ │  │  (BTC/USD)    │  │
│  └─────────────────────┘  │ │ └─────────────────┘ │ │  └───────────────┘  │
│  ┌─────────────────────┐  │ │ ┌─────────────────┐ │ └─────────────────────┘
│  │   Edge Functions    │  │ │ │ Static Site     │ │
│  │   (3 functions)     │  │ │ │ (Frontend)      │ │
│  └─────────────────────┘  │ │ └─────────────────┘ │
│  ┌─────────────────────┐  │ └─────────────────────┘
│  │   Storage           │  │
│  │   (Replays)         │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

---

## 📁 Proje Yapısı

```
crypto-cyber-survivors/
├── 📱 App.tsx                 # Ana uygulama (677 satır)
├── 📂 components/             # React bileşenleri (68 dosya)
│   ├── GameEngine.tsx         # Canvas render loop
│   ├── GameUI.tsx             # React HUD overlay
│   ├── screens/               # Menü ekranları (13)
│   ├── hud/                   # Oyun içi UI (17)
│   ├── mobile/                # Touch kontrolleri (5)
│   └── settings/              # Ayar panelleri (10)
├── 📂 services/               # Singleton servisler (42 dosya + 15 alt klasör)
│   ├── MarketService.ts       # WebSocket Binance/Coinbase
│   ├── PoolManager.ts         # Object pooling
│   ├── DifficultyManager.ts   # Market-based difficulty
│   ├── MetricsService.ts      # Analytics collection
│   ├── AntiCheatService.ts    # Client-side detection
│   ├── EventBus.ts            # Type-safe pub/sub
│   ├── audio/                 # SynthEngine (9)
│   ├── cards/                 # Kart sistemi (6)
│   ├── physics/               # Collision (6)
│   ├── renderers/             # IRenderer (7)
│   └── verification/          # VerificationQueue (1)
├── 📂 types/                  # TypeScript tanımları (15 dosya)
├── 📂 hooks/                  # React hooks (26 dosya)
├── 📂 stores/                 # Zustand state (2 dosya)
├── 📂 config/                 # Konfigürasyon (17 dosya)
├── 📂 tests/                  # Vitest testleri (116 dosya)
├── 📂 e2e/                    # Playwright E2E (16 dosya)
├── 📂 supabase/               # Supabase
│   ├── migrations/            # SQL migrations (18)
│   └── functions/             # Edge Functions (3)
└── 📂 railway-market-server/  # Backend (Node.js)
```

---

## 🔧 Teknoloji Stack'i

### Frontend
| Teknoloji | Kullanım | Durum |
|-----------|----------|-------|
| React 19 | UI Framework | ✅ |
| TypeScript 5 | Type Safety | ✅ |
| Vite 5 | Build Tool | ✅ |
| Zustand 5 | State Management | ✅ |
| Framer Motion | Animasyonlar | ✅ |
| Zod | Validation | ✅ |
| Canvas API | Game Rendering | ✅ |
| Web Audio API | Procedural Sound | ✅ |

### Backend
| Teknoloji | Kullanım | Durum |
|-----------|----------|-------|
| Supabase | PostgreSQL + Auth | ✅ |
| Railway | Hosting | ✅ |
| Deno | Edge Functions | ✅ |
| Node.js | Price Logger | ✅ |

### Testing
| Teknoloji | Kullanım | Coverage |
|-----------|----------|----------|
| Vitest | Unit Tests | 1431 tests |
| Playwright | E2E Tests | 72 tests |

---

## 🎮 Oyun Sistemleri

### Core Systems
| Sistem | Servis | Açıklama |
|--------|--------|----------|
| **Rendering** | GameEngine + Renderers | 60 FPS Canvas |
| **Physics** | CollisionSystem + SpatialGrid | O(n) collision |
| **Pooling** | PoolManager | O(1) allocation |
| **Market** | MarketService | Real-time BTC/USD |
| **Difficulty** | DifficultyManager | Market-based scaling |
| **Combat** | CombatSystem | Damage calculation |
| **Cards** | CardSystem | 40+ upgrades |
| **Combo** | ComboSystem | Kill streaks |
| **Audio** | SynthEngine | Procedural sounds |

### Secondary Systems
| Sistem | Servis | Açıklama |
|--------|--------|----------|
| Metrics | MetricsService + Storage | Analytics |
| Anti-Cheat | AntiCheatService | Detection |
| Achievements | AchievementService | Unlockables |
| Shop | ShopService | In-game store |
| Wallet | WalletService | Virtual currency |
| Lootbox | LootboxService | Random rewards |

---

## 📊 Veri Akışı

### Oyun Başlangıcı
```
User → MainMenu → PositionSelect → App.startGame()
                                        ↓
                     MetricsService.startSession()
                                        ↓
                     Edge Function: start-session
                                        ↓
                     Supabase: INSERT game_sessions
                                        ↓
                     Return: serverSessionId (UUID)
```

### Oyun Döngüsü (60 FPS)
```
┌─────────────────────────────────────────────────────────────┐
│                     GAME LOOP                                │
│  1. Input Processing (keyboard/touch)                        │
│  2. Market Data Update (WebSocket)                          │
│  3. Difficulty Adjustment (based on market)                 │
│  4. Entity Updates (player, enemies, bullets, gems)         │
│  5. Collision Detection (SpatialGrid)                       │
│  6. Combat Resolution (damage, kills)                       │
│  7. Rendering (Canvas)                                      │
│  8. UI Update (React HUD)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Oyun Bitişi
```
Player Death → App.handleGameOver()
                        ↓
         MetricsService.endSession()
                        ↓
         MetricsStorage.syncToSupabase() [UPSERT + Retry]
                        ↓
         VerificationQueue.enqueue()
                        ↓
         Edge Function: verify-game
                        ↓
         Supabase: UPDATE game_sessions (verified)
```

---

## 🏆 Güçlü Yönler

### Mimari
1. ✅ **Modüler Servis Mimarisi** - Singleton pattern, EventBus
2. ✅ **Performans Optimizasyonu** - Object pooling, spatial grid
3. ✅ **Type Safety** - Strict TypeScript, Zod validation
4. ✅ **Kapsamlı Test Coverage** - 1431 unit + 72 E2E
5. ✅ **Responsive Design** - Mobile + Desktop

### Backend
1. ✅ **Real-time Market Data** - WebSocket with fallback
2. ✅ **Secure Database** - RLS policies (all fixed)
3. ✅ **Server-side Verification** - Edge functions
4. ✅ **Price Logging** - 250K+ entries for anti-cheat

---

## ⚠️ Zayıf Yönler ve İyileştirmeler

### 1. App.tsx Çok Büyük (677 satır)
**Problem**: Orchestration + UI karışık  
**Çözüm**: GameOrchestrator servisi çıkar
```
Priority: Medium
Effort: 4 hours
Impact: Code maintainability
```

### 2. Anti-Cheat Yetersiz
**Problem**: Sadece client-side detection  
**Çözüm**: Session signing + server-side validation
```
Priority: High (before launch)
Effort: 16 hours
Impact: Competitive integrity
```

### 3. Offline Desteği Yok
**Problem**: Market verisi olmadan oyun başlamıyor  
**Çözüm**: Demo mode + PWA service worker
```
Priority: Medium
Effort: 8 hours
Impact: User experience
```

### 4. No State Machine
**Problem**: Game states via flags  
**Çözüm**: XState integration
```
Priority: Low (post-launch)
Effort: 12 hours
Impact: Code quality
```

---

## 📈 Metrikler

| Metrik | Değer | Hedef |
|--------|-------|-------|
| **Unit Tests** | 1431 | 1500+ |
| **E2E Tests** | 72 | 100+ |
| **Lint Errors** | 0 | 0 |
| **Bundle Size** | ~400KB | <500KB |
| **FPS (Mobile)** | 60 | 60 stable |
| **Supabase Tables** | 17 | - |
| **Edge Functions** | 3 | - |
| **Services** | 42 | - |
| **Components** | 68 | - |
| **Hooks** | 26 | - |

---

## 🔐 Güvenlik Katmanları

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Client-Side                                         │
│  - AntiCheatService (speed hack, memory tamper)             │
│  - Device fingerprinting                                     │
│  - Input logging for replay                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Transport                                           │
│  - HTTPS only                                                │
│  - Supabase anon key (limited permissions)                  │
│  - Session timeout                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Server-Side                                         │
│  - RLS policies (all tables)                                 │
│  - Edge function validation                                  │
│  - Price log verification                                    │
│  - Anomaly detection (planned)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Sonuç

Proje mimarisi **MVP için sağlam** durumda. Kritik güvenlik sorunları (RLS, veri akışı) düzeltildi. 

**Öncelikli iyileştirmeler:**
1. Anti-cheat güçlendirme (launch öncesi zorunlu)
2. PWA desteği (kullanıcı deneyimi)
3. App.tsx refactor (bakım kolaylığı)

Detaylı roadmap için: [2026_ROADMAP.md](./2026_ROADMAP.md)
