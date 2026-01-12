-- ============================================
-- MIGRATION 006: REWARD & WALLET SYSTEM
-- Date: 2026-01-12
-- Purpose: Implement wallets, transactions and withdrawal requests
-- ============================================

-- 1. player_wallets Table
CREATE TABLE IF NOT EXISTS player_wallets (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    
    -- Balances
    confirmed_balance NUMERIC DEFAULT 0,      -- Server-approved balance
    pending_balance NUMERIC DEFAULT 0,        -- Pending verification
    
    -- Lifetime stats
    total_earned NUMERIC DEFAULT 0,           -- Total earnings (all-time)
    total_withdrawn NUMERIC DEFAULT 0,        -- Total withdrawals
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_confirmed_balance CHECK (confirmed_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0)
);

-- Auto-update timestamp for wallets
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

-- 2. coin_transactions Table (Audit trail)
CREATE TABLE IF NOT EXISTS coin_transactions (
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
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (
        type IN ('game_reward_pending', 'game_reward_confirmed', 'game_reward_rollback', 
                 'withdrawal', 'bonus', 'adjustment', 'refund')
    )
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_player ON coin_transactions(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type, created_at DESC);

-- 3. withdrawal_requests Table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    
    amount NUMERIC NOT NULL,
    fee NUMERIC DEFAULT 0,
    net_amount NUMERIC NOT NULL,
    
    wallet_address TEXT NOT NULL,
    wallet_chain TEXT NOT NULL,
    
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'processing', 'completed', 'rejected'
    
    -- Admin
    admin_id UUID,
    admin_notes TEXT,
    
    -- Blockchain
    tx_hash TEXT,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')
    )
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_player ON withdrawal_requests(player_id, requested_at DESC);

-- 4. RLS POLICIES
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Wallets
CREATE POLICY "Players can view own wallet" ON player_wallets FOR SELECT 
USING (player_id IN (SELECT id FROM players WHERE display_name = (current_setting('request.jwt.claims', true)::json->>'nickname')));

CREATE POLICY "Only service role can update wallets" ON player_wallets FOR ALL
USING (false) WITH CHECK (false); -- Sadece service role

-- Transactions
CREATE POLICY "Players can view own transactions" ON coin_transactions FOR SELECT 
USING (player_id IN (SELECT id FROM players WHERE display_name = (current_setting('request.jwt.claims', true)::json->>'nickname')));

-- 5. GRANTS
GRANT SELECT ON player_wallets TO anon;
GRANT SELECT ON coin_transactions TO anon;
GRANT SELECT, INSERT ON withdrawal_requests TO anon;
