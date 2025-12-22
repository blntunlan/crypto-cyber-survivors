# 🗺️ Crypto Cyber Survivors - Master Roadmap

> Bu döküman projenin stratejik yol haritasını, önceliklerini ve zaman çizelgesini içerir.
> Son Güncelleme: 2025-12-20

---

## 📊 Proje Durumu Özeti

| Metrik | Değer |
|--------|-------|
| **Versiyon** | 0.0.0 (Alpha) |
| **Test Coverage** | 227 test ✅ |
| **Lint Status** | 0 error, 0 warning ✅ |
| **Core Features** | ✅ Tamamlandı |
| **Production Ready** | 🔶 Kısmen (Architecture Finalized) |

---

## 🎯 Vizyon

**"Real-time piyasa verileriyle entegre, blockchain ödüllü, competitive bir survival oyunu"**

```
Faz 1: Solid Foundation     ████████████████████ 100% ✅
 Faz 2: Polish & Quality     ██████████████░░░░░░  70% 🔶
 Faz 3: Backend & Web3       ████████░░░░░░░░░░░░  40% 🔶
Faz 4: Launch & Growth      ░░░░░░░░░░░░░░░░░░░░   0% ⬜
```

---

## 🏗️ Faz 1: Solid Foundation ✅ (Tamamlandı)

> Temel oyun mekanikleri ve mimari

| Özellik | Durum |
|---------|-------|
| Canvas Game Engine | ✅ |
| Player Movement & Dash | ✅ |
| Enemy System (6 tip) | ✅ |
| Combat System | ✅ |
| Object Pooling | ✅ |
| Card System (30+ kart) | ✅ |
| Real-time BTC WebSocket | ✅ |
| Dynamic Difficulty | ✅ |
| Combo System | ✅ |
| Audio Service | ✅ |
| Metrics Collection | ✅ |

---

## ⭐ Faz 2: Polish & Quality (Devam Ediyor)

### 2.1 ✅ Kod Kalitesi (Tamamlandı)

| Task | Durum |
|------|-------|
| Lint errors fix | ✅ |
| TypeScript strict mode | ✅ |
| Test coverage (+51 test) | ✅ |
| WebSocket error handling | ✅ |
| localStorage quota handling | ✅ |
| **Modular Renderer Refactor** | ✅ |
| **3-Tier Projectile Visuals** | ✅ |

### 2.2 🔶 Kütüphane Entegrasyonları (Bu Hafta)

| Kütüphane | Öncelik | Amaç | Süre |
|-----------|---------|------|------|
| **nanoid** | ⭐⭐⭐⭐⭐ | Collision-free ID generation | 30 dk |
| **Zustand** | ⭐⭐⭐⭐⭐ | State management, settings persist | 2 saat |
| **Zod** | ⭐⭐⭐⭐ | WebSocket data validation | 1 saat |
| **Howler.js** | ⭐⭐⭐ | Profesyonel ses sistemi | 2 saat |
| **Framer Motion** | ⭐⭐⭐ | UI animasyonları | 3 saat |

### 2.3 🔶 UI/UX İyileştirmeleri

| Task | Öncelik | Süre |
|------|---------|------|
| Settings menu (ses, grafik) | ⭐⭐⭐⭐ | 3 saat |
| Game over screen redesign | ⭐⭐⭐ | 2 saat |
| Card selection animations | ⭐⭐⭐ | 2 saat |
| Loading screen | ⭐⭐ | 1 saat |
| Tutorial/Onboarding | ⭐⭐ | 4 saat |

### 2.4 ⬜ Mobil Uyumluluk

> 📱 **Detaylı Roadmap:** [MOBILE_INTEGRATION_ROADMAP.md](./MOBILE_INTEGRATION_ROADMAP.md)

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Touch controls (virtual joystick) | ⭐⭐⭐⭐⭐ | 1-2 gün | ⬜ |
| Responsive canvas + safe area | ⭐⭐⭐⭐⭐ | 4 saat | ⬜ |
| Mobile HUD optimization | ⭐⭐⭐⭐ | 2 saat | ⬜ |
| PWA manifest + icons | ⭐⭐⭐⭐ | 3 saat | ⬜ |
| Service worker (offline) | ⭐⭐⭐ | 3 saat | ⬜ |
| Haptic feedback system | ⭐⭐⭐ | 2 saat | ⬜ |
| Performance optimization | ⭐⭐⭐ | 1 gün | ⬜ |

**Mobil Strateji:** PWA (Progressive Web App) - Tek codebase ile web + mobil

### 2.5 ⬜ Native App Store Çıkışı (Gelecek)

> 📲 **Detaylı Roadmap:** [NATIVE_APP_ROADMAP.md](./NATIVE_APP_ROADMAP.md)

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Pre-native hazırlık (Faz 0) | ⭐⭐⭐⭐ | Paralel | ⬜ |
| Capacitor entegrasyonu | ⭐⭐⭐⭐ | 2-3 gün | ⬜ |
| iOS App Store submission | ⭐⭐⭐ | 1 hafta | ⬜ |
| Google Play submission | ⭐⭐⭐ | 1 hafta | ⬜ |
| Beta testing (TestFlight/Internal) | ⭐⭐⭐ | 1 hafta | ⬜ |

**Native Strateji:** Capacitor.js - React codebase korunur, native wrapper ile App Store dağıtımı

---

## 🔗 Faz 3: Backend & Web3 (Gelecek)

### 3.1 Backend Infrastructure

```
Timeline: 2-3 Hafta
Teknoloji: Supabase (veya Node.js + PostgreSQL)
```

| Milestone | Bileşenler | Süre |
|-----------|------------|------|
| **M1: API Scaffold** | Supabase setup, tables, Edge functions | ✅ Tamamlandı |
| **M2: Auth System** | Device Fingerprint + Nickname Login | ✅ Tamamlandı |
| **M3: Score System** | Submit, validate, store scores | 🚧 Devam Ediyor |
| **M4: Leaderboard** | Daily/Season/All-time rankings | ⬜ Beklemede |
| **M5: Anti-Cheat** | Replay hash, time validation, rate limit | 🚧 Devam Ediyor |

### 3.2 Database Schema

```sql
-- Core Tables
players (wallet_address, nickname, created_at, ban_status)
game_sessions (id, player_id, score, pnl, duration, replay_hash)
leaderboard (season_id, player_id, best_score, rank)
seasons (id, start_date, end_date, prize_pool)

-- Analytics
metrics_sessions (id, session_id, metrics_json, created_at)
```

### 3.3 Web3 Integration

```
Blockchain: Solana (düşük tx fee, hızlı)
Wallet: Phantom / Solflare
NFT Standard: Metaplex
```

| Milestone | Bileşenler | Süre |
|-----------|------------|------|
| **W1: Wallet Connect** | Connect button, signature request | 1 gün |
| **W2: Session Signing** | Game start/end signature | 1 gün |
| **W3: NFT Contract** | Achievement NFT contract (Metaplex) | 2 gün |
| **W4: Minting** | Season winner NFT minting | 2 gün |

---

## 🚀 Faz 4: Launch & Growth

### 4.1 Pre-Launch Checklist

| Task | Kategori |
|------|----------|
| ⬜ Performance profiling (Lighthouse 90+) | Tech |
| ⬜ Error tracking (Sentry) | Tech |
| ⬜ Analytics (PostHog) | Tech |
| ⬜ Landing page | Marketing |
| ⬜ Social media assets | Marketing |
| ⬜ Press kit | Marketing |
| ⬜ Beta testers program | Community |
| ⬜ Discord server setup | Community |

### 4.2 Launch Strategy

```
Week 1: Soft Launch
- Invite-only beta
- Collect feedback
- Fix critical bugs

Week 2: Public Launch
- Open access
- First leaderboard season
- Social media push

Week 3+: Growth
- Content updates (new cards, enemies)
- Community events
- Partnerships
```

### 4.3 Post-Launch Roadmap

| Feature | Priority | Timeline |
|---------|----------|----------|
| New enemy types | ⭐⭐⭐⭐ | v0.2 |
| Boss battles | ⭐⭐⭐⭐ | v0.3 |
| Multiple characters | ⭐⭐⭐ | v0.4 |
| Co-op multiplayer | ⭐⭐ | v1.0 |
| Token integration | ⭐⭐ | v1.0 |

---

## 📅 Detaylı Zaman Çizelgesi

### Hafta 1 (Bu Hafta) - Polish

```
Pazartesi   : nanoid + Zustand entegrasyonu
Salı        : Settings menu implementasyonu
Çarşamba    : Zod validation + WebSocket refactor
Perşembe    : Howler.js audio refactor
Cuma        : Framer Motion UI animations
Hafta Sonu  : Testing + Bug fixes
```

### Hafta 2 - Mobile & PWA

```
Pazartesi   : Touch controls design
Salı        : Virtual joystick implementation
Çarşamba    : Responsive canvas
Perşembe    : PWA manifest + icons
Cuma        : Service worker
Hafta Sonu  : Mobile testing
```

### Hafta 3-4 - Backend

```
Week 3:
- Supabase project setup
- Database schema
- Auth flow (wallet)
- Basic API endpoints

Week 4:
- Score submission
- Leaderboard queries
- Anti-cheat basics
- Frontend integration
```

### Hafta 5-6 - Web3

```
Week 5:
- Solana wallet integration
- Session signing
- NFT contract development

Week 6:
- NFT minting flow
- Season management
- Testing & audit
```

---

## 🛠️ Teknik Kararlar

### State Management

```
Şu an: Custom hooks + useRef
Hedef: Zustand

Neden:
- Minimal boilerplate
- Built-in persist middleware
- React dışından erişim (game loop)
- DevTools desteği
```

### Audio

```
Şu an: Raw Web Audio API
Hedef: Howler.js

Neden:
- Cross-browser uyumluluk
- Audio sprites (tek dosya)
- Mobile audio unlock
- Volume fade/pan
```

### Validation

```
Şu an: Manuel type guards
Hedef: Zod

Neden:
- Runtime validation
- TypeScript inference
- WebSocket data güvenliği
- Config validation
```

### Backend

```
Tercih: Supabase

Neden:
- PostgreSQL (güçlü queries)
- Realtime subscriptions
- Edge Functions (low latency)
- Auth built-in
- Generous free tier
```

### Animation

```
Tercih: Framer Motion

Neden:
- React-native syntax
- AnimatePresence (exit animations)
- Gesture support
- Performance optimized
```

---

## 🎯 KPI'lar & Başarı Metrikleri

### Tech KPIs

| Metrik | Şu An | Hedef |
|--------|-------|-------|
| Lighthouse Performance | ? | 90+ |
| Test Coverage | 150 | 200+ |
| Build Size | ? | < 500KB |
| First Contentful Paint | ? | < 1.5s |
| Time to Interactive | ? | < 3s |

### Game KPIs (Post-Launch)

| Metrik | Hedef |
|--------|-------|
| D1 Retention | > 40% |
| D7 Retention | > 15% |
| Avg Session Duration | > 5 min |
| Daily Active Users | 1000+ |
| Conversion (wallet connect) | > 20% |

---

## 🚧 Risk Yönetimi

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| WebSocket kesintisi | Orta | Yüksek | Exponential backoff ✅ |
| Cheating | Yüksek | Yüksek | Server-side validation |
| Solana network congestion | Orta | Orta | Transaction retry logic |
| localStorage quota | Düşük | Orta | Graceful degradation ✅ |
| Mobile performance | Orta | Orta | Canvas optimization |

---

## 📚 Kaynaklar & Referanslar

### Dokümantasyon

- [IMPROVEMENT_TASKS.md](./IMPROVEMENT_TASKS.md) - Sprint görevleri
- [MOBILE_INTEGRATION_ROADMAP.md](./MOBILE_INTEGRATION_ROADMAP.md) - Mobil PWA entegrasyonu
- [NATIVE_APP_ROADMAP.md](./NATIVE_APP_ROADMAP.md) - iOS/Android App Store çıkışı
- [LEADERBOARD_ARCHITECTURE.md](./LEADERBOARD_ARCHITECTURE.md) - Backend planı
- [CARD_SYSTEM_REFERENCE.md](./CARD_SYSTEM_REFERENCE.md) - Kart sistemi
- [ENEMY_SYSTEM.md](./ENEMY_SYSTEM.md) - Düşman tipleri

### External

- [Supabase Docs](https://supabase.com/docs)
- [Solana Cookbook](https://solanacookbook.com)
- [Metaplex Docs](https://docs.metaplex.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Howler.js](https://howlerjs.com)

---

## ✅ Sonraki Adımlar (Immediate)

### Bu Hafta

1. **Pazartesi**: `nanoid` + `zustand` kurulumu
2. **Salı**: Settings persistence ile Zustand store
3. **Çarşamba**: `zod` ile WebSocket validation
4. **Perşembe**: Game over / level up animations (Framer Motion)
5. **Cuma**: Lighthouse audit + optimizations

### Karar Noktaları

- [ ] Backend: Supabase vs Custom Node.js?
- [ ] NFT: Solana vs Polygon?
- [ ] Token: Mevcut token vs yeni token?
- [ ] Monetization: Free-to-play vs NFT-gated?

---

> 💡 **Not:** Bu roadmap living document'tır. Öncelikler ve timeline'lar feedback'e göre güncellenecektir.
