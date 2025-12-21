---
description: Multi-Crypto Parite Sistemi Implementation Plan - BTC, ETH, SOL ve gelecek eklemeler için
---

# 🚀 Multi-Crypto Parite Sistemi Implementation Plan

## 📋 Özet

Bu plan, oyunun mevcut sadece-Bitcoin sisteminden çoklu kripto parite destekli bir sisteme geçişini detaylandırır. İlk aşamada BTC, ETH ve SOL desteklenecek, ileride kolayca yeni pariteler eklenebilecek şekilde tasarlanacaktır.

---

## 📐 Mevcut Sistem Analizi

### Şu Anki Yapı
```
constants.ts
├── BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
├── COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com'

services/marketService.ts
├── Hardcoded BTC-USD product_ids
├── Tek parite için tasarlanmış

hooks/useMarketData.ts
├── Tek MarketService instance
├── Tek fiyat stream

components/screens/MainMenu.tsx
├── Sadece LONG/SHORT seçimi
├── Parite seçimi yok
```

### Değiştirilecek Dosyalar
- `constants.ts` - WS URL'leri dinamik olacak
- `types.ts` - CryptoPair tipi eklenecek
- `services/marketService.ts` - Multi-pair desteği
- `schemas/marketSchemas.ts` - Yeni şemalar
- `hooks/useMarketData.ts` - Parite parametresi
- `components/screens/MainMenu.tsx` - Parite seçici UI
- `components/GameUI.tsx` - Parite gösterimi
- `components/hud/LiveFeed.tsx` - Parite badge

---

## 🏗️ Faz 1: Tip Tanımlamaları ve Config

### 1.1 Yeni Tipler (`types/crypto.ts`)

```typescript
// Desteklenen kripto pariteleri
export type CryptoPair = 'BTC' | 'ETH' | 'SOL';

// Parite config yapısı
export interface CryptoConfig {
  id: CryptoPair;
  name: string;
  symbol: string;        // BTCUSDT, ETHUSDT, SOLUSDT
  displayName: string;   // Bitcoin, Ethereum, Solana
  color: string;         // Brand rengi
  icon: string;          // Emoji veya icon path
  binanceSymbol: string; // btcusdt, ethusdt, solusdt
  coinbaseProductId: string; // BTC-USD, ETH-USD, SOL-USD
  decimals: number;      // Fiyat decimal sayısı
}

// Parite registry
export const CRYPTO_PAIRS: Record<CryptoPair, CryptoConfig> = {
  BTC: {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTCUSDT',
    displayName: 'Bitcoin',
    color: '#F7931A',
    icon: '₿',
    binanceSymbol: 'btcusdt',
    coinbaseProductId: 'BTC-USD',
    decimals: 2,
  },
  ETH: {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETHUSDT',
    displayName: 'Ethereum',
    color: '#627EEA',
    icon: 'Ξ',
    binanceSymbol: 'ethusdt',
    coinbaseProductId: 'ETH-USD',
    decimals: 2,
  },
  SOL: {
    id: 'SOL',
    name: 'Solana',
    symbol: 'SOLUSDT',
    displayName: 'Solana',
    color: '#9945FF',
    icon: '◎',
    binanceSymbol: 'solusdt',
    coinbaseProductId: 'SOL-USD',
    decimals: 2,
  },
};

// Gelecek eklemeler için örnek:
// DOGE, AVAX, MATIC, LINK, DOT, ADA, XRP, BNB, etc.
```

### 1.2 Constants Güncelleme (`constants.ts`)

```typescript
// Dinamik WS URL oluşturma
export const getBinanceWsUrl = (pair: CryptoPair): string => {
  const config = CRYPTO_PAIRS[pair];
  return `wss://stream.binance.com:9443/ws/${config.binanceSymbol}@ticker`;
};

// Legacy export (backward compatibility)
export const BINANCE_WS_URL = getBinanceWsUrl('BTC');
export const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';
```

---

## 🔌 Faz 2: MarketService Refactor

### 2.1 Yeni MarketService Interface

```typescript
// services/marketService.ts

export interface MarketServiceConfig {
  pair: CryptoPair;
  onData: (update: MarketUpdate) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export class MarketService {
  private pair: CryptoPair;
  private config: CryptoConfig;
  
  constructor(config: MarketServiceConfig) {
    this.pair = config.pair;
    this.config = CRYPTO_PAIRS[config.pair];
    // ...
  }
  
  private connectBinance(): void {
    const wsUrl = getBinanceWsUrl(this.pair);
    this.binanceSocket = this.wsFactory(wsUrl);
    // ...
  }
  
  private connectCoinbase(): void {
    // Coinbase subscribe mesajında product_id dinamik
    this.coinbaseSocket?.send(JSON.stringify({
      type: 'subscribe',
      product_ids: [this.config.coinbaseProductId],
      channels: ['ticker'],
    }));
  }
}
```

### 2.2 MarketUpdate Genişletme

```typescript
export interface MarketUpdate {
  price: number;
  high?: number;
  low?: number;
  source: 'binance' | 'coinbase';
  volume?: number;
  pair: CryptoPair;  // YENİ
}
```

---

## 🎨 Faz 3: UI Bileşenleri

### 3.1 Parite Seçici Bileşeni (`components/ui/CryptoSelector.tsx`)

```typescript
interface CryptoSelectorProps {
  selected: CryptoPair;
  onSelect: (pair: CryptoPair) => void;
  disabled?: boolean;
}

export const CryptoSelector: React.FC<CryptoSelectorProps> = ({
  selected,
  onSelect,
  disabled
}) => {
  const pairs = Object.values(CRYPTO_PAIRS);
  
  return (
    <div className="flex gap-2 justify-center">
      {pairs.map(pair => (
        <button
          key={pair.id}
          onClick={() => onSelect(pair.id)}
          disabled={disabled}
          className={`
            px-4 py-3 rounded-xl border transition-all
            ${selected === pair.id 
              ? 'ring-2 scale-105' 
              : 'opacity-60 hover:opacity-100'}
          `}
          style={{
            borderColor: pair.color + '40',
            backgroundColor: selected === pair.id ? pair.color + '20' : 'transparent',
            color: pair.color,
          }}
        >
          <span className="text-2xl">{pair.icon}</span>
          <span className="block text-xs font-bold mt-1">{pair.id}</span>
        </button>
      ))}
    </div>
  );
};
```

### 3.2 MainMenu Güncellemesi

```typescript
// components/screens/MainMenu.tsx

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption, pair: CryptoPair) => void;
  onOpenSettings: () => void;
  selectedPair: CryptoPair;
  onPairChange: (pair: CryptoPair) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  price, 
  onStart, 
  onOpenSettings,
  selectedPair,
  onPairChange
}) => {
  const pairConfig = CRYPTO_PAIRS[selectedPair];
  
  return (
    <div>
      {/* Parite Seçici */}
      <div className="space-y-3">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
          Select Asset
        </span>
        <CryptoSelector 
          selected={selectedPair} 
          onSelect={onPairChange} 
        />
      </div>
      
      {/* Fiyat - Parite rengiyle */}
      <div 
        className="text-5xl font-black tracking-tighter"
        style={{ color: pairConfig.color }}
      >
        {pairConfig.icon} ${price.toLocaleString()}
      </div>
      
      {/* Long/Short butonları */}
      <button onClick={() => onStart(MarketPosition.LONG, selectedLeverage, selectedPair)}>
        ...
      </button>
    </div>
  );
};
```

### 3.3 LiveFeed Parite Badge (`components/hud/LiveFeed.tsx`)

```typescript
// Fiyat gösteriminde parite badge
<div className="flex items-center gap-2">
  <span 
    className="px-2 py-0.5 rounded text-xs font-bold"
    style={{ backgroundColor: pairConfig.color + '30', color: pairConfig.color }}
  >
    {pairConfig.icon} {pairConfig.id}
  </span>
  <span className={priceColor}>
    ${smoothValues.price.toLocaleString()}
  </span>
</div>
```

---

## 🎮 Faz 4: Game State Entegrasyonu

### 4.1 GameStateManager Güncellemesi

```typescript
// services/GameStateManager.ts

interface GameSessionData {
  // Mevcut alanlar...
  pair: CryptoPair;  // YENİ
}

static initializeNewGame(
  position: MarketPosition, 
  entryPrice: number, 
  leverage: LeverageOption,
  pair: CryptoPair  // YENİ
): void {
  this.currentSession = {
    // ...
    pair,
  };
}
```

### 4.2 useMarketData Hook Güncellemesi

```typescript
// hooks/useMarketData.ts

export const useMarketData = (
  gameStatus: GameStatus,
  position: MarketPosition,
  entryPrice: number,
  leverage: LeverageOption,
  playerRef: React.RefObject<Player>,
  pair: CryptoPair  // YENİ
) => {
  useEffect(() => {
    const service = new MarketService({
      pair,
      onData: (update: MarketUpdate) => {
        // ...
      }
    });
    
    service.connect();
    return () => service.disconnect();
  }, [playerRef, pair]);  // pair değişince yeniden bağlan
  
  return { marketData, priceHistory };
};

### 4.3 Session Reset & Cleanup (CRITICAL)

Restart senaryosunda (örn. BTC -> Main Menu -> SOL) veri kirliliğini önlemek için:

```typescript
// hooks/useMarketData.ts

useEffect(() => {
  // Parite değiştiğinde geçmiş verileri temizle
  setPriceHistory([]);
  trHistoryRef.current = [];
  prevCloseRef.current = null;
  
  // Market datayı resetle
  setMarketData(prev => ({
    ...prev,
    price: 0,
    difficulty: 1,
    pnl: 0,
    effectivePnl: 0
  }));
}, [pair]);
```

Bu işlem, BTC volatilitesinin (örn. $1000'lık mumlar) SOL hesaplamalarını (örn. $1'lık mumlar) bozmasını engeller. Mevcut `useMarketData` hook'u `App.tsx` içinde sürekli yaşadığı için, parite değişikliğinde manuel reset şarttır.
```

---

## 📊 Faz 5: Metrics ve Analytics

### 5.1 Session Metrics Genişletme

```typescript
// types/metrics.ts

interface SessionMetrics {
  // Mevcut alanlar...
  pair: CryptoPair;
  pairConfig: CryptoConfig;
}
```

### 5.2 Supabase Şema Güncellemesi

```sql
-- Mevcut sessions tablosuna ekle
ALTER TABLE sessions ADD COLUMN pair TEXT DEFAULT 'BTC';
ALTER TABLE sessions ADD COLUMN pair_entry_price DECIMAL(20, 8);
```

---

## 🎨 Faz 6: Tema ve Görsel Adaptasyon

### 6.1 Dinamik Tema Desteği

```typescript
// config/ThemeConfig.ts

export const getPairTheme = (pair: CryptoPair) => {
  const config = CRYPTO_PAIRS[pair];
  
  return {
    primary: config.color,
    primaryLight: config.color + '30',
    primaryDark: config.color + '80',
    gradient: `linear-gradient(135deg, ${config.color}20 0%, transparent 50%)`,
  };
};
```

### 6.2 Background Candles Renklendirme

```typescript
// utils/backgroundCandles.ts

export const getCandleColors = (pair: CryptoPair) => {
  const theme = getPairTheme(pair);
  return {
    bullish: theme.primary,
    bearish: COLORS.SHORT,
  };
};
```

---

## ✅ Implementation Checklist

### Faz 1: Tipler ve Config
- [x] `types/crypto.ts` oluştur
- [x] `CryptoPair` tip tanımı
- [x] `CryptoConfig` interface
- [x] `CRYPTO_PAIRS` registry (BTC, ETH, SOL)
- [x] `constants.ts` güncelle

### Faz 2: MarketService
- [x] Constructor'a pair parametresi ekle
- [x] Dinamik WS URL desteği
- [x] MarketUpdate'e pair alanı ekle
- [x] Coinbase product_id dinamik yap
- [ ] Test güncelle

### Faz 3: UI Bileşenleri
- [x] `CryptoSelector.tsx` oluştur
- [x] MainMenu'ye parite seçici ekle
- [x] LiveFeed'e parite badge ekle
- [ ] GameOver screen'de parite göster

### Faz 4: Game State
- [x] GameStateManager'a pair ekle
- [x] useMarketData hook güncelle
- [x] App.tsx state yönetimi
- [ ] GameContext güncelle

### Faz 5: Metrics
- [x] SessionMetrics güncelle
- [ ] Supabase şema migrate
- [x] MetricsService güncelle

### Faz 6: Tema
- [ ] getPairTheme fonksiyonu
- [ ] Background candles renklendirme
- [ ] UI renk adaptasyonu

---

## 🔮 Gelecek Eklemeler İçin

### Yeni Parite Ekleme Adımları

1. **Config Ekle** (`types/crypto.ts`):
```typescript
CRYPTO_PAIRS.DOGE = {
  id: 'DOGE',
  name: 'Dogecoin',
  symbol: 'DOGEUSDT',
  displayName: 'Dogecoin',
  color: '#C2A633',
  icon: '🐕',
  binanceSymbol: 'dogeusdt',
  coinbaseProductId: 'DOGE-USD',
  decimals: 4,
};
```

2. **Tip Güncelle**:
```typescript
export type CryptoPair = 'BTC' | 'ETH' | 'SOL' | 'DOGE';
```

3. **Test Et** - Otomatik olarak UI'da görünür!

### Potansiyel Gelecek Pariteler
- DOGE (Dogecoin)
- AVAX (Avalanche)
- MATIC (Polygon)
- LINK (Chainlink)
- DOT (Polkadot)
- ADA (Cardano)
- XRP (Ripple)
- BNB (Binance Coin)
- ATOM (Cosmos)
- NEAR (Near Protocol)

---

## ⚠️ Dikkat Edilecekler

1. **API Rate Limits**: Birden fazla WebSocket bağlantısı açarken dikkatli ol
2. **Decimal Precision**: Her parite farklı decimal precision gerektirebilir
3. **Volatility**: SOL/ETH daha volatil, difficulty hesaplamasına etki edebilir
4. **Backward Compatibility**: Mevcut save dosyaları BTC varsayalı
5. **Test Coverage**: Her yeni parite için integration test yaz

---

## 🏁 Tahmini Süre

| Faz | Tahmini Süre |
|-----|--------------|
| Faz 1: Tipler | 1 saat |
| Faz 2: MarketService | 2-3 saat |
| Faz 3: UI | 2-3 saat |
| Faz 4: Game State | 1-2 saat |
| Faz 5: Metrics | 1 saat |
| Faz 6: Tema | 1-2 saat |
| **TOPLAM** | **8-12 saat** |

---

*Son güncelleme: 2025-12-21*
