# Beta Launch Runbook

> **Status** live
> Owner: Operations, Engineering, QA

Bu runbook beta release rehearsal, deploy, rollback, monitoring ve incident owner akışını tek yerde tanımlar. Amaç beta çıkışını sadece build geçişine değil, P0 sign-off, gözlemleme ve geri dönüş hazırlığına bağlamaktır.

## Release Ön Koşulları

| Kapı | Komut / Kanıt | Kabul |
|---|---|---|
| Baseline | `npm run check:baseline` | Typecheck, architecture guardrail, lint, unit test ve build geçer |
| Director Gate H | `npm run check:director-reference` | Replay, Mirror parity, 30/60/120 pacing ve performance reference geçer |
| Market server | `cd railway-market-server && npm run validate` | Typecheck, lint ve build geçer |
| External sign-off | [Beta External Sign-off Board](/docs/workflows/BETA_EXTERNAL_SIGNOFF_BOARD) | Tüm P0 satırları `Geçti` |
| E2E critical | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:critical` | Chromium ve mobile Chrome critical path geçer |
| E2E matrix | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:matrix` | Chromium, mobile Chrome, Firefox ve WebKit geçer |
| Security env | [Beta Env Guardrail](/docs/workflows/BETA_ENV_GUARDRAIL) | Railway frontend, API ve aggregator env sign-off geçer |

## Deploy Sırası

| Sıra | İş | Komut / Kanıt | Owner |
|---|---|---|---|
| 1 | Release branch veya main HEAD doğrula | `git status --short` ve commit SHA kaydı | Engineering |
| 2 | Docs mirror güncelle | `npm run docs:sync` | Engineering |
| 3 | Baseline ve market validate son kez çalıştır | `npm run check:baseline`; `cd railway-market-server && npm run validate` | Engineering |
| 4 | Gerekirse DB migration uygula | API servis startup migration logunu doğrula | Backend |
| 5 | Frontend deploy tetikle | `npm run deploy` | Operations |
| 6 | Market server deploy tetikle | `npm run railway:market:deploy` | Operations |
| 7 | Smoke test çalıştır | [Beta Smoke Test Checklist](/docs/workflows/BETA_SMOKE_TEST_CHECKLIST) | QA |
| 8 | Admin telemetry dashboard izle | [Beta Telemetry Dashboard](/docs/workflows/BETA_TELEMETRY_DASHBOARD) | Operations |

## Post-deploy Smoke

| Kontrol | Kabul |
|---|---|
| App shell | Landing, auth fallback ve main menu yüklenir |
| Market feed | BTC price stream connected veya graceful fallback gösterir |
| Session lifecycle | Start session, gameplay, death/cash out ve wallet refresh çalışır |
| Verify endpoint | Successful verified session double-credit üretmez |
| Telemetry ingest | Error, performance ve session telemetry admin dashboard'a akar |
| Docs viewer | `public/docs/navigation.json` yeni dokümanları gösterir |

## Director Rollout

| Aşama | Runtime Modu | Trafik | Gerekli Kanıt | İlerleme Kuralı |
|---|---|---:|---|---|
| 0 | `runtime` | 0% | Replay ve Mirror parity hash sıfır mismatch | Ops rehearsal tamamlanır |
| 1 | `runtime` | 1% | 30 dakika telemetry gözlemi | Unfair death, clamp, event spam ve settlement error normal bandda |
| 2 | `runtime` | 10% | 2 saat telemetry gözlemi | Fatal error veya verification fail eşiği aşılmaz |
| 3 | `runtime` | 50% | 24 saat telemetry gözlemi | Rollback tetiklenmez |
| 4 | `runtime` | 100% | Incident owner onayı | Release notu ve kanıt logu tamamlanır |

- Production’da `VITE_MARKET_RUNTIME_MODE` yalnız `runtime` olabilir; `legacy` ve `dual` değerleri Director runtime’a zorlanır.
- Token ve Mirror PvP, Practice Assist kullanamaz; parity kanıtı aynı frame/seed/config/content için saklanır.
- Her aşama öncesi server-side reward idempotency ve cash-out race testleri yeşil olmalıdır.

## Rollback Planı

| Senaryo | Aksiyon | Kapanış |
|---|---|---|
| Frontend blank screen veya fatal route crash | Son sağlıklı commit'e `git revert` ve `npm run deploy` | Smoke test tekrar geçer |
| Market feed outage | Aggregator deploy rollback veya market fallback mode | SSE/WebSocket reconnect stabil |
| Verify/reward regression | Deploy durdur, reward writes disable edilmeden yeni release açma | Double-credit ve false credit yok |
| Env misconfiguration | Railway env guardrail yeniden çalıştır, eksik key düzelt | `check:beta-env` tüm servislerde geçer |
| DB migration issue | Migration owner rollback planını uygular, API writes kontrol edilir | Data loss yok, health check yeşil |
| Replay veya Mirror parity mismatch | Rollout yüzdesini durdur, son sağlıklı runtime release'e dön | Aynı recorded frame/seed tekrarında hash sıfır mismatch |
| Frame-time baseline `%5` üstü | Yeni rollout aşamasını açma, performans regresyonunu izole et | Reference benchmark ve 30/60/120 pacing tekrar yeşil |
| Settlement error veya unfair-death spike | Yeni oturum kabulünü durdur, release rollback ve ledger audit başlat | İdempotent ledger tekrarında coin/shard kaybı veya çift kredi yok |

## Monitoring Penceresi

| Süre | İzlenecek Metrik | No-Go / Rollback Eşiği |
|---|---|---|
| İlk 15 dakika | Fatal error, blank screen, API 5xx | Tekrarlayan P0 hata |
| İlk 1 saat | Verification fail rate | `> 5%` |
| İlk 1 saat | Crash-free session rate | `< 95%` |
| İlk 1 saat | Reconnect events | Normal baseline üstünde belirgin spike |
| İlk 24 saat | Balance telemetry | Median survival ve reward/min uç değerleri |
| Her rollout aşaması | Director telemetry | Replay mismatch, clamp, event spam, unfair death ve settlement error sıfır kritik alarm |

## Rollback Tatbikatı

1. Stage 0'da aynı recorded canonical frame dizisini ve seed'i replay ederek snapshot/spawn hash eşitliğini doğrula.
2. Token ve Mirror PvP modu için parity testini çalıştır; Practice Assist istisnası oluşmadığını doğrula.
3. Cash-out, liquidation ve reconnect yarış testlerinden sonra aynı idempotency key ile tekrar çağrı yap; ledger sonucu değişmemelidir.
4. Rollback sonrası API migration logunu, aktif runtime modunu ve wallet/escrow bakiyelerini doğrula.
5. Tatbikat, veri veya ledger kaybı üretirse rollout bir sonraki aşamaya geçmez.

## Incident Owner Akışı

| Rol | Sorumluluk |
|---|---|
| Incident lead | Go/no-go ve rollback kararını verir |
| Backend owner | API, DB, reward verification ve env issue'larını çözer |
| Frontend owner | Runtime crash, UI, input ve docs viewer issue'larını çözer |
| QA owner | Repro, smoke, E2E ve gerçek cihaz regression kanıtını toplar |
| Ops owner | Railway deploy, env, log ve monitoring akışını yönetir |

## Beta Launch Notes Şablonu

```text
Release date: YYYY-MM-DD
Commit SHA: <sha>
Frontend deploy: pass | fail
Market server deploy: pass | fail
External P0 sign-off: pass | fail
Known risks: <links>
Rollback owner: <name>
Monitoring window: <start-end>
Decision: Go | Conditional Go | No-Go
```

## No-Go Kuralları

- External sign-off board içinde açık P0 varsa beta deploy yapılmaz.
- `npm run check:baseline` veya market `npm run validate` fail olursa deploy yapılmaz.
- Railway env sign-off olmadan prod/beta ortamına release çıkılmaz.
- Reward verification veya wallet balance regresyonu varken release açılmaz.
- Post-deploy smoke fail olursa release aktif tutulmaz; rollback veya hotfix kararı verilir.

## Kanıt Logu

| Tarih | Kanıt | Sonuç |
|---|---|---|
| 2026-06-20 | Beta launch runbook oluşturuldu; release ön koşulları, deploy sırası, rollback, monitoring, incident owner ve launch notes şablonu tanımlandı | Takip aktif |
