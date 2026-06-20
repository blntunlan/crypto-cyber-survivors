# Beta External Sign-off Board

> **Status** live
> Owner: Engineering, QA, Operations, Gameplay

Bu board beta checklist içinde local automation ile kapanamayan dış doğrulama maddelerini tek sıraya bağlar. Amaç gerçek cihaz, Railway ortamı, browser binary ve canlı telemetry gerektiren işleri geçici olarak kapatmadan net evidence ve owner ile takip etmektir.

## Blokaj Özeti

| Öncelik | Blocker | Kapanış Dokümanı | Kapanış Kriteri | Owner | Durum |
|---|---|---|---|---|---|
| P0 | Mobile input gerçek cihaz sign-off | [Mobile Beta QA Checklist](/docs/workflows/MOBILE_BETA_QA_CHECKLIST) | Küçük iOS, modern iOS, küçük Android ve modern Android profilleri geçer | QA + Frontend | Otomasyon geçti, gerçek cihaz bekliyor |
| P0 | Runtime FPS gerçek cihaz sign-off | [Beta Runtime FPS Sign-off](/docs/workflows/BETA_RUNTIME_FPS_SIGNOFF) | Low, medium ve high profillerde 5 dakikalık run kabul eşiğini geçer | QA + Performance | Chromium smoke geçti, gerçek cihaz bekliyor |
| P0 | Security env Railway sign-off | [Beta Env Guardrail](/docs/workflows/BETA_ENV_GUARDRAIL) | Frontend, API server ve market aggregator `check:beta-env` komutları Railway beta/prod ortamında geçer | Operations + Backend | Geçti |
| P0 | E2E browser matrix | [Beta E2E Matrix](/docs/workflows/BETA_E2E_MATRIX) | Chromium, mobile Chrome, Firefox ve WebKit `beta-smoke` matrix geçer | QA Engineering | Geçti |
| P1 | Balance tuning live snapshot | [Beta Balance Tuning Playbook](/docs/workflows/BETA_BALANCE_TUNING_PLAYBOOK) | En az 100 verified session veya 48 saat canlı veri ile tuning kararı kaydedilir | Gameplay + Data | Canlı veri bekliyor |

## Uygulama Sırası

| Sıra | İş | Neden |
|---|---|---|
| 1 | Firefox/WebKit binary kurulumunu tamamla ve browser matrix'i tekrar koş | Local environment blocker kalkmadan E2E maddesi kapanamaz |
| 2 | Railway CLI login sonrası env guardrail komutlarını servis bazlı çalıştır | Beta/prod secret ve URL kapısı release öncesi P0 |
| 3 | Mobile QA cihaz matrisini tamamla | Input ve HUD riskleri otomasyonla tam kapanmıyor |
| 4 | Runtime FPS cihaz profillerini tamamla | Balance ve spawn kararları gerçek cihaz performansına bağlı |
| 5 | İlk canlı telemetry snapshot'ı al | Balance tuning veri olmadan yapılmamalı |
| 6 | Balance tuning kararını kaydet ve gerekiyorsa tek değişkenli PR aç | Aynı PR içinde çoklu denge değişikliği debug maliyetini artırır |

## Evidence Paketleri

| Blocker | Zorunlu Evidence |
|---|---|
| Mobile input | Cihaz modeli, OS/browser, orientation, geçen senaryo sayısı, blocking issue listesi |
| Runtime FPS | Cihaz profili, run süresi, avg FPS, 1% low FPS, heap growth, crash-free sonucu |
| Security env | Railway project/environment, service adı, redacted komut sonucu, raw secret içermeyen not |
| E2E matrix | Playwright version, browser binary path doğrulaması, matrix komutu, tüm project sonucu |
| Balance tuning | Snapshot aralığı, verified session sayısı, cohort kırılımı, karar, PR/commit ve canary sonucu |

## Kapanış Kuralları

- `Bekliyor` veya `Kısmi` durumdaki P0 maddeler beta çıkışı için açık blocker sayılır.
- Environment blocker test failure gibi yorumlanmaz; ancak evidence olmadan kapatılamaz.
- Gerçek cihaz sign-off yerine emulator veya Chromium-only smoke kabul edilmez.
- Railway evidence raw secret, database URL, token veya private key değeri içeremez.
- Balance tuning canlı veri yokken yapılırsa karar geçersiz sayılır ve geri alınır.

## Launch Kararı

| Karar | Şart |
|---|---|
| Go | Tüm P0 satırları `Geçti`, P1 balance için canlı snapshot kararı kayıtlı veya açık risk olarak kabul edilmiş |
| Conditional Go | P0 yok, P1 balance canlı veri bekliyor ve release notes içinde açık risk olarak yazıldı |
| No-Go | Herhangi bir P0 satırı `Bekliyor`, `Kısmi`, `Fail` veya environment blocker durumunda |

## Kanıt Logu

| Tarih | Kanıt | Sonuç |
|---|---|---|
| 2026-06-20 | External sign-off board oluşturuldu; mobile, runtime FPS, Railway env, E2E browser matrix ve balance live snapshot tek kapanış sırasına bağlandı | Takip aktif |
| 2026-06-20 | E2E browser matrix Chromium, mobile Chrome, Firefox ve WebKit üzerinde 24 test ile geçti | Geçti |
| 2026-06-20 | Mobile otomasyon, FPS smoke, docs check, typecheck, production build ve market server validate tekrar geçti | Lokal kapılar yeşil |
| 2026-06-20 | Railway production env guardrail frontend, api-server ve market-aggregator scope'larında geçti | Geçti |
