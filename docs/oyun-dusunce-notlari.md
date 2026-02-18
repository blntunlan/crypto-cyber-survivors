# Oyun Dusunce Notlari (Plan Asamasi - Gelistirilmis Blueprint)

## 1. Hedef ve Kapsam
- Tek ve net bir core loop kurulacak.
- Run icinde market feed oyunu anlik etkileyecek.
- Leverage run baslangicinda secilecek ve run sonuna kadar sabit kalacak.
- Leverage arttikca oyuncu daha kirilgan olacak, ancak gem/XP odulleri artacak.
- Tum runtime etkiler tek bir "snapshot" kaynagindan okunacak.
- Mevcut director katmanlari kaldirilacak ve sade bir market-driven pipeline kullanilacak.

## 2. Ust Mimari (Single Source of Truth)

Pipeline:
`MarketInput -> SignalNormalizer -> RuntimeDifficultyEngine -> RuntimeDifficultySnapshot -> Core Systems`

Core systems:
- Spawn
- Enemy movement/speed
- Enemy damage
- Player fragility (alinan hasar)
- Gem/XP multiplier
- Lootbox drop chance

Kurallar:
- Her frame ayri formuller calistirilmaz, en son hesaplanan snapshot kullanilir.
- Spawn, collision, reward gibi sistemler market verisini direkt okumaz.
- Tum sistemler yalnizca `RuntimeDifficultySnapshot` uzerinden etkilenir.

## 3. Domain Modeli (Kontratlar)

```ts
export type PositionSide = 'long' | 'short';
export type TrendAlignment = 'with_player' | 'against_player' | 'neutral';
export type RsiSignal = 'none' | 'oversold' | 'overbought';
export type WhaleTier = 0 | 1 | 2 | 3;

export interface RunConfig {
  runId: string;
  leverage: number; // main menu secilir, run boyunca sabit
  side: PositionSide; // long/short
  entryPrice: number;
  pair: string; // BTCUSDT vb.
  startedAt: number;
}

export interface MarketSnapshot {
  ts: number;
  pairPrice: number;
  rsi: number | null;
  atr: number | null;
  macdHistogram: number | null;
  volume: number | null;
  volumeEma: number | null;
}

export interface RuntimeDifficultySnapshot {
  ts: number;
  leverage: number;
  pnlPercent: number; // leverage uygulanmis efektif pnl
  fragilityMult: number; // player hasar carpan
  enemySpeedMult: number;
  enemyDamageMult: number;
  spawnRateMult: number;
  gemXpMult: number;
  lootboxDropChance: number;
  trendAlignment: TrendAlignment;
  rsiSignal: RsiSignal;
  whaleTier: WhaleTier;
  marketTimedOut: boolean;
}
```

## 4. Runtime Kurallari (Kesin Is Mantigi)

### 4.1 Leverage (run boyu sabit)
- `leverage` main menu secimidir.
- Run basladiktan sonra degistirilemez.
- Etkiler:
  - `fragilityMult` artar.
  - `gemXpMult` artar.

Ornek tier tablosu (ilk denge icin):

| Leverage Band | Fragility Mult | Gem/XP Mult |
|---|---:|---:|
| 1x - 5x | 1.00 - 1.12 | 1.00 - 1.10 |
| 6x - 20x | 1.13 - 1.35 | 1.11 - 1.35 |
| 21x - 50x | 1.36 - 1.75 | 1.36 - 1.70 |
| 51x - 100x | 1.76 - 2.30 | 1.71 - 2.20 |

Not:
- Bu tablo baslangic tuning tablosudur.
- Cap degerleri zorunludur (asiri dengesizlik olmamasi icin).

### 4.2 PnL (canli feed)
Temel hesap:

```ts
const rawMove = side === 'long'
  ? (pairPrice - entryPrice) / entryPrice
  : (entryPrice - pairPrice) / entryPrice;

const pnlPercent = clamp(rawMove * leverage, -1, 1);
```

Kural:
- PnL negatife gittikce enemy speed artar.
- PnL pozitifse speed bir miktar rahatlar ama asla tamamen dusmez.

Ornek etki:

```ts
const speedFromNegativePnl = 1 + clamp(-pnlPercent, 0, 0.6) * 0.55;
const speedFromPositivePnl = 1 - clamp(pnlPercent, 0, 0.4) * 0.15;
const pnlSpeedMult = pnlPercent < 0 ? speedFromNegativePnl : speedFromPositivePnl;
```

### 4.3 RSI spawn
- `rsi < 20` ise `oversold` RSI enemy spawn.
- `rsi > 80` ise `overbought` RSI enemy spawn.
- Cooldown olmadan arka arkaya spawn yok.

Ornek:
- Min cooldown: `4s`
- Tek tickte max RSI enemy: `1`

### 4.4 Volume spike -> Whale tier
Ornek spike orani:

```ts
const spikeRatio = volume / max(volumeEma, 1);
```

Tier:
- `spikeRatio < 1.8` -> `tier 0` (spawn yok)
- `1.8 <= spikeRatio < 2.5` -> `tier 1 whale`
- `2.5 <= spikeRatio < 4.0` -> `tier 2 whale`
- `>= 4.0` -> `tier 3 whale`

Koruma:
- Whale spawn icin ayri cooldown zorunlu.
- Ayni anda birden fazla whale spawn limitli olmali.

### 4.5 ATR -> genel enemy speed
Normalize:

```ts
const atrPct = atr && pairPrice > 0 ? atr / pairPrice : 0;
const atrNorm = normalize(atrPct, 0.002, 0.03); // 0..1
const atrSpeedMult = lerp(0.90, 1.35, atrNorm);
```

Kural:
- ATR yuksekse global speed artar.
- ATR cok dusukse speed hafif dusurulup okunabilirlik korunur.

### 4.6 MACD trend -> lootbox avantaji
Alignment:

```ts
const trendAlignment =
  macdHistogram == null
    ? 'neutral'
    : side === 'long'
      ? (macdHistogram > 0 ? 'with_player' : 'against_player')
      : (macdHistogram < 0 ? 'with_player' : 'against_player');
```

Lootbox:
- Base lootbox chance: `0.03`
- `with_player` ise chance artar.
- `against_player` ise base veya hafif dusuk kalir.
- V1'de lootbox icerigi sadece `gem`.

### 4.7 Market timeout (zorunlu gameover)
- Son market tick zamani tutulur.
- `now - lastTickAt > 15000ms` ise run zorunlu biter.
- Oyun sonu nedeni: `market_timeout`.

Opsiyonel UX:
- `10s` sonrasi HUD warning.
- `13s` sonrasi kritik warning.

## 5. Core Loop Fazlari (Frame Akisi)

Her frame:
1. `Sense`: son market snapshot + player/runtime state oku
2. `Compute`: RuntimeDifficultyEngine snapshot hesapla/guncelle
3. `Apply`: snapshot degerlerini spawn/combat/reward sistemlerine uygula
4. `Resolve`: movement, collision, hasar, kill/colect isle
5. `Reward`: gem/XP/lootbox kurallarini uygula
6. `Check`: timeout/gameover/levelup/state transition kontrol et
7. `Render`: frame ciz

Kural:
- Hesaplanan snapshot frame icinde immutable kabul edilir.

## 6. Kod Tabanina Entegrasyon Noktalari

Mevcut dosyalar:
- `hooks/useMarketData.ts` -> MarketSnapshot cikisi
- `services/gameplay/DifficultyManager.ts` -> RuntimeDifficultyEngine gorevi
- `components/GameEngine.tsx` -> core loop ve snapshot uygulama
- `services/combat/SpawnSystem.ts` -> RSI/whale/spawn-rate etkileri
- `services/combat/physics/CollisionSystem.ts` -> fragility carpan
- `services/gameplay/ExperienceService.ts` -> gem/XP multiplier
- `services/core/GameStateMachine.ts` -> timeout/gameover transition

Yeni hedef:
- Tum runtime etkiler tek output `RuntimeDifficultySnapshot` uzerinden aktarilacak.

## 7. Director Kaldirma Stratejisi

Sorun:
- Birden fazla director/difficulty yolu oldugu icin etki cakismasi ve tuning zorlugu.

Karar:
- Director katmanlari devre disi birakilip tek pipeline kalacak.

Guvenli gecis plani:
1. Feature flag: `USE_LEGACY_DIRECTOR=false` (default)
2. Director baglantilarini pasiflestir, snapshot pipeline'i tek aktif yol yap
3. 1 release gozlemle
4. Legacy director kodu ve testlerini temizle

## 8. Implementasyon Fazlari (Parca Parca Workflow)

### Faz 0 - Sozlesme ve tipler
- `RunConfig`, `MarketSnapshot`, `RuntimeDifficultySnapshot` tiplerini sabitle.
- Dogrulama: tipler compile, unit test skeleton hazir.

### Faz 1 - Leverage ve fragility/gemXp
- Run baslangicinda leverage lock.
- Fragility ve gem/XP multiplier tablo/egri implementasyonu.
- Dogrulama: leverage bir kez secilip run boyunca degismiyor.

### Faz 2 - Canli PnL motoru
- Entry/side/leverage/live price ile efektif pnl hesapla.
- Enemy speed'e pnl etkisini bagla.
- Dogrulama: negatif pnl -> speed artar, pozitif pnl -> speed normalize.

### Faz 3 - RSI + volume spawn kurallari
- RSI enemy spawn kapilari.
- Volume spike -> whale tier spawn.
- Cooldown + max active limiti ekle.
- Dogrulama: sentetik feed ile tier bazli spawn beklenen sekilde calisir.

### Faz 4 - ATR + MACD entegrasyonu
- ATR global speed carpanina baglanir.
- MACD trend alignment lootbox chance'i etkiler.
- V1 lootbox only-gem.
- Dogrulama: alignment durumuna gore lootbox olasiligi farkli.

### Faz 5 - Timeout failover
- 15s feed kesintisinde zorunlu gameover.
- Gerekirse warning HUD.
- Dogrulama: testte feed stop edildiginde timeout reason ile run sonlanir.

### Faz 6 - Legacy director temizligi
- Flag ile pasiflestirilmis director kodlarini kaldir.
- Cakisan impact path'lerini temizle.
- Dogrulama: tum runtime etkiler tek snapshot path'inden geliyor.

### Faz 7 - Balancing ve telemetri
- Cap ve egri degerlerini test/sim sonuclarina gore tune et.
- Metrikler: ortalama run suresi, timeout oranlari, leverage band dagilimi.
- Dogrulama: asiri leverage bandlerinde oynanabilirlik korunur.

## 9. Test Stratejisi

Unit test:
- PnL hesap dogrulugu (long/short)
- Leverage tier mapping
- RSI trigger logic
- Volume spike tier mapping
- ATR speed mapping
- MACD trend alignment
- Timeout detector

Integration test:
- GameEngine frame akisinda snapshot etkileri
- Spawn + combat + reward tutarliligi
- Timeout durumunda state transition

Balancing test:
- Farkli leverage ve market rejimlerinde run simulation
- "Too easy / too hard" bant kontrolu

## 10. Supabase Kesinti Analizi Plani

Kaynak:
- `supabase.price_history`

Cevaplanacak sorular:
- Tick aralik medyan degeri nedir?
- P95/P99 tick gap degerleri nedir?
- 15s ustu gap ne siklikla goruluyor?
- Pair bazinda fark var mi?

Cikti:
- Timeout degeri (15s) korunacak mi, 12-20s araliginda mi tune edilecek?

## 11. Bu Dokumana Gore Sonraki Adim

Uygulama sirasinda her faz icin:
1. Kod degisikligi
2. Unit/integration test
3. Kisa balans kontrolu
4. Sonraki faza gecis

Bu plan ile sistem "bosluk birakmadan" adim adim implement edilebilir.
