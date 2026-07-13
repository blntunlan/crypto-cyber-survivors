# Beta Smoke Test Checklist

> **Status** live
> Owner: Engineering, QA, Backend

Bu belge beta açılışı öncesi çalıştırılacak minimum smoke akışlarını sabitler. Otomasyon hızlı regresyon kapısıdır; portal çıkışı ve gerçek ortam cüzdan yenilemesi ayrıca manuel sign-off ister.

## Otomasyon Komutu

```TERMINAL
npm run test:e2e:beta:critical
```

## Otomasyon Kapsamı

| Akış | Kanıt |
|---|---|
| Fresh user | Local profile oluşturur, hub ekranına döner ve play menüye girer |
| Guest fallback | Bozuk kullanıcı storage değerini temizler ve nickname recovery ile hub'a döner |
| Returning user | Persisted user ile hub açılır, wallet balance görünür ve gameplay başlar |
| Game over | Debug game-over tetiklenir, terminale dönüş ve wallet refresh korunur |
| Cycle cash out | Cycle complete ekranından cash out ile verified exit path kapanır |
| Market disconnected | Market timeout/recovery eventleri UI tarafından yakalanır ve gameplay'e döner |

## Sıralı Manuel Smoke

| Sıra | Senaryo | Kabul Kriteri |
|---|---|---|
| 1 | Temiz tarayıcı profiliyle fresh user | Nickname girilir, hub açılır, play menüye geçilir |
| 2 | Returning user | Refresh sonrası aynı kullanıcı ve bakiye görünür |
| 3 | Guest/offline fallback | API geçici erişilemezken mevcut local profile korunur veya nickname recovery çalışır |
| 4 | Market disconnected | Market feed kesintisinde oyun durur, recovery sonrası gameplay devam eder |
| 5 | Game over | Ölüm veya debug game-over sonrası terminale dönüş ve session cleanup çalışır |
| 6 | Portal exit | Aktif portal içine girildiğinde run kapanır, reward breakdown ve verification payload tutarlı kalır |
| 7 | Wallet refresh | Verify success sonrası hub bakiyesi Railway wallet değeriyle yenilenir |

## Portal Exit Notu

Portal çıkışı gerçek gameplay pozisyonlama gerektirdiği için otomasyon dışı manuel smoke maddesidir. Kabul için `portalExtraction` event'i, game-over ekranı, reward breakdown ve wallet refresh aynı run kaydında doğrulanır.

## Kanıt Kaydı

| Tarih | Komut veya Kontrol | Sonuç |
|---|---|---|
| 2026-06-18 | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/beta-smoke.spec.ts --project=chromium` | 6 test geçti |
