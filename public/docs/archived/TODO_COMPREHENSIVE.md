# 📋 Crypto Cyber Survivors - Comprehensive TODO

> All project gaps, technical debt, and future features.
> Last Updated: 2026-01-20 23:39

---

## 🎯 Priority Descriptions

| Priority | Description |
|---------|----------|
| 🔴 P0 | **Critical** - Mandatory before launch |
| 🟠 P1 | **High** - Important for launch |
| 🟡 P2 | **Medium** - Improvement |
| 🟢 P3 | **Low** - Nice-to-have |

---

## 🛡️ Security & Anti-Cheat

### 🔴 P0 - Critical

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| SEC-001 | Session signing implementation | `services/verification/` | 4 hours |
| SEC-002 | Replay hash storage & validation | `supabase/functions/verify-game/` | 6 hours |
| SEC-003 | Rate limiting (score submission) | Edge Function | 2 hours |

### 🟠 P1 - High

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| SEC-004 | Client-side obfuscation (Terser config) | `vite.config.ts` | 3 hours |
| SEC-005 | DevTools detection (warning log) | `services/AntiCheatService.ts` | 2 hours |
| SEC-006 | Anomaly detection rules | Edge Function | 4 hours |
| SEC-007 | Memory integrity checks | `services/AntiCheatService.ts` | 3 hours |

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| SEC-008 | Full replay verification (simulation) | Railway worker | 1 day |
| SEC-009 | Ban system UI | Admin Dashboard | 4 hours |
| SEC-010 | CAPTCHA on high scores | `components/screens/` | 3 hours |

---

## 📱 PWA & Offline

### 🟠 P1 - High

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| PWA-001 | ~~manifest.json creation~~ | `public/manifest.json` | ✅ Completed |
| PWA-002 | ~~App icons (192x192, 512x512)~~ | `public/icons/` | ✅ Completed |
| PWA-003 | ~~Service worker (asset caching)~~ | `public/sw.js` | ✅ Completed |

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| PWA-004 | ~~Install prompt UI~~ | `components/ui/PWAInstallPrompt.tsx` | ✅ Completed |
| PWA-005 | ~~Offline fallback page~~ | `public/offline.html` | ✅ Completed |
| PWA-006 | Background sync (score queue) | Service Worker | 🔶 In Progress |

---

## 🎮 Gameplay Features

### 🟠 P1 - High

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| GAME-001 | Boss enemy system | `services/SpawnSystem.ts`, `config/BossConfig.ts` | 2-3 days |
| GAME-002 | Boss health bar UI | `components/hud/BossHealthBar.tsx` | 3 hours |
| GAME-003 | Boss attack patterns | `services/BossAI.ts` | 1 day |

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| GAME-004 | New enemy types (3+) | `config/EnemyRegistry.ts` | 1 day |
| GAME-005 | Multiple characters | `config/CharacterRegistry.ts` | 2-3 days |
| GAME-006 | Daily challenges | `services/ChallengeService.ts` | 2 days |
| GAME-007 | Achievement badges | `services/AchievementService.ts` | 1 day |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| GAME-008 | Seasonal leaderboards | Supabase + UI | 1-2 days |
| GAME-009 | Spectator mode | New architecture required | 1 week |
| GAME-010 | Co-op multiplayer | WebSocket server | 2-3 weeks |

---

## 🎨 UI/UX Improvements

### 🟠 P1 - High

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| UI-001 | Tutorial/Onboarding screens | `components/screens/TutorialScreen.tsx` | 4 hours |
| UI-002 | First-time user flow | `hooks/useTutorial.ts` | 2 hours |

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| UI-003 | Loading skeleton screens | `components/ui/Skeleton.tsx` | 2 hours |
| UI-004 | Social sharing buttons | GameOverScreen | 2 hours |
| UI-005 | Accessibility improvements (ARIA) | All interactive elements | 1 day |
| UI-006 | Keyboard navigation (all menus) | `hooks/useMenuNav.ts` | 3 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| UI-007 | Dark/Light theme toggle | `contexts/ThemeContext.tsx` | 3 hours |
| UI-008 | ~~Localization (i18n)~~ | `locales/` | ✅ Completed (6 languages) |
| UI-009 | Custom cursor | CSS | 1 hour |

---

## 🔊 Audio Improvements

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| AUD-001 | Howler.js migration (optional) | `services/audio/` | 1 day |
| AUD-002 | Background music loop | `services/audio/MusicService.ts` | 4 hours |
| AUD-003 | Audio sprites (single file) | Build optimization | 3 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| AUD-004 | More SFX variations | `config/AudioRegistry.ts` | 2 hours |
| AUD-005 | Adaptive music (market-based) | `services/audio/` | 4 hours |

---

## ⚡ Performance Optimizations

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| PERF-001 | Lighthouse audit & fixes | General | 4 hours |
| PERF-002 | Bundle size analysis | `vite.config.ts` | 2 hours |
| PERF-003 | Image lazy loading | Components | 2 hours |
| PERF-004 | Tree shaking optimization | Build config | 2 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| PERF-005 | Web Worker for physics | `workers/physics.worker.ts` | 1 day |
| PERF-006 | WASM for collision detection | Rust/WASM | 1 week |

---

## 🧪 Test Coverage Expansion

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| TEST-001 | Boss system tests | `tests/BossSystem.test.ts` | 2 hours |
| TEST-002 | PWA manifest tests | `tests/pwa/` | 1 hour |
| TEST-003 | Offline behavior E2E | `e2e/offline.spec.ts` | 2 hours |
| TEST-004 | Anti-cheat detection tests | `tests/AntiCheat.test.ts` | 2 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| TEST-005 | Visual regression (full suite) | Playwright | 1 day |
| TEST-006 | Performance benchmarks | Vitest bench | 3 hours |
| TEST-007 | Stress testing (1000+ entities) | Custom script | 4 hours |

---

## 📚 Documentation

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| DOC-001 | API documentation (TypeDoc update) | `docs/api/` | 2 hours |
| DOC-002 | Contributing guide | `CONTRIBUTING.md` | 2 hours |
| DOC-003 | Architecture decision records | `docs/adr/` | 3 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| DOC-004 | Video walkthrough | External | 1 day |
| DOC-005 | Changelog maintenance | `CHANGELOG.md` | Ongoing |

---

## 🚀 Deployment & DevOps

### 🟡 P2 - Medium

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| DEV-001 | CI/CD pipeline (GitHub Actions) | `.github/workflows/` | 4 hours |
| DEV-002 | Staging environment | Railway | 2 hours |
| DEV-003 | Automated E2E on PR | GitHub Actions | 3 hours |

### 🟢 P3 - Low

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| DEV-004 | Sentry error tracking integration | Optional | 3 hours |
| DEV-005 | PostHog analytics | Optional | 2 hours |

---

## 🔗 Web3 & Blockchain

### 🟢 P3 - Future

| ID | Task | File/Area | Effort |
|----|------|------------|--------|
| WEB3-001 | Phantom wallet connect | `services/WalletService.ts` | 1 day |
| WEB3-002 | Session signing (Solana) | Edge Function | 1 day |
| WEB3-003 | Achievement NFT contract | Metaplex | 2-3 days |
| WEB3-004 | NFT minting flow | UI + Backend | 2 days |
| WEB3-005 | Token rewards distribution | Smart contract | 1 week |

---

## 📊 Summary Statistics

| Category | Total Tasks | P0 | P1 | P2 | P3 |
|----------|-------------|----|----|----|----|
| Security | 10 | 3 | 4 | 3 | 0 |
| PWA | 6 | 0 | 3 | 3 | 0 |
| Gameplay | 10 | 0 | 3 | 4 | 3 |
| UI/UX | 9 | 0 | 2 | 4 | 3 |
| Audio | 5 | 0 | 0 | 3 | 2 |
| Performance | 6 | 0 | 0 | 4 | 2 |
| Testing | 7 | 0 | 0 | 4 | 3 |
| Docs | 5 | 0 | 0 | 3 | 2 |
| DevOps | 5 | 0 | 0 | 3 | 2 |
| Web3 | 5 | 0 | 0 | 0 | 5 |
| **TOTAL** | **68** | **3** | **12** | **31** | **22** |

---

## 🎯 Proposed Sprint Plan

| Sprint | Focus | Tasks | Status |
|:---|:---|:---|:---|
| **Sprint 1** | **Security Foundation** | Lint fixes, Localization (6 languages), Test coverage fixes, Market data synchronization, Performance optimizations, Session signing (SEC-001), Replay hash validation (SEC-002), manifest.json (PWA-001), App icons (PWA-002) | 🔶 In Progress |
| **Sprint 2** | **PWA & Anti-Cheat** | Service worker (PWA-003), Client obfuscation (SEC-004), DevTools detection (SEC-005), Tutorial screens (UI-001) | ⬜ Planned |
| **Sprint 3** | **Gameplay Expansion** | Boss system (GAME-001), Boss UI (GAME-002), New enemies (GAME-004) | ⬜ Planned |
| **Sprint 4** | **Polish & Launch Prep** | Lighthouse audit (PERF-001), API docs update (DOC-001), CI/CD pipeline (DEV-001) | ⬜ Planned |

---

// END OF PROTOCOL
