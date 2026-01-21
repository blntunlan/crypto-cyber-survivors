# 📋 Crypto Cyber Survivors - Comprehensive TODO

> Projedeki tüm eksiklikler, teknik borçlar ve gelecek özellikler.
> Son Güncelleme: 2026-01-20 23:39

---

## 🎯 Öncelik Açıklamaları

| Öncelik | Açıklama |
|---------|----------|
| 🔴 P0 | **Kritik** - Launch öncesi zorunlu |
| 🟠 P1 | **Yüksek** - Launch için önemli |
| 🟡 P2 | **Orta** - İyileştirme |
| 🟢 P3 | **Düşük** - Nice-to-have |

---

## 🛡️ Güvenlik & Anti-Cheat

### 🔴 P0 - Kritik

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| SEC-001 | Session signing implementasyonu | `services/verification/` | 4 saat |
| SEC-002 | Replay hash storage & validation | `supabase/functions/verify-game/` | 6 saat |
| SEC-003 | Rate limiting (score submission) | Edge Function | 2 saat |

### 🟠 P1 - Yüksek

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| SEC-004 | Client-side obfuscation (Terser config) | `vite.config.ts` | 3 saat |
| SEC-005 | DevTools detection (warning log) | `services/AntiCheatService.ts` | 2 saat |
| SEC-006 | Anomaly detection rules | Edge Function | 4 saat |
| SEC-007 | Memory integrity checks | `services/AntiCheatService.ts` | 3 saat |

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| SEC-008 | Full replay verification (simüle et) | Railway worker | 1 gün |
| SEC-009 | Ban system UI | Admin Dashboard | 4 saat |
| SEC-010 | CAPTCHA on high scores | `components/screens/` | 3 saat |

---

## 📱 PWA & Offline

### 🟠 P1 - Yüksek

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| PWA-001 | ~~manifest.json oluştur~~ | `public/manifest.json` | ✅ Tamamlandı |
| PWA-002 | ~~App icons (192x192, 512x512)~~ | `public/icons/` | ✅ Tamamlandı |
| PWA-003 | ~~Service worker (asset caching)~~ | `public/sw.js` | ✅ Tamamlandı |

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| PWA-004 | ~~Install prompt UI~~ | `components/ui/PWAInstallPrompt.tsx` | ✅ Tamamlandı |
| PWA-005 | ~~Offline fallback page~~ | `public/offline.html` | ✅ Tamamlandı |
| PWA-006 | Background sync (score queue) | Service Worker | 3 saat |

---

## 🎮 Gameplay Özellikleri

### 🟠 P1 - Yüksek

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| GAME-001 | Boss düşman sistemi | `services/SpawnSystem.ts`, `config/BossConfig.ts` | 2-3 gün |
| GAME-002 | Boss health bar UI | `components/hud/BossHealthBar.tsx` | 3 saat |
| GAME-003 | Boss attack patterns | `services/BossAI.ts` | 1 gün |

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| GAME-004 | Yeni düşman tipleri (3+) | `config/EnemyRegistry.ts` | 1 gün |
| GAME-005 | Multiple characters | `config/CharacterRegistry.ts` | 2-3 gün |
| GAME-006 | Daily challenges | `services/ChallengeService.ts` | 2 gün |
| GAME-007 | Achievement badges | `services/AchievementService.ts` | 1 gün |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| GAME-008 | Seasonal leaderboards | Supabase + UI | 1-2 gün |
| GAME-009 | Spectator mode | Yeni mimari gerekli | 1 hafta |
| GAME-010 | Co-op multiplayer | WebSocket server | 2-3 hafta |

---

## 🎨 UI/UX İyileştirmeleri

### 🟠 P1 - Yüksek

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| UI-001 | Tutorial/Onboarding ekranları | `components/screens/TutorialScreen.tsx` | 4 saat |
| UI-002 | First-time user flow | `hooks/useTutorial.ts` | 2 saat |

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| UI-003 | Loading skeleton screens | `components/ui/Skeleton.tsx` | 2 saat |
| UI-004 | Social sharing buttons | GameOverScreen | 2 saat |
| UI-005 | Accessibility improvements (ARIA) | Tüm interactive elements | 1 gün |
| UI-006 | Keyboard navigation (tüm menüler) | `hooks/useMenuNav.ts` | 3 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| UI-007 | Dark/Light theme toggle | `contexts/ThemeContext.tsx` | 3 saat |
| UI-008 | ~~Localization (i18n)~~ | `locales/` | ✅ Tamamlandı (6 dil) |
| UI-009 | Custom cursor | CSS | 1 saat |

---

## 🔊 Audio İyileştirmeleri

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| AUD-001 | Howler.js migration (optional) | `services/audio/` | 1 gün |
| AUD-002 | Background music loop | `services/audio/MusicService.ts` | 4 saat |
| AUD-003 | Audio sprites (tek dosya) | Build optimization | 3 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| AUD-004 | Daha fazla SFX varyasyonu | `config/AudioRegistry.ts` | 2 saat |
| AUD-005 | Adaptive music (market bazlı) | `services/audio/` | 4 saat |

---

## ⚡ Performance Optimizasyonları

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| PERF-001 | Lighthouse audit & fixes | General | 4 saat |
| PERF-002 | Bundle size analysis | `vite.config.ts` | 2 saat |
| PERF-003 | Image lazy loading | Components | 2 saat |
| PERF-004 | Tree shaking optimization | Build config | 2 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| PERF-005 | Web Worker for physics | `workers/physics.worker.ts` | 1 gün |
| PERF-006 | WASM for collision detection | Rust/WASM | 1 hafta |

---

## 🧪 Test Coverage Genişletme

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| TEST-001 | Boss system tests | `tests/BossSystem.test.ts` | 2 saat |
| TEST-002 | PWA manifest tests | `tests/pwa/` | 1 saat |
| TEST-003 | Offline behavior E2E | `e2e/offline.spec.ts` | 2 saat |
| TEST-004 | Anti-cheat detection tests | `tests/AntiCheat.test.ts` | 2 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| TEST-005 | Visual regression (full suite) | Playwright | 1 gün |
| TEST-006 | Performance benchmarks | Vitest bench | 3 saat |
| TEST-007 | Stress testing (1000+ entities) | Custom script | 4 saat |

---

## 📚 Dokümantasyon

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| DOC-001 | API documentation (TypeDoc update) | `docs/api/` | 2 saat |
| DOC-002 | Contributing guide | `CONTRIBUTING.md` | 2 saat |
| DOC-003 | Architecture decision records | `docs/adr/` | 3 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| DOC-004 | Video walkthrough | External | 1 gün |
| DOC-005 | Changelog maintenance | `CHANGELOG.md` | Ongoing |

---

## 🚀 Deployment & DevOps

### 🟡 P2 - Orta

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| DEV-001 | CI/CD pipeline (GitHub Actions) | `.github/workflows/` | 4 saat |
| DEV-002 | Staging environment | Railway | 2 saat |
| DEV-003 | Automated E2E on PR | GitHub Actions | 3 saat |

### 🟢 P3 - Düşük

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| DEV-004 | Sentry error tracking integration | Optional | 3 saat |
| DEV-005 | PostHog analytics | Optional | 2 saat |

---

## 🔗 Web3 & Blockchain

### 🟢 P3 - Gelecek

| ID | Task | Dosya/Alan | Effort |
|----|------|------------|--------|
| WEB3-001 | Phantom wallet connect | `services/WalletService.ts` | 1 gün |
| WEB3-002 | Session signing (Solana) | Edge Function | 1 gün |
| WEB3-003 | Achievement NFT contract | Metaplex | 2-3 gün |
| WEB3-004 | NFT minting flow | UI + Backend | 2 gün |
| WEB3-005 | Token rewards distribution | Smart contract | 1 hafta |

---

## 📊 Özet İstatistikler

| Kategori | Toplam Task | P0 | P1 | P2 | P3 |
|----------|-------------|----|----|----|----|
| Güvenlik | 10 | 3 | 4 | 3 | 0 |
| PWA | 6 | 0 | 3 | 3 | 0 |
| Gameplay | 10 | 0 | 3 | 4 | 3 |
| UI/UX | 9 | 0 | 2 | 4 | 3 |
| Audio | 5 | 0 | 0 | 3 | 2 |
| Performance | 6 | 0 | 0 | 4 | 2 |
| Testing | 7 | 0 | 0 | 4 | 3 |
| Docs | 5 | 0 | 0 | 3 | 2 |
| DevOps | 5 | 0 | 0 | 3 | 2 |
| Web3 | 5 | 0 | 0 | 0 | 5 |
| **TOPLAM** | **68** | **3** | **12** | **31** | **22** |

---

## 🎯 Önerilen Sprint Planı

### Sprint 1 (Bu Hafta) - Güvenlik Temeli
- [x] SEC-001: Lint fixes ✅
- [x] UI-008: Localization (6 dil) ✅
- [x] Test coverage düzeltmeleri (1479 test) ✅
- [x] Market data flow fixes ✅
- [x] Performance optimizations ✅
- [ ] SEC-001: Session signing
- [ ] SEC-002: Replay hash validation
- [ ] PWA-001: manifest.json
- [ ] PWA-002: App icons

### Sprint 2 (Gelecek Hafta) - PWA & Anti-Cheat
- [ ] PWA-003: Service worker
- [ ] SEC-004: Client obfuscation
- [ ] SEC-005: DevTools detection
- [ ] UI-001: Tutorial screens

### Sprint 3 - Gameplay Expansion
- [ ] GAME-001: Boss system
- [ ] GAME-002: Boss UI
- [ ] GAME-004: New enemies

### Sprint 4 - Polish & Launch Prep
- [ ] PERF-001: Lighthouse audit
- [ ] DOC-001: API docs update
- [ ] DEV-001: CI/CD pipeline

---

> 💡 Bu döküman sürekli güncellenir. Her tamamlanan task için [x] işareti ekleyin.
