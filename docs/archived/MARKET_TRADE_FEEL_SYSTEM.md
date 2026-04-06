# Market Trade Feel System - Tasarim Dokumani

> Oyuncunun gercek bir kripto trade hissiyatini yasamasi icin market verisi, PnL durumu, teknik indikatorler ve oyun mekaniklarinin nasil birlestigini detayli olarak anlatan dokuman.

## Temel Felsefe

Oyuncu bir BTC/USD pozisyonu aciyor (LONG veya SHORT, kaldiraciyla) ve o andan itibaren:
- **Karliysa**: Oyun nispeten rahat, dusmanlar daha yavas, loot daha bol
- **Zarardaysa**: Oyun acmasizlasir - tam bir "liquidation paniği" hissiyati
- **Indikatorler oyuncunun yaninda** (RSI, trend): Dusmanlar dost canlis, buff droplar
- **Indikatorler oyuncunun aleyhine**: Dusmanlar agresif, debuff yagmuru

---

## 1. PnL Tier Sistemi (Trade Hissiyati)

PnL = `(currentPrice - entryPrice) / entryPrice * leverage`

Kaldiraciyla carptiktan sonra pnlRatio -1 ile +1 arasina clamp edilir.

### PnL Zararda (Oyun Zorlasir)

| PnL Araligi | Hissiyat | Dusman Hizi | Dusman Hasari | Spawn Orani | Oyuncu Etkisi |
|---|---|---|---|---|---|
| **%0 ile %-5** | Hafif gerginlik | 1.0x-1.03x | +0.125x underwater penalty | Normal | Minimal fark |
| **%-5 ile %-10** | Belirgin baski | 1.03x-1.055x | +0.25x underwater | +%6 spawn boost | Stres baslangici |
| **%-10 ile %-30** | Ciddi tehlike | 1.055x-1.165x | +0.75x underwater | +%7.5 spawn boost | Panik hissi, daha cok enemy |
| **%-30 ile %-60** | Liquidation korkusu | 1.165x-1.33x | +1.5x underwater | +%15 spawn boost | Ekran karariyor (FOV), shocklar |
| **%-60 ile %-100** | Tam erime | 1.33x (cap) | +2.5x underwater (cap) | +%25 spawn boost | Volatility shock, hit stop efekti |

#### Hesaplama Detayi (UnifiedDirector)

```
pnlSpeedMult = 1 + clamp(-pnlRatio, 0, 0.6) * 0.55
  %-5  PnL → 1 + 0.05*0.55 = 1.0275x hiz
  %-30 PnL → 1 + 0.30*0.55 = 1.165x hiz
  %-60 PnL → 1 + 0.60*0.55 = 1.33x hiz (cap)

underwaterPenalty = |pnlRatio| * 2.5  (enemyDamage icin)
  %-10 PnL → 0.25 ekstra hasar
  %-50 PnL → 1.25 ekstra hasar
  %-100 PnL → 2.5 ekstra hasar (cap)
```

#### LeverageEngine PnL Etkisi (Kaldiraciyla Carpar)

```
damageTaken icin:
  pnlPressure = 1.0 + |pnl| * 0.6  (zarar varken aldigimiz hasar artar)
  %-10 → 1.06x ekstra
  %-50 → 1.30x ekstra
  %-100 → 1.60x ekstra

spawnRate icin:
  spawnPnlBoost = 1.0 + |pnl| * 0.25  (zarar varken daha cok enemy)
  %-20 → 1.05x
  %-60 → 1.15x
  %-100 → 1.25x
```

### PnL Karda (Oyun Rahatlar)

| PnL Araligi | Hissiyat | Dusman Hizi | Hasar Kalkan | Gem Degeri | Oyuncu Etkisi |
|---|---|---|---|---|---|
| **%0 ile %+10** | Hafif rahatlama | 0.985x | %1 kalkan | 1.06x gem | Minimal pozitif etki |
| **%+10 ile %+40** | Guvende hissi | 0.94x | %4 kalkan | 1.24x gem | Rahat oynama, bol loot |
| **%+40 ile %+100** | Euphoria | 0.94x (cap) | %10 kalkan (cap) | 1.60x gem | Oyun odul yagdiriyor |

```
pnlSpeedMult = 1 - clamp(pnlRatio, 0, 0.4) * 0.15
  %+10 → 0.985x (dusmanlar hafif yavaslar)
  %+40 → 0.94x (cap)

LeverageEngine pnlShield:
  pnlShield = 1.0 - min(pnl, 1) * 0.1
  %+50 → aldigin hasar %5 azalir
  %+100 → aldigin hasar %10 azalir

gemValue = base * (1 + max(0, pnl) * 0.6)
  %+20 → 1.12x gem degeri
  %+50 → 1.30x gem degeri
  %+100 → 1.60x gem degeri
```

---

## 2. RSI Sistemi (Piyasa Durumu → Dusman Davranisi)

RSI, oyuncunun pozisyonuna (LONG/SHORT) gore DOST veya DUSMAN davranisi belirler.

### RSI State Esikleri (Hysteresis)

```
OVERSOLD:   Giris < 20, Cikis > 25  (asiri satim, dip potansiyeli)
OVERBOUGHT: Giris > 80, Cikis < 75  (asiri alim, tepe potansiyeli)
NEUTRAL:    20-80 arasi
```

### Pozisyona Gore RSI Etkisi

#### LONG Pozisyon + OVERSOLD (RSI < 20) = FAVORABLE (DOST)

"Piyasa dip yapmis, long icin firsat" → Dusmanlar oyuncuya yardimci

| Parametre | Deger | Aciklama |
|---|---|---|
| Aggro | 0.5x | Dusmanlar yarim yamalak saldirir |
| Hiz | 0.8x | Yavas hareket eder, kolay vurulur |
| Hasar | 0.7x | Az hasar verir |
| Can | 0.8x | Az canli, kolay olur |
| Buff Drop | %70 | Oldurunce yuksek ihtimalle buff duser |
| Debuff Drop | %10 | Neredeyse hic debuff gelmez |
| Hareket | Straight (duz) | Kolay hedef |
| Gorsel | Friendly (yesil/cyan) | Dost gorsellik |

#### LONG Pozisyon + OVERBOUGHT (RSI > 80) = UNFAVORABLE (DUSMAN)

"Piyasa tepe yapmis, long tehlikede" → Dusmanlar oyuncuyu ezer

| Parametre | Deger | Aciklama |
|---|---|---|
| Aggro | 1.8x | Cok agresif |
| Hiz | 1.4x | Hizli, yakalanamaz |
| Hasar | 1.5x | Yuksek hasar |
| Can | 1.3x | Tank gibi |
| Buff Drop | %10 | Buff neredeyse yok |
| Debuff Drop | %50 | Her oldurunce %50 debuff riski |
| Hareket | Zigzag | Zor hedef |
| Gorsel | Aggressive (koyu kirmizi) | Tehlikeli gorsellik |

#### SHORT Pozisyon → Tam Tersi

- SHORT + OVERBOUGHT = FAVORABLE (dost dusmanlar)
- SHORT + OVERSOLD = UNFAVORABLE (agresif dusmanlar)

### RSI-Tetikli Ozel Spawn Olaylari

```
OVERSOLD tetiklendigi zaman (min 4sn arayla):
  %45 Bear      → Ayi tipi dusman (piyasa tematik)
  %20 FUD       → Korku yayan dusman
  %20 Liquidator → Likidasyon tehdidi
  %15 MEV Bot   → Bot saldirisi

OVERBOUGHT tetiklendigi zaman (min 4sn arayla):
  %40 Bull      → Boga tipi dusman
  %20 PumpDump  → Pump & dump saldirisi
  %15 RSI Bot   → RSI bazli bot
  %25 Rugpull   → Rugpull tehdidi
```

---

## 3. ATR Sistemi (Volatilite → Oyun Hizi)

ATR (Average True Range) piyasanin ne kadar hareketli oldugunu olcer.
Yuksek ATR = yuksek volatilite = oyun hizlanir ve kaotik olur.

### ATR → Hiz Donusumu

```
atrNorm = clamp((atrPercent - 0.002) / (0.03 - 0.002), 0, 1)
atrSpeedMult = 0.9 + atrNorm * 0.45

ATR%     | Norm | Hiz Carpani | Hissiyat
---------|------|-------------|------------------
< 0.002% | 0.0  | 0.90x       | Sakin piyasa, yavas oyun
  0.005% | 0.11 | 0.95x       | Normal
  0.010% | 0.29 | 1.03x       | Biraz hareketli
  0.020% | 0.64 | 1.19x       | Volatil, hizlanan oyun
  0.030% | 1.0  | 1.35x       | Kaos! Hersey hizli
```

### ATR → Chaos Level

```
chaosLevel = clamp(atrNorm + |priceChange|, 0, 1)
```

Chaos level yuksek olunca gorsel efektler artar (screen shake, partikuller, renk degisimleri).

### ATR → LeverageEngine Damage Amplification

```
volAmp = 1.0 + ATR% * 0.2 * 100
  ATR 0.003% → 1.06x (minimal)
  ATR 0.010% → 1.20x (belirgin)
  ATR 0.030% → 1.60x (tehlikeli)

Kaldiraciyla birlestiginde:
  100x leverage + ATR 0.02% → baseDamage(3.5) * volAmp(1.4) = 4.9x hasar (cap: 3.5x)
```

---

## 4. Volume Sistemi (Islem Hacmi → Whale Spawn)

Hacim, z-score normalizasyonuyla 0-1 araligina map edilir.

### Volume → Spawn Etkisi

```
volumeBoost = volumeNorm * 1.5  (spawnRate'e eklenir)

Volume 0.3 → +0.45 spawn
Volume 0.7 → +1.05 spawn
Volume 1.0 → +1.50 spawn
```

### Volume → Whale Tier Sistemi

| Normalized Volume | Whale Tier | Boyut | Can | Deger | Spawn Sansi |
|---|---|---|---|---|---|
| < 0.75 | Yok | - | - | - | - |
| 0.75+ | Baby Whale | 1.3x | 1.5x | 1.5x | %15 |
| 0.85+ | Whale | 1.6x | 2.5x | 2.5x | %25 |
| 0.95+ | Mega Whale | 2.0x | 4.0x | 5.0x | %20 |

---

## 5. Kaldirac Sistemi (Risk/Odul Mekanigi)

Kaldirac, oyunun temel risk/odul dengesini belirler: **Glass Cannon** mekanigi.

### Kaldirac Normalizasyonu

```
norm = (log2(leverage + 1) - 1) / (log2(101) - 1)

1x   → 0.00  (sifir etki)
5x   → 0.28  (hafif)
10x  → 0.48  (orta)
25x  → 0.71  (yuksek)
50x  → 0.84  (cok yuksek)
100x → 1.00  (maksimum)
```

### Kaldirac Carpanlari Tablosu

| Parametre | 1x | 10x | 25x | 50x | 100x | Aciklama |
|---|---|---|---|---|---|---|
| Alinan Hasar | 1.0x | 2.2x | 2.8x | 3.1x | 3.5x | Glass cannon |
| Max HP | 1.0x | 0.85x | 0.72x | 0.60x | 0.50x | Daha az can |
| XP Kazanci | 1.0x | 1.13x | 1.24x | 1.37x | 1.54x | Hizli level |
| Spawn Orani | 0.8x | 2.0x | 2.6x | 2.9x | 3.3x | Daha cok dusman |
| Dusman Hizi | 0.8x | 1.4x | 1.6x | 1.8x | 2.0x | Hizli dusmanlar |
| Dusman Hasari | 0.8x | 1.5x | 1.8x | 2.1x | 2.3x | Agir darbeler |
| Gem Degeri | 1.0x | 1.14x | 1.36x | 1.74x | 2.49x | Daha degerli loot |
| Ramp Hizi | 1.0x | 1.6x | 1.9x | 2.0x | 2.2x | Zorluk hizli artar |

---

## 6. Shock Sistemi (Ani Piyasa Hareketleri)

PnL momentum (EMA smoothed) belirli esikleri astiginda "shock" tetiklenir.

### PnL Momentum Hesabi

```
pnlMomentum = 0.8 * oncekiMomentum + 0.2 * (simdikiPnL - oncekiPnL)
```

### Shock Turleri

| Tur | Esik | Shock Factor | Efektler |
|---|---|---|---|
| Downside Shock | momentum < -0.01 | 2.0x | Ekran shake, tum zorluk 2x, hit stop (50x+ kaldiraçta) |
| Upside Shock | momentum > 0.01 | 1.2x | Hafif zorluk artisi (tetikte tut) |

### Shock Koruma Mekanizmasi

- Oyunun ilk 5 saniyesinde shock tetiklenmez (grace period)
- Art arda shock'lar arasi minimum 10 saniye (cooldown)
- 50x+ kaldiraçta hit stop efekti (100ms duraklama, sinematik darbe hissi)

---

## 7. Mercy Sistemi (Oyuncu Koruma)

Oyuncunun HP'si %30 altina dustugunde devreye girer.

```
mercy = clamp(1.0 - hpPercent * 3.33, 0, 1) * 0.7

HP %30 → mercy = 0.0 (henüz yok)
HP %20 → mercy = 0.23 (hafif yardim)
HP %10 → mercy = 0.47 (belirgin azaltma)
HP %0  → mercy = 0.70 (maksimum merhamet)

Etkileri:
  spawnRate -= mercy         (daha az dusman)
  enemySpeed -= mercy * 0.4  (daha yavas dusmanlar)
  gemDropRate += mercy * 2.0  (daha cok loot)
```

---

## 8. Smoothing Sistemi

Tum zorluk degisimleri ani degil, LERP ile yumusatilir:

```
smoothedValue += (targetValue - smoothedValue) * 0.05  (frame basina %5)
```

Bu sayede:
- Ani fiyat degisimlerinde oyun birden zorlasmaz/kolaylasmaz
- Yumusak gecis trader hissini destekler
- Oyuncu degisimi hisseder ama sarsinti olmaz

---

## 9. Senaryo Ornekleri

### Senaryo A: 25x LONG, BTC $97,000'dan $96,000'a Dusus

```
rawPnL = -1.03%
effectivePnL = -25.77% (25x kaldirac)
RSI: 18 → OVERSOLD

Dusman Hizi: 1.0 * 1.14(PnL) * 1.0(ATR) = 1.14x
Dusman Hasari: 1.0 + 0.3(zaman) + 0.35(kaldirac) + 0.64(underwater) = 2.29x
Spawn: 1.0 + 0.15(zaman) + 0.35(kaldirac) + 0.45(volume) = 1.95x

AMA RSI OVERSOLD + LONG = FAVORABLE:
  → Spawn edilen dusmanlar DOST
  → 0.5x aggro, 0.8x hiz, %70 buff drop
  → Oyuncu zor durumda AMA piyasa "dip yapti" diye oyun yardim ediyor
  → Trade hissiyati: "Zordayim ama dip olabilir, tutmaliyim"
```

### Senaryo B: 100x LONG, BTC $97,000'dan $97,500'a Cikis

```
rawPnL = +0.515%
effectivePnL = +51.5% (100x kaldirac)
RSI: 82 → OVERBOUGHT

Dusman Hizi: 1.0 * 0.94(PnL olumlu) * 1.15(kaldirac) = 1.08x
Hasar Kalkan: %5.15 (PnL shield)
Gem Degeri: 1.5(kaldirac) * 1.31(PnL boost) = 1.96x

AMA RSI OVERBOUGHT + LONG = UNFAVORABLE:
  → Spawn edilen dusmanlar AGRESIF
  → 1.8x aggro, 1.4x hiz, %50 debuff drop
  → Oyuncu karda AMA piyasa "tepe yapti" sinyali
  → Trade hissiyati: "Kardasin ama her an donebilir, dikkat!"
  → Dusmanlar zigzag yapiyor, debuff yagdiriyor
```

### Senaryo C: 50x SHORT, BTC Hizla Yukseliyor

```
rawPnL = +1% (fiyat artisi)
effectivePnL = -50% (SHORT oldugu icin ters, 50x kaldirac)
RSI: 75 → NEUTRAL (henuz OVERBOUGHT degil)
ATR: 0.025% → Yuksek volatilite

Dusman Hizi: 1.0 * 1.275(agir zarar) * 1.27(yuksek ATR) = 1.62x
Spawn: 1.0 + 0.3(zaman) + 0.6(volume) + 0.42(kaldirac) = 2.32x
LeverageEngine Hasar: 2.9(base) * 1.30(PnL pressure) * 1.50(ATR vol) = ~3.5x (cap)

Trade hissiyati: "Short pozisyondayim, fiyat yukseliyor,
  liquidation'a yaklasiyorum, her yer dusman, kaos!"
```

---

## 10. Trend Alignment (MACD → Lootbox)

MACD histogram, oyuncunun pozisyon yonuyle uyumuna gore lootbox drop oranini etkiler:

```
LONG + MACD pozitif = "with_player" → %4.5 lootbox (1.5x boost)
LONG + MACD negatif = "against_player" → %2.4 lootbox (0.8x)
Notr MACD → %3.0 lootbox (base)
```

---

## 11. Dosya Referanslari

| Sistem | Dosya | Satir |
|---|---|---|
| Ana Zorluk Hesaplama | `services/gameplay/DifficultyManager.ts` | 127-279 |
| Kural Motoru | `services/difficulty/UnifiedDirector.ts` | 55-165 |
| Kaldirac Carpanlari | `services/gameplay/LeverageEngine.ts` | 194-287 |
| RSI Dusman Modifiyeri | `types/indicators.ts` | 249-318, 503-518 |
| RSI Hesaplama | `services/indicators/RSICalculator.ts` | 147-234 |
| ATR Hesaplama | `services/indicators/ATRCalculator.ts` | 29-81 |
| Spawn Sistemi | `services/combat/SpawnSystem.ts` | 245-339 |
| Market Hesaplama | `services/market/MarketCalculator.ts` | 64-88 |
| Zorluk Context | `services/difficulty/DifficultyContext.ts` | 21-43 |
| Zorluk Tipleri | `services/gameplay/DifficultyTypes.ts` | tum dosya |
| Dusman Factory | `factories/EnemyFactory.ts` | 56-155 |
| Whale Tier Config | `types/indicators.ts` | 99-147 |

---

## 12. Veri Akis Diyagrami

```
Binance/Coinbase WebSocket
    │
    ▼
MarketService (canli fiyat, volume)
    │
    ├──▶ MarketCalculator (PnL = (price-entry)/entry * leverage)
    │       │
    │       ▼
    │   DifficultyContext (tum inputlari toplar)
    │       │
    │       ▼
    │   UnifiedDirector (kural motoru)
    │       │ pnlSpeedMult, underwaterPenalty, volumeBoost, atrSpeedMult
    │       ▼
    │   DifficultyManager.calculate() → DifficultyOutput
    │       │
    │       ├──▶ SpawnSystem (spawn orani, dusman turu)
    │       ├──▶ CombatSystem (hasar carpanlari)
    │       └──▶ HUD/Efektler (chaos level, shock, FOV)
    │
    ├──▶ RSICalculator → RSI State (OVERSOLD/NEUTRAL/OVERBOUGHT)
    │       │
    │       ▼
    │   getEnemyModifierFromRSI(rsiState, position)
    │       │ FRIENDLY / NEUTRAL / AGGRESSIVE modifier
    │       ▼
    │   EnemyFactory.createEnemy(..., rsiModifier)
    │       → hiz, hasar, can, drop orani, hareket paterni
    │
    ├──▶ ATRCalculator → ATR Percent
    │       │
    │       ▼
    │   atrSpeedMult = 0.9 + norm * 0.45
    │   chaosLevel = atrNorm + |priceChange|
    │
    └──▶ Volume Normalization → Whale Tier
            │
            ▼
        whaleProbability = volume * 0.05 + trend * 0.02
```
