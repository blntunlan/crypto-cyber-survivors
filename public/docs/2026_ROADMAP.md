# 🗺️ Crypto Cyber Survivors - 2026 Roadmap

**Created**: 2026-01-18  
**Last Updated**: 2026-01-20  
**Current Version**: 0.1.0 (Beta)

---

## 📊 Project Status

```
████████████████████████████████████░░░░  80% COMPLETED
```

| Phase | Progress | Status |
|-----|----------|-------|
| Phase 1: Core Game | ████████████████████ 100% | ✅ Completed |
| Phase 2: Polish | ███████████████████░ 95% | ✅ Completed |
| Phase 3: Backend | ██████████████░░░░░░ 70% | 🔶 In Progress |
| Phase 4: Launch | ██████░░░░░░░░░░░░░░ 25% | 🔶 Started |

---

## 🏃 Sprint 1: Stabilization (This Week)

**Date**: 2026-01-18 → 2026-01-24  
**Goal**: Production-ready stabilization

### Core Tasks

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| RLS security fixes | ⭐⭐⭐⭐⭐ | 2h | ✅ Completed |
| Data flow fixes (UPSERT) | ⭐⭐⭐⭐⭐ | 2h | ✅ Completed |
| Add retry logic | ⭐⭐⭐⭐ | 1h | ✅ Completed |
| Add FK indexes | ⭐⭐⭐ | 30m | ✅ Completed |
| Deploy to Railway | ⭐⭐⭐ | 30m | ✅ Skipped (CI/CD) |
| Update documents | ⭐⭐ | 1h | ✅ Completed |

### 2026-01-20 Updates

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| Test coverage fixes (26 failing tests) | ⭐⭐⭐⭐⭐ | 3h | ✅ Completed |
| Multi-language support (ES, PT, HI, VI) | ⭐⭐⭐⭐ | 2h | ✅ Completed |
| Market data flow & synchronization | ⭐⭐⭐⭐ | 2h | ✅ Completed |
| Live Feed Disconnect fix | ⭐⭐⭐⭐ | 1h | ✅ Completed |
| PnL Shock detection fix | ⭐⭐⭐ | 1h | ✅ Completed |
| Lucky Star buff display fix | ⭐⭐⭐ | 30m | ✅ Completed |
| Retro mode performance optimization | ⭐⭐⭐ | 2h | ✅ Completed |
| Mobile dash distance adjustment | ⭐⭐ | 30m | ✅ Completed |
| Header animation improvements | ⭐⭐ | 30m | ✅ Completed |
| Memory & GC pressure optimization | ⭐⭐⭐ | 1h | ✅ Completed |
| GameRenderer & GameStateManager tests | ⭐⭐⭐ | 2h | ✅ Completed |

**Outputs:**
- [x] FRONTEND_DB_MAPPING.md
- [x] RAILWAY_SUPABASE_INTEGRATION.md
- [x] DATA_FLOW_FIX_REPORT.md
- [x] TODO_LIST.md
- [x] ARCHITECTURE.md
- [x] 6 language support (EN, TR, ES, PT, HI, VI)

---

## 🛡️ Sprint 2: Anti-Cheat (Next Week)

**Date**: 2026-01-25 → 2026-01-31  
**Goal**: Security for competitive integrity

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| Session signing (client) | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Session verification (server) | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Replay hash generation | ⭐⭐⭐⭐ | 3h | ⬜ |
| verify-replay edge function | ⭐⭐⭐⭐ | 3h | ⬜ |
| Anomaly detection rules | ⭐⭐⭐ | 4h | ⬜ |
| Shadow ban system | ⭐⭐⭐ | 2h | ⬜ |

**Details:** [ANTI_CHEAT_ROADMAP.md](./ANTI_CHEAT_ROADMAP.md)

---

## 📱 Sprint 3: PWA & UX (February 1st Week)

**Date**: 2026-02-01 → 2026-02-07  
**Goal**: Mobile experience improvement

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| PWA manifest.json | ⭐⭐⭐⭐ | 1h | ✅ Completed |
| Service worker (caching) | ⭐⭐⭐⭐ | 3h | ✅ Completed |
| Apple touch icons | ⭐⭐⭐ | 1h | ✅ Completed |
| Install prompt UI | ⭐⭐⭐ | 2h | ✅ Completed |
| Offline demo mode | ⭐⭐⭐ | 4h | ⬜ |
| Tutorial/Onboarding | ⭐⭐⭐ | 6h | ⬜ |
| Loading optimizations | ⭐⭐ | 2h | ⬜ |

---

## 🔧 Sprint 4: Refactoring (February 2nd Week)

**Date**: 2026-02-08 → 2026-02-14  
**Goal**: Code quality and ease of maintenance

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| App.tsx split (GameOrchestrator) | ⭐⭐⭐ | 4h | ⬜ |
| XState for game flow | ⭐⭐ | 6h | ⬜ |
| Service dependency injection | ⭐⭐ | 4h | ⬜ |
| Performance profiling | ⭐⭐⭐ | 3h | ⬜ |
| Lighthouse 90+ score | ⭐⭐⭐ | 2h | ⬜ |

---

## 🚀 Sprint 5: Soft Launch (February 3rd Week)

**Date**: 2026-02-15 → 2026-02-21  
**Goal**: Limited user testing

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| Beta tester onboarding | ⭐⭐⭐⭐⭐ | 4h | ⬜ |
| Feedback collection form | ⭐⭐⭐⭐ | 2h | ⬜ |
| Bug tracking setup | ⭐⭐⭐⭐ | 2h | ⬜ |
| Analytics dashboard | ⭐⭐⭐ | 4h | ⬜ |
| Discord server | ⭐⭐⭐ | 2h | ⬜ |
| First leaderboard season | ⭐⭐⭐ | 2h | ⬜ |

---

## 🌐 Sprint 6-7: Web3 Integration (March)

**Date**: 2026-03-01 → 2026-03-15  
**Goal**: Blockchain reward system

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| Wallet connect (Phantom) | ⭐⭐⭐⭐ | 6h | ⬜ |
| Wallet-based session signing | ⭐⭐⭐⭐ | 4h | ⬜ |
| Achievement NFT contract | ⭐⭐⭐ | 8h | ⬜ |
| NFT minting integration | ⭐⭐⭐ | 6h | ⬜ |
| Season rewards contract | ⭐⭐ | 8h | ⬜ |
| Token distribution UI | ⭐⭐ | 4h | ⬜ |

**Blockchain**: Solana (Low fee, fast)

---

## 📲 Sprint 8-9: Native Apps (April)

**Date**: 2026-04-01 → 2026-04-15  
**Goal**: App Store/Play Store

| Task | Priority | Duration | Status |
|------|---------|------|-------|
| Capacitor setup | ⭐⭐⭐ | 4h | ⬜ |
| iOS build configuration | ⭐⭐⭐ | 4h | ⬜ |
| Android build configuration | ⭐⭐⭐ | 4h | ⬜ |
| App icons & splash screens | ⭐⭐⭐ | 2h | ⬜ |
| App Store submission | ⭐⭐⭐⭐ | 8h | ⬜ |
| Play Store submission | ⭐⭐⭐⭐ | 4h | ⬜ |

**Details:** [NATIVE_APP_ROADMAP.md](./NATIVE_APP_ROADMAP.md)

---

## 🎮 Sprint 10+: Content Updates (Q2 2026)

**Goal**: Game content expansion

| Feature | Version | Status |
|---------|---------|-------|
| Boss battles | v0.2 | ⬜ |
| 4 new enemy types | v0.2 | ⬜ |
| 20 new cards | v0.2 | ⬜ |
| Multiple characters | v0.3 | ⬜ |
| Daily challenges | v0.3 | ⬜ |
| Seasonal themes | v0.4 | ⬜ |
| Co-op multiplayer | v1.0 | ⬜ |

---

## 📊 Timeline

```
2026
│
├── January ─────────────────────────────────────────
│   ├── [18] Sprint 1: Stabilization ✅
│   └── [25] Sprint 2: Anti-Cheat
│
├── February ────────────────────────────────────────
│   ├── [01] Sprint 3: PWA & UX
│   ├── [08] Sprint 4: Refactoring
│   └── [15] Sprint 5: SOFT LAUNCH 🚀
│
├── March ─────────────────────────────────────────
│   └── [01-15] Sprint 6-7: Web3 Integration
│
├── April ────────────────────────────────────────
│   ├── [01-15] Sprint 8-9: Native Apps
│   └── [15] App Store Launch 📱
│
├── May ────────────────────────────────────────
│   └── v0.2: Boss Battles + New Content
│
└── June ──────────────────────────────────────
    └── v0.3: Multiple Characters
```

---

## 🎯 KPI Goals

### Technical
| Metric | Current | Q1 Goal | Q2 Goal |
|--------|-------|----------|----------|
| Unit Tests | 1479 ✅ | 1600 | 2000 |
| E2E Tests | 342 ✅ | 100 | 150 |
| Lighthouse | ~85 | 90+ | 95+ |
| Bundle Size | 443KB (gzip) ✅ | <450KB | <500KB |
| Uptime | - | 99.5% | 99.9% |
| Language Support | 6 ✅ | 6 | 10 |

### Business
| Metric | Soft Launch | Q2 Goal |
|--------|-------------|----------|
| DAU | 100 | 5,000 |
| D1 Retention | 40% | 50% |
| D7 Retention | 15% | 25% |
| Avg Session | 5 min | 8 min |

---

## 🚧 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|----------|------|------------|
| Cheating epidemic | High | High | Sprint 2: Anti-cheat |
| Mobile performance | Medium | Medium | ✅ Device benchmark |
| Market data outage | Medium | High | ✅ Coinbase fallback |
| App Store rejection | Medium | Medium | Compliance review |
| Solana congestion | Low | Medium | Batch transactions |

---

## 📌 Decision Points

| Decision | Options | Deadline | Status |
|-------|-----------|----------|-------|
| NFT Blockchain | Solana vs Polygon | Feb 15 | ⬜ |
| Monetization | Free vs NFT-gated | Feb 15 | ⬜ |
| Token | New vs existing | March 1 | ⬜ |
| App Store | Apple vs Google first | April 1 | ⬜ |

---

## ✅ 2026-01-20 Completed Tasks

- [x] Test coverage fixes (1479 tests passed)
- [x] Multi-language support (ES, PT, HI, VI)
- [x] Market data flow synchronization
- [x] Live Feed Disconnect fix
- [x] PnL Shock detection fix
- [x] Lucky Star buff display fix
- [x] Retro mode performance optimization
- [x] Mobile dash distance adjustment
- [x] Header animation improvements
- [x] Memory & GC pressure optimization
- [x] GameRenderer & GameStateManager tests

## 🎯 Next Steps (Sprint 1 Remaining)

| Priority | Task | Estimated Time |
|---------|------|-------------|
| ⭐⭐⭐⭐⭐ | Expand E2E test suite | 2h |
| ⭐⭐⭐⭐ | PWA manifest.json preparation | 1h |
| ⭐⭐⭐⭐ | Performance profiling (Lighthouse) | 2h |
| ⭐⭐⭐ | Tutorial/Onboarding design | 3h |
| ⭐⭐⭐ | Sprint 2 Anti-cheat technical analysis | 2h |

---

## 📈 Sprint 1 Summary (2026-01-18 → 2026-01-24)

**Progress**: ██████████████████░░ 90%

| Category | Completed | Remaining |
|----------|------------|-------|
| Bug Fixes | 8 | 0 |
| Performance | 3 | 1 (Lighthouse) |
| Localization | 4 new languages | 0 |
| Testing | 1479 unit + 342 E2E | - |
| PWA | manifest, SW, icons | Install prompt |
| Docs | 6 files | 1 |

---

> 💡 This roadmap is a living document. It will be updated at the end of each sprint.
> 📅 Next update: 2026-01-24 (Sprint 1 Close)

// END OF PROTOCOL
