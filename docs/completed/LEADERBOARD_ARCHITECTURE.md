# 🏆 Web3 Leaderboard Architecture

## Overview

| Özellik | Detay |
|---------|-------|
| Leaderboard | 3 günlük periyot |
| Wallet | Phantom / Solflare (Solana) |
| Sıralama | En yüksek P&L |
| Ödül | NFT (derece yapanlara) |
| Güvenlik | Anti-bot + IP restriction |

---

## 1. Backend Architecture

```
┌─────────────────────────────────────────┐
│            Frontend (React)             │
└───────────────┬─────────────────────────┘
                │ HTTPS + Signed Messages
                ▼
┌─────────────────────────────────────────┐
│          API Gateway (Cloudflare)       │
│  - Rate limiting                        │
│  - DDoS protection                      │
│  - IP reputation check                  │
└───────────────┬─────────────────────────┘
                ▼
┌─────────────────────────────────────────┐
│        Game Server (Node.js)            │
│  - Score validation                     │
│  - Replay verification                  │
│  - Wallet signature verify              │
└───────────────┬─────────────────────────┘
                ▼
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │
│  - Leaderboard                          │
│  - Player profiles                      │
│  - Game sessions                        │
└─────────────────────────────────────────┘
```

---

## 2. Anti-Cheat Sistemleri

### 2.1 Sunucu Taraflı Validation

| Kontrol | Açıklama |
|---------|-----------|
| Replay Hash | Oyun eylemlerinin hash'i sunucuya gönderilir |
| Time Validation | İmkansız hızda işlemler reddedilir |
| P&L Verification | BTC fiyatı sunucuda doğrulanır |
| Score Bounds | İmkansız skorlar otomatik flaglenir |

### 2.2 IP/Device Restrictions

```typescript
interface SessionSecurity {
  ip: string;              // 1 aktif session/IP
  deviceFingerprint: string;  // Browser fingerprint
  walletAddress: string;      // 1 wallet = 1 oyuncu
  lastSession: Date;          // Cooldown between games
}
```

### 2.3 Bot Detection

- Mouse movement patterns
- Click timing analysis  
- Impossible reaction times
- Behavioral ML model (gelecek)

---

## 3. Wallet Integration (Solana)

### 3.1 Flow

```
1. Connect Phantom → Get publicKey
2. Sign message → "Play game session {timestamp}"
3. Server verifies signature
4. Game starts with session token
5. Game ends → Sign result
6. Server validates & saves score
```

### 3.2 Libraries

```json
{
  "@solana/web3.js": "^1.87.0",
  "@solana/wallet-adapter-react": "^0.15.0",
  "@solana/wallet-adapter-phantom": "^0.9.0"
}
```

---

## 4. Leaderboard System

### 4.1 Seasons

| Period | Duration | Reset |
|--------|----------|-------|
| Daily | 24h | Her gün 00:00 UTC |
| Season | 3 gün | Her 3 günde |
| All-time | ∞ | Resetlenmez |

### 4.2 NFT Rewards

| Rank | Reward |
|------|--------|
| 1st | Gold NFT + Token |
| 2-5 | Silver NFT |
| 6-10 | Bronze NFT |
| Top 100 | Participation NFT |

---

## 5. Database Schema (Özet)

```sql
-- Players
players(wallet_address, nickname, created_at, ban_status)

-- Sessions  
game_sessions(id, player_id, start_time, end_time, 
              entry_price, exit_price, pnl, score,
              ip_address, device_hash, replay_hash)

-- Leaderboard
leaderboard(season_id, player_id, best_pnl, rank)

-- Seasons
seasons(id, start_date, end_date, nft_mint_address)
```

---

## İmplementasyon Sırası

1. ⬜ Wallet connection UI
2. ⬜ Backend API scaffold
3. ⬜ Session management
4. ⬜ Score submission
5. ⬜ Leaderboard display
6. ⬜ Anti-cheat integration
7. ⬜ NFT minting (Metaplex)
