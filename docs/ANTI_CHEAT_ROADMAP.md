# 🛡️ Anti-Cheat & Data Integrity System

## 📋 Overview

Bu doküman, Crypto Cyber Survivors oyununda veri manipülasyonunu önleme, fiyat verisi doğrulama ve client-side modifikasyonlarına karşı koruma sistemlerini detaylandırır.

| Aspect | Description |
|--------|-------------|
| **Priority** | HIGH - Production için kritik |
| **Complexity** | HIGH - Multiple layers of security |
| **Timeline** | 2-3 weeks |
| **Status** | 📋 PLANNED |

---

## ☁️ Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KULLANICI                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE (CDN + Security) [FREE]                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • DDoS Protection          • Global CDN                                    │
│  • SSL/TLS                  • Cloudflare Workers (100K req/day FREE)       │
│  • WAF                      • Rate Limiting                                 │
│  • Bot Protection           • Cloudflare Pages (Static hosting)            │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
          Static Assets                    API Requests
          (React App)                      (Proxied)
                    │                               │
                    ▼                               ▼
┌────────────────────────────┐    ┌─────────────────────────────────────────┐
│   CLOUDFLARE PAGES         │    │      SUPABASE [FREE TIER]                │
│   ───────────────────────  │    │  ─────────────────────────────────────  │
│  • React/Vite Build        │    │  • PostgreSQL (500MB)                   │
│  • Unlimited bandwidth     │    │  • Edge Functions (500K/month)          │
│  • Auto deploy from Git    │    │  • Realtime Subscriptions               │
│  • Global CDN              │    │  • Row Level Security                   │
└────────────────────────────┘    └─────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RAILWAY [FREE TIER - $5/month]                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Price Oracle Cron Job (her 5 saniye fiyat kaydet)                        │
│  • Background Workers (replay verification)                                  │
│  • Scheduled Tasks                                                           │
│  ≈ 500 saat/ay (~20 gün continuous)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 💰 Free Tier Limits

| Service | Resource | Free Limit | Anti-Cheat İçin Yeterli? |
|---------|----------|------------|-------------------------|
| **Cloudflare Pages** | Bandwidth | Unlimited | ✅ Fazlasıyla |
| **Cloudflare Pages** | Builds | 500/month | ✅ Yeterli |
| **Cloudflare Workers** | Requests | 100K/day | ✅ Yeterli |
| **Supabase** | Database | 500 MB | ✅ Beta için yeterli |
| **Supabase** | Bandwidth | 2 GB/month | ⚠️ Dikkatli kullan |
| **Supabase** | Edge Functions | 500K/month | ✅ Yeterli |
| **Railway** | Credit | $5/month | ⚠️ Cron interval önemli |

### ⚠️ Railway Cron Job Optimizasyonu

```typescript
// Fiyat kaydetme sıklığı vs Railway kullanımı
// ---------------------------------------------
// Her 1 saniye  → ~2.6M request/ay → $5 yetmez ❌
// Her 5 saniye  → ~520K request/ay → $5 yeter ✅
// Her 10 saniye → ~260K request/ay → $5 rahat yeter ✅

// ÖNERİ: Her 5 saniyede bir fiyat kaydet
// Tolerance: ±0.5% (5 saniyelik fiyat değişimi için yeterli)
```

---

## 🎯 Güvenlik Tehditleri

### 1. Client-Side Manipülasyon
| Tehdit | Açıklama | Risk |
|--------|----------|------|
| **Memory Editing** | Cheat Engine ile RAM değerlerini değiştirme | 🔴 CRITICAL |
| **Console Manipulation** | DevTools ile JavaScript değişkenleri değiştirme | 🔴 CRITICAL |
| **Local Storage Tampering** | Scores, stats, session verileri | 🟠 HIGH |
| **Network Interception** | Request/Response modifikasyonu | 🟠 HIGH |
| **Code Injection** | Custom scripts enjekte etme | 🟠 HIGH |

### 2. Server-Side Gereksinimler
| Gereksinim | Açıklama |
|------------|----------|
| **Session Verification** | Her oyun session'ının server'da doğrulanması |
| **Price Validation** | Gerçek piyasa fiyatlarıyla karşılaştırma |
| **Replay Verification** | Oyun olaylarının tekrar oynatılabilir kaydı |
| **Rate Limiting** | Anormal request pattern'ları tespit |
| **Anomaly Detection** | İmkansız istatistiklerin tespiti |

---

## 🏗️ Detaylı Mimari Tasarım

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAME CLIENT                                      │
│                          (Cloudflare Pages)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│   │  Game State     │───▶│  Event Recorder │───▶│  Session Manager        │ │
│   │  (Protected)    │    │  (Hash chain)   │    │  (Token-based)          │ │
│   └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│            │                                              │                  │
│            │              ┌───────────────────────────────┘                  │
│            │              │                                                  │
│            ▼              ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      API CLIENT                                      │   │
│   │  - All requests go through Cloudflare (DDoS protection)             │   │
│   │  - Supabase anon key for read operations                            │   │
│   │  - Session token for authenticated operations                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTPS (via Cloudflare)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE WORKERS (Optional)                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Rate Limiting (IP-based)                                                  │
│  • Request validation                                                        │
│  • Bot detection                                                             │
│  • Geo-blocking (if needed)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE EDGE FUNCTIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│   │  start-session  │    │  validate-      │    │    end-session          │ │
│   │  (Token issue)  │    │  heartbeat      │    │    (Full validation)    │ │
│   └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│            │                      │                         │                │
│            └──────────────────────┼─────────────────────────┘                │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      VALIDATION ENGINE                               │   │
│   │  - Price history verification (from price_history table)            │   │
│   │  - PnL calculation verification                                      │   │
│   │  - Statistics anomaly detection                                      │   │
│   │  - Hash chain integrity check                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE DATABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│   │   players   │  │game_sessions│  │price_history│  │  cheat_attempts     ││
│   │             │  │  (verified) │  │  (5s tick)  │  │  (audit log)        ││
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘│
│                          ▲                                                   │
│   ┌──────────────────────┼──────────────────────────────────────────────┐   │
│   │                 RLS POLICIES (Row Level Security)                   │   │
│   │  - anon: READ leaderboard, READ prices                              │   │
│   │  - authenticated: READ own data                                     │   │
│   │  - service_role: WRITE all (Edge Functions only)                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Cron Job (every 5 seconds)
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RAILWAY (Background Worker)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      PRICE ORACLE                                    │   │
│   │  - Fetch from Binance API every 5 seconds                           │   │
│   │  - Store to price_history with HMAC signature                       │   │
│   │  - Pairs: BTCUSDT, ETHUSDT, SOLUSDT                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      REPLAY VERIFIER (Future)                        │   │
│   │  - Async verification of high-score sessions                        │   │
│   │  - Queue-based processing                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Fiyat Verisi Doğrulama Sistemi

### 1. Server-Side Price Oracle

```typescript
// Edge Function: price-oracle
interface PriceSnapshot {
  pair: string;           // 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'
  price: number;          // Current price
  timestamp: number;      // Unix timestamp (ms)
  source: string;         // 'binance', 'coinbase', etc.
  signature: string;      // Server-signed hash
}

// Price fetched from official API and stored
async function fetchAndStorePrices() {
  const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  
  for (const pair of pairs) {
    const price = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    const data = await price.json();
    
    // Sign the price data
    const signature = await signData({
      pair,
      price: parseFloat(data.price),
      timestamp: Date.now()
    });
    
    // Store in database
    await supabase.from('price_history').insert({
      pair,
      price: parseFloat(data.price),
      timestamp: new Date(),
      signature
    });
  }
}

// Run every 1 second
setInterval(fetchAndStorePrices, 1000);
```

### 2. Session Price Verification

```typescript
// When session ends, verify prices used during gameplay
async function verifySessionPrices(session: GameSession): Promise<ValidationResult> {
  const { entry_price, exit_price, crypto_pair, start_time, end_time } = session;
  
  // Get official price history for the session period
  const { data: priceHistory } = await supabase
    .from('price_history')
    .select('*')
    .eq('pair', crypto_pair)
    .gte('timestamp', start_time)
    .lte('timestamp', end_time)
    .order('timestamp');
  
  // Verify entry price (within ±0.1% tolerance)
  const entryPriceValid = priceHistory.some(p => 
    Math.abs(p.price - entry_price) / p.price < 0.001
  );
  
  // Verify exit price
  const exitPriceValid = priceHistory.some(p => 
    Math.abs(p.price - exit_price) / p.price < 0.001
  );
  
  if (!entryPriceValid || !exitPriceValid) {
    return { valid: false, reason: 'PRICE_MISMATCH' };
  }
  
  // Verify PnL calculation
  const expectedPnl = calculatePnL(entry_price, exit_price, session.position, session.leverage);
  if (Math.abs(expectedPnl - session.pnl_percent) > 0.01) {
    return { valid: false, reason: 'PNL_CALCULATION_ERROR' };
  }
  
  return { valid: true };
}
```

---

## 🎮 Game Event Recording (Replay System)

### 1. Event Types

```typescript
interface GameEvent {
  type: GameEventType;
  timestamp: number;      // Relative to session start
  data: any;              // Event-specific data
  hash: string;           // SHA-256 of previous event + this event
}

enum GameEventType {
  // Player actions
  MOVE = 'MOVE',
  SHOOT = 'SHOOT',
  LEVEL_UP = 'LEVEL_UP',
  CARD_SELECT = 'CARD_SELECT',
  
  // Game state changes
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_KILL = 'ENEMY_KILL',
  DAMAGE_TAKEN = 'DAMAGE_TAKEN',
  XP_GAINED = 'XP_GAINED',
  
  // Price updates
  PRICE_UPDATE = 'PRICE_UPDATE',
  
  // Special
  HEARTBEAT = 'HEARTBEAT',
  SESSION_END = 'SESSION_END'
}
```

### 2. Event Chain (Blockchain-like)

```typescript
class EventRecorder {
  private events: GameEvent[] = [];
  private previousHash: string = '0';
  
  record(type: GameEventType, data: any): void {
    const event: GameEvent = {
      type,
      timestamp: performance.now() - this.sessionStart,
      data,
      hash: this.computeHash(type, data)
    };
    
    this.events.push(event);
    this.previousHash = event.hash;
  }
  
  private computeHash(type: GameEventType, data: any): string {
    const payload = JSON.stringify({
      previousHash: this.previousHash,
      type,
      data,
      timestamp: Date.now()
    });
    return sha256(payload);
  }
  
  getCompressedReplay(): string {
    // Compress and encode for transmission
    const compressed = pako.gzip(JSON.stringify(this.events));
    return base64.encode(compressed);
  }
}
```

### 3. Server-Side Replay Verification

```typescript
// Edge Function: verify-replay
async function verifyReplay(
  sessionId: string, 
  compressedReplay: string,
  finalStats: GameStats
): Promise<VerificationResult> {
  // Decompress replay
  const events = decompressReplay(compressedReplay);
  
  // Verify hash chain integrity
  let previousHash = '0';
  for (const event of events) {
    const expectedHash = computeHash(previousHash, event);
    if (event.hash !== expectedHash) {
      return { valid: false, reason: 'CHAIN_BROKEN', index: events.indexOf(event) };
    }
    previousHash = event.hash;
  }
  
  // Simulate game and compare results
  const simulatedStats = simulateGame(events);
  
  // Compare key metrics
  const discrepancies = compareStats(simulatedStats, finalStats);
  if (discrepancies.length > 0) {
    return { valid: false, reason: 'STATS_MISMATCH', discrepancies };
  }
  
  return { valid: true, replayHash: sha256(compressedReplay) };
}

function simulateGame(events: GameEvent[]): GameStats {
  let stats = {
    level: 1,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    xpGained: 0
  };
  
  for (const event of events) {
    switch (event.type) {
      case GameEventType.ENEMY_KILL:
        stats.kills++;
        stats.damageDealt += event.data.damage;
        break;
      case GameEventType.DAMAGE_TAKEN:
        stats.damageTaken += event.data.amount;
        break;
      case GameEventType.XP_GAINED:
        stats.xpGained += event.data.amount;
        break;
      case GameEventType.LEVEL_UP:
        stats.level = event.data.newLevel;
        break;
    }
  }
  
  return stats;
}
```

---

## 🔒 Client-Side Obfuscation

### 1. Build-Time Obfuscation

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      mangle: {
        properties: {
          regex: /^_private_/  // Mangle private properties
        }
      },
      compress: {
        drop_console: true,    // Remove console.log
        drop_debugger: true,   // Remove debugger statements
        pure_funcs: ['console.log', 'console.debug']
      }
    },
    rollupOptions: {
      plugins: [
        obfuscator({
          compact: true,
          controlFlowFlattening: true,
          deadCodeInjection: true,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          splitStrings: true
        })
      ]
    }
  }
});
```

### 2. Runtime Protection

```typescript
// AntiCheatService.ts
export class AntiCheatService {
  private static fingerprint: string;
  private static integrityCheckInterval: number;
  
  static init(): void {
    // 1. Detect DevTools
    this.detectDevTools();
    
    // 2. Detect memory editing (Cheat Engine)
    this.setupIntegrityChecks();
    
    // 3. Disable right-click context menu
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // 4. Detect debugger pause
    this.detectDebugger();
    
    // 5. Generate device fingerprint
    this.fingerprint = this.generateFingerprint();
  }
  
  private static detectDevTools(): void {
    const threshold = 160;
    const check = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        this.onCheatDetected('DEVTOOLS_OPEN');
      }
    };
    
    window.addEventListener('resize', check);
    setInterval(check, 1000);
  }
  
  private static detectDebugger(): void {
    let start = performance.now();
    debugger; // This line will pause if debugger is open
    let end = performance.now();
    
    if (end - start > 100) {
      this.onCheatDetected('DEBUGGER_DETECTED');
    }
    
    setTimeout(() => this.detectDebugger(), 5000);
  }
  
  private static setupIntegrityChecks(): void {
    // Store critical values encrypted
    const criticalValues = new Map<string, { value: any, check: number }>();
    
    // Check every 100ms
    this.integrityCheckInterval = setInterval(() => {
      for (const [key, stored] of criticalValues) {
        const current = this.getCriticalValue(key);
        const currentCheck = this.computeChecksum(current);
        
        if (currentCheck !== stored.check && current !== stored.value) {
          this.onCheatDetected(`MEMORY_TAMPER:${key}`);
        }
      }
    }, 100);
  }
  
  private static onCheatDetected(type: string): void {
    // Log to server
    void this.reportCheat(type);
    
    // Corrupt game state (soft ban)
    window.dispatchEvent(new CustomEvent('cheat_detected'));
    
    // Optionally: End session immediately
    // GameStateMachine.transition(GameStatus.GAMEOVER);
  }
  
  private static async reportCheat(type: string): Promise<void> {
    const { supabase } = await import('./supabase');
    await supabase.from('cheat_attempts').insert({
      player_id: UserSessionService.getPlayerId(),
      cheat_type: type,
      timestamp: new Date().toISOString(),
      fingerprint: this.fingerprint,
      user_agent: navigator.userAgent
    });
  }
}
```

---

## 📋 Database Security (RLS Policies)

```sql
-- ============================================
-- STRICT RLS POLICIES FOR GAME DATA
-- ============================================

-- 1. Players table - Read only own data
CREATE POLICY "players_read_own"
ON players FOR SELECT
USING (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

-- Players cannot update their own stats directly
CREATE POLICY "players_no_self_update"
ON players FOR UPDATE
USING (false); -- Only service_role can update

-- 2. Game Sessions - Insert only via Edge Functions
CREATE POLICY "sessions_insert_via_service"
ON game_sessions FOR INSERT
WITH CHECK (
  -- Only validated sessions can be inserted
  validated = true AND
  current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
);

-- Sessions are immutable (no updates allowed)
CREATE POLICY "sessions_no_update"
ON game_sessions FOR UPDATE
USING (false);

CREATE POLICY "sessions_no_delete"
ON game_sessions FOR DELETE
USING (false);

-- 3. Price History - Read only, insert only service
CREATE POLICY "prices_read_all"
ON price_history FOR SELECT
USING (true);

CREATE POLICY "prices_insert_service_only"
ON price_history FOR INSERT
WITH CHECK (
  current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
);

-- 4. Leaderboard - Read only view
CREATE POLICY "leaderboard_read"
ON leaderboard FOR SELECT
USING (true);

-- Only Edge Functions can update leaderboard
CREATE POLICY "leaderboard_update_service"
ON leaderboard FOR INSERT
WITH CHECK (
  current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
);
```

---

## 🚀 Implementation Phases

### Phase 0: Infrastructure Setup (Day 1)
| Task | Description | Where | Effort |
|------|-------------|-------|--------|
| 0.1 | Setup Cloudflare Pages | Cloudflare | 1h |
| 0.2 | Connect GitHub for auto-deploy | Cloudflare | 30m |
| 0.3 | Configure custom domain | Cloudflare | 30m |
| 0.4 | Create Railway project | Railway | 30m |
| 0.5 | Connect Railway to Supabase env vars | Railway | 30m |

**Deliverables:**
- [ ] Game deployed on Cloudflare Pages
- [ ] Railway project ready for workers
- [ ] Supabase connected to both

---

### Phase 1: Price Oracle (Week 1)
| Task | Description | Where | Effort |
|------|-------------|-------|--------|
| 1.1 | Create `price_history` table | Supabase | 1h |
| 1.2 | Railway cron: Binance price fetcher | Railway | 4h |
| 1.3 | Supabase Edge: Price verification | Supabase | 4h |
| 1.4 | Client: Fetch prices from Supabase | Client | 3h |
| 1.5 | RLS policies for price data | Supabase | 2h |

```typescript
// Railway Worker - price-oracle.ts
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service_role key for write access
);

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

// Run every 5 seconds
cron.schedule('*/5 * * * * *', async () => {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(PAIRS)}`
    );
    const prices = await response.json();
    
    const records = prices.map((p: any) => ({
      pair: p.symbol,
      price: parseFloat(p.price),
      source: 'binance',
      fetched_at: new Date().toISOString()
    }));
    
    await supabase.from('price_history').insert(records);
    console.log(`[PriceOracle] Stored ${records.length} prices`);
  } catch (error) {
    console.error('[PriceOracle] Error:', error);
  }
});

console.log('[PriceOracle] Started - Running every 5 seconds');
```

**Deliverables:**
- [ ] Prices stored every 5 seconds (Railway optimized)
- [ ] Session validation checks entry/exit prices
- [ ] Client receives prices from trusted Supabase

---

### Phase 2: Session Validation (Week 1-2)
| Task | Description | Where | Effort |
|------|-------------|-------|--------|
| 2.1 | Edge Function: `start-session` | Supabase | 4h |
| 2.2 | Edge Function: `end-session` | Supabase | 4h |
| 2.3 | Client: SessionManager service | Client | 3h |
| 2.4 | Price validation logic | Supabase | 3h |
| 2.5 | Anomaly detection rules | Supabase | 4h |

```typescript
// Supabase Edge Function: end-session/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { sessionData } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // 1. Validate prices against history
  const { data: prices } = await supabase
    .from('price_history')
    .select('price')
    .eq('pair', sessionData.crypto_pair)
    .gte('fetched_at', sessionData.start_time)
    .lte('fetched_at', sessionData.end_time);
  
  const entryValid = prices?.some(p => 
    Math.abs(p.price - sessionData.entry_price) / sessionData.entry_price < 0.005 // 0.5% tolerance
  );
  
  const exitValid = prices?.some(p => 
    Math.abs(p.price - sessionData.exit_price) / sessionData.exit_price < 0.005
  );
  
  if (!entryValid || !exitValid) {
    return new Response(JSON.stringify({ 
      valid: false, 
      reason: 'PRICE_MISMATCH' 
    }), { status: 400 });
  }
  
  // 2. Validate PnL calculation
  const expectedPnl = calculatePnL(
    sessionData.entry_price,
    sessionData.exit_price,
    sessionData.position,
    sessionData.leverage
  );
  
  if (Math.abs(expectedPnl - sessionData.pnl_percent) > 0.1) {
    return new Response(JSON.stringify({ 
      valid: false, 
      reason: 'PNL_MISMATCH' 
    }), { status: 400 });
  }
  
  // 3. Insert validated session
  await supabase.from('game_sessions').insert({
    ...sessionData,
    validated: true,
    validation_method: 'edge_function'
  });
  
  return new Response(JSON.stringify({ valid: true }));
});
```

**Deliverables:**
- [ ] Server-validated sessions only
- [ ] Price manipulation impossible
- [ ] PnL calculations verified server-side

---

### Phase 3: Client Hardening (Week 2) ✅ COMPLETED
| Task | Description | Where | Status |
|------|-------------|-------|--------|
| 3.1 | Vite obfuscation config | Client | ✅ Done |
| 3.2 | Remove console.log in production | Client | ✅ Done |
| 3.3 | DevTools detection (logging) | Client | ✅ Done |
| 3.4 | AntiCheatService basic | Client | ✅ Done |
| 3.5 | Cheat attempt reporting | Client | ✅ Done |

**Deliverables:**
- [x] Obfuscated production build (Terser configured)
- [x] DevTools detection implemented (`AntiCheatService.ts`)
- [x] Memory tampering detection (integrity checks)
- [x] Speed hack detection (frame timing analysis)
- [x] Cheat reporting to Supabase `cheat_attempts` table

**Files Created/Modified:**
- `services/AntiCheatService.ts` - New anti-cheat singleton service
- `types/events.ts` - Added cheat-related event types
- `vite.config.ts` - Production obfuscation settings

---

---

## ☁️ Cloudflare Entegrasyon Durumu

> **Son Kontrol:** 2026-01-17 14:27 UTC+3

### 🔌 MCP Bağlantı Durumu

| Servis | Durum | Açıklama |
|--------|-------|----------|
| **Cloudflare API** | ✅ Bağlı | MCP üzerinden bağlantı aktif |
| **Workers** | ✅ 5 Worker | `crypto-rate-limiter`, `crypto-security-headers`, `crypto-bot-protection`, `crypto-price-oracle`, `crypto-session-validator` |
| **D1 Database** | ✅ Oluşturuldu | `crypto-cyber-sessions` (4 tablo: `rate_limits`, `price_history`, `bot_attempts`, `game_sessions`) |
| **CRON Triggers** | ✅ Aktif | `crypto-price-oracle` her 5 dakikada bir çalışır |
| **Queues** | ✅ Oluşturuldu | `crypto-rate-limit-queue` |
| **R2 Buckets** | ⚪ Boş | Henüz bucket oluşturulmadı |
| **Zones** | ⚪ Boş | Domain henüz eklenmedi |
| **Pages** | 📋 Planlandı | GitHub entegrasyonu bekliyor |

### 🚀 Deploy Edilecek Cloudflare Servisleri

#### 1. Rate Limiting Worker
```typescript
// cf-worker-rate-limiter.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate:${clientIP}`;
    
    // KV'den rate limit kontrolü
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= 100) { // 100 req/minute
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    // Counter'ı artır
    await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 60 });
    
    // Origin'e yönlendir
    return fetch(request);
  }
};
```

#### 2. Bot Detection Worker
```typescript
// cf-worker-bot-detector.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const botScore = request.cf?.botManagement?.score || 100;
    const isVerifiedBot = request.cf?.botManagement?.verifiedBot || false;
    
    // Şüpheli botları logla
    if (botScore < 30 && !isVerifiedBot) {
      await env.BOT_LOGS_KV.put(
        `bot:${Date.now()}`,
        JSON.stringify({
          ip: request.headers.get('CF-Connecting-IP'),
          ua: request.headers.get('User-Agent'),
          score: botScore,
          path: new URL(request.url).pathname
        }),
        { expirationTtl: 86400 }
      );
      
      // Challenge göster veya engelle
      return new Response('Suspicious activity detected', { status: 403 });
    }
    
    return fetch(request);
  }
};
```

#### 3. D1 Session Store (Alternatif)
```sql
-- Cloudflare D1 için session tablosu (Supabase yedeği olarak)
CREATE TABLE cf_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  validated INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_sessions_player ON cf_sessions(player_id);
CREATE INDEX idx_sessions_time ON cf_sessions(start_time);
```

### 📋 Cloudflare Setup Adımları

#### Adım 1: Domain Ekleme (İsteğe Bağlı)
```bash
# Mevcut domain varsa Cloudflare'e ekle
# Dashboard: dash.cloudflare.com > Add Site
# Nameserver değişikliği gerekli
```

#### Adım 2: Pages Projesi Oluşturma
```bash
# 1. Cloudflare Dashboard > Pages > Create Project
# 2. GitHub repo bağla: crypto-cyber-survivors
# 3. Build settings:
#    - Build command: npm run build
#    - Output directory: dist
# 4. Environment variables:
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_ANON_KEY
```

#### Adım 3: Worker Deploy
```bash
# Wrangler CLI kullanarak
npx wrangler deploy cf-worker-rate-limiter.ts --name rate-limiter
npx wrangler deploy cf-worker-bot-detector.ts --name bot-detector
```

#### Adım 4: KV Namespace Oluşturma
```bash
# Rate limiting için KV namespace
npx wrangler kv:namespace create "RATE_LIMIT_KV"
npx wrangler kv:namespace create "BOT_LOGS_KV"
```

#### Adım 5: D1 Database (İsteğe Bağlı)
```bash
# Backup/fallback session store
npx wrangler d1 create crypto-cyber-sessions
npx wrangler d1 execute crypto-cyber-sessions --file=./schema.sql
```

### 🔐 Cloudflare Security Features (Free Tier)

| Özellik | Free Tier Dahil | Notlar |
|---------|-----------------|--------|
| **DDoS Protection** | ✅ Evet | Otomatik, sınırsız |
| **SSL/TLS** | ✅ Evet | Universal SSL |
| **WAF (Basic)** | ✅ Evet | Managed rules limited |
| **Bot Fight Mode** | ✅ Evet | Temel bot koruması |
| **Rate Limiting** | ❌ Hayır | Worker ile implemente et |
| **Workers** | ✅ 100K req/day | Anti-cheat için yeterli |
| **KV Storage** | ✅ 100K reads/day | Rate limit store için |
| **D1 Database** | ✅ 5M rows/day | Session backup için |
| **R2 Storage** | ✅ 10GB | Replay storage için |
| **Pages** | ✅ Unlimited | Static hosting |

---

### Phase 4: Cloudflare Security (Week 2) ✅ COMPLETED
| Task | Description | Where | Status |
|------|-------------|-------|--------|
| 4.1 | Cloudflare WAF rules | Cloudflare | ✅ Workers deployed |
| 4.2 | Rate limiting Worker | Cloudflare | ✅ `crypto-rate-limiter` |
| 4.3 | Bot protection Worker | Cloudflare | ✅ `crypto-bot-protection` |
| 4.4 | Security headers Worker | Cloudflare | ✅ `crypto-security-headers` |
| 4.5 | D1 database setup | Cloudflare | ✅ `crypto-cyber-sessions` |
| 4.6 | Pages deployment | Cloudflare | 📋 Pending GitHub connect |
| 4.7 | Domain configuration | Cloudflare | 📋 Pending domain |

**Deliverables:**
- [x] Rate limiting Worker deployed (100 req/min per IP)
- [x] Security headers Worker deployed (CSP, X-Frame-Options, etc.)
- [x] Bot protection Worker deployed (UA filtering, bot score check)
- [x] D1 database created for session backup
- [ ] Pages project connected to GitHub
- [ ] Custom domain configured

---

### Phase 5: Event Recording & Replay (Week 3) ✅ COMPLETED
| Task | Description | Where | Status |
|------|-------------|-------|--------|
| 5.1 | EventRecorderService | Client | ✅ Done |
| 5.2 | Hash chain implementation | Client | ✅ Done |
| 5.3 | verify-replay Edge Function | Supabase | ✅ Done |
| 5.4 | Database migration | Supabase | ✅ Done |

**Deliverables:**
- [x] All game events recorded with hash chain (`EventRecorderService.ts`)
- [x] Automatic EventBus integration for key events
- [x] Server-side replay verification Edge Function
- [x] Database tables: `game_replays`, `verification_failures`, `cheat_attempts`
- [x] RLS policies for secure access

**Files Created:**
- `services/EventRecorderService.ts` - Hash chain event recorder
- `types/replay.ts` - Replay type definitions
- `supabase/functions/verify-replay/index.ts` - Server verification
- `supabase/migrations/016_replay_verification.sql` - Database tables

---

## ⚠️ Limitations & Trade-offs

### What We CAN Prevent
| Attack | Prevention Method |
|--------|-------------------|
| Price manipulation | Server-side price oracle |
| Fake session data | Server validation |
| Simple memory editing | Integrity checks + obfuscation |
| DevTools exploitation | Detection + session invalidation |
| Replay fraud | Hash chain verification |

### What We CANNOT Fully Prevent
| Attack | Reason | Mitigation |
|--------|--------|------------|
| Sophisticated bots | Too complex to distinguish | Anomaly detection, manual review |
| Game analysis | Client code can be reverse-engineered | Frequent updates, obfuscation |
| Perfect aim hacks | Client-side decision | Replay analysis for impossible accuracy |

### Trade-offs
| Decision | Benefit | Cost |
|----------|---------|------|
| Heavy obfuscation | Harder to reverse | Larger bundle, slower startup |
| Replay recording | Full verification | More bandwidth, storage |
| Frequent heartbeats | Quick detection | Server load, battery drain |
| Server-side prices | No manipulation | Latency, server dependency |

---

## 📊 Validation Confidence Levels

```typescript
enum ValidationConfidence {
  VERIFIED = 'VERIFIED',       // Replay verified, all checks passed
  TRUSTED = 'TRUSTED',         // Basic validation passed, no replay check
  SUSPICIOUS = 'SUSPICIOUS',   // Some anomalies detected
  REJECTED = 'REJECTED'        // Validation failed
}

// Sessions with VERIFIED status are eligible for:
// - Leaderboard placement
// - Rewards distribution
// - Tournament qualification
```

---

## 🔧 Quick Start (MVP Anti-Cheat)

Eğer full sistem çok kompleks ise, MVP olarak şunlar yapılabilir:

### MVP Checklist

#### 0. Infrastructure (Day 1) ✅ COMPLETED
- [x] Cloudflare Workers setup (5 workers deployed)
- [x] Railway project (for price oracle backup)
- [x] D1 Database with all tables
- [ ] Cloudflare Pages + GitHub connection (manual step)

#### 1. **Price Oracle** ✅ COMPLETED (Cloudflare)
- [x] `crypto-price-oracle` worker deployed
- [x] CRON trigger her 5 dakikada bir fiyat kaydeder
- [x] `price_history` table with proper indexes (D1)
- [x] Price verification endpoint (`/verify`)

#### 2. **Session Validation** ✅ COMPLETED (Cloudflare)
- [x] `crypto-session-validator` worker deployed
- [x] Price verification logic
- [x] PnL calculation verification
- [x] Anomaly detection (kill rate, level rate)
- [x] `game_sessions` table (D1)

#### 3. **Basic Hardening** ✅ COMPLETED
- [x] Production build obfuscation (Terser)
- [x] console.log removal
- [x] DevTools detection (logging only)
- [x] AntiCheatService implemented

#### 4. **Cloudflare Security** ✅ COMPLETED
- [x] `crypto-rate-limiter` Worker (D1-based, 100 req/min)
- [x] `crypto-security-headers` Worker (HSTS, CSP, X-Frame-Options)
- [x] `crypto-bot-protection` Worker (UA filtering, bot score)
- [x] D1 database with 4 tables
- [x] DDoS protection (automatic with Cloudflare)
- [ ] Pages + GitHub connection (manual step)

#### 5. **Event Recording & Replay** ✅ COMPLETED
- [x] EventRecorderService with hash chain
- [x] verify-replay Edge Function
- [x] Database migrations for replay storage
- [ ] Server-side game simulation (future enhancement)

---

## 📁 Related Files

| File | Description |
|------|-------------|
| `docs/BETA_USER_SYSTEM_ROADMAP.md` | Beta user system documentation (✅ Completed) |
| `docs/LEADERBOARD_ARCHITECTURE.md` | Web3 leaderboard details |
| `supabase/migrations/001_analytics_views.sql` | Analytics views and functions |

---

*Last Updated: 2026-01-17 14:27 UTC+3*
*Status: ✅ Phase 1, 2, 3, 4, 5 COMPLETED - Full Anti-Cheat System on Cloudflare*
*Priority: HIGH*
*Infrastructure: Cloudflare (Workers + D1) + Supabase + Railway (All Free Tier Compatible)*
