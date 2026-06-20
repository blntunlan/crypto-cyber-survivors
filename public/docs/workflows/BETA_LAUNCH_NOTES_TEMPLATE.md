# Beta Launch Notes Template

> **Status** live
> Owner: Product, Operations, QA

Bu doküman beta yayın metni, bilinen riskler ve operasyon onaylarını tek formatta toplar. [Beta Launch Runbook](/docs/workflows/BETA_LAUNCH_RUNBOOK) içindeki deploy kararı `Go` veya `Conditional Go` olmadan bu notlar yayınlanmamalıdır.

## Release Metadata

| Alan | Değer |
|---|---|
| Release adı | Crypto Survivors Beta |
| Release tarihi | TBD |
| Commit SHA | TBD |
| Frontend deploy | Bekliyor |
| Market server deploy | Bekliyor |
| External P0 sign-off | No-Go: mobile gerçek cihaz ve runtime FPS gerçek cihaz bekliyor |
| Monitoring penceresi | TBD |
| Rollback owner | TBD |
| Decision | No-Go |

## Player-facing Özet

```text
Crypto Survivors beta açıldı.

Bu sürüm canlı BTC/USD market verisini oyun zorluğu, düşman davranışı ve ödül akışıyla birleştiren erken erişim testidir. Beta süresince gameplay dengesi, performans ve telemetry davranışı aktif olarak izlenecek.
```

## Beta Kapsamı

| Alan | Yayında |
|---|---|
| Market-driven difficulty | Evet |
| Session verification | Evet |
| Wallet / coin refresh | Evet |
| Guest fallback | Evet |
| Mobile HUD ve touch controls | Sign-off sonrası |
| Admin telemetry dashboard | Evet |
| Replay storage | Beta DB storage kararıyla sınırlı |
| Achievement backend | Planlandı, beta blocker değil |

## Oyuncuya Açık Uyarılar

- Bu beta finansal ürün değildir; market verisi eğlence amaçlıdır.
- Oyun içi ödüller sanaldır ve yatırım tavsiyesi, getiri vaadi veya al-sat yönlendirmesi değildir.
- Beta sırasında economy, reward pacing, difficulty ve telemetry davranışı değişebilir.
- Bakım, rollback veya veri sıfırlama gerektiğinde release notes güncellenecektir.
- Cüzdan veya bağlantı hatalarında support kanalı üzerinden session zamanı ve kullanıcı adı paylaşılmalıdır; private key veya secret paylaşılmamalıdır.

## Bilinen Riskler

| Risk | Durum | Mitigasyon |
|---|---|---|
| Mobile gerçek cihaz input/FPS varyansı | Bekliyor | [Beta External Sign-off Board](/docs/workflows/BETA_EXTERNAL_SIGNOFF_BOARD) P0 kapanışı |
| Firefox/WebKit Playwright binary blokajı | Geçti | [Beta E2E Matrix](/docs/workflows/BETA_E2E_MATRIX) remediation ve 24 test matrix geçişi |
| Railway env sign-off | Geçti | [Beta Env Guardrail](/docs/workflows/BETA_ENV_GUARDRAIL) servis bazlı production check |
| Balance tuning canlı veri yokluğu | Bekliyor | [Beta Balance Tuning Playbook](/docs/workflows/BETA_BALANCE_TUNING_PLAYBOOK) snapshot sonrası karar |

## Publish Checklist

| Kontrol | Kabul |
|---|---|
| P0 sign-off | External board içinde tüm P0 satırları `Geçti` |
| Launch runbook | Deploy, rollback ve monitoring owner alanları dolu |
| Support route | Feedback ve incident kanalı release notes içinde açık |
| Legal copy | Entertainment-only ve virtual rewards uyarıları korunuyor |
| Known risks | Conditional Go varsa release notes içinde açıkça listelenmiş |
| Rollback readiness | Rollback owner ve son sağlıklı commit kayıtlı |

## Yayın Kanalları

| Kanal | İçerik | Owner |
|---|---|---|
| In-game docs | Bu launch notes dokümanı | Product |
| Landing page veya modal | Player-facing özet ve risk uyarıları | Frontend |
| Discord / community | Kısa beta duyurusu ve feedback linki | Community |
| Internal ops | Commit SHA, deploy status, monitoring window | Operations |

## Final Onay

| Rol | İsim | Karar | Tarih | Not |
|---|---|---|---|---|
| Product | TBD | Bekliyor | TBD | TBD |
| Engineering | TBD | Bekliyor | TBD | TBD |
| QA | TBD | Bekliyor | TBD | TBD |
| Operations | TBD | Bekliyor | TBD | TBD |

## Kanıt Logu

| Tarih | Kanıt | Sonuç |
|---|---|---|
| 2026-06-20 | Beta launch notes template oluşturuldu; player-facing özet, beta kapsamı, bilinen riskler, publish checklist, yayın kanalları ve final onay tablosu tanımlandı | Takip aktif |
| 2026-06-20 | Lokal kapılar yeşil; E2E browser matrix ve Railway env guardrail geçti. Mobile gerçek cihaz ve runtime FPS gerçek cihaz sign-off açık olduğu için release decision `No-Go` olarak korundu | No-Go |
