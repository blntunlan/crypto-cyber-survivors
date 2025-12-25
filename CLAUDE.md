# 🎮 Crypto Cyber Survivors - Claude Proje Bağlam Dosyası

> Bu dosya Claude'un projeyi daha iyi anlaması için otomatik olarak okunur.

## 📋 Proje Özeti

Crypto-themed vampire survivors oyunu. React 19 + TypeScript + Vite + Zustand ile geliştirilmiş.
Gerçek zamanlı BTC/USD fiyat verilerini Binance & Coinbase WebSocket üzerinden alır.

## 🛠️ Sık Kullanılan Komutlar

```bash
# Geliştirme
npm run dev              # Dev server başlat (port 3000)
npm run build            # Production build

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
│   ├── GameHUD.tsx           # Oyun içi UI overlay
│   ├── GameUI.tsx            # Responsive React HUD
│   ├── admin/                # Admin dashboard panelleri
│   ├── mobile/               # Touch kontrolleri
│   └── screens/              # Menü ekranları
├── services/                  # Singleton servisler
│   ├── MarketService.ts      # Binance/Coinbase WebSocket
│   ├── PhysicsSystem.ts      # Collision detection
│   ├── DifficultyManager.ts  # Market-based difficulty
│   ├── EventBus.ts           # Type-safe event system
│   ├── admin/                # Admin panel servisleri
│   ├── renderers/            # IRenderer implementasyonları
│   ├── metrics/              # Analytics subsystem
│   └── auth/                 # Authentication servisleri
├── stores/                    # Zustand state management
│   ├── gameStore.ts          # Oyun state'i
│   └── admin/                # Admin panel state
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript tanımları
├── tests/                     # Vitest test dosyaları
├── e2e/                       # Playwright E2E testleri
├── supabase/                  # Supabase migrations & functions
└── railway-market-server/     # Price logger backend
```

## 🎯 Kodlama Standartları

### TypeScript
- **Type hints zorunlu**: Tüm fonksiyon parametreleri ve dönüş değerleri tiplendirilmeli
- **snake_case değil, camelCase**: Değişken ve fonksiyonlar için `camelCase` kullan
- **PascalCase**: Sınıflar, interface'ler ve type'lar için
- **Strict mode**: `tsconfig.json` strict modda

### React Patterns
- **Fonksiyonel bileşenler**: Class component kullanma
- **Custom hooks**: Tekrarlayan mantık için `use*` hook'ları çıkar
- **Zustand**: Global state için Redux yerine Zustand kullan
- **Framer Motion**: Animasyonlar için

### Servis Mimarisi
- **Singleton pattern**: Tüm servisler singleton olarak export edilir
- **EventBus**: Servisler arası iletişim için `EventBus.emit()` kullan
- **gameReset event**: Yeni oyun başladığında state sıfırlamak için subscribe ol

## 🧪 Test Kuralları

### Vitest
- Test dosyaları: `tests/` klasöründe veya `*.test.ts` uzantılı
- Mock'lar: `vi.mock()` kullan
- Integration testleri: `SKIP_INTEGRATION=true` ile atlanabilir

### Playwright E2E
- Spec dosyaları: `e2e/` klasöründe
- Headless modda çalışır
- Visual regression: `toMatchScreenshot()` kullanılabilir

## ⚠️ Önemli Kurallar

### YAPMAMALISIN
1. ❌ `dist/`, `node_modules/`, `.git/` klasörlerini değiştirme
2. ❌ `eval()` veya `exec()` kullanma
3. ❌ Hardcoded API key veya secret commit etme
4. ❌ `.env*` dosyalarını commit etme
5. ❌ Bare `except` clause kullanma - her zaman spesifik exception yakala
6. ❌ Global değişkenler kullanma - Zustand store veya singleton servis kullan

### YAPMALISIN
1. ✅ Her public method için JSDoc yaz
2. ✅ Yeni özellikler için test yaz (min %80 coverage)
3. ✅ Commit mesajları conventional format: `feat:`, `fix:`, `docs:`, `test:`
4. ✅ Lint hatası bırakma: `npm run lint` başarılı olmalı
5. ✅ Type-safe kod yaz: `any` kullanımından kaçın

## 🔌 Entegrasyonlar

### Supabase
- **Project ID**: `dqaggcizordsijpnfteo`
- **Tables**: `players`, `game_sessions`, `player_wallets`, `leaderboard` (view)
- **Edge Functions**: `verify-game`, `submit-score`
- **RLS**: Tüm tablolarda aktif

### Railway
- **Proje**: crypto-cyber-survivors
- **Servisler**: 
  - Frontend (static site)
  - railway-market-server (price logger backend)

### WebSocket Feeds
- **Binance**: `wss://stream.binance.com:9443/ws/btcusdt@trade`
- **Coinbase**: `wss://ws-feed.exchange.coinbase.com` (fallback)

## 📊 Performans Hedefleri

- **FPS**: 60 FPS (mobil ve desktop)
- **Bundle Size**: < 500KB gzipped
- **Build Time**: < 30 saniye
- **Test Suite**: < 60 saniye

## 🔍 Debug Araçları

- **Admin Dashboard**: `Ctrl+Shift+A` ile aç
- **Cheat Manager**: Development modda aktif
- **FPS Monitor**: Canvas üzerinde gösterilir
- **Logger**: `Logger.info()`, `Logger.warn()`, `Logger.error()`

## 📝 Workflow'lar

Mevcut workflow'lar `.agent/workflows/` klasöründe:

- `/code-review` - Kapsamlı kod incelemesi
- `/debug-push` - Test, lint, commit ve push workflow'u

## 🚀 Deployment

```bash
# Railway'e deploy
railway up

# Supabase migrations
supabase db push
supabase functions deploy
```

---

*Bu dosya projenin temel bağlamını içerir. Claude her oturumda bunu okuyarak proje kurallarına uyar.*
