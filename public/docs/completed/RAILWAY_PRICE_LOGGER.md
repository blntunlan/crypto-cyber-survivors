# 🚂 Railway Price Logger - Detaylı Dokümantasyon

> **Görev:** Binance'den gerçek zamanlı fiyat verilerini alıp Supabase'e kaydetmek (Anti-cheat sisteminin temel altyapısı)

---

## 🎯 Genel Bakış

### Railway Price Logger Nedir?

Railway üzerinde çalışan bir Node.js WebSocket server'ı. Her saniye Binance'den BTC, ETH ve SOL fiyat verilerini alıp Supabase'deki `price_logs` tablosuna kaydeder.

### Neden Railway?

| Seçenek | Neden Uygun Değil | Railway Avantajı |
|---------|-------------------|------------------|
| **Client-side fiyat** | Oyuncu manipüle edebilir | ❌ Güvenilmez |
| **Supabase Edge Function** | WebSocket desteklemiyor | ❌ Sadece HTTP |
| **Railway** | 24/7 WebSocket bağlantısı tutabilir | ✅ Güvenilir, ölçeklenebilir |

### Mimari

```
Binance WebSocket API
        ↓
Railway Price Logger (Node.js)
        ↓
Supabase price_logs table
        ↓
verify-game Edge Function (fiyat doğrulama)
```

---

## 📁 Proje Yapısı

```
railway-market-server/
├── src/
│   ├── index.ts              # Ana server
│   ├── services/
│   │   ├── binanceService.ts # Binance WS client
│   │   ├── supabaseService.ts # Supabase client
│   │   └── priceLogger.ts    # Fiyat loglama logic
│   ├── types/
│   │   └── market.ts         # Type definitions
│   └── utils/
│       ├── logger.ts         # Logging utility
│       └── retry.ts          # Retry logic
├── dist/                     # Compiled JS (gitignore)
├── package.json
├── tsconfig.json
├── .env                      # Local test
└── railway.json              # Railway config (opsiyonel)
```

---

## 🔧 Teknik Detaylar

### 1. Binance WebSocket Entegrasyonu

**Endpoint:** `wss://stream.binance.com:9443/stream`

**Subscription Format:**
```json
{
  "method": "SUBSCRIBE",
  "params": [
    "btcusdt@kline_1s",
    "ethusdt@kline_1s", 
    "solusdt@kline_1s"
  ],
  "id": 1
}
```

**Received Data Structure:**
```json
{
  "e": "kline",
  "E": 1703462400000,
  "s": "BTCUSDT",
  "k": {
    "t": 1703462400000,      // Kline start time
    "T": 1703462400999,      // Kline close time
    "s": "BTCUSDT",          // Symbol
    "i": "1s",               // Interval
    "o": "43500.00",         // Open price
    "c": "43510.50",         // Close price (current)
    "h": "43520.00",         // High price
    "l": "43495.00",         // Low price
    "v": "12.5",             // Volume
    "n": 245,                // Number of trades
    "x": false,              // Is this kline closed?
    "q": "543750.00",        // Quote asset volume
    "V": "6.2",              // Taker buy base asset volume
    "Q": "269625.00"         // Taker buy quote asset volume
  }
}
```

---

### 2. Code Implementation

#### `src/index.ts`

```typescript
import express from 'express';
import { BinanceService } from './services/binanceService';
import { SupabaseService } from './services/supabaseService';
import { PriceLogger } from './services/priceLogger';
import { Logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Health check endpoint (Railway için)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint (monitoring için)
app.get('/stats', async (req, res) => {
  const stats = await PriceLogger.getInstance().getStats();
  res.json(stats);
});

async function startServer() {
  try {
    // Initialize services
    const supabase = SupabaseService.getInstance();
    const binance = BinanceService.getInstance();
    const logger = PriceLogger.getInstance();

    // Start price logging
    await logger.start();

    // Start HTTP server
    app.listen(PORT, () => {
      Logger.info(`🚀 Server ready at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received, shutting down gracefully...');
      await logger.stop();
      await binance.disconnect();
      process.exit(0);
    });

  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

#### `src/services/binanceService.ts`

```typescript
import WebSocket from 'ws';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface KlineData {
  pair: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BinanceService extends EventEmitter {
  private static instance: BinanceService;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isIntentionallyClosed = false;

  private readonly WS_URL = 'wss://stream.binance.com:9443/stream';
  private readonly PAIRS = ['btcusdt', 'ethusdt', 'solusdt'];

  private constructor() {
    super();
  }

  static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      Logger.warn('Already connected to Binance');
      return;
    }

    return new Promise((resolve, reject) => {
      Logger.info('🔄 Connecting to Binance streams...');
      this.isIntentionallyClosed = false;

      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        Logger.info('✅ Connected to Binance WebSocket');
        this.reconnectDelay = 1000; // Reset delay on success
        this.subscribe();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          
          // Handle kline stream
          if (parsed.data?.e === 'kline') {
            const kline = this.parseKlineData(parsed.data);
            this.emit('kline', kline);
          }
        } catch (error) {
          Logger.error('Failed to parse Binance message:', error);
        }
      });

      this.ws.on('error', (error) => {
        Logger.error('Binance WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        Logger.warn('Binance WebSocket closed');
        this.ws = null;

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      });

      // Ping/pong for keepalive
      this.ws.on('ping', () => {
        this.ws?.pong();
      });
    });
  }

  private subscribe(): void {
    const streams = this.PAIRS.map(pair => `${pair}@kline_1s`);
    
    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now()
    };

    this.ws?.send(JSON.stringify(subscribeMessage));
    Logger.info(`Tracking pairs: ${this.PAIRS.join(', ')}`);
  }

  private parseKlineData(data: any): KlineData {
    const k = data.k;
    
    return {
      pair: k.s.replace('USDT', '').toUpperCase(), // BTCUSDT -> BTC
      timestamp: new Date(k.t),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v)
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    Logger.info(`Reconnecting in ${this.reconnectDelay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        Logger.error('Reconnect failed:', error);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        );
      });
    }, this.reconnectDelay);
  }

  async disconnect(): Promise<void> {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    Logger.info('Disconnected from Binance');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

---

#### `src/services/supabaseService.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    Logger.info('✅ Supabase client initialized');
  }

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async insertPriceLog(data: {
    pair: string;
    price: number;
    high: number;
    low: number;
    volume: number;
    timestamp: Date;
  }): Promise<void> {
    const { error } = await this.client
      .from('price_logs')
      .insert({
        pair: data.pair,
        price: data.price,
        high: data.high,
        low: data.low,
        volume: data.volume,
        timestamp: data.timestamp.toISOString(),
        source: 'binance'
      });

    if (error) {
      // Duplicate entry is ok (timestamp collision)
      if (error.code !== '23505') {
        throw error;
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('price_logs')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}
```

---

#### `src/services/priceLogger.ts`

```typescript
import { BinanceService, KlineData } from './binanceService';
import { SupabaseService } from './supabaseService';
import { Logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

interface LoggerStats {
  totalLogged: number;
  lastLogTime: Date | null;
  errors: number;
  byPair: Record<string, number>;
}

export class PriceLogger {
  private static instance: PriceLogger;
  private binance: BinanceService;
  private supabase: SupabaseService;
  private stats: LoggerStats = {
    totalLogged: 0,
    lastLogTime: null,
    errors: 0,
    byPair: {}
  };

  private constructor() {
    this.binance = BinanceService.getInstance();
    this.supabase = SupabaseService.getInstance();
  }

  static getInstance(): PriceLogger {
    if (!PriceLogger.instance) {
      PriceLogger.instance = new PriceLogger();
    }
    return PriceLogger.instance;
  }

  async start(): Promise<void> {
    // Connect to Binance
    await this.binance.connect();

    // Listen to kline events
    this.binance.on('kline', (data: KlineData) => {
      this.handleKlineData(data);
    });

    Logger.info('✅ Price logger started');
  }

  private async handleKlineData(data: KlineData): Promise<void> {
    try {
      // Log to Supabase with retry
      await withRetry(
        () => this.supabase.insertPriceLog({
          pair: data.pair,
          price: data.close,
          high: data.high,
          low: data.low,
          volume: data.volume,
          timestamp: data.timestamp
        }),
        {
          maxRetries: 3,
          delayMs: 1000,
          backoff: true
        }
      );

      // Update stats
      this.stats.totalLogged++;
      this.stats.lastLogTime = new Date();
      this.stats.byPair[data.pair] = (this.stats.byPair[data.pair] || 0) + 1;

      Logger.debug(`✅ Logged: ${data.pair} = $${data.close}`);

    } catch (error) {
      this.stats.errors++;
      Logger.error(`Failed to log ${data.pair} price:`, error);
    }
  }

  async stop(): Promise<void> {
    await this.binance.disconnect();
    Logger.info('Price logger stopped');
  }

  getStats(): LoggerStats {
    return { ...this.stats };
  }
}
```

---

#### `src/utils/retry.ts`

```typescript
import { Logger } from './logger';

interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoff?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.delayMs;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxRetries) {
        break;
      }

      Logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      if (options.backoff) {
        delay *= 2;
      }
    }
  }

  throw lastError;
}
```

---

#### `src/utils/logger.ts`

```typescript
export class Logger {
  private static formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  static info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  static warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  static error(message: string, error?: any): void {
    console.error(this.formatMessage('ERROR', message, error instanceof Error ? error.message : error));
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
}
```

---

## 📦 Dependencies

### `package.json`

```json
{
  "name": "railway-price-logger",
  "version": "1.0.0",
  "description": "Real-time crypto price logger for anti-cheat system",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/ws": "^8.5.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 🌍 Environment Variables

### `.env` (Local Test)

```env
# Supabase
SUPABASE_URL=https://xvvxipcrltzkoijxnwqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Server
PORT=3001
NODE_ENV=development
```

### Railway Dashboard Settings

```bash
SUPABASE_URL=https://xvvxipcrltzkoijxnwqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (admin key)
NODE_ENV=production
```

⚠️ **DİKKAT:** `SUPABASE_SERVICE_ROLE_KEY` kullanıyoruz (ANON değil), çünkü:
- RLS bypass gerekiyor (yüksek frekansta yazma)
- Server-side işlem, güvenli ortamda

---

## 🚀 Deployment

### Railway Deployment Steps

1. **Railway Projesi Oluştur**
```bash
railway login
railway init
```

2. **Environment Variables Ekle**
```bash
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

3. **Deploy**
```bash
railway up
```

4. **Domain Oluştur** (opsiyonel, health check için)
```bash
railway domain
```

### Health Check

Railway deploy edildikten sonra test et:

```bash
curl https://your-app.up.railway.app/health

# Response:
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-12-24T01:00:00.000Z"
}
```

### Stats Endpoint

```bash
curl https://your-app.up.railway.app/stats

# Response:
{
  "totalLogged": 8640,
  "lastLogTime": "2025-12-24T01:00:00.000Z",
  "errors": 0,
  "byPair": {
    "BTC": 2880,
    "ETH": 2880,
    "SOL": 2880
  }
}
```

---

## 📊 Monitoring & Alerts

### Railway Dashboard Metrics

**Built-in Metrics:**
- CPU usage
- Memory usage
- Network traffic
- Logs (realtime)

### Custom Monitoring

**Supabase'den veri kontrolü:**

```sql
-- Son 5 dakikada kaç log yazıldı?
SELECT 
  pair,
  COUNT(*) as log_count,
  MAX(timestamp) as last_log
FROM price_logs
WHERE timestamp > NOW() - INTERVAL '5 minutes'
GROUP BY pair;

-- Expected: ~300 per pair (5min * 60sec)
```

### Alerting (Gelecek)

**Uptime monitoring:**
- [UptimeRobot](https://uptimerobot.com/) ile /health endpoint monitor
- 5dk downtime → Email alert

**Custom alerts:**
```sql
-- Function: Check if price logs are stale
CREATE OR REPLACE FUNCTION check_price_logs_stale()
RETURNS BOOLEAN AS $$
DECLARE
  last_log TIMESTAMPTZ;
BEGIN
  SELECT MAX(timestamp) INTO last_log
  FROM price_logs;
  
  -- If last log is older than 5 minutes, return true (stale)
  RETURN last_log < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
```

---

## 💰 Cost Optimization

### Data Retention Policy

**30 günlük retention:**

```sql
-- Supabase'de Cron Job (pg_cron extension)
SELECT cron.schedule(
  'cleanup-old-price-logs',
  '0 2 * * *', -- Her gün saat 02:00'de
  $$
  DELETE FROM price_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
  $$
);
```

**Neden 30 gün?**
- Oyun session'ları genelde anında verify edilir
- Dispute durumları için max 7 gün backup yeterli
- 30 gün = güvenli margin

### Storage Calculation

**Örnek:**
- 3 pair × 86400 saniye/gün = 259,200 row/gün
- Her row ~100 bytes
- 259,200 × 100 = ~25 MB/gün
- 30 gün = ~750 MB

**Supabase Free Tier:** 500 MB database (30 günde taşar)  
**Pro Tier:** 8 GB database (rahat kaldırır)

**Optimizasyon:**
```sql
-- Index sadece son 30 güne (partial index)
CREATE INDEX idx_price_logs_recent 
ON price_logs(pair, timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '30 days';
```

---

## 🔧 Troubleshooting

### Problem: Railway server çalışmıyor

**Logs kontrolü:**
```bash
railway logs
```

**Common issues:**
- Missing env vars → `railway variables` ile kontrol et
- Build failed → `package.json` scripts kontrol et
- Port binding issue → `PORT` env var kullanıyor musun?

---

### Problem: Binance bağlantısı düşüyor

**Reconnection logic var ama...**
- Binance rate limit: 300 connections/5min
- Stream limit: 1024 streams/connection

**Solution:**
- Single connection kullan (şu anki)
- Exponential backoff (implemented)

---

### Problem: Supabase'e yazma hatası

**Common errors:**
- `23505` (duplicate key) → Aynı timestamp'e 2 kayıt, normal (ignore)
- `42P01` (table not found) → `price_logs` tablosu yok mu?
- `53300` (too many connections) → Connection pooling gerekebilir

**Debug:**
```typescript
Logger.error('Supabase insert failed:', {
  code: error.code,
  message: error.message,
  hint: error.hint
});
```

---

### Problem: Memory leak (Railway memory kullanımı artıyor)

**Diagnosis:**
```bash
railway run -- node --inspect dist/index.js
```

**Potential causes:**
- WebSocket listeners temizlenmiyor
- Event emitter memory leak
- Supabase connection pool büyüyor

**Solutions:**
- `removeAllListeners()` on disconnect
- Connection pooling config
- Periodic restart (Railway otomatik yapar zaten)

---

## 🔐 Security Considerations

### Service Role Key Protection

⚠️ **ASLA** client'a expose etme!
- Service role key = admin yetkisi
- Sadece server-side kullan
- Railway env variables şifreli

### Network Security

- Railway → Supabase TLS encrypted
- Railway → Binance TLS encrypted
- Railway internal IP, public değil (sadece domain)

### Rate Limiting (Gelecek)

**Supabase query limits:**
- Free tier: 500 requests/second
- Bizim kullanım: ~3 req/sec (normal)

**Binance limits:**
- WebSocket: 300 connections/5min/IP
- Messages: Unlimited (pratik olarak)

---

## 📈 Performance Optimization

### Batch Inserts (Gelecek)

Şu an her saniye 1 kayıt × 3 pair = 3 insert/sec.

**Batch insert ile:**
```typescript
private buffer: PriceLogEntry[] = [];
private readonly BATCH_SIZE = 60; // 1 dakika buffer

private async handleKlineData(data: KlineData): Promise<void> {
  this.buffer.push(data);
  
  if (this.buffer.length >= this.BATCH_SIZE) {
    await this.flushBuffer();
  }
}

private async flushBuffer(): Promise<void> {
  if (this.buffer.length === 0) return;
  
  const batch = this.buffer.splice(0, this.BATCH_SIZE);
  
  await this.supabase.getClient()
    .from('price_logs')
    .insert(batch);
}
```

**Avantaj:** 180 insert/min → 3 insert/min (60× reduction)  
**Dezavantaj:** Real-time verification için 1dk delay

---

### Connection Pooling

```typescript
// supabaseService.ts
this.client = createClient(supabaseUrl, supabaseKey, {
  db: {
    poolMin: 1,
    poolMax: 10
  }
});
```

---

## 🧪 Testing

### Local Test

```bash
npm run dev
```

**Expected output:**
```
[2025-12-24T01:00:00.000Z] INFO: ✅ Supabase client initialized
[2025-12-24T01:00:00.100Z] INFO: 🔄 Connecting to Binance streams...
[2025-12-24T01:00:00.500Z] INFO: ✅ Connected to Binance WebSocket
[2025-12-24T01:00:00.600Z] INFO: Tracking pairs: btcusdt, ethusdt, solusdt
[2025-12-24T01:00:01.000Z] DEBUG: ✅ Logged: BTC = $43500.00
[2025-12-24T01:00:01.100Z] DEBUG: ✅ Logged: ETH = $2300.00
[2025-12-24T01:00:01.200Z] DEBUG: ✅ Logged: SOL = $98.50
```

### Integration Test

**Supabase check:**
```sql
SELECT * FROM price_logs
WHERE timestamp > NOW() - INTERVAL '1 minute'
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected:** ~180 rows (60 sec × 3 pairs)

---

## 📋 Checklist - Phase 1 Implementation

### Setup

- [ ] Railway projesi oluştur
- [ ] GitHub repo'yu Railway'e bağla
- [ ] Environment variables ekle (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

### Database

- [ ] Supabase'de `price_logs` tablosunu oluştur
- [ ] Index ekle (`pair`, `timestamp`)
- [ ] Test insert yap (manual)

### Code

- [ ] Proje yapısını oluştur (yukarıdaki folder structure)
- [ ] Dependencies yükle (`npm install`)
- [ ] `BinanceService` kodunu yaz
- [ ] `SupabaseService` kodunu yaz
- [ ] `PriceLogger` kodunu yaz
- [ ] `index.ts` main server'ı yaz

### Testing

- [ ] Local test (`npm run dev`)
- [ ] Binance bağlantısını kontrol et
- [ ] Supabase'e yazma testi
- [ ] 5 dakika çalıştır, veri kontrolü
- [ ] Error handling test (Supabase'i kapat → reconnect?)

### Deployment

- [ ] `npm run build` çalıştır, hata olmasın
- [ ] Railway'e push (`railway up`)
- [ ] Railway logs kontrol et
- [ ] Health endpoint test (`/health`)
- [ ] Stats endpoint test (`/stats`)

### Monitoring

- [ ] 24 saat çalıştır
- [ ] Supabase'de veri kontrolü (1 gün = ~259K row)
- [ ] Memory/CPU kullanımı (Railway dashboard)
- [ ] Error count (`/stats` → errors: 0)

---

## 🚦 Next Steps (Phase 2)

Railway başarıyla çalıştıktan sonra:

1. ✅ Price logs doluyor
2. ⏩ `verify-game` edge function'ı güncelle
3. ⏩ Client entegrasyonu (`verifyGameSession` aktive et)

---

**Durum:** Planning/Development  
**Tahmini Süre:** 2-3 gün  
**Bağımlılıklar:** Supabase `price_logs` tablosu
