# Beta Bundle Budget Report

> **Status** live
> Owner: Engineering, Performance

Bu rapor beta adayı production build çıktısındaki initial payload, toplam JavaScript/CSS ve asset ağırlığını kayıt altına alır.

## Ölçüm Komutu

```TERMINAL
npm run build
```

Build sonucu: Vite production build başarılı, 2575 module transform edildi ve Vite chunk warning üretmedi.

## Initial Payload

`dist/index.html` tarafından doğrudan yüklenen module script, modulepreload ve CSS referansları:

| Dosya | Raw | Gzip |
|---|---:|---:|
| `a/WKg0ZOUm.js` | 206.67 kB | 60.01 kB |
| `a/DN15BZVn.css` | 152.40 kB | 23.65 kB |
| **Toplam initial** | **359.07 kB** | **83.66 kB** |

## Toplam Build Dağılımı

| Tür | Adet | Raw | Gzip |
|---|---:|---:|---:|
| `.png` | 56 | 25401.79 kB | 24935.65 kB |
| `.js` | 21 | 1964.08 kB | 556.74 kB |
| `.md` | 174 | 1458.60 kB | 494.41 kB |
| `.json` | 10 | 234.61 kB | 80.13 kB |
| `.css` | 2 | 160.84 kB | 25.96 kB |

## En Büyük Dosyalar

| Dosya | Raw | Gzip | Not |
|---|---:|---:|---|
| `a/CGfLVhrd.js` | 788.84 kB | 215.92 kB | Lazy-loaded UI/vendor chunk |
| `assets/icons/cards/lightning-network-tier3.png` | 689.25 kB | 681.49 kB | Asset payload risk |
| `assets/sprites/enemy_tank.png` | 667.25 kB | 663.94 kB | Asset payload risk |
| `assets/icons/cards/cold-wallet-tier3.png` | 650.04 kB | 644.74 kB | Asset payload risk |
| `assets/icons/cards/market-cap-tier2.png` | 623.71 kB | 617.51 kB | Asset payload risk |

## Değerlendirme

- JavaScript beta için kabul edilebilir seviyede: en büyük chunk Vite warning limitinin altında ve toplam initial gzip 83.66 kB.
- CSS initial payload 23.65 kB gzip ile düşük riskte.
- Ana risk JavaScript değil, toplam PNG payloadı: 56 dosya ve yaklaşık 24.81 MB raw asset.
- Asset dosyaları gzip altında anlamlı küçülmüyor; görsel optimizasyon WebP/AVIF veya sprite atlas/lazy loading üzerinden yapılmalı.
- P2 `Bundle splitting uygula` maddesi kapatıldı; admin, docs, landing/debug yüzeyleri lazy chunk'lara ayrıldı. Büyük görsel asset yükleme stratejisi ayrı iş olarak kalır.

## Kabul Kararı

- Beta bloklanmaz: production build geçiyor, Vite chunk warning yok ve initial JS/CSS bütçesi düşürüldü.
- Beta sonrası optimizasyon gereklidir: PNG asset optimizasyonu ve route/asset lazy loading planı P2 kapsamına taşınır.
