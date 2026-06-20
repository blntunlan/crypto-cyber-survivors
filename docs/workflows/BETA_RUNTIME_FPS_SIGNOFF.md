# Beta Runtime FPS Sign-off

> **Status** live
> Owner: Engineering, QA

Bu belge beta öncesi low, medium ve high cihaz profillerinde 5 dakikalık gerçek cihaz FPS kabul kaydını toplamak için kullanılır. Playwright FPS smoke destek kanıtıdır; gerçek cihaz/profil sign-off yerine geçmez.

## Ölçüm Kapsamı

| Profil | Minimum Cihaz | Amaç |
|---|---|---|
| Low | Düşük/orta Android veya eski iPhone | Thermal, memory ve touch gecikmesi riski |
| Medium | Güncel orta segment telefon veya laptop | Tipik beta oyuncu deneyimi |
| High | Modern desktop veya güçlü telefon | Üst limit, efekt yoğunluğu ve render headroom |

## Kabul Eşiği

| Metric | Kabul |
|---|---|
| Avg FPS | `>= 55` desktop/high, `>= 50` mobile low/medium |
| 1% low FPS | `>= 40` |
| Heap growth | 5 dakikada `<= 50 MB` veya stabil plateau |
| Frame drops | Sürekli stutter yok; tekil spike not edilir |
| Input latency | 5 dakika sonunda belirgin artış yok |
| Crash-free | Run boyunca crash, tab reload veya fatal disconnect yok |

## Ölçüm Adımları

- Beta/prod build veya preview URL açılır.
- Cihaz profili, browser, OS, network tipi ve grafik kalite ayarı kaydedilir.
- Aynı run 5 dakika oynanır; combat yoğunluğu ve market disconnected state gözlemlenir.
- Admin/debug metrics veya browser performance panelinden avg FPS, 1% low, heap ve frame drop not edilir.
- Run sonunda session verification, wallet refresh ve replay soft-fail davranışı kontrol edilir.

## Destekleyici Otomasyon

| Komut | Durum |
|---|---|
| `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/performance/fps.spec.ts --project=chromium` | FPS smoke için kullanılır |
| `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/performance/memory-leak.spec.ts --project=chromium` | Heap growth smoke için kullanılır |

## Sign-off Kaydı

| Tarih | Profil | Cihaz / OS / Browser | Quality | Avg FPS | 1% Low | Heap Growth | Frame Drops | Sonuç | Not |
|---|---|---|---|---:|---:|---:|---:|---|---|
| TBD | Low | TBD | TBD | TBD | TBD | TBD | TBD | Bekliyor | Gerçek cihaz ölçümü yapılmadı |
| TBD | Medium | TBD | TBD | TBD | TBD | TBD | TBD | Bekliyor | Gerçek cihaz ölçümü yapılmadı |
| TBD | High | TBD | TBD | TBD | TBD | TBD | TBD | Bekliyor | Gerçek cihaz ölçümü yapılmadı |

## Blokaj Kuralı

- Low veya medium profil crash ederse beta açılmaz.
- Avg FPS kabul eşiği altında kalırsa balance tuning yapılmaz; önce performance profile düzeltilir.
- Heap growth sürekli artıyorsa memory leak araştırması P0 olur.

## Beta Checklist Bağlantısı

- [Beta Readiness Checklist](/docs/BETA_READINESS_CHECKLIST)
- [Beta Telemetry Dashboard](/docs/workflows/BETA_TELEMETRY_DASHBOARD)
- [Beta Balance Tuning Playbook](/docs/workflows/BETA_BALANCE_TUNING_PLAYBOOK)
