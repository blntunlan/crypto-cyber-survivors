# 📊 Bitcoin Verisinin Oyunda Kullanım Şekli

Oyunun temel mekaniği Bitcoin'in **gerçek zamanlı fiyat verilerini** kullanarak oyun zorluğunu dinamik olarak değiştiriyor.

---

## 1. Veri Kaynakları (`marketService.ts`)

```
┌─────────────────────────────────────────────────────┐
│     📡 WebSocket Bağlantıları                       │
│  ─────────────────────────────────────────────────  │
│  • Binance:  wss://stream.binance.com:9443/ws/...   │
│  • Coinbase: wss://ws-feed.exchange.coinbase.com    │
└─────────────────────────────────────────────────────┘
              ↓ (Gerçek Zamanlı BTC/USD Fiyatı)
```

Her iki borsadan da **BTC-USD** fiyat bilgisi alınıyor:
- **Binance**: Fiyat, 24s yüksek/düşük, hacim
- **Coinbase**: Sadece fiyat

---

## 2. Veri İşleme (`hooks/useMarketData.ts`)

Bitcoin verisi alındığında şunlar hesaplanıyor:

| Metrik | Açıklama |
|--------|----------|
| **`price`** | Anlık BTC-USD fiyatı |
| **`pnl`** | Oyuncunun kar/zarar oranı (entry price'a göre) |
| **`atr`** | Average True Range (14 periyot) - volatilite ölçüsü |
| **`difficulty`** | Hesaplanan zorluk çarpanı |

### PNL Hesabı

```typescript
// LONG pozisyon: Fiyat yükseldikçe kâr
pnl = (price - entryPrice) / entryPrice;

// SHORT pozisyon: Fiyat düştükçe kâr
if (position === MarketPosition.SHORT) pnl = -pnl;
```

---

## 3. Zorluk Hesaplama (`services/DifficultyManager.ts`)

Bitcoin verisi oyun zorluğunu **4 ana faktörle** etkiliyor:

| Faktör | Etkisi |
|--------|--------|
| **P&L Effect** | 📉 Zarar → Daha zor / 📈 Kâr → Daha kolay |
| **Volatility (ATR)** | 🌊 Yüksek volatilite = Daha hızlı düşmanlar |
| **Momentum** | 📊 Trend yönü (iyileşme/kötüleşme) |
| **Wave Phases** | `calm` → `building` → `intense` → `peak` döngüsü |

### Çıktılar

```typescript
interface DifficultyOutput {
  spawnRate: number;    // Düşman spawn hızı çarpanı (0.3 - 3.5)
  enemySpeed: number;   // Düşman hızı çarpanı (0.4 - 1.8)
  enemyHealth: number;  // Düşman canı çarpanı (0.8 - 3.0)
  total: number;        // Toplam zorluk (0.3 - 8.0)
}
```

---

## 4. Özet Akış Şeması

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Binance    │────▶│  marketService│────▶│  useMarketData  │
│   Coinbase   │     │   WebSocket   │     │     Hook        │
└──────────────┘     └───────────────┘     └────────┬────────┘
                                                     │
     ┌───────────────────────────────────────────────┘
     ▼
┌──────────────────────────────────────────────────────────┐
│                 DifficultyManager                        │
│  ──────────────────────────────────────────────────────  │
│  • P&L Factor     → Zarar edersen daha zor!              │
│  • Volatility     → Piyasa sallantılıysa tehlikeli!      │
│  • Wave System    → Dalga dalga zorluk artışı            │
│  • Momentum       → Trend yönüne göre ayarlama           │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                    Oyun Mekaniği                         │
│  ──────────────────────────────────────────────────────  │
│  🐻 Düşman spawn hızı   → spawnRate                      │
│  💨 Düşman hızları      → enemySpeed                     │
│  ❤️  Düşman canları     → enemyHealth                    │
│  📊 UI'da P&L gösterimi → price, pnl                     │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Örnek Senaryolar

| Durum | Sonuç |
|-------|-------|
| BTC %5 düştü, SHORT pozisyondasın | ✅ %5 kârdasın → Oyun daha kolay |
| BTC %3 yükseldi, SHORT pozisyondasın | ❌ %3 zarardaısn → Düşmanlar daha hızlı ve sık |
| Piyasa çok volatil (yüksek ATR) | ⚠️ Düşman hızları artıyor |
| HP %20'nin altına düştü | 🆘 Oyun biraz kolaylaşıyor (near-death mercy) |

---

## 6. Dosya Referansları

| Dosya | Rol |
|-------|-----|
| `services/marketService.ts` | WebSocket bağlantıları ve ham veri alımı |
| `hooks/useMarketData.ts` | Veri işleme, ATR ve PNL hesaplama |
| `services/DifficultyManager.ts` | Zorluk algoritması |
| `types.ts` | `MarketData` interface tanımı |
| `constants.ts` | WebSocket URL'leri |

---

## 7. MarketData Interface

```typescript
interface MarketData {
  price: number;      // Anlık BTC fiyatı
  volume: number;     // 24s işlem hacmi
  pnl: number;        // Oyuncu P&L oranı (-1 ile +1 arası)
  rsi: number;        // RSI göstergesi (şu an statik 50)
  difficulty: number; // Hesaplanan zorluk çarpanı
}
```

---

Bu sistem sayesinde **gerçek Bitcoin piyasasındaki hareketler** doğrudan oyun zorluğunu etkiliyor! 🎮📈
