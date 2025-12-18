# 📊 Oyun Metrikleri Toplama ve Analiz Roadmap

> Bitcoin fiyatının oyuna etkisini ve oyuncu deneyimini analiz etmek için kapsamlı bir metrik sistemi.

---

## �️ Feature Flag Sistemi

Metrik toplama sistemi **kolayca açılıp kapanabilir** bir yapıda tasarlandı.

### Hızlı Açma/Kapama

`config/MetricsConfig.ts` dosyasını aç ve `enabled` değerini değiştir:

```typescript
export const METRICS_CONFIG: MetricsConfig = {
  // 🎚️ MASTER SWITCH - Set to false to disable all metrics
  enabled: true,  // ← true veya false yap
  
  showDebugPanel: true,
  // ...
};
```

### Environment Variables (Future)

```bash
# .env veya .env.local dosyasına ekle
VITE_METRICS_ENABLED=false
VITE_METRICS_REMOTE_ENDPOINT=https://api.yourserver.com/metrics
VITE_METRICS_API_KEY=your-api-key
```

### Performans Etkisi

- **`enabled: false`** → Sıfır performans etkisi (tüm metodlar hemen return eder)
- **`enabled: true`** → Minimal overhead (frame başına ~0.1ms)

---

## 🗄️ Gelecekte Database Entegrasyonu

Sistem `remote` storage tipini destekleyecek şekilde tasarlandı:

```typescript
storage: {
  type: 'remote',  // 'local' yerine 'remote'
  remoteEndpoint: 'https://api.yourserver.com/metrics',
  apiKey: 'your-api-key',
}
```

Gerekli endpoint'ler:
- `POST /metrics/sessions` → Oturum kaydet
- `GET /metrics/sessions` → Oturumları getir
- `POST /metrics/insights` → Insight hesapla

---

## �🎯 Amaç

Oyunu daha eğlenceli hale getirmek için şu verileri topluyoruz:
1. **Bitcoin Etki Analizi** - Fiyat hareketleri oyunu nasıl etkiliyor?
2. **Zorluk Dengesi** - Oyun çok mu zor? Çok mu kolay?
3. **Oyuncu Davranışları** - Oyuncular nerelerde zorlanıyor?
4. **İyileştirme Fırsatları** - Hangi mekanikleri değiştirmeliyiz?

---

## 📐 Metrik Kategorileri

### 1. 📈 Bitcoin & Market Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `BTC_001` | `priceAtStart` | Oyun başlangıcındaki BTC fiyatı | Başlangıç koşulu analizi |
| `BTC_002` | `priceAtEnd` | Oyun bitimindeki BTC fiyatı | Fiyat hareketinin etkisi |
| `BTC_003` | `priceChange` | Oyun süresince toplam fiyat değişimi (%) | Volatilite etkisi |
| `BTC_004` | `maxPnL` | Ulaşılan maksimum kar oranı | En iyi an |
| `BTC_005` | `minPnL` | Ulaşılan minimum kar/zarar oranı | En kötü an |
| `BTC_006` | `averagePnL` | Oyun boyunca ortalama PnL | Genel durum |
| `BTC_007` | `volatilityScore` | Oyun süresince ortalama ATR | Piyasa durumu |
| `BTC_008` | `positionChosen` | Seçilen pozisyon (LONG/SHORT) | Oyuncu tercihi |
| `BTC_009` | `pnlAtDeath` | Ölüm anındaki PnL | Kritik an analizi |

### 2. ⚔️ Zorluk Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `DIF_001` | `averageDifficulty` | Oyun boyunca ortalama zorluk | Genel zorluk seviyesi |
| `DIF_002` | `maxDifficulty` | Ulaşılan maksimum zorluk | Spike'ları tespit |
| `DIF_003` | `timeInEachWavePhase` | Her dalga fazında geçen süre | Dalga dengesi |
| `DIF_004` | `difficultyAtDeath` | Ölüm anındaki zorluk | Kritik eşik |
| `DIF_005` | `pnlVsDifficultyCorrelation` | PnL-Zorluk korelasyonu | Bitcoin etkisi |
| `DIF_006` | `timeInHighDifficulty` | Yüksek zorlukta (>5) geçen süre | Stres süresi |
| `DIF_007` | `timeInLowDifficulty` | Düşük zorlukta (<2) geçen süre | Rahat süre |
| `DIF_008` | `nearDeathActivations` | Near-death mercy kaç kez aktif oldu | Kurtarma sistemi |

### 3. 🎮 Oyuncu Performans Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `PLR_001` | `totalKills` | Toplam öldürülen düşman | Performans |
| `PLR_002` | `survivalTimeMs` | Hayatta kalma süresi (ms) | Ana başarı metriği |
| `PLR_003` | `maxLevel` | Ulaşılan maksimum seviye | Progression |
| `PLR_004` | `damageDealt` | Verilen toplam hasar | Saldırı gücü |
| `PLR_005` | `damageTaken` | Alınan toplam hasar | Savunma |
| `PLR_006` | `healingReceived` | Alınan toplam iyileşme | İyileşme kullanımı |
| `PLR_007` | `gemsCollected` | Toplanan gem sayısı | Kaynak toplama |
| `PLR_008` | `expEarned` | Kazanılan toplam XP | Progression hızı |
| `PLR_009` | `criticalHits` | Kritik vuruş sayısı | Şans/Skill |
| `PLR_010` | `superCriticalHits` | Super kritik vuruş sayısı | High-end performance |

### 4. 🔥 Combo & Streak Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `CMB_001` | `maxStreak` | Maksimum kill streak | En iyi an |
| `CMB_002` | `averageStreak` | Ortalama streak süresi | Combo tutarlılığı |
| `CMB_003` | `milestonesReached` | Ulaşılan milestone'lar | Başarı seviyeleri |
| `CMB_004` | `comboTimeouts` | Combo'nun timeout olma sayısı | Akış kesintileri |
| `CMB_005` | `totalBonusXp` | Combo'dan kazanılan bonus XP | Ekstra ödül |

### 5. 🃏 Kart & Upgrade Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `CRD_001` | `cardsChosen` | Seçilen kartların listesi | Popüler kartlar |
| `CRD_002` | `cardsByTier` | Tier'lara göre seçilen kartlar | Tier dengesi |
| `CRD_003` | `levelUpCount` | Toplam level up sayısı | Progression |
| `CRD_004` | `averageTimeToLevelUp` | Ortalama level up süresi | Pacing |

### 6. 👾 Düşman Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `ENM_001` | `killsByType` | Tür bazında öldürülen düşmanlar | Düşman dengesi |
| `ENM_002` | `maxEnemiesOnScreen` | Ekrandaki max düşman sayısı | Spawn dengesi |
| `ENM_003` | `averageEnemyLifetime` | Ortalama düşman yaşam süresi | Zorluk göstergesi |
| `ENM_004` | `spawnsTotal` | Toplam spawn edilen düşman | Spawn rate |

### 7. ⏱️ Zaman & Oturum Metrikleri

| Metrik ID | Metrik Adı | Açıklama | Amaç |
|-----------|------------|----------|------|
| `SES_001` | `sessionId` | Benzersiz oturum ID | Tracking |
| `SES_002` | `sessionTimestamp` | Oturum başlangıç zamanı | Zaman analizi |
| `SES_003` | `gameEndReason` | Oyun bitiş sebebi | Ölüm analizi |
| `SES_004` | `timeToDeath` | İlk önemli hasardan ölüme süre | Survival curve |

---

## 🏗️ Implementasyon Planı

### Faz 1: Temel Altyapı ✅ TAMAMLANDI

```
📦 MetricsService
 ├── 📄 services/MetricsService.ts      → Ana servis ✓
 └── 📄 types/metrics.ts                → Type definitions ✓
```

**Görevler:**
1. [x] `MetricsService.ts` singleton oluştur
2. [x] EventBus ile entegrasyon
3. [x] Oturum bazlı metrik toplama
4. [x] LocalStorage'a kaydetme
5. [x] Export fonksiyonları (JSON/CSV)

### Faz 2: Metrik Toplama ✅ TAMAMLANDI

**Görevler:**
1. [x] Bitcoin metrikleri toplama
2. [x] Zorluk metrikleri toplama
3. [x] Oyuncu performans metrikleri
4. [x] Combo metrikleri
5. [x] Düşman metrikleri

### Faz 3: Analiz & Görselleştirme ✅ TAMAMLANDI

**Görevler:**
1. [x] Özet istatistikler hesaplama
2. [x] Trendler belirleme
3. [x] Korelasyon analizi
4. [x] Debug paneli (dev mode) - `MetricsDebugPanel.tsx`

### Faz 4: Insights & Öneriler ✅ TAMAMLANDI

**Görevler:**
1. [x] Otomatik zorluk ayarlama önerileri
2. [x] Kart dengesi analizi
3. [x] Bitcoin etkisi raporu

---

## 📊 Toplanan Verilerden Çıkarılacak Insights

### A) Bitcoin Etkisi Analizi

```typescript
// Sorulacak sorular:
// 1. Fiyat düşerken LONG oyuncuları ne kadar süre hayatta kalıyor?
// 2. Yüksek volatilitede ölüm oranı nedir?
// 3. Hangi PnL seviyelerinde oyuncular en çok ölüyor?

interface BitcoinInsights {
  // LONG vs SHORT başarı oranı
  positionSuccessRate: Record<'LONG' | 'SHORT', number>;
  
  // PnL'ye göre ortalama survival time
  survivalByPnL: Array<{ pnlRange: string; avgSurvival: number }>;
  
  // Volatilite etkisi
  volatilityImpact: {
    lowVolatility: { avgSurvival: number; avgLevel: number };
    highVolatility: { avgSurvival: number; avgLevel: number };
  };
}
```

### B) Zorluk Dengesi Analizi

```typescript
interface DifficultyInsights {
  // En çok ölüm hangi zorlukta oluyor?
  deathsByDifficulty: Record<string, number>;
  
  // Near-death mercy ne kadar kullanılıyor?
  nearDeathUsage: { activated: number; survived: number; died: number };
  
  // Wave fazları dengeli mi?
  wavePhaseStats: Record<WavePhase, { avgTime: number; deathRate: number }>;
}
```

### C) Oyuncu Deneyimi Analizi

```typescript
interface PlayerExperienceInsights {
  // Ortalama oyun süresi ne kadar?
  averageGameDuration: number;
  
  // Oyuncular hangi seviyede ölüyor?
  deathsByLevel: Record<number, number>;
  
  // En popüler kartlar hangileri?
  cardPopularity: Array<{ card: string; pickRate: number }>;
  
  // Combo sistemi kullanılıyor mu?
  comboEngagement: { averageMaxStreak: number; milestonesPerGame: number };
}
```

---

## 🔧 Teknik Tasarım

### MetricsService Interface

```typescript
interface MetricsService {
  // Oturum yönetimi
  startSession(): string;
  endSession(reason: GameEndReason): void;
  
  // Metrik kaydetme
  record<T extends MetricCategory>(
    category: T,
    metricId: string,
    value: number | string | object
  ): void;
  
  // Anlık metrikler
  trackBitcoin(price: number, pnl: number, atr: number): void;
  trackDifficulty(difficulty: DifficultyOutput): void;
  trackKill(enemyType: string, isCrit: boolean): void;
  trackDamage(type: 'dealt' | 'taken', amount: number): void;
  trackLevelUp(level: number, cardChosen: string): void;
  
  // Export
  exportSession(sessionId: string): SessionMetrics;
  exportAllSessions(): SessionMetrics[];
  exportAsCSV(): string;
  exportAsJSON(): string;
  
  // Analiz
  getInsights(): GameInsights;
  getBitcoinInsights(): BitcoinInsights;
  getDifficultyInsights(): DifficultyInsights;
}
```

### Data Flow

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│    Game Loop     │────▶│  EventBus       │────▶│  MetricsService  │
│  (her frame)     │     │  (events)       │     │  (kayıt)         │
└──────────────────┘     └─────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Insights       │◀────│  localStorage   │◀────│  JSON Export     │
│   Dashboard      │     │  (persist)      │     │                  │
└──────────────────┘     └─────────────────┘     └──────────────────┘
```

---

## 📅 Timeline

| Faz | Süre | Hafta |
|-----|------|-------|
| **Faz 1**: Temel Altyapı | 2-3 saat | Şimdi |
| **Faz 2**: Metrik Toplama | 3-4 saat | Şimdi |
| **Faz 3**: Görselleştirme | 2-3 saat | Sonra |
| **Faz 4**: Insights | 3-4 saat | Sonra |

---

## ✅ Hemen Yapılacaklar

1. **`MetricsService.ts`** - Ana servis dosyası
2. **`types/metrics.ts`** - Type tanımları
3. **EventBus entegrasyonu** - Mevcut event'lere bağlanma
4. **GameEngine entegrasyonu** - Frame-based metrics
5. **LocalStorage persistence** - Veri kaydetme
6. **Dev mode debug panel** - Gerçek zamanlı görüntüleme

---

## 🚀 Başlangıç Adımları

```bash
# 1. Yeni dosyalar oluştur
services/MetricsService.ts
types/metrics.ts

# 2. EventBus'a yeni event'ler ekle
'metricsSnapshot' | 'sessionEnd'

# 3. GameEngine'e entegre et

# 4. Debug panel ekle (dev mode)
```

---

Bu roadmap'i onaylıyor musunuz? Onayladıktan sonra hemen implementasyona başlayabilirim! 🎮📊
