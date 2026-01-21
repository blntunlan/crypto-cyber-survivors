# 🗺️ Crypto Cyber Survivors - 2026 Roadmap

**Oluşturulma**: 2026-01-18  
**Son Güncelleme**: 2026-01-20  
**Mevcut Versiyon**: 0.1.0 (Beta)

---

## 📊 Proje Durumu

```
████████████████████████████████████░░░░  80% TAMAMLANDI
```

| Faz | İlerleme | Durum |
|-----|----------|-------|
| Faz 1: Core Game | ████████████████████ 100% | ✅ Tamamlandı |
| Faz 2: Polish | ███████████████████░ 95% | ✅ Tamamlandı |
| Faz 3: Backend | ██████████████░░░░░░ 70% | 🔶 Devam Ediyor |
| Faz 4: Launch | ██████░░░░░░░░░░░░░░ 25% | 🔶 Başladı |

---

## 🏃 Sprint 1: Stabilizasyon (Bu Hafta)

**Tarih**: 2026-01-18 → 2026-01-24  
**Hedef**: Production-ready stabilizasyon

### Temel Görevler

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| RLS güvenlik düzeltmeleri | ⭐⭐⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Veri akışı düzeltmeleri (UPSERT) | ⭐⭐⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Retry logic ekleme | ⭐⭐⭐⭐ | 1h | ✅ Tamamlandı |
| FK indeksleri ekleme | ⭐⭐⭐ | 30m | ✅ Tamamlandı |
| Railway'e deploy | ⭐⭐⭐ | 30m | ✅ Atlandı (CI/CD) |
| Dokümanları güncelle | ⭐⭐ | 1h | ✅ Tamamlandı |

### 2026-01-20 Güncellemeleri

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Test coverage düzeltmeleri (26 failing test) | ⭐⭐⭐⭐⭐ | 3h | ✅ Tamamlandı |
| Çoklu dil desteği (ES, PT, HI, VI) | ⭐⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Market data flow & synchronization | ⭐⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Live Feed Disconnect fix | ⭐⭐⭐⭐ | 1h | ✅ Tamamlandı |
| PnL Shock detection fix | ⭐⭐⭐ | 1h | ✅ Tamamlandı |
| Lucky Star buff display fix | ⭐⭐⭐ | 30m | ✅ Tamamlandı |
| Retro mode performance optimization | ⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Mobile dash distance adjustment | ⭐⭐ | 30m | ✅ Tamamlandı |
| Header animation improvements | ⭐⭐ | 30m | ✅ Tamamlandı |
| Memory & GC pressure optimization | ⭐⭐⭐ | 1h | ✅ Tamamlandı |
| GameRenderer & GameStateManager tests | ⭐⭐⭐ | 2h | ✅ Tamamlandı |

**Çıktılar:**
- [x] FRONTEND_DB_MAPPING.md
- [x] RAILWAY_SUPABASE_INTEGRATION.md
- [x] DATA_FLOW_FIX_REPORT.md
- [x] TODO_LIST.md
- [x] ARCHITECTURE.md
- [x] 6 dil desteği (EN, TR, ES, PT, HI, VI)

---

## 🛡️ Sprint 2: Anti-Cheat (Haftaya)

**Tarih**: 2026-01-25 → 2026-01-31  
**Hedef**: Competitive integrity için güvenlik

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Session signing (client) | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Session verification (server) | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Replay hash generation | ⭐⭐⭐⭐ | 3h | ⬜ |
| verify-replay edge function | ⭐⭐⭐⭐ | 3h | ⬜ |
| Anomaly detection rules | ⭐⭐⭐ | 4h | ⬜ |
| Shadow ban system | ⭐⭐⭐ | 2h | ⬜ |

**Detay:** [ANTI_CHEAT_ROADMAP.md](./ANTI_CHEAT_ROADMAP.md)

---

## 📱 Sprint 3: PWA & UX (Şubat 1. Hafta)

**Tarih**: 2026-02-01 → 2026-02-07  
**Hedef**: Mobil deneyim iyileştirme

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| PWA manifest.json | ⭐⭐⭐⭐ | 1h | ✅ Tamamlandı |
| Service worker (caching) | ⭐⭐⭐⭐ | 3h | ✅ Tamamlandı |
| Apple touch icons | ⭐⭐⭐ | 1h | ✅ Tamamlandı |
| Install prompt UI | ⭐⭐⭐ | 2h | ✅ Tamamlandı |
| Offline demo mode | ⭐⭐⭐ | 4h | ⬜ |
| Tutorial/Onboarding | ⭐⭐⭐ | 6h | ⬜ |
| Loading optimizations | ⭐⭐ | 2h | ⬜ |

---

## 🔧 Sprint 4: Refactoring (Şubat 2. Hafta)

**Tarih**: 2026-02-08 → 2026-02-14  
**Hedef**: Kod kalitesi ve bakım kolaylığı

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| App.tsx split (GameOrchestrator) | ⭐⭐⭐ | 4h | ⬜ |
| XState for game flow | ⭐⭐ | 6h | ⬜ |
| Service dependency injection | ⭐⭐ | 4h | ⬜ |
| Performance profiling | ⭐⭐⭐ | 3h | ⬜ |
| Lighthouse 90+ score | ⭐⭐⭐ | 2h | ⬜ |

---

## 🚀 Sprint 5: Soft Launch (Şubat 3. Hafta)

**Tarih**: 2026-02-15 → 2026-02-21  
**Hedef**: Sınırlı kullanıcı testi

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Beta tester onboarding | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Feedback collection form | ⭐⭐⭐⭐ | 2h | ⬜ |
| Bug tracking setup | ⭐⭐⭐⭐ | 2h | ⬜ |
| Analytics dashboard | ⭐⭐⭐ | 4h | ⬜ |
| Discord server | ⭐⭐⭐ | 2h | ⬜ |
| First leaderboard season | ⭐⭐⭐ | 2h | ⬜ |

---

## 🌐 Sprint 6-7: Web3 Integration (Mart)

**Tarih**: 2026-03-01 → 2026-03-15  
**Hedef**: Blockchain ödül sistemi

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Wallet connect (Phantom) | ⭐⭐⭐⭐ | 6h | ⬜ |
| Wallet-based session signing | ⭐⭐⭐⭐ | 4h | ⬜ |
| Achievement NFT contract | ⭐⭐⭐ | 8h | ⬜ |
| NFT minting integration | ⭐⭐⭐ | 6h | ⬜ |
| Season rewards contract | ⭐⭐ | 8h | ⬜ |
| Token distribution UI | ⭐⭐ | 4h | ⬜ |

**Blockchain**: Solana (düşük fee, hızlı)

---

## 📲 Sprint 8-9: Native Apps (Nisan)

**Tarih**: 2026-04-01 → 2026-04-15  
**Hedef**: App Store/Play Store

| Task | Öncelik | Süre | Durum |
|------|---------|------|-------|
| Capacitor setup | ⭐⭐⭐ | 4h | ⬜ |
| iOS build configuration | ⭐⭐⭐ | 4h | ⬜ |
| Android build configuration | ⭐⭐⭐ | 4h | ⬜ |
| App icons & splash screens | ⭐⭐⭐ | 2h | ⬜ |
| App Store submission | ⭐⭐⭐⭐ | 8h | ⬜ |
| Play Store submission | ⭐⭐⭐⭐ | 4h | ⬜ |

**Detay:** [NATIVE_APP_ROADMAP.md](./NATIVE_APP_ROADMAP.md)

---

## 🎮 Sprint 10+: Content Updates (Q2 2026)

**Hedef**: Oyun içeriği genişletme

| Feature | Version | Durum |
|---------|---------|-------|
| Boss battles | v0.2 | ⬜ |
| 4 new enemy types | v0.2 | ⬜ |
| 20 new cards | v0.2 | ⬜ |
| Multiple characters | v0.3 | ⬜ |
| Daily challenges | v0.3 | ⬜ |
| Seasonal themes | v0.4 | ⬜ |
| Co-op multiplayer | v1.0 | ⬜ |

---

## 📊 Zaman Çizelgesi

```
2026
│
├── Ocak ─────────────────────────────────────────
│   ├── [18] Sprint 1: Stabilizasyon ✅
│   └── [25] Sprint 2: Anti-Cheat
│
├── Şubat ────────────────────────────────────────
│   ├── [01] Sprint 3: PWA & UX
│   ├── [08] Sprint 4: Refactoring
│   └── [15] Sprint 5: SOFT LAUNCH 🚀
│
├── Mart ─────────────────────────────────────────
│   └── [01-15] Sprint 6-7: Web3 Integration
│
├── Nisan ────────────────────────────────────────
│   ├── [01-15] Sprint 8-9: Native Apps
│   └── [15] App Store Launch 📱
│
├── Mayıs ────────────────────────────────────────
│   └── v0.2: Boss Battles + New Content
│
└── Haziran ──────────────────────────────────────
    └── v0.3: Multiple Characters
```

---

## 🎯 KPI Hedefleri

### Teknik
| Metrik | Şu An | Q1 Hedef | Q2 Hedef |
|--------|-------|----------|----------|
| Unit Tests | 1479 ✅ | 1600 | 2000 |
| E2E Tests | 342 ✅ | 100 | 150 |
| Lighthouse | ~85 | 90+ | 95+ |
| Bundle Size | 443KB (gzip) ✅ | <450KB | <500KB |
| Uptime | - | 99.5% | 99.9% |
| Dil Desteği | 6 ✅ | 6 | 10 |

### İş
| Metrik | Soft Launch | Q2 Hedef |
|--------|-------------|----------|
| DAU | 100 | 5,000 |
| D1 Retention | 40% | 50% |
| D7 Retention | 15% | 25% |
| Avg Session | 5 min | 8 min |

---

## 🚧 Risk Matrisi

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| Cheating epidemic | Yüksek | Yüksek | Sprint 2: Anti-cheat |
| Mobile performance | Orta | Orta | ✅ Device benchmark |
| Market data outage | Orta | Yüksek | ✅ Coinbase fallback |
| App Store rejection | Orta | Orta | Compliance review |
| Solana congestion | Düşük | Orta | Batch transactions |

---

## 📌 Karar Noktaları

| Karar | Seçenekler | Deadline | Durum |
|-------|-----------|----------|-------|
| NFT Blockchain | Solana vs Polygon | Şubat 15 | ⬜ |
| Monetizasyon | Free vs NFT-gated | Şubat 15 | ⬜ |
| Token | Yeni vs mevcut | Mart 1 | ⬜ |
| App Store | Apple vs Google first | Nisan 1 | ⬜ |

---

## ✅ 2026-01-20 Tamamlanan Görevler

- [x] Test coverage düzeltmeleri (1479 test geçti)
- [x] Çoklu dil desteği (ES, PT, HI, VI)
- [x] Market data flow synchronization
- [x] Live Feed Disconnect fix
- [x] PnL Shock detection fix
- [x] Lucky Star buff display fix
- [x] Retro mode performance optimization
- [x] Mobile dash distance adjustment
- [x] Header animation improvements
- [x] Memory & GC pressure optimization
- [x] GameRenderer & GameStateManager tests

## 🎯 Sonraki Adımlar (Sprint 1 Kalan)

| Öncelik | Task | Tahmini Süre |
|---------|------|-------------|
| ⭐⭐⭐⭐⭐ | E2E test suite genişletme | 2h |
| ⭐⭐⭐⭐ | PWA manifest.json hazırlığı | 1h |
| ⭐⭐⭐⭐ | Performance profiling (Lighthouse) | 2h |
| ⭐⭐⭐ | Tutorial/Onboarding tasarımı | 3h |
| ⭐⭐⭐ | Sprint 2 Anti-cheat teknik analizi | 2h |

---

## 📈 Sprint 1 Özet (2026-01-18 → 2026-01-24)

**İlerleme**: ██████████████████░░ 90%

| Kategori | Tamamlanan | Kalan |
|----------|------------|-------|
| Bug Fixes | 8 | 0 |
| Performance | 3 | 1 (Lighthouse) |
| Localization | 4 yeni dil | 0 |
| Testing | 1479 unit + 342 E2E | - |
| PWA | manifest, SW, icons | Install prompt |
| Docs | 6 dosya | 1 |

---

> 💡 Bu roadmap living document'tır. Her sprint sonunda güncellenecektir.
> 📅 Sonraki güncelleme: 2026-01-24 (Sprint 1 Kapanış)
