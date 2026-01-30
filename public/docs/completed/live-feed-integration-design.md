# 🎮 Crypto Cyber Survivors - Core Game Brain Architecture

## 📋 Kararlaştırılan Tasarım Dokümanı
**Versiyon:** 2.1  
**Tarih:** 2025-12-22  
**Durum:** Ultra-Think Revizyonu - Kesinleşmiş Kararlar

---

## 🎯 Ana Felsefe

> **"Trade = Survival"**  
> Oyuncu gerçek bir kripto pozisyonundaymış gibi hissetmeli.  
> Her piyasa hareketi oyun deneyimini doğrudan etkilemeli.  
> **En büyük düşman kendi açgözlülüğündür.**

---

## 📊 Karar #1: Fiyat Değişimi Kategorileri

### Şu An İçin Statik Eşikler
```typescript
enum PriceMovementCategory {
  MICRO = 'micro',       // < %0.1
  SMALL = 'small',       // %0.1 - %0.5
  MEDIUM = 'medium',     // %0.5 - %1
  LARGE = 'large',       // %1 - %3
  EXTREME = 'extreme'    // > %3 (WHALE EVENT)
}
```

### Gelecek: Dinamik İndikatör Bazlı
- ATR (Average True Range) bazlı dinamik eşikler
- Piyasa koşullarına göre otomatik ayarlanan kategoriler
- Örnek: Düşük volatilitede %0.3 = LARGE, Yüksek volatilitede %1 = MEDIUM

### Anti-Cheat: Fiyat Verisi Saklama
```typescript
interface StoredPricePoint {
  timestamp: number;      // Unix timestamp (ms)
  price: number;          // Actual price
  source: 'binance' | 'coinbase';
  gameSessionId: string;  // Hangi oyun oturumu
}

// Backend'de doğrulama için
interface GameSessionVerification {
  sessionId: string;
  startTime: number;
  endTime: number;
  priceHistory: StoredPricePoint[];
  // Backend bu verileri kendi kayıtlarıyla karşılaştırır
}
```

**Durum:** ✅ Statik başla, dinamik geliştir

---

## 🔴 Karar #2: Likidasyon & Avatar Sistemi

### Likidasyon Mesafesi (Danger Levels) - Background Renk Değişimi
```typescript
interface DangerLevel {
  level: 'safe' | 'caution' | 'danger' | 'critical' | 'liquidating';
  backgroundColor: string;
  effectivePnLThreshold: number;
}

const DANGER_LEVELS: DangerLevel[] = [
  { level: 'safe',        backgroundColor: 'normal',      effectivePnLThreshold: -0.30 },
  { level: 'caution',     backgroundColor: 'yellow-tint', effectivePnLThreshold: -0.50 },
  { level: 'danger',      backgroundColor: 'orange-tint', effectivePnLThreshold: -0.70 },
  { level: 'critical',    backgroundColor: 'red-pulse',   effectivePnLThreshold: -0.90 },
  { level: 'liquidating', backgroundColor: 'black-white', effectivePnLThreshold: -1.00 },
];
```

### Background Efekt Detayları
| Level | Background | Ek Efektler |
|-------|------------|-------------|
| safe | Normal gradient | Yok |
| caution | Sarı kenar glow | - |
| danger | Turuncu vignette | Hafif shake |
| critical | Kırmızı pulse | Heartbeat ses, ekran titremesi |
| liquidating | Siyah-beyaz, slow-mo | 3 saniye son şans |

### Likidasyon = Oyun Biter
```typescript
// effectivePnL <= -1.0 olunca
function handleLiquidation(session: GameSession): void {
  // 1. 3 saniyelik "liquidation sequence"
  triggerLiquidationSequence();
  
  // 2. Oyun biter
  endGame({
    reason: 'liquidation',
    finalPnL: session.effectivePnL,
    coinsEarned: 0,  // LİKİDASYON = SIFIR COIN
    message: "REKT 💀"
  });
}
```

### 💡 Dynamic Avatar Mutation (Görsel PnL)
Oyuncu portföyünün fiziksel yansımasıdır.

| Durum | Görsel Değişim |
|-------|----------------|
| **Bullish Growth (Kârda)** | Karakter büyür, parlak hale gelir. Silahlar güçlenir, efektler "yukarı" doğru. |
| **Bearish Corruption (Zararda)** | Karakter küçülür, kararır, dikenli hale gelir (defansif mod). |
| **High Volatility** | Karakter titrer, elektrik saçar (Unstable Mode). |
| **Critical Danger** | Zırh parçalanır, karakter "çıplak" kalır, her darbe ölümcül. |

**Durum:** ✅ Onaylandı

---

## ⏱️ Karar #3: Zaman Mimarisi & Greed Curse

### Faz 1: Entry Hype (0:00 - 1:00)
```
0:00 - 0:15  → Intro, ilk düşmanlar (öğrenme)
0:15 - 0:30  → Spawn ramp-up
0:30 - 0:45  → Normal tempo
0:45 - 1:00  → İlk climax (elite wave veya mini challenge)
```

### Faz 2: Position Hold (1:00 - 5:00)
```
Market-driven difficulty
Wave cycles (calm → building → intense → peak)
Whale events on extreme price movements
RSI-based special spawns
```

### Faz 3: Take Profit Decision (5:00)
Oyun pause, karar ekranı (detay aşağıda)

### Faz 4: Extended Play (5:00+) - Eğer Double Down/Reverse seçilirse
```
Aynı döngü devam, ama:
- Difficulty 1.5x
- Rewards 2x
- Her 5 dakikada yeni karar noktası
- Greed Curse aktif
```

### 💡 The Greed Curse (Açgözlülük Laneti)
> "Açgözlülük kör eder."

- **Mekanik:** Her +5 dakikada (Double Down), Loot değerleri artar (%20) AMA Görüş Alanı (Fog of War) %10 azalır.
- **Sonuç:** Uzun süre oynayan oyuncu çok kazanır ama neredeyse kör oynar.
- **Metafor:** Risk sadece matematiksel değil, oynanışsal bir handikap haline gelir.

**Durum:** ✅ Onaylandı

---

## 💰 Karar #4: Take Profit Decision Ekranı

### Ekran Tasarımı
```
┌─────────────────────────────────────────────────────────────┐
│                    📊 POSITION REPORT                        │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Entry: $97,450    Current: $98,200                         │
│  Position: LONG 10x                                          │
│  Raw PnL: +0.77%   Effective PnL: +7.7%                      │
│                                                              │
│  ⏱️ Survival: 5:00   ⚔️ Kills: 234   🎯 Max Combo: 47        │
│                                                              │
│  💰 ESTIMATED REWARD: 1,250 COINS                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ 🟢 TAKE PROFIT │  │ 🔄 DOUBLE DOWN │  │ ↩️ REVERSE     │ │
│  │   Exit & Claim │  │  +5 min, 2x    │  │  Flip Position │ │
│  │   Safe coins   │  │  More risk     │  │  New direction │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                              │
│           ┌────────────────┐                                 │
│           │ 💉 ADD MARGIN  │  ← Sadece kritik durumda        │
│           │  Lower liq.    │                                 │
│           └────────────────┘                                 │
│                                                              │
│  ⏳ Decision in: 15 seconds                                  │
│  ⚠️ No decision = Take Profit (safe exit)                    │
└─────────────────────────────────────────────────────────────┘
```

### Seçenek Kuralları
```typescript
interface TakeProfitOptions {
  takeProfit: {
    always: true;
    action: 'end_game_with_rewards';
  };
  
  doubleDown: {
    available: effectivePnL > -0.50;  // %50'den fazla kayıpta yok
    action: 'continue_5min_2x_rewards';
    riskIncrease: 1.5;  // Difficulty +50%
    greedCurse: '+1 level';
  };
  
  reverse: {
    available: effectivePnL > -0.70;  // %70'den fazla kayıpta yok
    action: 'flip_position_new_5min';
    note: 'Long→Short veya Short→Long';
    greedCurse: 'reset';
  };
  
  addMargin: {
    available: effectivePnL < -0.70;  // SADECE kritik durumda
    action: 'lower_liquidation_threshold';
    effect: 'Likidasyon eşiği %50 düşer';  // -100% → -150%
    penalty: 'Final coins -30%';
  };
}
```

### Süre Biterse
- Otomatik **Take Profit** seçilir (güvenli çıkış)
- Oyuncu cezalandırılmaz

**Durum:** ✅ Kesinleşti

---

## 🐋 Karar #5: Algorithmic Enemies (Market Makers)

Düşmanlar piyasa aktörlerini taklit eder.

### 💡 Enemy Types

| Düşman | Tetikleme | Davranış | Ödül |
|--------|-----------|----------|------|
| **Stop-Loss Hunters** | Her zaman | Oyuncuya saldırmaz, etrafında döner. Can %30'a inince hepsi birden saldırır. | Normal |
| **FOMO Swarm** | Pump sırasında | Oyuncudan kaçarlar. Yakalarsan ekstra ödül. | Yüksek |
| **Panic Sellers** | Dump sırasında | İntihar saldırısı. Hızlı ama zayıf. | Düşük |
| **The Crab** | Durağan piyasa | Çok zırhlı, yavaş, bıktırıcı. | Orta |

### Whale Event
| Durum | Whale Tipi | Davranış |
|-------|------------|----------|
| Pozitif (kârda) | Friendly Whale | Zayıf düşman, kolay öldürülür, LOOTBOX garantisi |
| Negatif (zararda) | Hostile Whale | Mini-boss, tehlikeli, öldürünce LOOTBOX |

**Tetikleme:** > %3 fiyat hareketi (EXTREME category)

**Durum:** ✅ Onaylandı

---

## 📈 Karar #6: RSI Spawn Sistemi (Mean Reversion)

Teknik analizin "Mean Reversion" (Ortalamaya Dönüş) prensibine göre tasarlandı.

### RSI Zone Mapping

#### 1. RSI < 30 (Oversold - Aşırı Satım)
**Piyasa çok düştü, tepki yükselişi gelme ihtimali yüksek.**

| Pozisyon | Durum | Etki |
|----------|-------|------|
| **LONG** | ✅ **FAVORABLE** (Dip Buying Opportunity) | Spawn -20%, Loot +50%, Zayıf düşmanlar, "BUY THE DIP" yeşil aura |
| **SHORT** | ❌ **UNFAVORABLE** (Trend Reversal Risk) | Spawn +30%, Stop-Loss Hunter'lar spawn, Uyarı işaretleri |

#### 2. RSI > 70 (Overbought - Aşırı Alım)  
**Piyasa çok yükseldi, düzeltme düşüşü gelme ihtimali yüksek.**

| Pozisyon | Durum | Etki |
|----------|-------|------|
| **SHORT** | ✅ **FAVORABLE** (Top Selling Opportunity) | Spawn -20%, Loot +50%, Zayıf düşmanlar, "SHORT THE TOP" kırmızı aura |
| **LONG** | ❌ **UNFAVORABLE** (Trend Exhaustion Risk) | Spawn +30%, Profit Takers spawn, Uyarı işaretleri |

#### 3. RSI 30-70 (Neutral)
**Trend takibi, standart oynanış.**

| Pozisyon | Durum | Etki |
|----------|-------|------|
| Hepsi | Neutral | Standart spawn, The Crab düşmanları |

### Görsel Feedback Örneği
```
┌─────────────────────────────────────────┐
│  RSI: 25 [OVERSOLD]                     │
│  ░░░░░░████████████  25/100             │
│                                          │
│  📉 Your LONG is in favorable zone!     │
│  🎁 +50% Loot Quality                   │
│  💪 BUY THE DIP - Enemies are weaker    │
└─────────────────────────────────────────┘
```

**Durum:** ✅ Revize Edildi (Mean Reversion mantığı)

---

## 🎚️ Karar #7: Level-Up Zaman Baskısı

### Kurallar
```typescript
interface LevelUpConfig {
  maxDecisionTime: 10;  // saniye
  
  gameState: 'PAUSED';  // Oyun durur
  
  // Süre bitince
  onTimeout: 'NO_CARD';  // Hiçbir kart verilmez
  
  // Görsel baskı
  visualPressure: {
    lastSeconds: 5;      // Son 5 saniye
    effect: 'red_border_pulse';
    sound: 'tick_tock';
  };
}
```

### Akış
```
Level Up!
    ↓
Oyun PAUSE
    ↓
10 saniye timer başlar
    ↓
Oyuncu kart seçer → Kart alır, oyun devam
    veya
Timer biter → KART YOK, oyun devam
```

**Durum:** ✅ Kesinleşti

---

## 🎮 Karar #8: Rekabetçi Mod

### Kısıtlamalar
```typescript
interface CompetitiveMode {
  // Pause sistemi
  pauseMenuEnabled: false;  // PAUSE YOK (abuse önlemi)
  
  // Level-up
  levelUpPausesGame: true;  // Bu durur
  levelUpMaxTime: 10;       // 10 saniye
  
  // Take Profit
  takeProfitPausesGame: true;  // Bu da durur
  takeProfitMaxTime: 15;       // 15 saniye
  
  // Alt-tab/minimize
  onFocusLoss: 'continue';  // Oyun devam eder
  
  // Anti-cheat
  priceValidation: true;    // Fiyat verisi doğrulaması
}
```

### Neden Pause Yok?
1. Oyuncular zor anlarda pause yaparak strateji düşünmesin
2. Gerçek trade'de pause yok, burada da olmasın
3. Adrenalin ve baskı hissi korunmalı
4. Leaderboard için eşit şartlar

**Durum:** ✅ Kesinleşti

---

## 🔧 Implementasyon Öncelikleri

### Phase 1: Core Mechanics (Öncelik 1)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 1.1 | RSI Hesaplama | `useMarketData.ts` | 1 saat |
| 1.2 | Danger Level Background | `BackgroundRenderer.ts` | 2 saat |
| 1.3 | Likidasyon Event | `GameStateManager.ts` | 1 saat |
| 1.4 | Level-Up Timer | `LevelUpScreen.tsx` | 1 saat |

### Phase 2: Market Events (Öncelik 2)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 2.1 | Price Movement Detection | `MarketEventService.ts` (yeni) | 2 saat |
| 2.2 | Whale Spawn Logic | `SpawnSystem.ts` | 2 saat |
| 2.3 | RSI Zone Effects | `DifficultyManager.ts` | 2 saat |

### Phase 3: Algorithmic Enemies (Öncelik 3)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 3.1 | Stop-Loss Hunters AI | `EnemyBehaviors.ts` (yeni) | 2 saat |
| 3.2 | FOMO Swarm AI | `EnemyBehaviors.ts` | 2 saat |
| 3.3 | Panic Sellers AI | `EnemyBehaviors.ts` | 1 saat |

### Phase 4: Ultra-Think Features (Öncelik 4)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 4.1 | Dynamic Avatar Mutation | `PlayerRenderer.ts` | 3 saat |
| 4.2 | Greed Curse (Fog of War) | `BackgroundRenderer.ts` | 2 saat |

### Phase 5: Take Profit System (Öncelik 5)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 5.1 | Take Profit Screen | `TakeProfitScreen.tsx` (yeni) | 3 saat |
| 5.2 | Double Down Logic | `GameStateManager.ts` | 1 saat |
| 5.3 | Reverse Position | `useMarketData.ts` | 1 saat |
| 5.4 | Add Margin | `LiquidationService.ts` (yeni) | 1 saat |

### Phase 6: Lootbox & Rewards (Öncelik 6)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 6.1 | Lootbox Entity | `types/Lootbox.ts` (yeni) | 1 saat |
| 6.2 | Lootbox Spawner | `LootboxSpawner.ts` (yeni) | 2 saat |
| 6.3 | Lootbox UI | `LootboxScreen.tsx` (yeni) | 3 saat |

### Phase 7: Anti-Cheat & Storage (Öncelik 7)
| Sıra | Feature | Dosya | Süre |
|------|---------|-------|------|
| 7.1 | Price History Storage | `PriceHistoryService.ts` (yeni) | 2 saat |
| 7.2 | Session Validation | `SessionValidator.ts` (yeni) | 3 saat |

---

## 📝 Sonraki Adımlar

1. **Phase 1.1: RSI Hesaplama** - Hemen başlayabiliriz
2. Danger Level Background görselleştirmesi
3. Whale enemy type tasarımı
4. Lootbox içerik tablosu

---

## ❓ Açık Sorular (Sonra Cevaplanacak)

1. Spawn rate formülünün detaylı parametreleri
2. Yeni silah tipleri (orbital, aura, chain, bomb)
3. Yeni enemy tipleri detayları
4. Lootbox içerik oranları
5. Coin ekonomisi (kaç coin = 1 token?)

---

*Bu doküman güncellenmeye devam edecek.*
*Oyun sadece bir simülasyon değil, psikolojik bir deneyim olmasını hedefler.*
