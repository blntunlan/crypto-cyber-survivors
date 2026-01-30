# 🛡️ Anti-Cheat & Data Integrity System

## 📋 Overview

This document details the systems for preventing data manipulation, validating price data, and protecting against client-side modifications in Crypto Cyber Survivors.

| Aspect | Description |
|--------|-------------|
| **Priority** | HIGH - Critical for Production |
| **Complexity** | HIGH - Multiple layers of security |
| **Timeline** | 2-3 weeks |
| **Status** | 📋 PLANNED |

---

## ☁️ Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  USER                                        │
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
│  • Price Oracle Cron Job (save price every 5 seconds)                       │
│  • Background Workers (replay verification)                                  │
│  • Scheduled Tasks                                                           │
│  ≈ 500 hours/month (~20 days continuous)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 💰 Free Tier Limits

| Service | Resource | Free Limit | Sufficient for Anti-Cheat? |
|---------|----------|------------|-------------------------|
| **Cloudflare Pages** | Bandwidth | Unlimited | ✅ Plenty |
| **Cloudflare Pages** | Builds | 500/month | ✅ Sufficient |
| **Cloudflare Workers** | Requests | 100K/day | ✅ Sufficient |
| **Supabase** | Database | 500 MB | ✅ Sufficient for Beta |
| **Supabase** | Bandwidth | 2 GB/month | ⚠️ Use carefully |
| **Supabase** | Edge Functions | 500K/month | ✅ Sufficient |
| **Railway** | Credit | $5/month | ⚠️ Cron interval matters |

### ⚠️ Railway Cron Job Optimization

```typescript
// Price recording frequency vs Railway usage
// ---------------------------------------------
// Every 1 second  → ~2.6M requests/month → $5 not enough ❌
// Every 5 seconds  → ~520K requests/month → $5 sufficient ✅
// Every 10 seconds → ~260K requests/month → $5 easily sufficient ✅

// RECOMMENDATION: Record price every 5 seconds
// Tolerance: ±0.5% (sufficient for 5-second price movement)
```

---

## 🎯 Security Threats

### 1. Client-Side Manipulation
| Threat | Description | Risk |
|--------|----------|------|
| **Memory Editing** | Changing RAM values with tools like Cheat Engine | 🔴 CRITICAL |
| **Console Manipulation** | Changing JavaScript variables via DevTools | 🔴 CRITICAL |
| **Local Storage Tampering** | Modifying scores, stats, session data | 🟠 HIGH |
| **Network Interception** | Request/Response modification | 🟠 HIGH |
| **Code Injection** | Injecting custom scripts | 🟠 HIGH |

### 2. Server-Side Requirements
| Requirement | Description |
|------------|----------|
| **Session Verification** | Server-side validation of every game session |
| **Price Validation** | Comparison with real market prices |
| **Replay Verification** | Playable record of game events |
| **Rate Limiting** | Detection of abnormal request patterns |
| **Anomaly Detection** | Identification of impossible statistics |

---

## 🏗️ Detailed Architectural Design

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
│            │              │                                                  │
│            ▼              ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      API CLIENT                                      │   │
│   │  - All requests via Cloudflare (DDoS protection)                    │   │
│   │  - Supabase anon key for read operations                            │   │
│   │  - Session token for authenticated operations                        │   │
└─────────────────────────────────────────────────────────────────────────────┘
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
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
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
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Price Data Validation System

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

### Phase 0: Infrastructure Setup
| Task | Description | Status |
|------|-------------|-------|
| 0.1 | Setup Cloudflare Pages | ✅ |
| 0.2 | Connect GitHub for auto-deploy | ✅ |
| 0.3 | Configure custom domain | ✅ |
| 0.4 | Create Railway project | ✅ |
| 0.5 | Connect Railway to Supabase env vars | ✅ |

---

### Phase 1: Price Oracle
| Task | Description | Status |
|------|-------------|-------|
| 1.1 | Create `price_history` table | ✅ |
| 1.2 | Railway cron: Binance price fetcher | ✅ |
| 1.3 | Supabase Edge: Price verification | ✅ |
| 1.4 | Client: Fetch prices from Supabase | ✅ |
| 1.5 | RLS policies for price data | ✅ |

---

### Phase 2: Session Validation
| Task | Description | Status |
|------|-------------|-------|
| 2.1 | Edge Function: `start-session` | ⬜ |
| 2.2 | Edge Function: `end-session` | ⬜ |
| 2.3 | Client: SessionManager service | ⬜ |
| 2.4 | Price validation logic | ⬜ |
| 2.5 | Anomaly detection rules | ⬜ |

---

### Phase 3: Client Hardening [COMPLETED]
| Task | Description | Status |
|------|-------------|-------|
| 3.1 | Vite obfuscation config | ✅ |
| 3.2 | Remove console.log in production | ✅ |
| 3.3 | DevTools detection (logging) | ✅ |
| 3.4 | AntiCheatService basic | ✅ |
| 3.5 | Cheat attempt reporting | ✅ |

---

// END OF PROTOCOL
