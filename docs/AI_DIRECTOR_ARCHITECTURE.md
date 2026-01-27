# 🧠 AI Director Mimari Tasarımı (Neuro-Dynamic Difficulty) v2

> **Durum:** Onaylandı (Mühendislik Planı)
> **Hedef:** Statik `WavePhase` sistemini, Makine Öğrenmesi (Brain.js) tabanlı, piyasa ve oyuncu verilerine duyarlı "Canlı" bir yönetmen ile değiştirmek.

Bu doküman, oyunun zorluk ve atmosfer yönetimini **"Piyasa Duygusu + Oyuncu Stresi"** ekseninde yeniden kurgular.

---

## 1. Vizyon: "Game Director" vs "Timeline"

Eski sistem (`WavePhase`), bir müzik çalar gibiydi; dakika 3:00'te şarkı değişirdi. Yeni sistem (**AI Director**), bir DJ gibi olacak; kalabalığın (piyasanın ve oyuncunun) havasına bakıp müziği o an değiştirecek.

### Temel Değişiklik
- **Eski:** `Time -> WaveConfig -> Output`
- **Yeni:** `(Price Action + Player State) -> Neural Network -> Output`

---

## 2. Nöral Ağ Topolojisi (Neural Topology)

Sistem, tarayıcı tabanlı hafif bir **Feed-Forward Neural Network** kullanacaktır. Başlangıçta LSTM yerine Feed-Forward seçilmiştir (daha hafif ve hızlı), yetersiz kalırsa LSTM'e geçilecektir.

**Yapı:** `[Input: 8] -> [Hidden: 16] -> [Output: 5]` (Tek katmanlı geniş, veya 2 katmanlı `8 -> 12 -> 8 -> 5` denenecek).

### A. Girdiler (Sensors - Input Layer) [Normalized 0.0 - 1.0]

Yapay zekanın dünyayı algıladığı 8 temel duyu:

1.  **📊 Market Sentiment (RSI):**
    *   Piyasa "Şişik" (Overbought) mi yoksa "Panik" (Oversold) modunda mı?
2.  **🌪️ Market Chaos (ATR):**
    *   Volatilite ne durumda? (Oyun Hızı).
3.  **📉 Trend Strength (MACD):**
    *   **Dinamik Normalizasyon:** `tanh(macd / (macdRange * 0.5))`
    *   Fiyatın yönünden ziyade, trendin arkasındaki itici gücü gösterir.
4.  **⚡ Risk Factor (Leverage):**
    *   Oyuncunun kaldıraç oranı (1x - 100x).
5.  **💰 PnL Status:**
    *   Kâr/Zarar durumu (-1.0 Zarar, +1.0 Kâr).
6.  **💓 Player Stress Score (Temporal):**
    *   `stress = (DamageRate_5sec * 0.6) + (DashFrequency * 0.3) + (NearDeathDuration * 0.1)`
    *   Anlık hasar yerine, son 5 saniyedeki "dayak yeme hızı" baz alınır.
7.  **🛡️ Zone Control:**
    *   Oyuncu haritanın ne kadarını kontrol edebiliyor?
8.  **⏳ Cycle Progression:**
    *   Oyun süresi ilerledikçe artan baz zorluk faktörü.

### B. Çıktılar (Actuators - Output Layer)

AI, oyun motoruna şu 5 parametreyi gönderir (0.0 - 1.0) ve bu değerler **Linear Interpolation** ile yumuşatılarak uygulanır:

1.  **Spawn Density:** Ekranda aynı anda kaç düşman olacak?
2.  **Enemy Speed modifier:** Temel hızın üzerine eklenecek adrenalin hızı.
3.  **Elite Probability:** Whale, Liquidator veya Özel event tetikleme şansı.
4.  **Aggression:** Düşmanların takip etme zekası ve mermi atma sıklığı.
5.  **Atmosphere Darkening:** Ekran kararması, müzik temposu, görsel "Korku" düzeyi.

---

## 3. Sistem Döngüsü ve Frekans (The Loop)

Performans ve Oyun Hissi dengesi için "Algı" ve "Karar" döngüleri ayrılmıştır:

*   **Sensor Update (200ms):**
    *   Tüm girdiler (Stres, MACD, ATR) hızlıca güncellenir.
*   **Brain Decision (800ms):**
    *   Nöral ağ çalışır ve yeni `TargetOutput` belirlenir.
*   **Actuator Interpolation (Her Frame):**
    *   `CurrentOutput`, `TargetOutput` değerine doğru yumuşakça kayar (Lerp). Ani zorluk sıçramaları engellenir.

---

## 4. Eğitim Stratejisi (Continuous Bias Training)

AI'ı sadece uç değerlerle (0 ve 1) değil, ara değerlerle (Sürekli Veri) eğiteceğiz.

### Training Data Set Örnekleri
```javascript
const trainingData = [
  // Senaryo: Piyasa Çöküşü + Yüksek Kaldıraç (Panic)
  { input: { macd: -0.8, leverage: 1.0 }, output: { aggression: 0.9, density: 1.0 } },
  // Senaryo: Hafif Düşüş + Orta Kaldıraç (Tension)
  { input: { macd: -0.3, leverage: 0.5 }, output: { aggression: 0.5, density: 0.6 } },
  // Senaryo: Piyasa Yatay + Oyuncu Rahat (Boredom)
  { input: { atr: 0.1, stress: 0.1 }, output: { eliteProb: 0.4 } }, // Sürpriz yolla
];
```

### Adaptive Learning (Fine-Tuning)
Eğer oyun sırasında:
*   `PlayerStress < 0.2` (Çok kolay) VE `BrainAggression > 0.8` (Zor yapmaya çalışıyor)
*   **Sonuç:** AI yetersiz kaldı.
*   **Aksiyon:** Bellekteki bu duruma ait ağırlıkları artır (Self-Correction).

---

## 5. Geçiş Planı (Migration Roadmap)

### Faz 1: Altyapı
1.  `npm install brain.js`
2.  `DifficultyContext` içine **MACD (12, 26, 9)** hesaplaması ekle. (Normalizasyonlu).
3.  `PlayerStats` modülüne **Temporal Stress Score** mantığını ekle.

### Faz 2: Beyin Nakli
4.  `AIDirector.ts` sınıfını oluştur (Nöral Ağ yönetimi).
5.  Shadow Mode (Gölge Modu) ile çıktıları konsolda izle.

### Faz 3: Aktivasyon
6.  `WavePhase` sistemini devre dışı bırak.
7.  AI çıktılarını `SpawnSystem` parametrelerine bağla.

---
