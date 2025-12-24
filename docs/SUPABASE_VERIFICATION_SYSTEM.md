# 💎 Supabase Verification & Reward System - Detaylı Dokümantasyon

> **Pattern:** Optimistic UI + Server-Side Verification + Rollback on Reject

---

## 🎯 Genel Bakış

### Optimistic Reward Flow

```
Oyun Biter
    ↓
Client: Hemen coin hesapla & göster (Optimistic)
    ↓
Background: Supabase Edge Function'a gönder
    ↓
Server: Doğrula (price_logs vs claimed_data)
    ↓
✅ Geçti → Reward confirm, bakiye kesinleşti
❌ Geçmedi → Rewind, bakiye düzelt, toast göster
```

### Neden Optimistic UI?

| Durum | Kullanıcı Deneyimi |
|-------|-------------------|
| **Sync (bekle → doğrula → göster)** | 😴 3-5sn loading, kötü UX |
| **Optimistic (göster → doğrula)** | ⚡ Anında feedback, premium hissiyat |

---

## 🗄️ Database Schema

### 1. `price_logs` (Railway'den geliyor)

```sql
-- Railway Price Logger tarafından doldurulur
CREATE TABLE price_logs (
    id BIGSERIAL PRIMARY KEY,
    pair TEXT NOT NULL,           -- 'BTC', 'ETH', 'SOL'
    price NUMERIC NOT NULL,
    high NUMERIC,
    low NUMERIC,
    volume NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT DEFAULT 'binance',
    
    UNIQUE(pair, timestamp)
);

-- Fast lookup index
CREATE INDEX idx_price_logs_lookup ON price_logs(pair, timestamp DESC);

-- Partial index (last 30 days only)
CREATE INDEX idx_price_logs_recent 
ON price_logs(pair, timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Auto-cleanup old data (pg_cron)
SELECT cron.schedule(
  'cleanup-old-price-logs',
  '0 2 * * *', -- Her gün 02:00'de
  $$
  DELETE FROM price_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
  $$
);
```

**RLS:** Public read-only (verification için gerekli)

```sql
ALTER TABLE price_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read price logs"
ON price_logs FOR SELECT
USING (true);

CREATE POLICY "Only service role can insert"
ON price_logs FOR INSERT
WITH CHECK (false); -- Sadece service_role_key ile yazılabilir
```

---

### 2. `player_wallets` (Coin bakiyeleri)

```sql
CREATE TABLE player_wallets (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    
    -- Bakiyeler
    confirmed_balance NUMERIC DEFAULT 0,      -- Server onaylı bakiye
    pending_balance NUMERIC DEFAULT 0,        -- Pending verification
    
    -- Lifetime stats
    total_earned NUMERIC DEFAULT 0,           -- Toplam kazanç (all-time)
    total_withdrawn NUMERIC DEFAULT 0,        -- Toplam çekim
    
    -- Wallet info (gelecek)
    wallet_address TEXT,
    wallet_chain TEXT,
    is_wallet_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_confirmed_balance CHECK (confirmed_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0)
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_updated
BEFORE UPDATE ON player_wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_timestamp();
```

**RLS:** Oyuncular sadece kendi cüzdanını görebilir

```sql
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;

-- Read own wallet
CREATE POLICY "Players can view own wallet"
ON player_wallets FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players 
        WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname'
    )
);

-- Insert own wallet (ilk kez)
CREATE POLICY "Players can create own wallet"
ON player_wallets FOR INSERT
WITH CHECK (
    player_id IN (
        SELECT id FROM players 
        WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname'
    )
);

-- Update sadece edge function'dan (service role)
CREATE POLICY "Only service role can update wallets"
ON player_wallets FOR UPDATE
USING (false); -- Client tarafından update edilemez
```

---

### 3. `game_sessions` (Genişletilmiş)

```sql
-- Mevcut game_sessions tablosuna eklenecek kolonlar
ALTER TABLE game_sessions
    -- Claimed (oyuncudan gelen)
    ADD COLUMN claimed_entry_price NUMERIC,
    ADD COLUMN claimed_exit_price NUMERIC,
    ADD COLUMN claimed_pnl NUMERIC,
    ADD COLUMN claimed_kills INTEGER,
    ADD COLUMN claimed_level INTEGER,
    ADD COLUMN claimed_survival_time_ms INTEGER,
    
    -- Verified (server calculated)
    ADD COLUMN verified_entry_price NUMERIC,
    ADD COLUMN verified_exit_price NUMERIC,
    ADD COLUMN verified_pnl NUMERIC,
    
    -- Verification metadata
    ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN verification_method TEXT,     -- 'exact', 'tolerance', 'fallback', 'rejected'
    ADD COLUMN verification_error TEXT,
    
    -- Diff values (debug için)
    ADD COLUMN price_diff_entry NUMERIC,
    ADD COLUMN price_diff_exit NUMERIC,
    ADD COLUMN pnl_diff NUMERIC,
    ADD COLUMN time_diff_ms INTEGER,
    
    -- Reward
    ADD COLUMN reward_amount NUMERIC DEFAULT 0,
    ADD COLUMN reward_status TEXT DEFAULT 'pending',  -- 'pending', 'confirmed', 'rejected', 'rolled_back'
    ADD COLUMN optimistic_reward NUMERIC DEFAULT 0,  -- Client'ın hesapladığı (rollback için)
    
    -- Timestamps
    ADD COLUMN verified_at TIMESTAMPTZ,
    ADD COLUMN reward_credited_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX idx_game_sessions_verification ON game_sessions(player_id, reward_status, session_timestamp DESC);
CREATE INDEX idx_game_sessions_pending ON game_sessions(reward_status) WHERE reward_status = 'pending';
```

**RLS:** Oyuncular kendi session'larını görebilir

```sql
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own sessions"
ON game_sessions FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players 
        WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname'
    )
);

CREATE POLICY "Players can insert own sessions"
ON game_sessions FOR INSERT
WITH CHECK (
    player_id IN (
        SELECT id FROM players 
        WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname'
    )
);
```

---

### 4. `coin_transactions` (Audit trail)

```sql
CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,  -- 'game_reward_pending', 'game_reward_confirmed', 'game_reward_rollback', 'withdrawal', 'bonus'
    
    -- Reference
    reference_type TEXT,  -- 'game_session', 'withdrawal_request', 'manual'
    reference_id UUID,
    
    -- Balance snapshots
    balance_before NUMERIC,
    balance_after NUMERIC,
    
    -- Metadata
    description TEXT,
    metadata JSONB,  -- Extra data
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (
        type IN ('game_reward_pending', 'game_reward_confirmed', 'game_reward_rollback', 
                 'withdrawal', 'bonus', 'adjustment', 'refund')
    )
);

CREATE INDEX idx_coin_transactions_player ON coin_transactions(player_id, created_at DESC);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(type, created_at DESC);
```

**RLS:** Oyuncular sadece kendi işlemlerini görebilir

```sql
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own transactions"
ON coin_transactions FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players 
        WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname'
    )
);

CREATE POLICY "Only service role can insert transactions"
ON coin_transactions FOR INSERT
WITH CHECK (false); -- Sadece edge function
```

---

### 5. `withdrawal_requests` (Gelecek)

```sql
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    amount NUMERIC NOT NULL,
    fee NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    
    wallet_address TEXT NOT NULL,
    wallet_chain TEXT NOT NULL,
    
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'processing', 'completed', 'rejected'
    
    -- Admin
    admin_id UUID,
    admin_notes TEXT,
    
    -- Blockchain
    tx_hash TEXT,
    block_number BIGINT,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')
    )
);

CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at DESC);
CREATE INDEX idx_withdrawal_requests_player ON withdrawal_requests(player_id, requested_at DESC);
```

---

## ⚡ Edge Functions

### 1. `verify-game` (Ana doğrulama logic)

**Konum:** `supabase/functions/verify-game/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tolerance configuration
const TOLERANCE = {
  PRICE: 0.01,      // %1 fiyat farkı
  PNL: 0.05,        // %5 PnL farkı
  TIME: 60000,      // 60 saniye timing farkı
  MAX_PNL: 1.0,     // %100 maksimum PnL (fraud detection)
  MIN_SURVIVAL: 10, // 10 saniye minimum (spam prevention)
};

// Reward calculation constants
const REWARD = {
  BASE_PER_SECOND: 0.1,    // Her saniye 0.1 coin
  KILL_BONUS: 2,           // Her kill 2 coin
  LEVEL_BONUS: 10,         // Her level 10 coin
  PNL_MULTIPLIER: 50,      // %1 PnL = 50 coin
  PNL_BONUS_MIN: -100,     // Maximum penalty
  PNL_BONUS_MAX: 500,      // Maximum bonus
};

interface GameSessionData {
  userId: string;
  pair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  
  startTime: number;
  endTime: number;
  
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  
  kills: number;
  level: number;
  survivalTimeMs: number;
  
  optimisticReward: number;  // Client hesabı (rollback için)
}

interface VerificationResult {
  verified: boolean;
  reward: number;
  verificationMethod: string;
  error?: string;
  
  // Debug info
  verifiedEntryPrice?: number;
  verifiedExitPrice?: number;
  verifiedPnL?: number;
  priceDiffEntry?: number;
  priceDiffExit?: number;
  pnlDiff?: number;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (service role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const data: GameSessionData = await req.json();

    // 1. SANITY CHECKS
    const now = Date.now();
    const sessionDuration = data.endTime - data.startTime;
    const survivalSeconds = data.survivalTimeMs / 1000;

    // Future check
    if (data.startTime > now + TOLERANCE.TIME) {
      return rejectSession(supabase, data, 'rejected', 'Session start time is in the future');
    }

    // End time check
    if (data.endTime > now + TOLERANCE.TIME) {
      return rejectSession(supabase, data, 'rejected', 'Session end time is in the future');
    }

    // Duration consistency
    const timeDiff = Math.abs(sessionDuration - data.survivalTimeMs);
    if (timeDiff > TOLERANCE.TIME) {
      return rejectSession(
        supabase, 
        data, 
        'rejected', 
        `Time inconsistency: ${timeDiff}ms (claimed: ${data.survivalTimeMs}ms, calculated: ${sessionDuration}ms)`
      );
    }

    // Minimum survival time (spam prevention)
    if (survivalSeconds < TOLERANCE.MIN_SURVIVAL) {
      return rejectSession(supabase, data, 'rejected', `Too short: ${survivalSeconds}s (min: ${TOLERANCE.MIN_SURVIVAL}s)`);
    }

    // Impossible stats check (heuristic)
    const killRate = data.kills / survivalSeconds;
    if (killRate > 10) { // 10 kills/second is physically impossible
      return rejectSession(supabase, data, 'rejected', `Impossible kill rate: ${killRate.toFixed(2)}/s`);
    }

    const levelRate = data.level / survivalSeconds;
    if (levelRate > 0.5) { // 1 level every 2 seconds is impossible
      return rejectSession(supabase, data, 'rejected', `Impossible level rate: ${levelRate.toFixed(2)}/s`);
    }

    // 2. PRICE VERIFICATION
    const { verifiedEntryPrice, verifiedExitPrice, method } = await verifyPrices(
      supabase,
      data.pair,
      data.startTime,
      data.endTime
    );

    if (!verifiedEntryPrice || !verifiedExitPrice) {
      // Fallback: No price logs available
      console.warn(`No price logs for ${data.pair} at ${data.startTime}-${data.endTime}, using fallback`);
      return fallbackVerification(supabase, data);
    }

    // Calculate price differences
    const priceDiffEntry = Math.abs(data.claimedEntryPrice - verifiedEntryPrice) / verifiedEntryPrice;
    const priceDiffExit = Math.abs(data.claimedExitPrice - verifiedExitPrice) / verifiedExitPrice;

    // Price tolerance check
    if (priceDiffEntry > TOLERANCE.PRICE) {
      return rejectSession(
        supabase,
        data,
        'rejected',
        `Entry price mismatch: ${(priceDiffEntry * 100).toFixed(2)}% (claimed: ${data.claimedEntryPrice}, verified: ${verifiedEntryPrice})`
      );
    }

    if (priceDiffExit > TOLERANCE.PRICE) {
      return rejectSession(
        supabase,
        data,
        'rejected',
        `Exit price mismatch: ${(priceDiffExit * 100).toFixed(2)}% (claimed: ${data.claimedExitPrice}, verified: ${verifiedExitPrice})`
      );
    }

    // 3. PNL VERIFICATION
    const verifiedPnL = calculatePnL(
      verifiedEntryPrice,
      verifiedExitPrice,
      data.position,
      data.leverage
    );

    const pnlDiff = Math.abs(data.claimedPnL - verifiedPnL);

    if (pnlDiff > TOLERANCE.PNL) {
      return rejectSession(
        supabase,
        data,
        'rejected',
        `PnL mismatch: ${(pnlDiff * 100).toFixed(2)}% (claimed: ${data.claimedPnL.toFixed(2)}%, verified: ${verifiedPnL.toFixed(2)}%)`
      );
    }

    // Fraud detection: Excessive PnL
    if (Math.abs(verifiedPnL) > TOLERANCE.MAX_PNL && survivalSeconds < 600) {
      // >100% PnL in <10 minutes = suspicious
      console.warn(`High PnL detected: ${verifiedPnL.toFixed(2)}% in ${survivalSeconds}s`);
      // Don't reject, but flag for manual review
    }

    // 4. REWARD CALCULATION
    const reward = calculateReward({
      survivalTimeMs: data.survivalTimeMs,
      kills: data.kills,
      level: data.level,
      verifiedPnL
    });

    // 5. UPDATE DATABASE (Transaction)
    await creditReward(supabase, data, {
      reward,
      verifiedEntryPrice,
      verifiedExitPrice,
      verifiedPnL,
      priceDiffEntry,
      priceDiffExit,
      pnlDiff: pnlDiff,
      verificationMethod: method
    });

    // 6. RETURN RESULT
    return new Response(
      JSON.stringify({
        verified: true,
        reward: Math.floor(reward),
        verificationMethod: method,
        verifiedPnL,
        verifiedEntryPrice,
        verifiedExitPrice,
        priceDiffEntry,
        priceDiffExit,
        pnlDiff
      } as VerificationResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Verification error:', error);
    
    return new Response(
      JSON.stringify({ 
        verified: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        reward: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Helper: Get verified prices from price_logs
async function verifyPrices(
  supabase: any,
  pair: string,
  startTime: number,
  endTime: number
): Promise<{ verifiedEntryPrice: number | null, verifiedExitPrice: number | null, method: string }> {
  // Query with tolerance window (±5 seconds)
  const startTimestamp = new Date(startTime - 5000).toISOString();
  const endTimestamp = new Date(endTime + 5000).toISOString();

  const { data: entryLogs, error: entryError } = await supabase
    .from('price_logs')
    .select('price, timestamp')
    .eq('pair', pair)
    .gte('timestamp', new Date(startTime - 5000).toISOString())
    .lte('timestamp', new Date(startTime + 5000).toISOString())
    .order('timestamp', { ascending: true })
    .limit(10);

  const { data: exitLogs, error: exitError } = await supabase
    .from('price_logs')
    .select('price, timestamp')
    .eq('pair', pair)
    .gte('timestamp', new Date(endTime - 5000).toISOString())
    .lte('timestamp', new Date(endTime + 5000).toISOString())
    .order('timestamp', { ascending: true })
    .limit(10);

  if (entryError || exitError || !entryLogs?.length || !exitLogs?.length) {
    return { verifiedEntryPrice: null, verifiedExitPrice: null, method: 'fallback' };
  }

  // Find closest match
  const entryPrice = findClosestPrice(entryLogs, startTime);
  const exitPrice = findClosestPrice(exitLogs, endTime);

  return {
    verifiedEntryPrice: entryPrice,
    verifiedExitPrice: exitPrice,
    method: 'verified'
  };
}

function findClosestPrice(logs: any[], targetTime: number): number {
  let closest = logs[0];
  let minDiff = Math.abs(new Date(logs[0].timestamp).getTime() - targetTime);

  for (const log of logs) {
    const diff = Math.abs(new Date(log.timestamp).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = log;
    }
  }

  return parseFloat(closest.price);
}

// Helper: Calculate PnL
function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  position: 'LONG' | 'SHORT',
  leverage: number
): number {
  const priceChange = (exitPrice - entryPrice) / entryPrice;
  const pnl = position === 'LONG' ? priceChange : -priceChange;
  return pnl * leverage * 100; // Convert to percentage
}

// Helper: Calculate reward
function calculateReward(data: {
  survivalTimeMs: number;
  kills: number;
  level: number;
  verifiedPnL: number;
}): number {
  const base = (data.survivalTimeMs / 1000) * REWARD.BASE_PER_SECOND;
  const killBonus = data.kills * REWARD.KILL_BONUS;
  const levelBonus = data.level * REWARD.LEVEL_BONUS;
  
  const pnlBonus = Math.max(
    REWARD.PNL_BONUS_MIN,
    Math.min(
      REWARD.PNL_BONUS_MAX,
      data.verifiedPnL * REWARD.PNL_MULTIPLIER
    )
  );

  const total = base + killBonus + levelBonus + pnlBonus;
  return Math.max(0, total); // Never negative
}

// Helper: Credit reward (Transaction)
async function creditReward(
  supabase: any,
  data: GameSessionData,
  verification: {
    reward: number;
    verifiedEntryPrice: number;
    verifiedExitPrice: number;
    verifiedPnL: number;
    priceDiffEntry: number;
    priceDiffExit: number;
    pnlDiff: number;
    verificationMethod: string;
  }
): Promise<void> {
  // Get player ID
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('display_name', data.userId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const playerId = player.id;

  // 1. Insert game session
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      player_id: playerId,
      crypto_pair: data.pair,
      position: data.position,
      leverage: data.leverage,
      
      claimed_entry_price: data.claimedEntryPrice,
      claimed_exit_price: data.claimedExitPrice,
      claimed_pnl: data.claimedPnL,
      claimed_kills: data.kills,
      claimed_level: data.level,
      claimed_survival_time_ms: data.survivalTimeMs,
      
      verified_entry_price: verification.verifiedEntryPrice,
      verified_exit_price: verification.verifiedExitPrice,
      verified_pnl: verification.verifiedPnL,
      
      is_verified: true,
      verification_method: verification.verificationMethod,
      price_diff_entry: verification.priceDiffEntry,
      price_diff_exit: verification.priceDiffExit,
      pnl_diff: verification.pnlDiff,
      
      reward_amount: verification.reward,
      reward_status: 'confirmed',
      optimistic_reward: data.optimisticReward,
      
      max_level: data.level,
      total_kills: data.kills,
      survival_time_ms: data.survivalTimeMs,
      
      verified_at: new Date().toISOString(),
      reward_credited_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (sessionError) {
    throw sessionError;
  }

  // 2. Get current wallet balance
  const { data: wallet } = await supabase
    .from('player_wallets')
    .select('confirmed_balance, pending_balance')
    .eq('player_id', playerId)
    .single();

  const oldBalance = wallet ? parseFloat(wallet.confirmed_balance) : 0;
  const pendingBalance = wallet ? parseFloat(wallet.pending_balance) : 0;
  const newBalance = oldBalance + verification.reward - (data.optimisticReward || 0);
newPending = Math.max(0, pendingBalance - (data.optimisticReward || 0));

  // 3. Update wallet
  await supabase
    .from('player_wallets')
    .upsert({
      player_id: playerId,
      confirmed_balance: newBalance,
      pending_balance: newPending,
      total_earned: (wallet?.total_earned || 0) + verification.reward,
      updated_at: new Date().toISOString()
    });

  // 4. Create transaction records
  if (data.optimisticReward > 0) {
    // Rollback optimistic transaction
    await supabase.from('coin_transactions').insert({
      player_id: playerId,
      amount: -data.optimisticReward,
      type: 'game_reward_rollback',
      reference_type: 'game_session',
      reference_id: session.id,
      balance_before: oldBalance + pendingBalance,
      balance_after: oldBalance + newPending,
      description: 'Optimistic reward rollback'
    });
  }

  // Confirmed reward
  await supabase.from('coin_transactions').insert({
    player_id: playerId,
    amount: verification.reward,
    type: 'game_reward_confirmed',
    reference_type: 'game_session',
    reference_id: session.id,
    balance_before: oldBalance + newPending,
    balance_after: newBalance + newPending,
    description: `Game reward: ${data.level} level, ${data.kills} kills, ${verification.verifiedPnL.toFixed(2)}% PnL`
  });
}

// Helper: Reject session
async function rejectSession(
  supabase: any,
  data: GameSessionData,
  status: string,
  errorMessage: string
): Promise<Response> {
  console.warn(`Session rejected: ${errorMessage}`);

  // Get player ID
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('display_name', data.userId)
    .single();

  if (player) {
    const playerId = player.id;

    // 1. Insert rejected session
    const { data: session } = await supabase
      .from('game_sessions')
      .insert({
        player_id: playerId,
        crypto_pair: data.pair,
        position: data.position,
        leverage: data.leverage,
        
        claimed_entry_price: data.claimedEntryPrice,
        claimed_exit_price: data.claimedExitPrice,
        claimed_pnl: data.claimedPnL,
        claimed_kills: data.kills,
        claimed_level: data.level,
        claimed_survival_time_ms: data.survivalTimeMs,
        
        is_verified: false,
        verification_method: status,
        verification_error: errorMessage,
        
        reward_amount: 0,
        reward_status: 'rejected',
        optimistic_reward: data.optimisticReward,
        
        verified_at: new Date().toISOString()
      })
      .select('id')
      .single();

    // 2. Rollback optimistic reward if any
    if (data.optimisticReward > 0 && session) {
      const { data: wallet } = await supabase
        .from('player_wallets')
        .select('confirmed_balance, pending_balance')
        .eq('player_id', playerId)
        .single();

      const oldPending = wallet ? parseFloat(wallet.pending_balance) : 0;
      const newPending = Math.max(0, oldPending - data.optimisticReward);

      await supabase
        .from('player_wallets')
        .update({
          pending_balance: newPending,
          updated_at: new Date().toISOString()
        })
        .eq('player_id', playerId);

      // Transaction record
      await supabase.from('coin_transactions').insert({
        player_id: playerId,
        amount: -data.optimisticReward,
        type: 'game_reward_rollback',
        reference_type: 'game_session',
        reference_id: session.id,
        balance_before: oldPending,
        balance_after: newPending,
        description: `Rejected: ${errorMessage}`
      });
    }
  }

  return new Response(
    JSON.stringify({
      verified: false,
      reward: 0,
      error: errorMessage,
      verificationMethod: status
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Still 200, not an error from API perspective
    }
  );
}

// Helper: Fallback verification (no price logs)
async function fallbackVerification(
  supabase: any,
  data: GameSessionData
): Promise<Response> {
  console.warn('Using fallback verification (no price logs)');

  // Calculate reduced reward (penalty for no verification)
  const rawReward = calculateReward({
    survivalTimeMs: data.survivalTimeMs,
    kills: data.kills,
    level: data.level,
    verifiedPnL: 0 // No PnL bonus in fallback
  });

  const fallbackReward = rawReward * 0.5; // 50% penalty

  await creditReward(supabase, data, {
    reward: fallbackReward,
    verifiedEntryPrice: data.claimedEntryPrice,
    verifiedExitPrice: data.claimedExitPrice,
    verifiedPnL: 0,
    priceDiffEntry: 0,
    priceDiffExit: 0,
    pnlDiff: 0,
    verificationMethod: 'fallback'
  });

  return new Response(
    JSON.stringify({
      verified: true,
      reward: Math.floor(fallbackReward),
      verificationMethod: 'fallback',
      warning: 'Price logs not available, reward reduced by 50%'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  );
}
```

---

## 🎮 Client Integration

### 1. Optimistic Reward Calculation (Client-side)

**Konum:** `services/rewards/RewardCalculator.ts`

```typescript
export interface RewardCalculation {
  base: number;
  killBonus: number;
  levelBonus: number;
  pnlBonus: number;
  total: number;
}

export class RewardCalculator {
  private static readonly REWARD = {
    BASE_PER_SECOND: 0.1,
    KILL_BONUS: 2,
    LEVEL_BONUS: 10,
    PNL_MULTIPLIER: 50,
    PNL_BONUS_MIN: -100,
    PNL_BONUS_MAX: 500,
  };

  static calculate(data: {
    survivalTimeMs: number;
    kills: number;
    level: number;
    pnl: number;
  }): RewardCalculation {
    const base = (data.survivalTimeMs / 1000) * this.REWARD.BASE_PER_SECOND;
    const killBonus = data.kills * this.REWARD.KILL_BONUS;
    const levelBonus = data.level * this.REWARD.LEVEL_BONUS;
    
    const pnlBonusRaw = data.pnl * this.REWARD.PNL_MULTIPLIER;
    const pnlBonus = Math.max(
      this.REWARD.PNL_BONUS_MIN,
      Math.min(this.REWARD.PNL_BONUS_MAX, pnlBonusRaw)
    );

    const total = Math.max(0, base + killBonus + levelBonus + pnlBonus);

    return {
      base,
      killBonus,
      levelBonus,
      pnlBonus,
      total: Math.floor(total)
    };
  }
}
```

---

### 2. Wallet Service (Client-side)

**Konum:** `services/wallet/WalletService.ts`

```typescript
import { supabase } from '../supabase';
import { UserSessionService } from '../auth/UserSessionService';
import { Logger } from '../Logger';

export interface WalletBalance {
  confirmed: number;
  pending: number;
  total: number;
  totalEarned: number;
  totalWithdrawn: number;
}

export class WalletService {
  private static instance: WalletService;
  private currentBalance: WalletBalance | null = null;
  private listeners: ((balance: WalletBalance) => void)[] = [];

  private constructor() {
    this.initializeWallet();
  }

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Initialize wallet and subscribe to changes
   */
  private async initializeWallet(): Promise<void> {
    await this.fetchBalance();

    // Subscribe to realtime changes
    if (supabase) {
      const playerId = UserSessionService.getPlayerId();
      
      supabase
        .channel('wallet-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'player_wallets',
            filter: `player_id=eq.${playerId}`
          },
          (payload) => {
            Logger.info('[Wallet] Balance updated from server');
            this.handleBalanceUpdate(payload.new);
          }
        )
        .subscribe();
    }
  }

  /**
   * Fetch current balance from Supabase
   */
  async fetchBalance(): Promise<WalletBalance | null> {
    if (!supabase) {
      Logger.warn('[Wallet] Supabase not configured');
      return null;
    }

    try {
      const playerId = UserSessionService.getPlayerId();

      const { data, error } = await supabase
        .from('player_wallets')
        .select('confirmed_balance, pending_balance, total_earned, total_withdrawn')
        .eq('player_id', playerId)
        .single();

      if (error) {
        // Wallet doesn't exist yet, create it
        if (error.code === 'PGRST116') {
          await this.createWallet();
          return this.fetchBalance();
        }
        throw error;
      }

      const balance: WalletBalance = {
        confirmed: parseFloat(data.confirmed_balance || 0),
        pending: parseFloat(data.pending_balance || 0),
        total: parseFloat(data.confirmed_balance || 0) + parseFloat(data.pending_balance || 0),
        totalEarned: parseFloat(data.total_earned || 0),
        totalWithdrawn: parseFloat(data.total_withdrawn || 0)
      };

      this.currentBalance = balance;
      this.notifyListeners(balance);

      return balance;

    } catch (error) {
      Logger.error('[Wallet] Failed to fetch balance:', error);
      return null;
    }
  }

  /**
   * Create wallet for new player
   */
  private async createWallet(): Promise<void> {
    if (!supabase) return;

    const playerId = UserSessionService.getPlayerId();

    await supabase.from('player_wallets').insert({
      player_id: playerId,
      confirmed_balance: 0,
      pending_balance: 0
    });

    Logger.info('[Wallet] Created new wallet');
  }

  /**
   * Add optimistic reward (instant feedback)
   */
  addOptimisticReward(amount: number): void {
    if (!this.currentBalance) {
      this.currentBalance = {
        confirmed: 0,
        pending: 0,
        total: 0,
        totalEarned: 0,
        totalWithdrawn: 0
      };
    }

    this.currentBalance.pending += amount;
    this.currentBalance.total += amount;

    Logger.info(`[Wallet] Optimistic reward added: +${amount} coins (pending verification)`);
    this.notifyListeners(this.currentBalance);
  }

  /**
   * Handle balance update from server (realtime)
   */
  private handleBalanceUpdate(newData: any): void {
    const balance: WalletBalance = {
      confirmed: parseFloat(newData.confirmed_balance || 0),
      pending: parseFloat(newData.pending_balance || 0),
      total: parseFloat(newData.confirmed_balance || 0) + parseFloat(newData.pending_balance || 0),
      totalEarned: parseFloat(newData.total_earned || 0),
      totalWithdrawn: parseFloat(newData.total_withdrawn || 0)
    };

    const oldTotal = this.currentBalance?.total || 0;
    const newTotal = balance.total;

    if (newTotal < oldTotal) {
      // Rollback occurred!
      Logger.warn(`[Wallet] Reward rollback detected: ${oldTotal} → ${newTotal}`);
      this.notifyRollback(oldTotal - newTotal);
    }

    this.currentBalance = balance;
    this.notifyListeners(balance);
  }

  /**
   * Subscribe to balance changes
   */
  subscribe(callback: (balance: WalletBalance) => void): () => void {
    this.listeners.push(callback);

    // Immediately notify with current balance
    if (this.currentBalance) {
      callback(this.currentBalance);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(balance: WalletBalance): void {
    this.listeners.forEach(callback => callback(balance));
  }

  /**
   * Notify rollback (emit event for toast)
   */
  private notifyRollback(amount: number): void {
    // Emit EventBus event for UI toast
    import('../EventBus').then(({ EventBus }) => {
      EventBus.emit('rewardRollback', { amount });
    });
  }

  /**
   * Get current balance (sync)
   */
  getBalance(): WalletBalance | null {
    return this.currentBalance;
  }
}
```

---

### 3. Game Over Flow (App.tsx)

```typescript
// App.tsx (handleGameOver güncelleme)

const handleGameOver = useCallback(async () => {
  setFinalPnl(marketData.pnl);
  setFinalSurvivalTime(DifficultyManager.getTotalElapsedSeconds());
  GameStateMachine.transition(GameStatus.GAMEOVER);

  // Stop tracking
  const { PerformanceTracker } = await import('./services/analytics/PerformanceTracker');
  const tracker = PerformanceTracker.getInstance();
  tracker.stop();
  const perfStats = tracker.getStats();

  // End metrics session
  MetricsService.endSession(GameEndReason.DEATH, {
    price: marketData.price,
    pnl: marketData.pnl,
    level: playerRef.current.level,
    hp: playerRef.current.hp,
    difficulty: marketData.difficulty,
    playerStats: {
      damage: playerRef.current.baseDamage,
      fireRate: playerRef.current.fireRate,
      speed: playerRef.current.speed,
      luck: playerRef.current.luck,
      critChance: playerRef.current.critChance,
      critDamage: playerRef.current.critChance * 2,
    },
    position,
    entryPrice,
    leverage,
    totalKills: runStats.totalKills,
    avgFps: perfStats.avgFps,
    minFps: perfStats.minFps,
    deviceFingerprint: DeviceProfiler.getFingerprint(),
  });

  // ✨ OPTIMISTIC REWARD CALCULATION
  const optimisticReward = RewardCalculator.calculate({
    survivalTimeMs: DifficultyManager.getTotalElapsedSeconds() * 1000,
    kills: runStats.totalKills,
    level: playerRef.current.level,
    pnl: marketData.pnl
  });

  Logger.info('[Game] Optimistic reward calculated:', optimisticReward);

  // Add to wallet immediately (optimistic)
  WalletService.getInstance().addOptimisticReward(optimisticReward.total);

  // Show reward animation/toast
  EventBus.emit('rewardEarned', { 
    amount: optimisticReward.total,
    breakdown: optimisticReward
  });

  // 🔥 BACKGROUND VERIFICATION (fire and forget)
  void verifyGameSessionAsync({
    userId: UserSessionService.getNickname() || 'Unknown',
    pair,
    position,
    leverage,
    startTime: sessionStartTime,
    endTime: Date.now(),
    claimedEntryPrice: entryPrice,
    claimedExitPrice: marketData.price,
    claimedPnL: marketData.pnl,
    kills: runStats.totalKills,
    level: playerRef.current.level,
    survivalTimeMs: DifficultyManager.getTotalElapsedSeconds() * 1000,
    optimisticReward: optimisticReward.total
  });

}, [marketData, playerRef, position, entryPrice, leverage, runStats, sessionStartTime, pair]);
```

---

### 4. Async Verification

**Konum:** `services/verification/VerificationService.ts`

```typescript
import { supabase } from '../supabase';
import { Logger } from '../Logger';
import { EventBus } from '../EventBus';

interface VerificationRequest {
  userId: string;
  pair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  startTime: number;
  endTime: number;
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  kills: number;
  level: number;
  survivalTimeMs: number;
  optimisticReward: number;
}

export async function verifyGameSessionAsync(
  request: VerificationRequest
): Promise<void> {
  if (!supabase) {
    Logger.warn('[Verification] Supabase not configured, skipping');
    return;
  }

  try {
    Logger.info('[Verification] Starting background verification...');

    const { data, error } = await supabase.functions.invoke('verify-game', {
      body: request
    });

    if (error) {
      Logger.error('[Verification] Edge function error:', error);
      
      // Emit rollback event
      EventBus.emit('verificationFailed', {
        error: error.message,
        optimisticReward: request.optimisticReward
      });
      
      return;
    }

    if (!data) {
      Logger.warn('[Verification] Empty response');
      return;
    }

    Logger.info('[Verification] Result:', data);

    if (!data.verified) {
      // Verification failed!
      Logger.warn('[Verification] Session rejected:', data.error);
      
      EventBus.emit('verificationRejected', {
        error: data.error,
        optimisticReward: request.optimisticReward
      });
    } else {
      // Verification passed!
      Logger.info(`[Verification] Session approved! Reward: ${data.reward} coins`);
      
      EventBus.emit('verificationSuccess', {
        reward: data.reward,
        optimisticReward: request.optimisticReward,
        method: data.verificationMethod
      });
    }

  } catch (err) {
    Logger.error('[Verification] Exception:', err);
    
    EventBus.emit('verificationError', {
      error: err instanceof Error ? err.message : 'Unknown error',
      optimisticReward: request.optimisticReward
    });
  }
}
```

---

## 🎨 UI Components

### 1. Wallet Display (MainMenu)

```typescript
// components/screens/MainMenu.tsx

import { WalletService } from '../../services/wallet/WalletService';

export const MainMenu: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  useEffect(() => {
    const wallet = WalletService.getInstance();
    
    // Subscribe to balance changes
    const unsubscribe = wallet.subscribe((newBalance) => {
      setBalance(newBalance);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="main-menu">
      {/* Wallet Display */}
      {balance && (
        <motion.div className="wallet-display">
          <div className="balance">
            <span className="confirmed">{balance.confirmed.toFixed(0)}</span>
            {balance.pending > 0 && (
              <span className="pending">
                +{balance.pending.toFixed(0)} pending
              </span>
            )}
            <span className="label">coins</span>
          </div>
          
          <div className="stats">
            <div>Total Earned: {balance.totalEarned.toFixed(0)}</div>
          </div>
        </motion.div>
      )}
      
      {/* ... rest of menu ... */}
    </div>
  );
};
```

---

### 2. Reward Toast

```typescript
// components/ui/RewardToast.tsx

import { useEffect, useState } from 'react';
import { EventBus } from '../../services/EventBus';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertTriangle, CheckCircle } from 'lucide-react';

export const RewardToast: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Reward earned (optimistic)
    const unsub1 = EventBus.on('rewardEarned', (data) => {
      addNotification({
        id: Date.now(),
        type: 'pending',
        amount: data.amount,
        message: 'Reward pending verification...'
      });
    });

    // Verification success
    const unsub2 = EventBus.on('verificationSuccess', (data) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        amount: data.reward,
        message: `Verified! Earned ${data.reward} coins`
      });
    });

    // Verification rejected
    const unsub3 = EventBus.on('verificationRejected', (data) => {
      addNotification({
        id: Date.now(),
        type: 'rejected',
        amount: data.optimisticReward,
        message: `Verification failed: ${data.error}`
      });
    });

    // Rollback
    const unsub4 = EventBus.on('rewardRollback', (data) => {
      addNotification({
        id: Date.now(),
        type: 'rollback',
        amount: data.amount,
        message: 'Reward adjusted by server'
      });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const addNotification = (notification: any) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  return (
    <div className="fixed top-20 right-4 z-[200] space-y-2">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`
              px-4 py-3 rounded-lg backdrop-blur-md
              ${notification.type === 'pending' ? 'bg-blue-500/20 border border-blue-500/50' : ''}
              ${notification.type === 'success' ? 'bg-green-500/20 border border-green-500/50' : ''}
              ${notification.type === 'rejected' ? 'bg-red-500/20 border border-red-500/50' : ''}
              ${notification.type === 'rollback' ? 'bg-yellow-500/20 border border-yellow-500/50' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'pending' && <Coins className="w-5 h-5 text-blue-400 animate-pulse" />}
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
              {notification.type === 'rejected' && <AlertTriangle className="w-5 h-5 text-red-400" />}
              {notification.type === 'rollback' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              
              <div>
                <div className="text-white font-semibold">{notification.message}</div>
                {notification.amount > 0 && (
                  <div className="text-sm text-gray-300">
                    {notification.type === 'rollback' ? '-' : '+'}{notification.amount} coins
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

---

## 📋 Implementation Checklist

### Database Setup

- [ ] `price_logs` tablosunu oluştur (Railway Phase 1)
- [ ] `player_wallets` tablosunu oluştur
- [ ] `game_sessions` tablosunu genişlet (ALTER TABLE)
- [ ] `coin_transactions` tablosunu oluştur
- [ ] RLS policies ekle (tüm tablolar için)
- [ ] Indexes oluştur

### Edge Function

-[] `verify-game` function'ı deploy et
- [ ] Environment variables ekle (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Test et (Postman/curl)
- [ ] Tolerance değerlerini ayarla

### Client Code

- [ ] `RewardCalculator.ts` oluştur
- [ ] `WalletService.ts` oluştur
- [ ] `VerificationService.ts` oluştur
- [ ] `App.tsx` handleGameOver güncelle
- [ ] `MainMenu` wallet display ekle
- [ ] `RewardToast` component ekle
- [ ] EventBus handlers ekle

### Testing

- [ ] Optimistic reward testi (oyun bit → hemen coin göster)
- [ ] Verification success testi (server onayı)
- [ ] Verification reject testi (sahte veri gönder)
- [ ] Rollback testi (optimistic ≠ server)
- [ ] Realtime update testi (başka cihazdan wallet değişimi)

---

**Durum:** Planning/Development  
**Tahmini Süre:** 4-5 gün  
**Bağımlılıklar:** Railway Price Logger (Phase 1)
