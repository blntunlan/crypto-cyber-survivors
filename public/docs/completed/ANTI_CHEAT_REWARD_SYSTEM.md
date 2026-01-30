# 🏗️ Anti-Cheat & Reward System - System Architecture

> Status: ✅ COMPLETED
> **Objective:** To prevent players from cheating by performing server-side verification of game data and to establish a mock coin (real token in the future) reward system for successful games.

---

## 🎯 General Goal

```
Player Starts Game → Price Data Logged (Railway) → Game Ends → 
Server Verifies (Supabase) → If Passed, Coin Awarded → Can Withdraw
```

---

## 📐 System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Game)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  • Receives prices from Binance WS (for display)                        │
│  • Calculates session start/end time, entry/exit price, PnL             │
│  • Sends ALL data to Supabase Edge Function when game ends              │
│  • Displays mock coin balance                                           │
│  • Wallet connect integration (for withdraw)                            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Price Logger)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  • Connected to Binance WS, captures 1s price data                      │
│  • Writes to Supabase price_logs table every second                     │
│  • Separate logs for BTC, ETH, SOL                                      │
│  • SINGLE SOURCE OF TRUTH for price verification                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE (Backend)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📊 TABLES                                                              │
│  ├── players           → Player profiles                               │
│  ├── player_wallets    → Wallet addresses + balances                   │
│  ├── price_logs        → Price history from Railway                    │
│  ├── game_sessions     → All game records + verification status        │
│  ├── coin_transactions → Earnings/withdrawal transactions              │
│  └── withdrawal_requests → Withdrawal requests (pending/approved/rejected) │
│                                                                         │
│  ⚡ EDGE FUNCTIONS                                                      │
│  ├── verify-game       → End-game verification + reward calculation    │
│  ├── request-withdraw  → Create withdrawal request                     │
│  └── process-withdraw  → Process after admin approval (cron/manual)    │
│                                                                         │
│  🔐 RLS POLICIES                                                        │
│  └── Players can only view/modify their own data                       │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BLOCKCHAIN (Future)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  • Token Contract (ERC-20 or SPL)                                      │
│  • Token transfer upon withdrawal approval                             │
│  • Currently: Mock coin (number in database)                           │
│  • Future: Real token mint/transfer                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### 1. `price_logs` (Railway → Supabase)

**Purpose:** "Single Source of Truth" for server-side price verification

```sql
CREATE TABLE price_logs (
    id BIGSERIAL PRIMARY KEY,
    pair TEXT NOT NULL,           -- 'BTC', 'ETH', 'SOL'
    price NUMERIC NOT NULL,
    high NUMERIC,
    low NUMERIC,
    volume NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL,
    source TEXT DEFAULT 'binance',
    
    -- Index for fast lookups
    UNIQUE(pair, timestamp)
);

CREATE INDEX idx_price_logs_lookup ON price_logs(pair, timestamp DESC);
```

**Data Retention:** 30 days (old records are deleted for cost optimization)

---

### 2. `player_wallets` (Balance + Wallet)

**Purpose:** Store each player's coin balance and wallet address

> **⚠️ Important:** `confirmed_balance` and `pending_balance` should be kept separate for Optimistic UI.
> Client adds to `pending_balance` immediately after game ends, moves to `confirmed_balance` after server verification.

```sql
CREATE TABLE player_wallets (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    
    -- Balances (Optimistic UI Pattern)
    confirmed_balance NUMERIC DEFAULT 0,   -- Server confirmed, finalized balance
    pending_balance NUMERIC DEFAULT 0,     -- Pending verification (optimistic)
    
    -- Lifetime stats
    total_earned NUMERIC DEFAULT 0,         -- Total earnings (lifetime)
    total_withdrawn NUMERIC DEFAULT 0,      -- Total withdrawals (lifetime)
    
    -- Wallet info (future)
    wallet_address TEXT,                    -- Crypto wallet address (optional)
    wallet_chain TEXT,                      -- 'ethereum', 'solana', etc.
    is_wallet_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_confirmed_balance CHECK (confirmed_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0)
);

-- RLS: Players can only view their own wallet
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own wallet"
ON player_wallets FOR SELECT
USING (auth.uid() = player_id);

CREATE POLICY "Players can update own wallet address"
ON player_wallets FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);
```

**Optimistic UI Flow:**
1. Game ends → Client `pending_balance += optimisticReward`
2. Server verifies → `pending_balance -= optimisticReward`, `confirmed_balance += verifiedReward`
3. Server rejects → `pending_balance -= optimisticReward` (rollback)


---

### 3. `game_sessions` (Extended)

**Purpose:** Store game data and verification status

```sql
-- Columns to add to existing table:
ALTER TABLE game_sessions 
    -- Claimed (data from player)
    ADD COLUMN claimed_entry_price NUMERIC,
    ADD COLUMN claimed_exit_price NUMERIC,
    ADD COLUMN claimed_pnl NUMERIC,
    ADD COLUMN claimed_kills INTEGER,
    ADD COLUMN claimed_level INTEGER,
    
    -- Verified (server verified)
    ADD COLUMN verified_entry_price NUMERIC,
    ADD COLUMN verified_exit_price NUMERIC,
    ADD COLUMN verified_pnl NUMERIC,
    
    -- Verification metadata
    ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN verification_method TEXT,     -- 'exact', 'tolerance', 'fallback', 'rejected'
    ADD COLUMN verification_error TEXT,
    ADD COLUMN price_diff_entry NUMERIC,     -- Claimed vs Verified difference (debug)
    ADD COLUMN price_diff_exit NUMERIC,
    ADD COLUMN pnl_diff NUMERIC,
    ADD COLUMN time_diff_ms INTEGER,
    
    -- Reward
    ADD COLUMN reward_amount NUMERIC DEFAULT 0,
    ADD COLUMN reward_status TEXT DEFAULT 'pending';  -- 'pending', 'credited', 'rejected'

-- Index for reward processing
CREATE INDEX idx_game_sessions_reward ON game_sessions(reward_status, session_timestamp);
```

---

### 4. `coin_transactions` (Transaction History)

**Purpose:** Record all coin movements as an audit trail

```sql
CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,           -- 'game_reward', 'withdrawal', 'bonus', 'adjustment', 'refund'
    reference_id UUID,            -- game_session_id or withdrawal_request_id
    balance_before NUMERIC,
    balance_after NUMERIC,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_transactions_player ON coin_transactions(player_id, created_at DESC);

-- RLS: Players can only view their own transaction history
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own transactions"
ON coin_transactions FOR SELECT
USING (auth.uid() = player_id);
```

---

### 5. `withdrawal_requests` (Withdrawal Requests)

**Purpose:** Manage player withdrawal requests (admin approved system)

```sql
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    amount NUMERIC NOT NULL,
    wallet_address TEXT NOT NULL,
    wallet_chain TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'processing', 'completed', 'rejected'
    tx_hash TEXT,                   -- Blockchain transaction hash (future)
    admin_notes TEXT,
    admin_id UUID,                  -- Approving admin (future)
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at DESC);

-- RLS: Players can only view their own requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own requests"
ON withdrawal_requests FOR SELECT
USING (auth.uid() = player_id);

CREATE POLICY "Players can create withdrawal requests"
ON withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = player_id);
```

---

## ⚡ Verification Flow (Anti-Cheat)

### Step 1: Client → Supabase

When the game ends, client sends the following data:

```typescript
{
  userId: string,
  pair: 'BTC' | 'ETH' | 'SOL',
  position: 'LONG' | 'SHORT',
  leverage: number,
  
  // Timing
  startTime: number,  // Unix timestamp (ms)
  endTime: number,
  
  // Claimed prices
  claimedEntryPrice: number,
  claimedExitPrice: number,
  claimedPnL: number,  // Percentage
  
  // Game stats
  kills: number,
  level: number,
  goldCollected: number,
  survivalTimeMs: number
}
```

### Step 2: Edge Function Verification

`verify-game` edge function performs these checks:

```typescript
// 1. Sanity checks
- startTime < endTime
- endTime <= now() + 60000 (future check)
- survivalTimeMs ~= (endTime - startTime)
- Is level/kills physically possible?

// 2. Price verification
const verifiedEntry = await getPrice(pair, startTime);
const verifiedExit = await getPrice(pair, endTime);

const priceDiffEntry = abs(claimedEntryPrice - verifiedEntry) / verifiedEntry;
const priceDiffExit = abs(claimedExitPrice - verifiedExit) / verifiedExit;

// 3. PnL verification
const verifiedPnL = calculatePnL(
  verifiedEntry, 
  verifiedExit, 
  position, 
  leverage
);
const pnlDiff = abs(claimedPnL - verifiedPnL);

// 4. Tolerance checks
if (priceDiffEntry > 0.01) return REJECT;  // 1% tolerance
if (priceDiffExit > 0.01) return REJECT;
if (pnlDiff > 0.05) return REJECT;         // 5% tolerance

// 5. Reward calculation
const reward = calculateReward({
  survivalTimeMs,
  kills,
  level,
  verifiedPnL
});
```

### Step 3: Reward Calculation

```typescript
function calculateReward(data: VerifiedGameData): number {
  const base = data.survivalTimeMs / 1000 * 0.1;  // 0.1 coin per second
  const killBonus = data.kills * 2;                // 2 coins per kill
  const levelBonus = data.level * 10;              // 10 coins per level
  const pnlBonus = clamp(
    data.verifiedPnL * 50,   // 1% PnL = 50 coin
    -100,                     // Max penalty
    500                       // Max bonus
  );
  
  const total = base + killBonus + levelBonus + pnlBonus;
  return Math.max(0, total);  // Can't be negative
}
```

### Step 4: Balance Update

```sql
-- Inside transaction:
BEGIN;

-- 1. Add coins to wallet
UPDATE player_wallets
SET 
  mock_coin_balance = mock_coin_balance + reward,
  total_earned = total_earned + reward,
  updated_at = NOW()
WHERE player_id = userId;

-- 2. Create transaction record
INSERT INTO coin_transactions (
  player_id, amount, type, reference_id,
  balance_before, balance_after
) VALUES (
  userId, reward, 'game_reward', sessionId,
  oldBalance, oldBalance + reward
);

-- 3. Update game session
UPDATE game_sessions
SET 
  reward_amount = reward,
  reward_status = 'credited',
  is_verified = TRUE
WHERE id = sessionId;

COMMIT;
```

---

## 🔒 Anti-Cheat Mechanisms

### Detected Cheat Types

| Cheat Type | How it's Detected | Action |
|-----------|---------------------|---------|
| **Sending fake price** | Client price vs price_logs mismatch | ❌ Reject, 0 reward |
| **Fake PnL calc** | Server PnL calculation different | ❌ Reject, 0 reward |
| **Time manipulation** | `endTime - startTime ≠ survivalTimeMs` | ❌ Reject, 0 reward |
| **Speed hack** | Level/kill ratio physically impossible | ❌ Reject, flag account |
| **Replay session** | Multiple records with same startTime | ❌ Reject, last record invalid |
| **Future data** | `startTime > now()` | ❌ Reject |
| **Excessive PnL** | verifiedPnL > 100% in short time | ⚠️ Manual review |

### Tolerance Values (Tunable)

```typescript
const TOLERANCE = {
  PRICE: 0.01,      // 1% - For network delay/timing
  PNL: 0.05,        // 5% - For floating point differences
  TIME: 60000,      // 60s - For clock drift
  MAX_PNL: 1.0,     // 100% - Excessive PnL detection
  MIN_SURVIVAL: 10, // 10s - Spam prevention
};
```

---

## 💰 Withdrawal System

### Flow

```
1. Player requests withdraw from UI
   ├── Minimum withdrawal: 100 coins
   ├── Wallet address input
   └── Transaction fee: 2%

2. client → request-withdraw edge function
   └── Check balance
   └── Record to withdrawal_requests table

3. Admin panel (future)
   └── View pending requests
   └── Manual approve/reject

4. If Approved:
   ├── Currently: Deduct from player_wallets
   └── Future: Token transfer to blockchain
```

### Edge Function: `request-withdraw`

```typescript
// Supabase Edge Function
export async function requestWithdraw(req: Request) {
  const { userId, amount, walletAddress, chain } = await req.json();
  
  // 1. Balance check
  const wallet = await getWallet(userId);
  if (wallet.mock_coin_balance < amount) {
    return error('Insufficient balance');
  }
  
  // 2. Minimum check
  if (amount < 100) {
    return error('Minimum withdrawal: 100 coins');
  }
  
  // 3. Wallet address validation
  if (!isValidAddress(walletAddress, chain)) {
    return error('Invalid wallet address');
  }
  
  // 4. Create request
  const fee = amount * 0.02;  // 2% fee
  const netAmount = amount - fee;
  
  await supabase.from('withdrawal_requests').insert({
    player_id: userId,
    amount: netAmount,
    wallet_address: walletAddress,
    wallet_chain: chain,
    status: 'pending'
  });
  
  return success({ message: 'Withdrawal request submitted' });
}
```

---

## 📋 Implementation Plan

### Phase 1: Price Logging ⭐ (CRITICAL)

**Goal:** Railway server writes prices to Supabase

- [ ] Create `price_logs` table
- [ ] Update Railway market-server:
  - [ ] Integrate Supabase client
  - [ ] Record to price_logs every second
  - [ ] For BTC, ETH, SOL
- [ ] Test: Run for 24 hours, check data
- [ ] Data retention policy (30 days)

**Estimated Time:** 2-3 days

---

### Phase 2: Verification System ⭐

**Goal:** `verify-game` edge function working

- [ ] Extend `game_sessions` table (ALTER TABLE above)
- [ ] Rewrite `verify-game` edge function:
  - [ ] Fetch price from price_logs
  - [ ] Tolerance checks
  - [ ] Reward calculation
- [ ] Client integration:
  - [ ] Activate `verifyGameSession` call from App.tsx
  - [ ] Timeout/error handling
- [ ] Test: Manual test + edge cases

**Estimated Time:** 3-4 days

---

### Phase 3: Mock Coin System ⭐

**Goal:** Players earn coins and see their balances

- [ ] Create `player_wallets` table
- [ ] Create `coin_transactions` table
- [ ] Automatic coin credit after verification (inside transaction)
- [ ] Create UI:
  - [ ] Wallet balance display (in MainMenu)
  - [ ] Transaction history (new screen)
- [ ] Test: Play game → Win coins → See balance

**Estimated Time:** 2-3 days

---

### Phase 4: Withdrawal UI

**Goal:** Players create withdrawal requests

- [ ] Create `withdrawal_requests` table
- [ ] `request-withdraw` edge function
- [ ] UI screen:
  - [ ] Wallet address input
  - [ ] Amount input (minimum 100)
  - [ ] Fee calculation display
  - [ ] Withdraw button
- [ ] Request history screen
- [ ] Test: Create mock withdrawal request

**Estimated Time:** 2 days

---

### Phase 5: Admin Panel (Optional - Not for MVP)

**Goal:** Admin manages withdrawal requests

- [ ] Admin auth system (Supabase Auth)
- [ ] Admin panel UI:
  - [ ] Pending requests list
  - [ ] Approve/Reject buttons
  - [ ] Player details/history
- [ ] `process-withdraw` edge function

**Estimated Time:** 5-7 days

---

### Phase 6: Blockchain Integration (Future)

**Goal:** Real token withdrawal

- [ ] Token contract deploy (ERC-20 or SPL)
- [ ] Wallet connect integration
- [ ] Token transfer logic
- [ ] Transaction monitoring

**Estimated Time:** 2-3 weeks

---

## 🔐 Security Notes

### RLS (Row Level Security)

RLS must be active on all tables:
- ✅ Players can only see their own data
- ✅ Coin transactions can only be done by edge functions (service role)
- ✅ Withdrawal requests can only be created by the player

### Rate Limiting

- Game verification: Max 1 request/10 seconds (spam prevention)
- Withdrawal request: Max 1 request/day

### Audit Logging

All important actions must be logged:
- Failed verifications
- Suspicious activity (cheat attempts)
- Withdrawal requests
- Admin actions

---

## 📊 Monitoring & Alerts

### Metrics

- Successful verification rate (target: >95%)
- Average reward amount
- Total distributed coins
- Failed verification reasons (most common cheat type)
- Price logs coverage (target: 100%)

### Alerts

- If Price logs missing for more than 5 minutes → Railway issue
- Verification fail rate >20% → Review tolerance settings
- Withdrawal backlog >100 → Admin intervention required

---

## 💡 Future Improvements

- [ ] Anomaly detection with machine learning
- [ ] Dynamic tolerance adjustment (based on network status)
- [ ] Auto-approval for small withdrawals (<1000 coin)
- [ ] Referral system (bring a friend, earn coin)
- [ ] Daily/weekly quests (bonus coin)
- [ ] NFT integration (Achievement NFT for level 100)

---

## 📚 References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Railway Deployment](https://docs.railway.app/)
- [Web3.js](https://web3js.readthedocs.io/) (future blockchain integration)

---

**Last Update:** 2025-12-24  
**Status:** Planning Phase  
**Responsible:** Development Team

// END OF PROTOCOL
