# Beta Docs Navigation Maintenance

> **Status** live
> Owner: Documentation, Engineering

Bu rapor beta checklist kapsamındaki docs navigation bakımını, public mirror durumunu ve active/archived ayrımını kayıt altına alır.

## Audit Sonucu

| Kontrol | Sonuç |
|---|---|
| Navigation section sayısı | 6 |
| Navigation item sayısı | 58 |
| `docs/navigation.json` kırık link | 0 |
| `public/docs/navigation.json` kırık link | 0 |
| Navigation içinde `archived` link | 0 |
| Navigation içinde `completed` link | 0 |
| `docs/navigation.json` ve `public/docs/navigation.json` eşleşmesi | Evet |
| Active `docs/**/*.md` sayısı | 70 |
| Active `public/docs/**/*.md` sayısı | 70 |

## Navigation Kuralı

- Navigation sadece aktif, beta için okunabilir dokümanları göstermeli.
- `docs/archived/**` ve `docs/completed/**` navigation'a eklenmemeli.
- Yeni workflow dokümanı eklendiğinde hem `docs/navigation.json` hem `public/docs/navigation.json` güncellenmeli.
- `npm run docs:sync` public mirror için son adım olarak çalıştırılmalı.
- `npm run docs:check` navigation linkleri, public mirror eşleşmesi ve archived/completed link sızıntısını doğrulamalı.

## Beta İçin Eklenen Aktif Workflow Dokümanları

| Doküman | Amaç |
|---|---|
| `BETA_ENV_GUARDRAIL` | Beta environment guardrail |
| `BETA_SMOKE_TEST_CHECKLIST` | Smoke test kapsamı |
| `BETA_E2E_MATRIX` | Browser/device E2E matrisi |
| `BETA_BACKEND_API_CONTRACT` | Backend API sözleşmesi |
| `BETA_SSE_MARKET_CONTRACT` | Market SSE sözleşmesi |
| `BETA_LEGAL_RISK_COPY_REVIEW` | Legal/risk copy sınırları |
| `BETA_ONBOARDING_QA` | Onboarding QA |
| `BETA_SETTINGS_PERSISTENCE_QA` | Settings persistence QA |
| `BETA_BUNDLE_BUDGET_REPORT` | Bundle bütçe ölçümü |
| `BETA_BUNDLE_SPLITTING` | Bundle splitting uygulama kanıtı |
| `BETA_FEEDBACK_TRIAGE` | Feedback triage akışı |
| `BETA_COVERAGE_RISK_REDUCTION` | Coverage risk azaltımı |
| `BETA_DEPENDENCY_CLEANUP` | Unused dependency cleanup |
| `BETA_ACHIEVEMENT_BACKEND_PLAN` | Achievement backend feature planı |
| `BETA_REPLAY_STORAGE_DECISION` | Replay storage ürün kararı |
| `BETA_DOCS_NAVIGATION_MAINTENANCE` | Docs navigation bakım kanıtı |
| `BETA_TELEMETRY_DASHBOARD` | Beta telemetry dashboard kapsamı |
| `BETA_BALANCE_TUNING_PLAYBOOK` | Beta balance tuning playbook |
| `BETA_RUNTIME_FPS_SIGNOFF` | Runtime FPS cihaz sign-off planı |
| `BETA_EXTERNAL_SIGNOFF_BOARD` | Dış doğrulama blocker takip board'u |
| `BETA_LAUNCH_RUNBOOK` | Beta deploy, rollback ve incident runbook'u |
| `BETA_LAUNCH_NOTES_TEMPLATE` | Beta player-facing release notes şablonu |

## Kabul Kararı

- Docs navigation bakım maddesi kapatıldı: navigation linkleri geçerli, public mirror eşleşiyor ve archived/completed dokümanlar aktif navigation dışında.
- Yeni beta workflow dokümanları Core Workflows altında erişilebilir durumda.
