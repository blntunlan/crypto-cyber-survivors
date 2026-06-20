# Beta Telemetry Dashboard

> **Status** live
> Owner: Backend, Frontend, QA

Bu doküman beta telemetry dashboard geliştirmesinde görünür hale getirilen cohort, device profile, crash-free session, reconnect ve verification metriklerini kaydeder.

## Backend Summary Contract

| Alan | Kaynak | Dashboard Field |
|---|---|---|
| Verification fail rate | `sessions` total/verified 24h | `sessions.verificationFailRate` |
| Crash-free sessions | `sessions` total 24h ve critical `error_reports` | `telemetry.crashFreeSessionRate24h` |
| Reconnect events | `error_reports` reconnect/network sinyalleri | `telemetry.reconnectEvents24h` |
| Device profiles | `device_profiles.last_seen_at` 24h | `telemetry.activeDeviceProfiles24h` |
| Device cohort | `device_profiles.device_type` grouping | `telemetry.deviceTypeBreakdown` |
| Performance cohort | `device_profiles.recommended_profile` grouping | `telemetry.recommendedProfileBreakdown` |
| FPS health | `performance_metrics.avg_fps` 24h | `telemetry.avgFps24h` |

## Frontend Visibility

| UI Alanı | Davranış |
|---|---|
| Beta Telemetry Dashboard | Admin analytics tab içinde 5 kart olarak gösterilir |
| Crash-Free Sessions | Rate ve clean session sayısı |
| Verification Fail Rate | Unverified/total session oranı |
| Reconnect Events | 24h network/reconnect sinyal sayısı |
| Device Profiles | Aktif device profile sayısı ve top device type |
| Perf Cohort | Top recommended profile ve avg FPS |

Frontend admin paneli Railway admin endpoint'ini sadece `VITE_ADMIN_API_SECRET` ve `VITE_API_BASE_URL` veya `VITE_RAILWAY_API_URL` tanımlıysa çağırır. Secret tanımlı değilse panel güvenli fallback olarak `Admin API not configured` gösterir.

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | Frontend TypeScript geçti |
| `npx vitest run tests/services/admin/AdminAnalyticsService.test.ts` | 1 dosya, 3 test geçti |
| `cd railway-market-server && npx vitest run tests/routes/telemetryAdminVisibility.test.ts` | 1 dosya, 2 test geçti |
| `npm run build` | Production build geçti |
| `cd railway-market-server && npm run validate` | Typecheck, lint ve build geçti; mevcut route pattern'lerinden 20 lint warning raporlandı, error yok |

## Bilinçli Sınırlar

- Crash-free session rate session-id eşleşmeli error tracking değildir; critical error count ile 24h session sayısı üzerinden beta-level proxy olarak hesaplanır.
- Reconnect rate dedicated reconnect table yerine telemetry error/network sinyallerinden türetilir.
- Admin secret'i client tarafında sadece internal beta/admin build için kullanılmalı; public production admin auth ayrıca ele alınmalıdır.

## Kabul Kararı

- Beta telemetry dashboard geliştirmesi kapatıldı: cohort, device profile, crash-free session, reconnect event ve verification fail rate görünür hale getirildi.
- Daha doğru crash/session attribution ve reconnect telemetry event modeli beta sonrası observability işi olarak kalır.
