# Beta Bundle Budget Report

> **Status** live
> Owner: Engineering, Performance

Bu rapor beta adayı production build çıktısındaki initial payload, toplam JavaScript/CSS ve asset ağırlığını kayıt altına alır.

## Ölçüm Komutu

```TERMINAL
npm run build
```

Build sonucu: Vite production build başarılı, 2576 module transform edildi ve Vite chunk warning üretmedi.

## Initial Payload

`dist/index.html` tarafından doğrudan yüklenen module script, modulepreload ve CSS referansları:

| Dosya | Raw | Gzip |
|---|---:|---:|
| `a/CtWd_e2m.js` | 473.92 kB | 140.05 kB |
| `a/BOf7qNc1.js` | 42.98 kB | 12.34 kB |
| `a/BFl3bK1k.js` | 770.81 kB | 211.03 kB |
| `a/BydmimGz.js` | 3.51 kB | 1.30 kB |
| `a/DN15BZVn.css` | 152.40 kB | 23.65 kB |
| **Toplam initial** | **1443.62 kB** | **388.38 kB** |

## Toplam Build Dağılımı

| Tür | Adet | Raw | Gzip |
|---|---:|---:|---:|
| `.png` | 56 | 25401.79 kB | 24935.65 kB |
| `.js` | 25 | 1965.48 kB | 559.41 kB |
| `.md` | 170 | 1445.95 kB | 488.77 kB |
| `.json` | 10 | 234.11 kB | 80.01 kB |
| `.css` | 2 | 160.84 kB | 25.96 kB |

## En Büyük Dosyalar

| Dosya | Raw | Gzip | Not |
|---|---:|---:|---|
| `a/BFl3bK1k.js` | 770.81 kB | 211.03 kB | En büyük initial JS chunk |
| `assets/icons/cards/lightning-network-tier3.png` | 689.25 kB | 681.49 kB | Asset payload risk |
| `assets/sprites/enemy_tank.png` | 667.25 kB | 663.94 kB | Asset payload risk |
| `assets/icons/cards/cold-wallet-tier3.png` | 650.04 kB | 644.74 kB | Asset payload risk |
| `assets/icons/cards/market-cap-tier2.png` | 623.71 kB | 617.51 kB | Asset payload risk |

## Değerlendirme

- JavaScript beta için kabul edilebilir seviyede: en büyük chunk Vite warning limitinin altında ve toplam initial gzip 388.38 kB.
- CSS initial payload 23.65 kB gzip ile düşük riskte.
- Ana risk JavaScript değil, toplam PNG payloadı: 56 dosya ve yaklaşık 24.81 MB raw asset.
- Asset dosyaları gzip altında anlamlı küçülmüyor; görsel optimizasyon WebP/AVIF veya sprite atlas/lazy loading üzerinden yapılmalı.
- P2 `Bundle splitting uygula` maddesi açık kalmalı; admin, docs, landing/debug yüzeyleri ve büyük görsel asset yükleme stratejisi ayrı iş olarak ele alınmalı.

## Kabul Kararı

- Beta bloklanmaz: production build geçiyor, Vite chunk warning yok ve initial JS/CSS bütçesi makul.
- Beta sonrası optimizasyon gereklidir: PNG asset optimizasyonu ve route/asset lazy loading planı P2 kapsamına taşınır.
