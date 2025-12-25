# 🏗️ Anti-Cheat & Reward System - Sistem Mimarisi

> **Amaç:** Oyuncuların oyun verilerini server-side doğrulama yaparak hile yapmasını engellemek ve başarılı oyunlar için mock coin (gelecekte gerçek token) ödül sistemi kurmak.

---

## 🎯 Genel Hedef

```
Oyuncu Oyun Başlatır → Fiyat Verileri Loglanır (Railway) → Oyun Biter → 
Server Doğrular (Supabase) → Geçerse Coin Verilir → Cüzdana Çekilebilir
```

---

## 📐 Sistem Mimarisi

### Bileşenler

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Oyun)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  • Binance WS'den fiyat alır (görüntüleme için)                        │
│  • Session başlangıç/bitiş zamanı, entry/exit fiyat, PnL hesaplar      │
│  • Oyun bitince TÜM verileri Supabase Edge Function'a gönderir         │
│  • Mock coin bakiyesini gösterir                                       │
│  • Wallet connect entegrasyonu (withdraw için)                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Price Logger)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  • Binance WS'e bağlı, 1sn'lik fiyat verisi alır                       │
│  • Her saniye Supabase'e price_logs tablosuna yazar                    │
│  • BTC, ETH, SOL için ayrı ayrı loglar                                 │
│  • SINGLE SOURCE OF TRUTH for price verification                       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE (Backend)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📊 TABLES                                                              │
│  ├── players           → Oyuncu profilleri                             │
│  ├── player_wallets    → Cüzdan adresleri + bakiyeler                  │
│  ├── price_logs        → Railway'den gelen fiyat geçmişi               │
│  ├── game_sessions     → Tüm oyun kayıtları + verification status      │
│  ├── coin_transactions → Kazanç/çekim işlemleri                        │
│  └── withdrawal_requests → Çekim talepleri (pending/approved/rejected) │
│                                                                         │
│  ⚡ EDGE FUNCTIONS                                                      │
│  ├── verify-game       → Oyun bitişinde doğrulama + reward hesaplama  │
│  ├── request-withdraw  → Çekim talebi oluşturma                        │
│  └── process-withdraw  → Admin onayı sonrası işlem (cron/manual)       │
│                                                                         │
│  🔐 RLS POLICIES                                                        │
│  └── Oyuncular sadece kendi verilerini görebilir/değiştirebilir        │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BLOCKCHAIN (Gelecek)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  • Token Contract (ERC-20 veya SPL)                                    │
│  • Withdrawal işlemi onaylanınca token transfer                        │
│  • Şimdilik: Mock coin (database'de sayı)                              │
│  • Gelecekte: Gerçek token mint/transfer                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Veritabanı Şeması

### 1. `price_logs` (Railway → Supabase)

**Amaç:** Server-side fiyat doğrulaması için "Single Source of Truth"

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

**Data Retention:** 30 gün (eski kayıtlar silinir, maliyet optimizasyonu için)

---

### 2. `player_wallets` (Bakiye + Cüzdan)

**Amaç:** Her oyuncunun coin bakiyesini ve cüzdan adresini saklamak

> **⚠️ Önemli:** Optimistic UI için `confirmed_balance` ve `pending_balance` ayrı tutulmalı.
> Client oyun bitince hemen `pending_balance`'a ekler, server doğruladıktan sonra `confirmed_balance`'a geçer.

```sql
CREATE TABLE player_wallets (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    
    -- Bakiyeler (Optimistic UI Pattern)
    confirmed_balance NUMERIC DEFAULT 0,   -- Server onaylı, kesinleşmiş bakiye
    pending_balance NUMERIC DEFAULT 0,     -- Pending verification (optimistic)
    
    -- Lifetime stats
    total_earned NUMERIC DEFAULT 0,         -- Toplam kazanç (lifetime)
    total_withdrawn NUMERIC DEFAULT 0,      -- Toplam çekim (lifetime)
    
    -- Wallet info (gelecek)
    wallet_address TEXT,                    -- Kripto cüzdan adresi (opsiyonel)
    wallet_chain TEXT,                      -- 'ethereum', 'solana', etc.
    is_wallet_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_confirmed_balance CHECK (confirmed_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0)
);

-- RLS: Oyuncular sadece kendi cüzdanını görebilir
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
1. Oyun biter → Client `pending_balance += optimisticReward` yapar
2. Server doğrular → `pending_balance -= optimisticReward`, `confirmed_balance += verifiedReward`
3. Server reddederse → `pending_balance -= optimisticReward` (rollback)


---

### 3. `game_sessions` (Genişletilmiş)

**Amaç:** Oyun verilerini ve verification durumunu saklamak

```sql
-- Mevcut tabloya eklenecek kolonlar:
ALTER TABLE game_sessions 
    -- Claimed (oyuncudan gelen veriler)
    ADD COLUMN claimed_entry_price NUMERIC,
    ADD COLUMN claimed_exit_price NUMERIC,
    ADD COLUMN claimed_pnl NUMERIC,
    ADD COLUMN claimed_kills INTEGER,
    ADD COLUMN claimed_level INTEGER,
    
    -- Verified (server tarafından doğrulanan)
    ADD COLUMN verified_entry_price NUMERIC,
    ADD COLUMN verified_exit_price NUMERIC,
    ADD COLUMN verified_pnl NUMERIC,
    
    -- Verification metadata
    ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN verification_method TEXT,     -- 'exact', 'tolerance', 'fallback', 'rejected'
    ADD COLUMN verification_error TEXT,
    ADD COLUMN price_diff_entry NUMERIC,     -- Claimed vs Verified farkı (debug)
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

### 4. `coin_transactions` (İşlem Geçmişi)

**Amaç:** Tüm coin hareketlerini audit trail olarak kaydetmek

```sql
CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,           -- 'game_reward', 'withdrawal', 'bonus', 'adjustment', 'refund'
    reference_id UUID,            -- game_session_id veya withdrawal_request_id
    balance_before NUMERIC,
    balance_after NUMERIC,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_transactions_player ON coin_transactions(player_id, created_at DESC);

-- RLS: Oyuncular sadece kendi işlem geçmişini görebilir
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own transactions"
ON coin_transactions FOR SELECT
USING (auth.uid() = player_id);
```

---

### 5. `withdrawal_requests` (Çekim Talepleri)

**Amaç:** Oyuncuların çekim taleplerini yönetmek (admin onaylı sistem)

```sql
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    amount NUMERIC NOT NULL,
    wallet_address TEXT NOT NULL,
    wallet_chain TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'processing', 'completed', 'rejected'
    tx_hash TEXT,                   -- Blockchain transaction hash (gelecek)
    admin_notes TEXT,
    admin_id UUID,                  -- Onaylayan admin (gelecek)
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at DESC);

-- RLS: Oyuncular sadece kendi taleplerini görebilir
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

### Adım 1: Client → Supabase

Oyun bittiğinde client şu veriyi gönderir:

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

### Adım 2: Edge Function Doğrulama

`verify-game` edge function şu kontrolleri yapar:

```typescript
// 1. Sanity checks
- startTime < endTime
- endTime <= now() + 60000 (future check)
- survivalTimeMs ~= (endTime - startTime)
- level/kills fiziksel olarak mümkün mü?

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
if (priceDiffEntry > 0.01) return REJECT;  // %1 tolerans
if (priceDiffExit > 0.01) return REJECT;
if (pnlDiff > 0.05) return REJECT;         // %5 tolerans

// 5. Reward calculation
const reward = calculateReward({
  survivalTimeMs,
  kills,
  level,
  verifiedPnL
});
```

### Adım 3: Reward Hesaplama

```typescript
function calculateReward(data: VerifiedGameData): number {
  const base = data.survivalTimeMs / 1000 * 0.1;  // Her saniye 0.1 coin
  const killBonus = data.kills * 2;                // Her kill 2 coin
  const levelBonus = data.level * 10;              // Her level 10 coin
  const pnlBonus = clamp(
    data.verifiedPnL * 50,   // %1 PnL = 50 coin
    -100,                     // Maksimum ceza
    500                       // Maksimum bonus
  );
  
  const total = base + killBonus + levelBonus + pnlBonus;
  return Math.max(0, total);  // Negatif olamaz
}
```

### Adım 4: Bakiye Güncelleme

```sql
-- Transaction içinde:
BEGIN;

-- 1. Wallet'a coin ekle
UPDATE player_wallets
SET 
  mock_coin_balance = mock_coin_balance + reward,
  total_earned = total_earned + reward,
  updated_at = NOW()
WHERE player_id = userId;

-- 2. Transaction kaydı oluştur
INSERT INTO coin_transactions (
  player_id, amount, type, reference_id,
  balance_before, balance_after
) VALUES (
  userId, reward, 'game_reward', sessionId,
  oldBalance, oldBalance + reward
);

-- 3. Game session'ı güncelle
UPDATE game_sessions
SET 
  reward_amount = reward,
  reward_status = 'credited',
  is_verified = TRUE
WHERE id = sessionId;

COMMIT;
```

---

## 🔒 Anti-Cheat Mekanizmaları

### Tespit Edilen Hile Türleri

| Hile Türü | Nasıl Tespit Edilir | Aksiyon |
|-----------|---------------------|---------|
| **Sahte fiyat gönderme** | Client fiyatı vs price_logs eşleşmez | ❌ Reject, 0 reward |
| **Sahte PnL hesabı** | Server PnL hesaplaması farklı | ❌ Reject, 0 reward |
| **Süre manipülasyonu** | `endTime - startTime ≠ survivalTimeMs` | ❌ Reject, 0 reward |
| **Hız hilesi** | Level/kill oranı fiziksel olarak imkansız | ❌ Reject, flag account |
| **Tekrarlayan session** | Aynı startTime ile birden fazla kayıt | ❌ Reject, son kayıt geçersiz |
| **Gelecekten veri** | `startTime > now()` | ❌ Reject |
| **Aşırı yüksek PnL** | verifiedPnL > %100 kısa sürede | ⚠️ Manuel review |

### Tolerans Değerleri (Tunable)

```typescript
const TOLERANCE = {
  PRICE: 0.01,      // %1 - Network delay/timing için
  PNL: 0.05,        // %5 - Floating point farkları için
  TIME: 60000,      // 60sn - Clock drift için
  MAX_PNL: 1.0,     // %100 - Aşırı PnL tespiti
  MIN_SURVIVAL: 10, // 10sn - Spam önleme
};
```

---

## 💰 Withdrawal (Çekim) Sistemi

### Flow

```
1. Oyuncu UI'dan withdraw talebinde bulunur
   ├── Minimum çekim: 100 coin
   ├── Cüzdan adresi girişi
   └── İşlem ücreti: %2

2. client → request-withdraw edge function
   └── Bakiye kontrolü
   └── withdrawal_requests tablosuna kayıt

3. Admin panel (gelecek)
   └── Pending talepleri görüntüler
   └── Manuel onay/red

4. Onaylanırsa:
   ├── Şimdilik: player_wallets'tan düş
   └── Gelecekte: Blockchain'e token transfer
```

### Edge Function: `request-withdraw`

```typescript
// Supabase Edge Function
export async function requestWithdraw(req: Request) {
  const { userId, amount, walletAddress, chain } = await req.json();
  
  // 1. Bakiye kontrolü
  const wallet = await getWallet(userId);
  if (wallet.mock_coin_balance < amount) {
    return error('Insufficient balance');
  }
  
  // 2. Minimum kontrol
  if (amount < 100) {
    return error('Minimum withdrawal: 100 coins');
  }
  
  // 3. Cüzdan adresi validasyonu
  if (!isValidAddress(walletAddress, chain)) {
    return error('Invalid wallet address');
  }
  
  // 4. Talep oluştur
  const fee = amount * 0.02;  // %2 işlem ücreti
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

**Hedef:** Railway server'ı Supabase'e fiyat yazsın

- [ ] `price_logs` tablosunu oluştur
- [ ] Railway market-server'ı güncelle:
  - [ ] Supabase client entegre et
  - [ ] Her saniye price_logs'a kayıt yap
  - [ ] BTC, ETH, SOL için
- [ ] Test: 24 saat çalıştır, veri kontrolü yap
- [ ] Data retention policy (30 gün)

**Tahmini Süre:** 2-3 gün

---

### Phase 2: Verification System ⭐

**Hedef:** `verify-game` edge function çalışsın

- [ ] `game_sessions` tablosunu genişlet (yukarıdaki ALTER TABLE)
- [ ] `verify-game` edge function'ı yeniden yaz:
  - [ ] price_logs'dan fiyat çek
  - [ ] Tolerans kontrolleri
  - [ ] Reward hesaplama
- [ ] Client entegrasyonu:
  - [ ] App.tsx'den `verifyGameSession` çağrısını aktive et
  - [ ] Timeout/error handling
- [ ] Test: Manuel test + edge case'ler

**Tahmini Süre:** 3-4 gün

---

### Phase 3: Mock Coin System ⭐

**Hedef:** Oyuncular coin kazansın ve bakiyelerini görsün

- [ ] `player_wallets` tablosunu oluştur
- [ ] `coin_transactions` tablosunu oluştur
- [ ] Verification sonrası otomatik coin kredisi (transaction içinde)
- [ ] UI oluştur:
  - [ ] Wallet balance gösterimi (MainMenu'de)
  - [ ] Transaction history (yeni ekran)
- [ ] Test: Oyun oyna → Coin kazan → Bakiyeyi gör

**Tahmini Süre:** 2-3 gün

---

### Phase 4: Withdrawal UI

**Hedef:** Oyuncular çekim talebi oluştursun

- [ ] `withdrawal_requests` tablosunu oluştur
- [ ] `request-withdraw` edge function
- [ ] UI ekranı:
  - [ ] Wallet address input
  - [ ] Amount input (minimum 100)
  - [ ] Fee hesaplama gösterimi
  - [ ] Withdraw butonu
- [ ] Talep geçmişi ekranı
- [ ] Test: Mock çekim talebi oluştur

**Tahmini Süre:** 2 gün

---

### Phase 5: Admin Panel (Opsiyonel - MVP için değil)

**Hedef:** Admin çekim taleplerini yönetsin

- [ ] Admin auth sistemi (Supabase Auth)
- [ ] Admin panel UI:
  - [ ] Pending requests listesi
  - [ ] Approve/Reject butonları
  - [ ] Player details/history
- [ ] `process-withdraw` edge function

**Tahmini Süre:** 5-7 gün

---

### Phase 6: Blockchain Integration (Gelecek)

**Hedef:** Gerçek token çekimi

- [ ] Token contract deploy (ERC-20 veya SPL)
- [ ] Wallet connect entegrasyonu
- [ ] Token transfer logic
- [ ] Transaction monitoring

**Tahmini Süre:** 2-3 hafta

---

## 🔐 Güvenlik Notları

### RLS (Row Level Security)

Tüm tablolarda RLS aktif olmalı:
- ✅ Oyuncular sadece kendi verilerini görebilir
- ✅ Coin işlemleri sadece edge function'lardan yapılabilir (service role)
- ✅ Withdrawal talepleri sadece oyuncu tarafından oluşturulabilir

### Rate Limiting

- Game verification: Max 1 request/10 saniye (spam önleme)
- Withdrawal request: Max 1 request/gün

### Audit Logging

Tüm önemli aksiyonlar loglanmalı:
- Failed verifications
- Suspicious activity (hile denemeleri)
- Withdrawal requests
- Admin actions

---

## 📊 Monitoring & Alerts

### Metrikler

- Başarılı verification oranı (hedef: >95%)
- Ortalama reward miktarı
- Toplam dağıtılan coin
- Failed verification sebepleri (en sık hile türü)
- Price logs coverage (hedef: %100)

### Alertler

- Price logs 5 dakikadan fazla eksikse → Railway sorun
- Verification fail rate >20% → Tolerans ayarlarını gözden geçir
- Withdrawal backlog >100 → Admin müdahale gerekli

---

## 💡 Gelecek İyileştirmeler

- [ ] Machine learning ile anomali tespiti
- [ ] Dynamic tolerance adjustment (network durumuna göre)
- [ ] Auto-approval for small withdrawals (<1000 coin)
- [ ] Referral system (arkadaşını getir, coin kazan)
- [ ] Daily/weekly quests (bonus coin)
- [ ] NFT integration (level 100'e Achievement NFT)

---

## 📚 Referanslar

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Railway Deployment](https://docs.railway.app/)
- [Web3.js](https://web3js.readthedocs.io/) (gelecek blockchain entegrasyon)

---

**Son Güncelleme:** 2025-12-24  
**Durum:** Planning Phase  
**Sorumlu:** Development Team
