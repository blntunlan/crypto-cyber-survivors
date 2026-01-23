# 🎮 Crypto Survivors - Claude Proje Bağlam Dosyası

> Bu dosya Claude'un projeyi daha iyi anlaması için otomatik olarak okunur.
> Son Güncelleme: 2026-01-20

## 📋 Proje Özeti

Crypto-themed vampire survivors oyunu. React 19 + TypeScript + Vite + Zustand ile geliştirilmiş.
Gerçek zamanlı BTC/USD fiyat verilerini Binance & Coinbase WebSocket (Price) ve Supabase Realtime (Indicators) üzerinden alır. Windows üzerinden geliştirdiğim için && kullanma ; kullan.
Büyük diller (ES, PT, HI, VI) eklenmiş durumdadır.

**DB Optimization:** Migration 026 added JSONB support for cheat logs, fixed transaction constraints for achievements, and implemented BRIN indexes for performance.

**QA & Testing:** Professional testing lifecycle (Level 0-8) active. Vitest + MSW for integration, Playwright for E2E. Mandatory pre-commit tests via Husky + lint-staged.

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
├── components/                # React bileşenleri
│   ├── GameEngine.tsx        # Canvas render loop
│   ├── GameHUD.tsx           # Oyun içi UI overlay (Legacy)
│   ├── GameUI.tsx            # Responsive React HUD (Main)
│   ├── hub/                  # Hub/Menu bileşenleri
│   ├── hud/                  # Yeni modüler HUD bileşenleri
│   ├── screens/              # Oyun ekranları (Main, Hub, Settings, etc.)
│   ├── themed/               # Temalı ortak bileşenler
│   ├── admin/                # Admin dashboard panelleri
│   └── mobile/               # Touch kontrolleri
├── config/                    # Oyun konfigürasyonları (Enemy, Player, Game)
├── contexts/                  # React Context'ler (Theme, User, Language)
├── services/                  # Singleton servisler
│   ├── MarketService.ts      # Binance/Coinbase WebSocket & Fallback logic
│   ├── PhysicsSystem.ts      # Collision detection
│   ├── DifficultyManager.ts  # Market-based difficulty management
│   ├── EventBus.ts           # Type-safe event system
│   ├── PoolManager.ts        # O(1) Object pooling & pre-warming
│   ├── CardSystem.ts         # Upgrade/Card logic
│   ├── CombatSystem.ts       # Damage & Combat logic
│   ├── AntiCheatService.ts   # Client-side verification & protection
│   ├── analytics/            # Global metrics & session management
│   ├── renderers/            # Canvas/Sprite IRenderer implementations
│   ├── metrics/              # Performance & data analysis subsystem
│   ├── indicators/           # Market indicators (ATR, EMA, etc.)
│   └── auth/                 # Authentication & Session services
├── stores/                    # Zustand state management
│   ├── gameStore.ts          # Oyun state'i
│   └── admin/                # Admin panel state
├── hooks/                     # Custom React hooks (useMarket, useGame, etc.)
├── types/                     # TypeScript tanımları & Supabase types
├── utils/                     # Yardımcı fonksiyonlar ve araçlar
├── strategies/                # Oyun strateji pattern'leri
├── factories/                 # Nesne üretim factory'leri
├── schemas/                   # Validasyon şemaları
├── tests/                     # Vitest unit & integration testleri
├── e2e/                       # Playwright E2E testleri
├── docs/                      # Proje dökümantasyonu ve roadmap
├── supabase/                  # Migrations (achievements, wallet, shop, etc.)
└── railway-market-server/     # Price logger backend
```

## 🎯 Kodlama Standartları

### TypeScript
- **Type hints zorunlu**: Tüm fonksiyon parametreleri ve dönüş değerleri tiplendirilmeli
- **snake_case değil, camelCase**: Değişken ve fonksiyonlar için `camelCase` kullan
- **PascalCase**: Sınıflar, interface'ler ve type'lar için
- **Strict mode**: `tsconfig.json` strict modda
- **No `any`**: Her zaman spesifik tipler kullan

### Performans ve Optimizasyon
- **O(N) Döngülerinden Kaçın**: Oyun (update/render) döngüsü içinde aktif dizi taramalarından kaçın.
- **SpatialGrid Kullanımı**: Mesafe bazlı aramalar (en yakın düşman, çarpışma) için mutlaka `SpatialGrid` kullan.
- **Object Pooling (O(1))**: Objeleri havuza geri bırakırken `poolIndex` kullanarak O(1) serbest bırakma ve "Swap-and-Pop" ile O(1) geri dönüşüm uygula.
- **Hafıza Yönetimi**: Sıcak (hot) döngülerde nesne (object/array) oluşturmaktan kaçın (GC pressure azalt).

### React Patterns
- **Fonksiyonel bileşenler**: Class component kullanma
- **Custom hooks**: Tekrarlayan mantık için `use*` hook'ları çıkar
- **Zustand**: Global state için Redux yerine Zustand kullan
- **Framer Motion**: Animasyonlar için

### Servis Mimarisi
- **Singleton pattern**: Tüm servisler singleton olarak export edilir
- **EventBus**: Servisler arası iletişim için `EventBus.emit()` kullan
- **gameReset event**: Yeni oyun başladığında state sıfırlamak için subscribe ol

### Unit & Integration (Vitest + MSW)
- Test dosyaları: `tests/` klasöründe veya `*.test.ts` uzantılı
- **MSW**: API ve network çağrıları için MSW kullanımı zorunludur.
- Mock'lar: `vi.mock()` kullan (logic için), `MSW` kullan (network için).
- Coverage: Yeni özellikler için min %80 coverage koru.

### Playwright E2E
- Spec dosyaları: `e2e/` klasöründe
- Headless modda çalışır (CI/CD uyumlu)

## ⚠️ Önemli Kurallar

### YAPMAMALISIN
1. ❌ `dist/`, `node_modules/`, `.git/` klasörlerini değiştirme
2. ❌ `eval()` veya `exec()` kullanma
3. ❌ Hardcoded API key veya secret commit etme
4. ❌ `.env*` dosyalarını commit etme
5. ❌ `console.log` bırakma - `Logger` servisini kullan
6. ❌ Global değişkenler kullanma - Zustand store veya singleton servis kullan
7. ❌ **Testi olmayan kod pushlama** - QA Lifecycle (Level 0-8) takip edilmeli.

### YAPMALISIN
1. ✅ Her public method için JSDoc yaz
2. ✅ Yeni özellikler için test yaz (min 80% coverage)
3. ✅ Commit mesajları conventional format: `feat:`, `fix:`, `docs:`, `test:`
4. ✅ Lint hatası bırakma: `npm run lint` başarılı olmalı
5. ✅ `gameReset` event'ine subscribe olarak state temizliği yap (Örn: Lucky Star buff fix sonrası)
6. ✅ **MSW Handlers**: Yeni API endpoint'leri için handler ekle.

## 🔌 Entegrasyonlar

### Supabase
- **Project ID**: `dqaggcizordsijpnfteo`
- **Tables**: `players`, `game_sessions`, `player_wallets`, `achievements`, `shop_items`, `player_inventory`, `price_logs`
- **Functions**: `verify-game`, `submit-score`, `handle-purchase`
- **Security**: Row Level Security (RLS) her zaman aktif olmalı

### Railway
- **Frontend**: Railway üzerinden static web hosting
- **Price Logger**: `railway-market-server` backend servisi

### WebSocket Feeds
- **Binance**: `wss://stream.binance.com:9443/ws/btcusdt@trade`
- **Coinbase**: Fallback feed

## 🔍 Debug Araçları

- **Admin Dashboard**: `Ctrl+Shift+A` ile aç
- **Cheat Manager**: Development modda aktif (F1 veya menu üzerinden)
- **FPS/Metrics Monitor**: Canvas üzerinde detaylı performans verisi
- **Logger**: Detaylı loglama (Info, Warn, Error, Security)

## 📝 Workflow'lar

Mevcut workflow'lar `.agent/workflows/` klasöründe:

- `/code-review` - Kapsamlı kod ve mimari incelemesi
- `/pre-push-prep` - Test, lint, build ve commit hazırlığı
- `/qa-lifestyle-workflow` - **Master QA & Test döngüsü (Level 0-8)**
- `/deploySon` - Tam kapsamlı deployment süreci
- `/fix-bug` - Hata ayıklama ve düzeltme standartları
- `/code-doc-sync` - Kod ve dökümantasyon senkronizasyonu (Manual)

## 📚 Önemli Kaynaklar

- `docs/ARCHITECTURE.md`: Detaylı sistem mimarisi
- `docs/MASTER_ROADMAP.md`: Proje ilerleme durumu
- `docs/ANTI_CHEAT_REWARD_SYSTEM.md`: Güvenlik ve ödül mantığı
- `docs/TODO_COMPREHENSIVE.md`: Bekleyen görevler listesi

## 🚀 Deployment

```bash
# Değişiklikleri pushlayarak otomatik deploy'u tetikle
git add .
git commit -m "feat: your changes"
npm run deploy  # git push origin main komutunu çalıştırır
```

---

*Bu dosya projenin temel bağlamını içerir. Claude her oturumda bunu okuyarak proje kurallarına uyar.*
