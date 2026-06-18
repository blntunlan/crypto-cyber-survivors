# Beta Feedback Triage

> **Status** live
> Owner: Engineering, QA, Community

Bu doküman beta sırasında oyuncu feedback'inin hangi kanaldan alınacağını, nasıl etiketleneceğini ve hangi admin verileriyle doğrulanacağını tanımlar.

## Aktif Kanallar

| Kanal | Durum | Kullanım |
|---|---|---|
| In-game automatic reports | Aktif | `ErrorTracker` runtime, network, resource ve game error raporlarını `/api/v1/telemetry/errors` endpointine gönderir |
| Performance telemetry | Aktif | `PerformanceTracker` FPS/device metriklerini `/api/v1/telemetry/performance-metrics` endpointine gönderir |
| Cheat telemetry | Aktif | Anti-cheat raporları `/api/v1/telemetry/cheat-reports` içine akar |
| E-posta | Aktif | Landing footer `mailto:info@crypto-survivors.com` ile manuel temas kanalıdır |
| GitHub beta feedback | Aktif | `.github/ISSUE_TEMPLATE/beta_feedback.md` issue template'i `beta-feedback` ve `needs-triage` label'larıyla açılır |
| Discord | Beklemede | Landing footer şu anda `Coming Soon`; gerçek invite URL sağlanmadan beta kabul kanalı değildir |
| Twitter/X | Beklemede | Landing footer şu anda `Coming Soon`; gerçek profil URL sağlanmadan beta kabul kanalı değildir |

## Issue Label Akışı

| Label | Ne Zaman Kullanılır |
|---|---|
| `beta-feedback` | Beta tester kaynaklı her genel feedback issue'su |
| `needs-triage` | İlk inceleme bekleyen her yeni beta issue'su |
| `bug` | Reproduce edilebilir oynanış, UI veya backend hatası |
| `performance` | FPS, heap, stutter veya asset/bundle performansı |
| `mobile` | Touch input, safe-area, orientation veya küçük ekran problemi |
| `market-data` | SSE reconnect, stale data, fatal disconnect veya price drift |
| `wallet` | Auth, wallet refresh, reward settlement veya session verify problemi |
| `security` | Abuse, anti-cheat, suspicious reward veya exploit raporu |
| `docs` | Copy, onboarding metni veya dokümantasyon hatası |

## Triage Kuralları

- Yeni feedback issue'su `beta-feedback` ve `needs-triage` ile açılır.
- İlk incelemede severity `P0`, `P1`, `P2` veya `P3` olarak issue açıklamasına işlenir.
- `P0` reward corruption, session verify failure, market fairness break, beta play blocker veya güvenlik exploit anlamına gelir.
- `P1` sık crash, fatal reconnect loop, büyük FPS düşüşü, mobile input blocker veya onboarding drop-off anlamına gelir.
- `P2` balance, UX confusion, replay/leaderboard edge case veya non-critical visual bug anlamına gelir.
- `P3` polish, copy, minor suggestion veya low-impact docs feedback anlamına gelir.
- `needs-triage` label'ı owner, severity ve next action yazıldıktan sonra kaldırılır.

## Admin ve Telemetry İncelemesi

- `/api/v1/admin/dashboard` telemetry summary alanları error reports, cheat attempts, performance metrics, avg FPS ve active device profile sayısını gösterir.
- Error report detayları `error_reports.status = 'new'` ile triage başlangıç durumuna gelir.
- Cheat reports `cheat_attempts` içinde ayrı tutulur ve reward/session doğrulama issue'larından ayrı incelenir.
- Admin analytics error-summary ve resolve endpointleri henüz eksiktir; bu eksiklik P2 `Beta telemetry dashboard geliştirmesi yap` maddesine bağlıdır.

## Beta Kabul Kararı

- Beta için manuel feedback kanalı e-posta ve GitHub issue template ile aktif kabul edilir.
- Discord/Twitter URL'leri sağlanana kadar resmi beta support kanalı olarak duyurulmaz.
- In-game manual report UI yoksa bile otomatik in-game telemetry aktif olduğu için crash/performance/network raporları backend triage'a akar.
