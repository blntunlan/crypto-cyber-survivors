# Beta Readiness Checklist

> **Status** live
> Owner: Engineering, QA, Backend, Game Design

Bu belge Crypto Survivors betaya hazırlanırken sırayla işlenecek eksik, düzeltme ve doğrulama listesidir. Liste aktif kod yollarına ve aktif dokümantasyona göre hazırlanmıştır; arşivdeki eski roadmap maddeleri yalnızca tarihsel referans kabul edilir.

## Kullanım Kuralı

- P0 maddeleri kapanmadan beta açılmaz.
- P1 maddeleri beta adayı dondurulmadan önce kapatılır veya yazılı risk kabulü alınır.
- P2 maddeleri beta sonrası ilk stabilizasyon sprintine taşınabilir.
- Her madde için ilgili test, manuel doğrulama veya operasyon çıktısı linklenir.
- Yeni özellik eklenirse önce bu listedeki bağlı stabilizasyon maddesi tekrar değerlendirilir.

## Beta Hazır Tanımı

| Alan | Minimum Kabul Kriteri |
|---|---|
| Kod kapıları | `npm run check:baseline` yeşil |
| Market backend | Railway aggregator ve API health kontrolleri yeşil |
| Ödül ekonomisi | Durable coin kaynağı yalnızca Railway verify akışı |
| Oyun döngüsü | Desktop ve mobil hedeflerde stabil 60 FPS profili |
| QA | Kritik oyun, market, cüzdan, offline ve reconnect akışları testli |
| Güvenlik | JWT, rate limit, anti-cheat ve telemetry guardrail kontrolleri tamam |
| Operasyon | Deploy, rollback, env, monitoring ve incident notları hazır |

## P0 Beta Bloklayıcılar

- [x] **Baseline kapısını yeşile al**: `npm run check:baseline` çalışmalı; typecheck, singleton guardrail, lint, unit test ve production build geçmeli.
- [x] **Market server doğrulamasını çalıştır**: `cd railway-market-server && npm run validate` geçmeli; aggregator ve API server build/lint/typecheck uyumlu olmalı.
- [x] **Session lifecycle uçtan uca doğrula**: start session, gameplay, market sync flush, signed verify, wallet refresh ve session cleanup tek senaryoda geçmeli.
- [x] **Reward settlement otoritesini kilitle**: client sadece anlık UI feedback vermeli; kalıcı bakiye yalnızca Railway `/api/v1/sessions/verify` sonucuyla güncellenmeli.
- [x] **RewardCalculator parity testlerini tamamla**: client ve Railway `RewardCalculator` death, afk death, cycle complete, take profit, stop loss, flow exit ve forced portal değerlerinde aynı sonucu üretmeli.
- [x] **Verify idempotency testini tamamla**: aynı session iki kez gönderildiğinde coin double-credit olmamalı ve response deterministik kalmalı.
- [x] **Offline verification queue senaryosunu doğrula**: bağlantı yokken biten run queue'ya girmeli, reconnect sonrası retry etmeli ve kalıcı başarısızlık net raporlanmalı.
- [x] **MarketSyncQueue flush garantisini test et**: verify öncesi audit tick batch'leri gönderilmeli; flush hatasında kullanıcıya net retry veya pending state gösterilmeli.
- [x] **SSE market stream dayanıklılığını doğrula**: reconnect, stale data warning, fallback price, fatal disconnect ve recovery eventleri manuel ve otomatik testlerden geçmeli.
- [x] **DifficultyContext reset regresyonunu kapat**: game over, cash out, liquidation ve cycle continue sonrası difficulty state sızıntısı olmadığını testle.
- [x] **Pause-aware timing audit yap**: gameplay timer'ları native `setTimeout` yerine `TimeService` veya pause-aware lifecycle kullanmalı.
- [ ] **Mobile input kritik yolunu doğrula**: joystick, dash, pause, cash out, orientation, small-screen HUD ve touch hitbox kontrolleri gerçek cihazda geçmeli; otomasyon desteği geçti, gerçek cihaz sign-off [Mobile Beta QA Checklist](/docs/workflows/MOBILE_BETA_QA_CHECKLIST) üzerinden bekliyor.
- [ ] **Runtime FPS kabulünü ölç**: low, medium ve high profile cihazlarda 5 dakikalık run sırasında avg FPS, 1% low FPS, heap growth ve frame drop raporu alınmalı; Chromium otomasyon smoke geçti, gerçek cihaz/profil raporu bekliyor.
- [ ] **Security env kapılarını doğrula**: JWT secret, API URL, market aggregator URL, anti-cheat flags, Cloudflare optional config ve Railway env değerleri prod/beta ortamında eksiksiz olmalı; local contract ve secretsız CLI guardrail hazır, Railway sign-off [Beta Env Guardrail](/docs/workflows/BETA_ENV_GUARDRAIL) üzerinden bekliyor.
- [x] **Rate limit ve public ingest guardrail testini yap**: telemetry, errors, cheat attempts, sessions sync ve verify endpointleri abuse yükünde beklenen status code ile cevap vermeli.
- [x] **Beta smoke test senaryosunu kilitle**: fresh user, returning user, guest/offline fallback, market disconnected, game over, portal exit ve wallet refresh akışları [Beta Smoke Test Checklist](/docs/workflows/BETA_SMOKE_TEST_CHECKLIST) içinde sabitlendi; Chromium otomasyon smoke geçti, portal exit manuel sign-off olarak takip ediliyor.

## P1 Beta Adayı Tamamlayıcıları

- [ ] **Coverage risklerini düşür**: renderer, inventory, spawner, GameEngine edge path ve SpawnSystem kısmi alanları için hedefli test ekle.
- [ ] **E2E matrisini güncelle**: Chromium, Firefox, WebKit ve mobile Chrome için critical path, a11y, network error ve performance suite geçmeli; komut seti ve kabul kriteri [Beta E2E Matrix](/docs/workflows/BETA_E2E_MATRIX) içinde sabitlendi, tam browser matrix geçişi bekliyor.
- [x] **Backend API contract dokümanı oluştur**: route, auth, payload, response, error, rate limit ve DB ownership [Beta Backend API Contract](/docs/workflows/BETA_BACKEND_API_CONTRACT) içinde toplandı.
- [x] **SSE contract dokümanını detaylandır**: payload alanları, heartbeat, reconnect, history warmup ve client fallback davranışı [Beta SSE Market Contract](/docs/workflows/BETA_SSE_MARKET_CONTRACT) içinde açık yazıldı.
- [x] **DB object ownership dokümante et**: stored procedure, view, trigger, migration ve cleanup cron bağımlılıkları [Backend & DB Architecture](/docs/architecture/BACKEND_DB_ARCHITECTURE) içine eklendi.
- [x] **Telemetry ve analytics doğrulaması yap**: error report, performance metrics, cheat attempt ve admin dashboard summary verileri backend route testleriyle görünür kılındı.
- [x] **Replay kayıt yolunu doğrula**: replay size limit, save failure, upload/storage TODO ve verification payload ilişkisi [Replay & Anti-Cheat Validation](/docs/architecture/REPLAY_AND_VALIDATION) içinde karar altına alındı.
- [x] **Legal ve risk metinlerini son oku**: market data disclaimer, beta terms, privacy, telemetry disclosure ve crypto-financial language [Beta Legal Risk Copy Review](/docs/workflows/BETA_LEGAL_RISK_COPY_REVIEW) içinde sınırlandı.
- [x] **Onboarding sürtünmesini test et**: nickname validation, auth handoff, position seçimi, market connecting state ve first-run tutorial akışı [Beta Onboarding QA](/docs/workflows/BETA_ONBOARDING_QA) içinde ölçüldü.
- [x] **Audio ve settings persistence kontrolü yap**: mute, volume, quality profile, control settings ve reduced effects tercihleri refresh sonrası [Beta Settings Persistence QA](/docs/workflows/BETA_SETTINGS_PERSISTENCE_QA) içinde testlendi.
- [x] **Bundle budget raporu çıkar**: production build chunk boyutları [Beta Bundle Budget Report](/docs/workflows/BETA_BUNDLE_BUDGET_REPORT) içinde kaydedildi; JS/CSS beta için kabul edildi, PNG asset optimizasyonu P2'ye taşındı.
- [x] **Beta feedback kanalı bağla**: otomatik in-game telemetry, e-posta, GitHub beta issue template'i, Discord/Twitter bekleme durumu, admin triage notları ve issue label akışı [Beta Feedback Triage](/docs/workflows/BETA_FEEDBACK_TRIAGE) içinde netleşti.

## P2 Beta Sonrası İlk Sprint

- [ ] **Unused dependency temizliği yap**: beta audit raporunda işaretlenen devDependency ve config bağımlılıkları doğrulanıp sadeleştirilmeli.
- [ ] **Bundle splitting uygula**: admin, docs, landing veya debug-only yüzeyler ana oyun chunk'ından ayrılmalı.
- [ ] **Achievement backend TODO'larını planla**: Railway achievement endpointleri ve UI sync akışı ayrı feature slice olarak ele alınmalı.
- [ ] **Replay storage ürün kararını ver**: replay upload saklama maliyeti, retention policy ve anti-cheat değeri birlikte netleştirilmeli.
- [ ] **Docs navigation bakımını tamamla**: aktif dokümanlar güncel kalmalı; tamamlanan roadmap ve stale reports arşive taşınmalı.
- [ ] **Beta telemetry dashboard geliştirmesi yap**: cohort, device profile, crash-free sessions, reconnect rate ve verification fail rate görünür hale getirilmeli.
- [ ] **Balance tuning pass yap**: canlı beta verisiyle spawn pressure, reward pacing, portal frequency ve leverage risk eğrileri yeniden ayarlanmalı.

## Sıralı Çalışma Planı

| Sıra | Paket | Çıktı |
|---|---|---|
| 1 | Baseline freeze | Yeşil `check:baseline` ve market server `validate` çıktısı |
| 2 | Session and rewards | Verify, idempotency, wallet refresh ve parity testleri |
| 3 | Market reliability | SSE reconnect, MarketSyncQueue ve fatal disconnect testleri |
| 4 | Runtime lifecycle | Difficulty reset, pause timing, game over ve cash out regresyonları |
| 5 | Mobile and performance | Gerçek cihaz FPS, memory ve input raporları |
| 6 | Security hardening | Env, JWT, rate limit, telemetry abuse ve anti-cheat kontrolleri |
| 7 | QA expansion | E2E matrix, coverage hot spots ve manual smoke checklist |
| 8 | Docs and contracts | Backend API, SSE, DB ownership ve operations runbook güncellemeleri |
| 9 | UX readiness | Onboarding, legal copy, settings persistence ve feedback kanalı |
| 10 | Release rehearsal | Deploy, rollback, monitoring, incident owner ve beta launch notes |

## Çalışma Sırasında Açılacak Kanıtlar

- Her P0 madde için test komutu veya manuel test kaydı.
- Her backend madde için endpoint response örneği veya health-check çıktısı.
- Her performans madde için cihaz, tarayıcı, profil, run süresi, avg FPS, 1% low FPS ve heap değişimi.
- Her güvenlik madde için env adı, beklenen davranış ve başarısızlık modu.
- Her dokümantasyon maddesi için güncellenen `docs/` ve `public/docs/` dosya linki.

## Kanıt Logu

| Tarih | Checklist Maddesi | Kanıt | Sonuç |
|---|---|---|---|
| 2026-06-16 | Baseline kapısını yeşile al | `npm run check:baseline`; typecheck, architecture guardrail, lint, 247 test dosyası, 2455 test ve production build geçti | Geçti |
| 2026-06-16 | Market server doğrulamasını çalıştır | `cd railway-market-server && npm run validate`; typecheck, lint ve build geçti | Geçti |
| 2026-06-16 | Reward settlement otoritesini kilitle | `npx vitest run tests/services/gameplay/RewardCalculatorParity.test.ts tests/services/auth/GameSessionService.submit.test.ts tests/services/VerificationQueue.test.ts tests/hooks/useGameFlowController.test.ts`; cash out optimistic credit kullanmıyor, submit verify akışına gidiyor, verified olmayan server response bakiye yazmıyor | Geçti |
| 2026-06-16 | RewardCalculator parity testlerini tamamla | `RewardCalculatorParity.test.ts` forced portal vakasıyla genişletildi; `npm run test` 247 dosya ve 2455 test ile geçti | Geçti |
| 2026-06-16 | Verify idempotency testini tamamla | `railway-market-server/tests/routes/sessionsVerify.test.ts`; already verified ve transaction lock duplicate path 409 dönüyor, reward transaction double-credit'e ilerlemiyor; `cd railway-market-server && npm run test` 13 dosya ve 82 test ile geçti | Geçti |
| 2026-06-16 | Offline verification queue senaryosunu doğrula | `VerificationQueue.test.ts` queue persistence, offline pause, retry, max retry cleanup, reconnect success ve `verification:failed` kalıcı hata eventini kapsıyor; `npm run test` 247 dosya ve 2455 test ile geçti | Geçti |
| 2026-06-16 | MarketSyncQueue flush garantisini test et | `GameSessionService.submit.test.ts` flush incomplete veya rejected olduğunda `/api/v1/sessions/verify` çağrısını durduruyor ve `verification:queued` pending event'i yayıyor; `npm run lint`, `npm run typecheck`, `npm run test` 247 dosya ve 2455 test ile geçti | Geçti |
| 2026-06-16 | Session lifecycle uçtan uca doğrula | `SessionLifecycle.test.ts`; start → flush → signed verify → wallet → cleanup tam senaryo, flush failure guard, double submit idempotency, missing session guard ve payload integrity (exitType/portalType/maxStreak) testleri; 251 dosya ve 2515 test ile geçti | Geçti |
| 2026-06-16 | SSE market stream dayanıklılığını doğrula | `SSEMarketService.test.ts`; 22 test: connection lifecycle, data gap detection, synthetic fallback emission, fatal disconnect (30s), reconnect, visibility change, connection timeout ve status reporting; 251 dosya ve 2515 test ile geçti | Geçti |
| 2026-06-16 | DifficultyContext reset regresyonunu kapat | `DifficultyContextReset.test.ts`; 17 test: gameOver/death, cashOut, liquidation, cycle continue, gameReset, ResetOrchestrator ve cross-scenario regressions; cycleFactor compounding sızıntısı yok; 251 dosya ve 2515 test ile geçti | Geçti |
| 2026-06-16 | Pause-aware timing audit yap | `PauseAwareTimingAudit.test.ts`; TimeService pause/resume davranışı (delta=0, game time freeze, secondElapsed event freeze), setTimeout/setInterval static audit (gameplay-critical services temiz), allowlist ile accounting; 251 dosya ve 2515 test ile geçti | Geçti |
| 2026-06-17 | Session lifecycle uçtan uca doğrula | `npx vitest run tests/services/market/SSEMarketService.test.ts tests/components/GameAppShell.wallet.test.tsx tests/services/CoinService.test.ts tests/services/auth/SessionLifecycle.test.ts tests/services/auth/GameSessionService.submit.test.ts`; 5 dosya ve 86 test geçti; `npm run typecheck` geçti | Geçti |
| 2026-06-17 | SSE market stream dayanıklılığını doğrula | `npx eslint tests/services/market/SSEMarketService.test.ts`; `npx vitest run tests/services/market/SSEMarketService.test.ts`; 25 test geçti; `npm run typecheck` geçti | Geçti |
| 2026-06-17 | Mobile input kritik yolunu doğrula | `npx vitest run tests/MobileControls.test.tsx tests/components/mobile/DashButton.test.tsx tests/hooks/useGameInput.test.ts`; 9 test geçti. `npx vitest run tests/components/GameUI.test.tsx tests/integration/MobilePauseButton.test.ts tests/hooks/useCycleDecision.test.ts`; 19 test geçti. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/mobile-touch-controls.spec.ts --project=mobile-chrome`; 36 test geçti. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/mobile-hud.spec.ts --project=mobile-chrome`; 6 test geçti. Gerçek cihaz sign-off bekliyor | Kısmi |
| 2026-06-17 | Runtime FPS kabulünü ölç | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/performance/fps.spec.ts --project=chromium`; FPS smoke avg 131, min 110, memory growth -5.62 MB, 2 test geçti. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/performance/memory-leak.spec.ts --project=chromium`; 5 cycle heap growth 12.92 MB, 1 test geçti. 5 dakikalık low/medium/high gerçek cihaz raporu bekliyor | Kısmi |
| 2026-06-18 | Security env kapılarını doğrula | `BetaEnvContract.ts`, `scripts/check-beta-env.ts` ve `.env.example` contract güncellendi. `npx vitest run tests/config/BetaEnvContract.test.ts` 6 test geçti. Dummy frontend/api env ile `npm run check:beta-env -- --scope frontend --profile beta` ve `--scope api-server` geçti. `railway whoami --json` / `railway status --json` unauthorized döndü; prod/beta Railway sign-off bekliyor | Kısmi |
| 2026-06-18 | Rate limit ve public ingest guardrail testini yap | `railway-market-server/tests/middleware/rateLimit.test.ts`; global 100/min, auth 20/min, write 50/min, telemetry 10/min, leaderboard 30/min 429 davranışı ve sessions/telemetry/market route wiring test edildi. `cd railway-market-server && npx vitest run tests/middleware/rateLimit.test.ts` 11 test geçti; `cd railway-market-server && npm run validate` geçti | Geçti |
| 2026-06-18 | Beta smoke test senaryosunu kilitle | `e2e/beta-smoke.spec.ts`; fresh user, corrupt guest fallback, returning user wallet/gameplay, game over wallet refresh, cycle cash out ve market disconnect recovery kapsandı. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/beta-smoke.spec.ts --project=chromium` 6 test geçti | Geçti |
| 2026-06-18 | E2E matrisini güncelle | `test:e2e:beta:critical`, `test:e2e:beta:quality` ve `test:e2e:beta:matrix` scriptleri eklendi. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:critical` 12 test geçti; `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:quality` 12 test geçti. Global Chrome fallback sadece Chromium projelerine taşındı. `npm run test:e2e:beta:matrix` Chromium/mobile 12 test geçti; Firefox/WebKit Playwright binary eksikliği ve install timeout nedeniyle bloklu | Kısmi |
| 2026-06-19 | Backend API contract dokümanı oluştur | [Beta Backend API Contract](/docs/workflows/BETA_BACKEND_API_CONTRACT); Railway API server route/auth/rate-limit/payload/error/DB ownership sözleşmesi `railway-market-server/src/index.ts`, `railway-market-server/src/routes/*` ve `railway-market-server/src/db/validation.ts` üzerinden çıkarıldı | Geçti |
| 2026-06-19 | SSE contract dokümanını detaylandır | [Beta SSE Market Contract](/docs/workflows/BETA_SSE_MARKET_CONTRACT); stream payload, heartbeat, reconnect, visibility reconnect, 8s fallback, 30s fatal disconnect, history warmup ve aggregator deployment guardrail sözleşmesi `marketStream.ts`, `SSEMarketService.ts`, `MarketApiClient.ts` ve `useMarketData.ts` üzerinden çıkarıldı | Geçti |
| 2026-06-19 | DB object ownership dokümante et | [Backend & DB Architecture](/docs/architecture/BACKEND_DB_ARCHITECTURE); Railway-first stored procedure, view, trigger, migration ve cleanup cron ownership matrix’i `railway-market-server/src/db/schema.sql`, `railway-market-server/src/db/migrations/*.sql`, `railway-market-server/src/cron/cleanup.ts` ve `railway-market-aggregator/src/cron/cleanup.ts` üzerinden çıkarıldı | Geçti |
| 2026-06-19 | Telemetry ve analytics doğrulaması yap | `cd railway-market-server && npx vitest run tests/routes/telemetryAdminVisibility.test.ts`; error report, cheat attempt, device profile ve performance metric ingest pathleri ile `/api/v1/admin/dashboard` telemetry summary alanları doğrulandı. `cd railway-market-server && npm run validate` geçti | Geçti |
| 2026-06-19 | Replay kayıt yolunu doğrula | `cd railway-market-server && npx vitest run tests/routes/replays.test.ts`; verified session guard, owned session check, decoded 500KB limit, duplicate save conflict ve public replay download base64 payload doğrulandı. Replay save artık sadece başarılı verified session submission sonrası çağrılıyor; object storage beta dışı, DB `BYTEA` storage aktif | Geçti |
| 2026-06-19 | Legal ve risk metinlerini son oku | [Beta Legal Risk Copy Review](/docs/workflows/BETA_LEGAL_RISK_COPY_REVIEW); market data entertainment-only, not financial advice, virtual-only rewards, optional wallet/no custody, telemetry disclosure, beta reset ve disallowed crypto-financial claims contractı oluşturuldu | Geçti |
| 2026-06-19 | Onboarding sürtünmesini test et | `npx vitest run tests/auth/NicknameValidator.test.ts tests/services/auth/NicknameValidator.test.ts tests/screens/NicknameEntryScreen.test.tsx tests/services/auth/UserSessionService.test.ts tests/services/auth/RailwayAuthService.test.ts tests/screens/MainMenu.test.tsx tests/integration/GameStartFlow.test.tsx tests/components/GameAppShell.wallet.test.tsx`; 8 dosya, 107 test geçti. `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/tutorial-flow.spec.ts --project=chromium`; 2 test geçti | Geçti |
| 2026-06-19 | Audio ve settings persistence kontrolü yap | `npx vitest run tests/stores/gameStore.test.ts tests/services/DeviceBenchmarkService.test.ts`; store rehydrate mute/volume, sound mixer, gameplay controls, mobile controls, reduced motion ve manual quality profile reload senaryolarını doğruladı | Geçti |
| 2026-06-19 | Bundle budget raporu çıkar | `npm run build`; Vite production build geçti, 2576 module transform edildi, chunk warning yok. Initial payload 1443.62 kB raw / 388.38 kB gzip; toplam JS 1965.48 kB raw / 559.41 kB gzip; toplam PNG asset 25401.79 kB raw olarak P2 optimizasyon riski kaydedildi | Geçti |
| 2026-06-19 | Beta feedback kanalı bağla | `.github/ISSUE_TEMPLATE/beta_feedback.md` eklendi; `docs/workflows/BETA_FEEDBACK_TRIAGE.md` otomatik telemetry, e-posta, GitHub issue labels, Discord/Twitter bekleme durumu ve admin triage akışını tanımlıyor | Geçti |

## Referans Dokümanlar

- [Stabilization Protocol](/docs/workflows/STABILIZATION_PROTOCOL)
- [Mobile Beta QA Checklist](/docs/workflows/MOBILE_BETA_QA_CHECKLIST)
- [Beta Env Guardrail](/docs/workflows/BETA_ENV_GUARDRAIL)
- [Beta Smoke Test Checklist](/docs/workflows/BETA_SMOKE_TEST_CHECKLIST)
- [Beta E2E Matrix](/docs/workflows/BETA_E2E_MATRIX)
- [Beta Backend API Contract](/docs/workflows/BETA_BACKEND_API_CONTRACT)
- [Beta SSE Market Contract](/docs/workflows/BETA_SSE_MARKET_CONTRACT)
- [Beta Legal Risk Copy Review](/docs/workflows/BETA_LEGAL_RISK_COPY_REVIEW)
- [Beta Onboarding QA](/docs/workflows/BETA_ONBOARDING_QA)
- [Beta Settings Persistence QA](/docs/workflows/BETA_SETTINGS_PERSISTENCE_QA)
- [Beta Bundle Budget Report](/docs/workflows/BETA_BUNDLE_BUDGET_REPORT)
- [Beta Feedback Triage](/docs/workflows/BETA_FEEDBACK_TRIAGE)
- [Backend & DB Architecture](/docs/architecture/BACKEND_DB_ARCHITECTURE)
- [Replay and Validation](/docs/architecture/REPLAY_AND_VALIDATION)
- [Rewards and Verification](/docs/workflows/rewards-and-verification)
- [Difficulty Pipeline](/docs/workflows/difficulty-pipeline)
- [Replay and Validation](/docs/architecture/REPLAY_AND_VALIDATION)
- [Security Architecture](/docs/services/SECURITY_ARCHITECTURE)
- [Market Server Infrastructure](/docs/architecture/MARKET_SERVER_INFRASTRUCTURE)
- [Testing and QA Strategy](/docs/workflows/TESTING_STRATEGY)
