# 🎮 Crypto Survivors - Claude Proje Bağlam Dosyası

> Bu dosya Claude'un projeyi daha iyi anlaması için otomatik olarak okunur.
> Son Güncelleme: 2026-01-26

## 📋 Proje Özeti

Crypto-themed vampire survivors oyunu. React 19 + TypeScript + Vite + Zustand ile geliştirilmiş.
Gerçek zamanlı BTC/USD fiyat verilerini Binance & Coinbase WebSocket (Price) ve Supabase Realtime (Indicators) üzerinden alır. Windows üzerinden geliştirdiğim için && kullanma ; kullan.
**Difficulty System V2 (Layered Architecture)**, **Tutorial System**, **Neural AIDirector** (Synaptic tabanlı) ve **Cloudflare Anti-Cheat** entegre edilmiştir.
**Casual/Competitive oyun modları**, PWA desteği ve tam kapsamlı tutorial akışı mevcuttur.
Büyük diller (ES, PT, HI, VI, ZH, RU) tam desteklidir.

**DB Optimization:** Migration 026 added JSONB support for cheat logs, fixed transaction constraints for achievements, and implemented BRIN indexes for performance.

**QA & Testing:** Professional testing lifecycle (Level 0-8) active. Vitest + MSW for integration, Playwright for E2E. Mandatory pre-commit tests via Husky + lint-staged. Coverage global %70+, kritik servisler %80+.

## 🛠️ Sık Kullanılan Komutlar

```bash
# Geliştirme
npm run dev              # Dev server başlat (port 3000)
npm run build            # Production build
npm run docs             # TypeDoc dökümantasyonu oluştur

# Veritabanı
npm run supabase:gen     # Supabase type'larını güncelle

# Test
npm run test             # Vitest unit testlerini çalıştır
npm run test:watch       # Watch modunda test
npm run test:coverage    # Coverage raporu
npm run test:e2e         # Playwright E2E testleri
npm run test:e2e:ui      # Playwright UI mode

# Kod Kalitesi
npm run lint             # ESLint kontrol
npm run lint:fix         # ESLint hataları düzelt
npm run format           # Prettier ile formatla
```

## 📁 Proje Yapısı

```
crypto-cyber-survivors/
├── App.tsx                    # Ana uygulama bileşeni
├── components/                # React bileşenleri (View Layer Only)
│   ├── GameEngine.tsx        # Canvas render loop (No React State Updates in Loop!)
│   ├── GameUI.tsx            # Responsive React HUD (Main)
│   └── ...
├── config/                    # Oyun konfigürasyonları (Magic Numbers Yasak)
├── services/                  # Singleton Services (Logic Layer)
│   ├── DifficultyManager.ts  # Consumer of V2 System
│   ├── difficulty/           # V2 Layered Architecture (Inputs -> Context -> Director)
│   ├── EventBus.ts           # System communication (Decoupled)
│   ├── PoolManager.ts        # O(1) Object pooling (Mandatory for Entities)
│   ├── renderers/            # Canvas/Sprite implementations
│   └── ...
├── stores/                    # Zustand state management (Shared State)
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript Definitions
├── tests/                     # Vitest unit & integration tests
├── e2e/                       # Playwright E2E tests
└── docs/                      # Documentation
```

## 🎯 Kodlama ve Mimari Standartları

### 1. Performans Yasaları (Performance is Law)
- **GC-Free Loop:** Oyun döngüsü (Game Loop) içinde bellek tahsisi (new Object, Array map/filter) **YASAKTIR**.
- **Object Pooling:** Mermi, Düşman, Particle üretirken ASLA `new Entity()` kullanma. Mutlaka `PoolManager.spawn()` kullan.
- **Spatial Hashing:** Çarpışma ve mesafe kontrolleri için O(N^2) döngüler yasak. `SpatialGrid` kullan.
- **Referanslar:** Her frame değişen veriler (Position, Velocity) için React State değil, `useRef` veya `Singleton Service` kullan.

### 2. Mimari Desenler (Architectural Patterns)
- **Singleton Services:** `CombatSystem`, `DifficultyManager` gibi core sistemler Singleton olmalıdır.
- **EventBus İletişimi:** Servisler birbirini doğrudan çağırmamalı, `EventBus.emit()` ile haberleşmelidir.
- **Katmanlı Zorluk (Difficulty V2):**
  1. **Inputs:** `DifficultyContext.updateInputs()`
  2. **Analysis:** `DifficultyContext` faktörleri toplar.
  3. **Directing:** `AIDirector` nöral/sinaptik modifikasyon uygular.
  4. **Output:** `DifficultyManager` oyun parametrelerine map eder.

### 3. State Yönetimi
- **Zustand:** Yüksek frekanslı global state için (örn: UI güncellemeleri).
- **React Context:** Sadece statik/düşük frekanslı state için (Theme, Language, User).
- **Service State:** Oyun mantığı state'i servislerin içinde tutulur (`GameStore` değil).

### 4. TypeScript Kuralları
- **Strict Mode:** `any` yasak. Type Guard'lar ve Generics kullan.
- **Adlandırma:** Variable/Function -> `camelCase`, Class/Component -> `PascalCase`, Constant -> `UPPER_SNAKE_CASE`.

## ⚠️ Önemli Kurallar (Do's & Don'ts)

### YAPMAMALISIN
1. ❌ `GameEngine` render döngüsü içinde `useState` güncellemesi yapma (React Render Cycle'ı bozar).
2. ❌ Servisler içinde UI kodu (React Component) barındırma.
3. ❌ `.env*` veya API Key commit etme.
4. ❌ `Logger` çağrılarını silme (Anti-Cheat analizi için kritiktir).
5. ❌ Test yazmadan "feature" ekleme.

### YAPMALISIN
1. ✅ Yeni bir Entity eklerken `PoolManager`'a kaydet.
2. ✅ Logic değişiklikleri için Unit Test (Vitest), akış değişiklikleri için E2E (Playwright) yaz.
3. ✅ Network isteklerini (API) test ederken MSW ile mockla.
4. ✅ Commit mesajlarında conventional commits kullan (`feat:`, `fix:`, `perf:`).

## 🔌 Entegrasyonlar & Debug

### Supabase & Auth
- **Tables**: `players`, `game_sessions`, `achievements`. RLS aktif.
- **Functions**: `verify-game` (Anti-Cheat on-submit validation).

### Debug Araçları
- **Admin Dashboard**: `Ctrl+Shift+A` (Metrics, Console, State).
- **Cheat Manager**: Development modda `F1`.
- **Logger**: `Logger.info()`, `Logger.warn()` kullan. `console.log` bırakma.

## 📝 Workflow'lar
Detaylı süreçler `.agent/workflows/` altında:
- `/qa-lifestyle-workflow` (Level 0-8 Test Döngüsü)
- `/deploySon` (Deployment)
- `/performance-testing` (Benchmark)

## 🚀 Deployment
```bash
git add . && git commit -m "feat: description"
npm run deploy # git push origin main
```

---
*Bu dosya proje kurallarının TEK gerçeğidir.*