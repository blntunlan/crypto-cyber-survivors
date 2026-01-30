# 🎮 Beta User System & Analytics Roadmap ✅ COMPLETED

## 📋 Overview

This roadmap details the user management, metrics collection, and infrastructure required for future Web3 integration during the beta process of the Crypto Cyber Survivors game.

| Aspect | Description |
|--------|-------------|
| **Phase** | ✅ Beta Testing - COMPLETED |
| **Primary Goal** | Nickname-based login with comprehensive analytics |
| **Future Integration** | Twitter OAuth + Crypto Wallet (Phantom/Solflare) |
| **Database** | Supabase (PostgreSQL) |
| **Deployment** | Railway |
| **Status** | ✅ All 6 Phases Complete |

---

## 🎯 Core Objectives

1. **Nickname-based Beta Login** - User registration with nickname before entering the game
2. **Comprehensive Metrics Collection** - FPS, performance, game data
3. **Error Tracking** - Runtime errors and crash reports
4. **Future-proof Auth Architecture** - Infrastructure ready for Twitter & Wallet integration

---

## 💾 localStorage Persistence (Cookie-like Behavior)

We won't ask for the nickname every time the user logs in. It will work like a cookie using **localStorage**:

### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      WHEN GAME STARTS                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Is there a nickname   │
                 │  in localStorage?      │
                 └────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       ┌─────────────┐                 ┌─────────────┐
       │    YES ✅   │                 │    NO ❌    │
       └─────────────┘                 └─────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │  Show MainMenu   │           │ Show NicknameEntry│
    │  directly        │           │ Screen           │
    └──────────────────┘           └──────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │ Enter Nickname + │
                                  │ Save to          │
                                  │ localStorage     │
                                  └──────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │  Go to MainMenu  │
                                  └──────────────────┘
```

### Storage Structure

```typescript
// Key: 'crypto_survivors_user'
interface StoredUser {
  playerId: string;      // UUID from Supabase
  nickname: string;      // Display name (3-16 chars)
  createdAt: number;     // First login timestamp
  lastSeenAt: number;    // Last session timestamp
}

// Example localStorage content:
{
  "playerId": "abc123-uuid-from-supabase",
  "nickname": "CryptoKing",
  "createdAt": 1703264400000,
  "lastSeenAt": 1703350800000
}
```

### Behavior Matrix

| Scenario | Behavior |
|---------|----------|
| **First visit** | Show NicknameEntry screen |
| **Returning user** | Go directly to MainMenu, "Welcome back, {nickname}!" message |
| **Different browser/device** | Ask for new nickname (can use same nick, linked in Supabase) |
| **localStorage cleared** | Ask for new nickname |
| **Future: Twitter connected** | Auto login, sync across all devices |
| **Future: Wallet connected** | Login with Wallet signature, sync across all devices |

### UserSessionService API

```typescript
class UserSessionService {
  // Check if user exists in localStorage
  static hasStoredUser(): boolean;
  
  // Get stored user data
  static getStoredUser(): StoredUser | null;
  
  // Get player ID for MetricsService
  static getPlayerId(): string | null;
  
  // Save new user after registration
  static saveUser(playerId: string, nickname: string): void;
  
  // Update last seen timestamp
  static updateLastSeen(): void;
  
  // Clear user (for logout/debug)
  static clearUser(): void;
}
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │ NicknameEntry│   │  Game Loop   │   │  MetricsService     │  │
│  │    Screen   │──▶│              │──▶│  (existing)         │  │
│  └─────────────┘   └──────────────┘   └──────────────────────┘  │
│         │                                        │               │
│         │         ┌──────────────┐               │               │
│         └────────▶│ UserSession  │◀──────────────┘               │
│                   │   Service    │                               │
│                   └──────┬───────┘                               │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │         Performance & Error Tracking Layer                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │FPSTracker   │  │ErrorBoundary │  │PerformanceMonitor│  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   players   │  │game_sessions│  │  performance_metrics   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │error_reports│  │ leaderboard │  │    device_profiles     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Proposed File Structure

```
services/
├── auth/
│   ├── UserSessionService.ts      # Session management (NEW)
│   ├── AuthProvider.tsx           # React context for auth (NEW)
│   ├── NicknameValidator.ts       # Nickname validation rules (NEW)
│   └── types.ts                   # Auth types (NEW)
│
├── analytics/
│   ├── PerformanceTracker.ts      # FPS, frame times, memory (NEW)
│   ├── ErrorReporter.ts           # Error aggregation & reporting (NEW)
│   ├── DeviceProfiler.ts          # Device fingerprint & capabilities (NEW)
│   └── AnalyticsAggregator.ts     # Combines all analytics (NEW)
│
├── metrics/                       # (existing - enhance)
│   ├── MetricsStorage.ts          # ✅ Already syncs to Supabase
│   ├── MetricsCompiler.ts         # ✅ Existing
│   ├── MetricsExporter.ts         # ✅ Existing
│   └── MetricsAnalyzer.ts         # ✅ Existing
│
└── supabase.ts                    # ✅ Already configured

components/
├── screens/
│   ├── NicknameEntryScreen.tsx    # New entry screen (NEW)
│   └── MainMenu.tsx               # ✅ Modify to show after nickname
│
├── auth/
│   ├── NicknameInput.tsx          # Styled nickname input (NEW)
│   ├── WalletConnectButton.tsx    # Future: Phantom/Solflare (PLACEHOLDER)
│   └── TwitterLoginButton.tsx     # Future: Twitter OAuth (PLACEHOLDER)
│
└── debug/
├── PerformanceOverlay.tsx     # Dev-only performance display (NEW)
└── ErrorBoundaryReporter.tsx  # Error reporting wrapper (NEW)

hooks/
├── useUserSession.ts              # Session state hook (NEW)
├── usePerformanceMetrics.ts       # FPS & performance hook (NEW)
└── useErrorReporting.ts           # Error handling hook (NEW)

types/
├── user.ts                        # User & session types (NEW)
└── analytics.ts                   # Analytics types (NEW)
```

---

## 🗄️ Database Schema (Supabase)

### Phase 1: Beta (Nickname Only)

```sql
-- ============================================
-- PLAYERS TABLE (Beta - Nickname Only)
-- ============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(32) NOT NULL,
  
  -- Beta tracking
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 0,
  
  -- Future auth fields (NULL for beta)
  twitter_id VARCHAR(64) UNIQUE,
  twitter_handle VARCHAR(32),
  wallet_address VARCHAR(64) UNIQUE,
  wallet_type VARCHAR(16), -- 'phantom', 'solflare', etc.
  
  -- Status
  status VARCHAR(16) DEFAULT 'active', -- 'active', 'banned', 'suspended'
  ban_reason TEXT,
  
  CONSTRAINT valid_nickname CHECK (
    LENGTH(nickname) >= 3 AND 
    LENGTH(nickname) <= 16 AND
    nickname ~ '^[a-zA-Z0-9_]+$'
  )
);

-- Index for quick lookups
CREATE INDEX idx_players_nickname ON players(nickname);
CREATE INDEX idx_players_twitter ON players(twitter_id) WHERE twitter_id IS NOT NULL;
CREATE INDEX idx_players_wallet ON players(wallet_address) WHERE wallet_address IS NOT NULL;

-- ============================================
-- GAME SESSIONS TABLE (Enhanced)
-- ============================================
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  
  -- Session info
  session_timestamp TIMESTAMP DEFAULT NOW(),
  survival_time_ms INTEGER NOT NULL,
  end_reason VARCHAR(32) NOT NULL, -- 'death', 'quit', 'disconnect', 'crash'
  
  -- Game metrics
  max_level INTEGER NOT NULL,
  total_kills INTEGER NOT NULL,
  crypto_pair VARCHAR(16) NOT NULL, -- 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'
  position VARCHAR(8) NOT NULL, -- 'LONG', 'SHORT'
  leverage INTEGER NOT NULL,
  entry_price DECIMAL(20, 8),
  exit_price DECIMAL(20, 8),
  pnl_percent DECIMAL(10, 4),
  
  -- Full metrics JSON
  metrics JSONB NOT NULL,
  
  -- Device & Performance
  device_fingerprint VARCHAR(64),
  avg_fps DECIMAL(5, 1),
  min_fps DECIMAL(5, 1),
  
  -- Validation
  replay_hash VARCHAR(64), -- Future anti-cheat
  validated BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_sessions_timestamp ON game_sessions(session_timestamp);
CREATE INDEX idx_sessions_survival ON game_sessions(survival_time_ms DESC);

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  
  -- Timing
  recorded_at TIMESTAMP DEFAULT NOW(),
  
  -- FPS Data
  avg_fps DECIMAL(5, 1) NOT NULL,
  min_fps DECIMAL(5, 1) NOT NULL,
  max_fps DECIMAL(5, 1) NOT NULL,
  fps_1_percentile DECIMAL(5, 1), -- Worst 1%
  fps_samples INTEGER NOT NULL,
  
  -- Frame Times
  avg_frame_time_ms DECIMAL(6, 2),
  max_frame_time_ms DECIMAL(6, 2),
  frame_drops INTEGER, -- Frames > 33ms
  
  -- Memory (if available)
  memory_used_mb INTEGER,
  memory_peak_mb INTEGER,
  
  -- Game State at Sample
  enemy_count INTEGER,
  bullet_count INTEGER,
  particle_count INTEGER,
  
  -- Device Info
  device_type VARCHAR(16), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(32),
  optimization_profile VARCHAR(16) -- 'ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'ULTRA_LOW'
);

-- Index for analysis
CREATE INDEX idx_perf_player ON performance_metrics(player_id);
CREATE INDEX idx_perf_session ON performance_metrics(session_id);
CREATE INDEX idx_perf_time ON performance_metrics(recorded_at);

-- ============================================
-- ERROR REPORTS TABLE
-- ============================================
CREATE TABLE error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  
  -- Error Info
  reported_at TIMESTAMP DEFAULT NOW(),
  error_type VARCHAR(64) NOT NULL, -- 'runtime', 'crash', 'network', 'asset'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name VARCHAR(64),
  
  -- Context
  game_state VARCHAR(32), -- 'MENU', 'PLAYING', 'PAUSED', etc.
  survival_time_ms INTEGER,
  player_level INTEGER,
  
  -- Device Context
  device_fingerprint VARCHAR(64),
  browser VARCHAR(64),
  os VARCHAR(32),
  screen_resolution VARCHAR(16),
  
  -- Performance Context
  fps_at_error DECIMAL(5, 1),
  memory_at_error INTEGER,
  
  -- Counts
  occurrence_count INTEGER DEFAULT 1,
  
  -- Resolution
  status VARCHAR(16) DEFAULT 'new', -- 'new', 'investigating', 'fixed', 'wontfix'
  resolved_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_errors_type ON error_reports(error_type);
CREATE INDEX idx_errors_time ON error_reports(reported_at);
CREATE INDEX idx_errors_status ON error_reports(status);

-- ============================================
-- DEVICE PROFILES TABLE
-- ============================================
CREATE TABLE device_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint VARCHAR(64) UNIQUE NOT NULL,
  
  -- Device Info
  device_type VARCHAR(16) NOT NULL,
  browser VARCHAR(64),
  browser_version VARCHAR(32),
  os VARCHAR(32),
  os_version VARCHAR(32),
  
  -- Screen
  screen_width INTEGER,
  screen_height INTEGER,
  device_pixel_ratio DECIMAL(3, 2),
  
  -- GPU (if available)
  gpu_vendor VARCHAR(64),
  gpu_renderer VARCHAR(128),
  
  -- Capabilities
  webgl_version INTEGER,
  max_texture_size INTEGER,
  hardware_concurrency INTEGER, -- CPU cores
  device_memory INTEGER, -- GB
  
  -- Benchmark Results
  benchmark_score INTEGER,
  recommended_profile VARCHAR(16),
  
  -- Meta
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  session_count INTEGER DEFAULT 0
);

CREATE INDEX idx_device_fingerprint ON device_profiles(fingerprint);

-- ============================================
-- LEADERBOARD (Enhanced)
-- ============================================
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  
  -- Score Info
  score INTEGER NOT NULL,
  survival_time_ms INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  total_kills INTEGER NOT NULL,
  
  -- Crypto Context
  crypto_pair VARCHAR(16) NOT NULL,
  pnl_percent DECIMAL(10, 4),
  
  -- Season/Period
  period_type VARCHAR(16) NOT NULL, -- 'daily', 'weekly', 'season', 'all-time'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP,
  
  -- Ranking
  rank INTEGER,
  
  -- Timestamps
  achieved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_period ON leaderboard(period_type, period_start);
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX idx_leaderboard_player ON leaderboard(player_id);
```

---

## 🚀 Implementation Phases

### Phase 1: Nickname Entry System (Week 1)
**Priority: HIGH**

| Task | Description | Effort |
|------|-------------|--------|
| 1.1 | Create `NicknameEntryScreen.tsx` component | 4h |
| 1.2 | Implement `UserSessionService.ts` | 3h |
| 1.3 | Create `NicknameValidator.ts` (3-16 chars, alphanumeric + _) | 1h |
| 1.4 | Add Supabase `players` table migration | 1h |
| 1.5 | Create `AuthProvider.tsx` context | 2h |
| 1.6 | Integrate into `App.tsx` game flow | 2h |
| 1.7 | Local storage nickname persistence | 1h |
| 1.8 | Unit tests | 2h |

**Deliverables:**
- [x] Nickname screen before entering game ✅
- [x] Nickname saved to Supabase ✅
- [x] Nickname remembered in LocalStorage ✅
- [x] Validation rules applied ✅

**Status: ✅ COMPLETED (2024-12-22)**

```typescript
// Example: NicknameEntryScreen.tsx
interface NicknameEntryProps {
  onComplete: (nickname: string) => void;
}

export const NicknameEntryScreen: React.FC<NicknameEntryProps> = ({ onComplete }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    // Validate & submit to Supabase
  };
  
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      {/* Cyberpunk-styled nickname input */}
    </div>
  );
};
```

---

### Phase 2: Performance Tracking System (Week 2)
**Priority: HIGH** | **Status: ✅ COMPLETED**

| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | Create `PerformanceTracker.ts` service | 4h |
| 2.2 | Implement FPS sampling (configurable interval) | 2h |
| 2.3 | Add memory usage tracking (if available) | 2h |
| 2.4 | Create `performance_metrics` table | 1h |
| 2.5 | Batch upload to Supabase (every 30s) | 2h |
| 2.6 | Create `usePerformanceMetrics` hook | 2h |
| 2.7 | Add `PerformanceOverlay` for dev mode | 2h |
| 2.8 | Unit tests | 2h |

**Metrics to Collect:**

```typescript
interface PerformanceSnapshot {
  timestamp: number;
  
  // FPS
  currentFps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  fps1Percentile: number; // Worst 1%
  
  // Frame Times
  avgFrameTimeMs: number;
  maxFrameTimeMs: number;
  frameDrops: number; // Count of frames > 33ms
  
  // Memory (optional - not all browsers)
  memoryUsedMB?: number;
  memoryTotalMB?: number;
  
  // Game State
  enemyCount: number;
  bulletCount: number;
  particleCount: number;
  
  // Device
  optimizationProfile: string;
}
```

---

### Phase 3: Error Reporting System (Week 2-3)
**Priority: HIGH** | **Status: ✅ COMPLETED**

| Task | Description | Effort |
|------|-------------|--------|
| 3.1 | Create `ErrorReporter.ts` service | 4h |
| 3.2 | Enhance `ErrorBoundary` to report errors | 2h |
| 3.3 | Implement global error handlers | 2h |
| 3.4 | Create `error_reports` table | 1h |
| 3.5 | Error deduplication logic | 2h |
| 3.6 | Add context collection (game state, FPS) | 2h |
| 3.7 | Create `useErrorReporting` hook | 1h |
| 3.8 | Unit tests | 2h |

**Error Types to Track:**

| Type | Description | Priority |
|------|-------------|----------|
| `runtime` | JavaScript runtime errors | Critical |
| `crash` | React ErrorBoundary catches | Critical |
| `network` | API/WebSocket failures | High |
| `asset` | Image/Audio load failures | Medium |
| `performance` | FPS drops below threshold | Medium |
| `validation` | User input validation | Low |

---

### Phase 4: Device Profiling (Week 3)
**Priority: MEDIUM** | **Status: ✅ COMPLETED**

| Task | Description | Effort |
|------|-------------|--------|
| 4.1 | Create `DeviceProfiler.ts` service | 3h |
| 4.2 | Implement device fingerprinting | 2h |
| 4.3 | Collect GPU info (WebGL) | 2h |
| 4.4 | Create `device_profiles` table | 1h |
| 4.5 | Link profiles to sessions | 1h |
| 4.6 | Unit tests | 2h |

**Device Info Collected:**

```typescript
interface DeviceProfile {
  fingerprint: string;
  
  // Browser
  browser: string;
  browserVersion: string;
  userAgent: string;
  
  // OS
  os: string;
  osVersion: string;
  
  // Screen
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  
  // GPU (from WebGL)
  gpuVendor: string;
  gpuRenderer: string;
  webglVersion: number;
  maxTextureSize: number;
  
  // Hardware
  hardwareConcurrency: number; // CPU cores
  deviceMemory: number; // GB (Chrome only)
  
  // Capabilities
  touchSupport: boolean;
  pointerType: 'mouse' | 'touch' | 'pen';
  
  // Benchmark
  benchmarkScore: number;
  recommendedProfile: OptimizationProfile;
}
```

---

### Phase 5: Enhanced MetricsStorage Integration (Week 3)
**Priority: HIGH** | **Status: ✅ COMPLETED**

| Task | Description | Effort |
|------|-------------|--------|
| 5.1 | Update `MetricsStorage.ts` to include player_id | 2h |
| 5.2 | Add FPS data to session metrics | 2h |
| 5.3 | Add device_fingerprint to sessions | 1h |
| 5.4 | Enhance `syncToSupabase` with retry logic | 2h |
| 5.5 | Add offline queue for failed syncs | 2h |
| 5.6 | Update tests | 2h |

---

### Phase 6: Analytics Dashboard (Week 4)
**Priority: MEDIUM**

| Task | Description | Effort |
|------|-------------|--------|
| 6.1 | Create Supabase views for analytics | 3h |
| 6.2 | SQL queries for key metrics | 4h |
| 6.3 | (Optional) Supabase Studio dashboards | 2h |

**Key Metrics to Track:**

```sql
-- Daily Active Users
SELECT DATE(last_seen_at), COUNT(DISTINCT id) as dau
FROM players
WHERE last_seen_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(last_seen_at);

-- Average FPS by Device Type
SELECT 
  d.device_type,
  d.recommended_profile,
  AVG(p.avg_fps) as avg_fps,
  AVG(p.min_fps) as min_fps,
  COUNT(*) as sample_count
FROM performance_metrics p
JOIN device_profiles d ON p.device_fingerprint = d.fingerprint
GROUP BY d.device_type, d.recommended_profile;

-- Error Frequency
SELECT 
  error_type,
  error_message,
  COUNT(*) as occurrences,
  MAX(reported_at) as last_seen
FROM error_reports
WHERE reported_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, error_message
ORDER BY occurrences DESC
LIMIT 20;

-- Session Survival Distribution
SELECT 
  CASE 
    WHEN survival_time_ms < 60000 THEN '< 1 min'
    WHEN survival_time_ms < 180000 THEN '1-3 min'
    WHEN survival_time_ms < 300000 THEN '3-5 min'
    ELSE '> 5 min'
  END as duration_bucket,
  COUNT(*) as sessions
FROM game_sessions
GROUP BY duration_bucket;
```

---

## 🔮 Future Integration: Web3 & Twitter

### Phase 7: Twitter OAuth (Future)
**Status: PLACEHOLDER**

```typescript
// Future: TwitterLoginButton.tsx
interface TwitterAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: ['tweet.read', 'users.read'];
}

// Flow:
// 1. User clicks "Connect Twitter"
// 2. Redirect to Twitter OAuth
// 3. Callback with auth code
// 4. Exchange for access token
// 5. Link twitter_id to player record
```

**Database Update:**
```sql
UPDATE players 
SET 
  twitter_id = :twitter_id,
  twitter_handle = :twitter_handle
WHERE id = :player_id;
```

---

### Phase 8: Wallet Connection (Future)
**Status: PLACEHOLDER**

```typescript
// Future: WalletConnectButton.tsx
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletConfig {
  supportedWallets: ['phantom', 'solflare', 'backpack'];
  network: 'mainnet-beta' | 'devnet';
}

// Flow:
// 1. User clicks "Connect Wallet"
// 2. Phantom/Solflare popup
// 3. Sign message: "Sign in to Crypto Cyber Survivors: {nonce}"
// 4. Verify signature on backend
// 5. Link wallet_address to player record
```

**Message Signing:**
```typescript
const signMessage = async () => {
  const message = `Sign in to Crypto Cyber Survivors\nTimestamp: ${Date.now()}`;
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await wallet.signMessage(encodedMessage);
  
  // Send to backend for verification
  await api.verifyWalletSignature({
    publicKey: wallet.publicKey,
    signature,
    message,
  });
};
```

---

## 📈 Success Metrics

### Beta Phase KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unique Players | 100+ | Distinct nicknames |
| Avg Session Length | > 3 min | `AVG(survival_time_ms)` |
| Error Rate | < 1% | `error_reports / game_sessions` |
| Avg FPS | > 50 | `AVG(avg_fps)` from perf metrics |
| Data Collection Rate | 95%+ | Sessions with valid metrics |

### Performance Thresholds

| Device Type | Target FPS | Min Acceptable |
|-------------|------------|----------------|
| Desktop | 60+ | 45 |
| Mobile (High) | 50+ | 35 |
| Mobile (Low) | 30+ | 25 |

---

// END OF PROTOCOL
