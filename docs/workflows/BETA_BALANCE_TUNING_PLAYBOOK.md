# Beta Balance Tuning Playbook

> **Status** live
> Owner: Gameplay, Data, QA

Bu playbook canlı beta verisi geldiğinde spawn pressure, reward pacing, portal frequency ve leverage risk eğrilerini nasıl ayarlayacağımızı tanımlar. Bu aşamada sayısal balance değişikliği yapılmadı; canlı beta cohort verisi olmadan tuning yapmak savunulabilir değildir.

## Tuning Alanları

| Alan | Primary Source | Kod Sahibi |
|---|---|---|
| Spawn pressure | `services/difficulty/UnifiedDirector.ts`, `services/combat/SpawnSystem.ts` | Gameplay |
| Reward pacing | `railway-market-server/src/shared/RewardCalculator.ts`, `services/gameplay/RewardCalculator.ts` | Backend + Gameplay |
| Portal frequency | `services/gameplay/PortalSystemV2.ts`, `services/gameplay/portal/*` | Gameplay |
| Leverage risk curve | `services/difficulty/rules/LeverageRule.ts`, `services/gameplay/LeverageEngine.ts` | Gameplay |
| Telemetry readout | Admin Beta Telemetry Dashboard | Data + QA |

## Gerekli Canlı Veriler

| Metric | Segment | Kullanım |
|---|---|---|
| Median survival seconds | device cohort, leverage band, position | Spawn pressure ve mercy tuning |
| Death reason distribution | leverage band, market regime | Difficulty spike ve liquidation hissi |
| Reward per minute | exit type, portal type, leverage band | Reward pacing |
| Portal seen/entered/rejected rate | session length, PnL band | Portal frequency ve cooldown tuning |
| Verification fail rate | client version, device cohort | Reward/anti-cheat false negative kontrolü |
| Crash-free session rate | device cohort | Balance değişikliğinden önce teknik stabilite kapısı |

## Karar Eşikleri

| Sinyal | Aksiyon |
|---|---|
| Median survival `< 4 dk` ve crash-free `>= 95%` | Spawn pressure veya leverage penalty düşür |
| Median survival `> 12 dk` ve reward/min yüksek | Spawn pressure veya reward cap artır |
| Portal entered rate `< 15%` | Portal visibility, duration veya threshold iyileştir |
| Portal rejected rate `> 40%` | Portal timing/UX ve rejection penalty azalt |
| Verification fail rate `> 5%` | Balance tuning durdur, verification/debug önceliklendir |
| Mobile FPS avg `< 50` | Balance tuning durdur, performance profile düzelt |

## Tuning Sırası

| Sıra | İş | Kabul Kriteri |
|---|---|---|
| 1 | Beta telemetry snapshot al | En az 100 verified session veya 48 saat veri |
| 2 | Device cohort ayır | Mobile/desktop ve recommended profile kırılımı |
| 3 | Baseline survival/reward dağılımı çıkar | Median, p75, p95 ve outlier session listesi |
| 4 | Tek değişkenli tuning yap | Aynı PR içinde sadece bir ana parametre grubu |
| 5 | Regression test çalıştır | Difficulty, portal, reward ve verification testleri geçer |
| 6 | Canary cohort izle | 24 saat sonra aynı dashboard metrikleri karşılaştırılır |

## Live Snapshot Intake

| Alan | Değer |
|---|---|
| Snapshot tarihi | TBD |
| Build / commit | TBD |
| Veri aralığı | TBD |
| Verified session sayısı | TBD |
| Mobile / desktop kırılımı | TBD |
| Low / medium / high profile kırılımı | TBD |
| Median survival | TBD |
| P75 / P95 survival | TBD |
| Reward per minute median | TBD |
| Portal seen / entered / rejected | TBD |
| Death reason top 3 | TBD |
| Verification fail rate | TBD |
| Crash-free session rate | TBD |
| Mobile avg FPS | TBD |

## Tuning Karar Kaydı

| Tarih | Snapshot | Karar | Parametre Grubu | PR / Commit | Canary Sonucu |
|---|---|---|---|---|---|
| TBD | TBD | Bekliyor | TBD | TBD | TBD |

## Tuning Guardrails

- Reward math client ve backend arasında eş zamanlı değişmeli.
- Verification fail veya crash-free session bozulursa balance değişikliği geri alınmalı.
- Leverage risk curve doğrudan oyuncu kaybına etki ettiği için PnL bandı ve position ayrımı olmadan değiştirilmemeli.
- Portal frequency ayarı reward pacing ile birlikte okunmalı; sadece portal sayısına bakmak yanıltıcıdır.

## Bloklayıcı Veri Eşikleri

- `verified_session_count < 100` ise numeric tuning yapılmaz.
- `crash_free_session_rate < 95%` ise önce stabilite düzeltilir.
- `verification_fail_rate > 5%` ise önce verification/anti-cheat false negative analizi yapılır.
- Mobile avg FPS `< 50` ise önce performance profile ve spawn/render baskısı ayrıştırılır.
- Device cohort veya leverage band kırılımı yoksa leverage risk curve değiştirilmez.

## Mevcut Blokaj

- Canlı beta verisi yok.
- Admin dashboard artık gerekli visibility'yi sağlıyor, ancak henüz cohort snapshot üretilmedi.
- Bu nedenle checklist maddesi açık kalmalı ve ilk live beta data snapshot sonrası kapatılmalıdır.
