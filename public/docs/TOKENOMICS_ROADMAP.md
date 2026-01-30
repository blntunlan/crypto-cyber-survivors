# 🪙 Crypto Cyber Survivors - Tokenomics & Web3 Roadmap

> $SURV Token - Solana Blockchain Integration
> Created: 2025-12-20

---

## 📋 Table of Contents

1. [Vision](#-vision)
2. [Token Information](#-token-information)
3. [Tokenomics (Distribution)](#-tokenomics-distribution)
4. [Utility](#-utility)
5. [Technical Architecture](#-technical-architecture)
6. [Implementation Phases](#-implementation-phases)
7. [Security](#-security)
8. [Risks and Mitigation](#-risks-and-mitigation)

---

## 🎯 Vision

**"Play-to-Earn meets Real Market Data"**

Crypto Cyber Survivors is the first survival game to integrate real-time Bitcoin market data into game mechanics. The $SURV token powers this ecosystem by:

- Motivating players with **real crypto rewards**
- Creating prize pools for **season-based tournaments**
- Making player achievements permanent with **Achievement NFTs**
- Providing community management through **Governance**

---

## 💎 Token Information

| Feature | Value |
|---------|-------|
| **Token Name** | Survivor Token |
| **Symbol** | $SURV |
| **Blockchain** | Solana |
| **Token Standard** | SPL Token |
| **Decimals** | 9 |
| **Total Supply** | 1,000,000,000 (1 Billion) |
| **Initial Price** | TBD (Post-launch) |

---

## 📊 Tokenomics (Distribution)

```
┌─────────────────────────────────────────────────────────────┐
│                    TOTAL SUPPLY: 1 BILLION                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  40% Play-to-Earn │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  25% Team & Dev   │
│  ██████░░░░░░░░░░░░0░░░░░░░░░░░░░░░░░░░░░  15% Community    │
│  ████░░░░░░░░░░░░░░░░░░00░░░░░░░░░░░░░░░░  10% Liquidity    │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Marketing    │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% Reserve      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Distribution

| Category | Amount | Percentage | Vesting/Lock |
|----------|--------|-------|---------------|
| **Play-to-Earn Pool** | 400,000,000 | 40% | Gradual release over 5 years |
| **Team & Development** | 250,000,000 | 25% | 6 month cliff + 24 month linear vesting |
| **Community & Airdrop** | 150,000,000 | 15% | 5% at launch, 12 months for the rest |
| **Liquidity (DEX)** | 100,000,000 | 10% | Unlocked at launch (Raydium/Orca) |
| **Marketing & Partnerships** | 50,000,000 | 5% | Release as needed |
| **Strategic Reserve** | 50,000,000 | 5% | Usage with DAO approval |

---

## 🎮 Utility

### 1. Play-to-Earn Rewards 🏆

| Activity | Reward | Frequency |
|----------|------|--------|
| Daily Login | 10 $SURV | Daily |
| First 10 Minutes Survival | 50 $SURV | Per game |
| Season End Top 100 | 1,000 - 50,000 $SURV | Season (2 weeks) |
| Combo x50 Achievement | 25 $SURV | First time |
| Boss Kill (Upcoming) | 100 $SURV | Per game |

```typescript
// Example Reward Calculation
const calculateRewards = (stats: GameStats): number => {
    let rewards = 0;
    
    // Survival bonus
    if (stats.survivalTime >= 600) rewards += 50; // 10+ minutes
    
    // Combo bonus
    if (stats.maxCombo >= 50) rewards += 25;
    
    // Kill bonus (10 tokens for every 100 kills)
    rewards += Math.floor(stats.kills / 100) * 10;
    
    // Season rank bonus
    if (stats.seasonRank <= 10) rewards += 50000;
    else if (stats.seasonRank <= 100) rewards += 5000;
    
    return rewards;
};
```

### 2. In-Game Purchases 🛒

| Item | Price | Description |
|-----|-------|----------|
| Cosmetic Skin | 500 $SURV | Player appearance |
| Premium Card Pack | 1,000 $SURV | Access to rare cards |
| Season Pass | 2,500 $SURV | Extra rewards + special content |
| Name Change | 100 $SURV | Leaderboard name |

### 3. NFT Collection 🖼️

| NFT Type | Mint Cost | Feature |
|----------|---------------|---------|
| **Achievement Badge** | Free (Claim) | Proof of achievement |
| **Season Champion** | Top 3 Only | Special visual + 5% reward bonus |
| **Founder's Edition** | 10,000 $SURV | Early supporter badge |
| **Legendary Survivor** | 100 Units Only | Highest tier + governance weight |

### 4. Governance (DAO) 🗳️

Token holders can vote on:

- New card/enemy proposals
- Season reward pool distribution
- Token burn events
- Partnership approvals

```
1 $SURV = 1 Vote
Minimum Proposal Threshold: 10,000 $SURV
Quorum: 5% of total supply
```

### 5. Staking & Yield 📈

| Pool | APY | Lock Period |
|------|-----|--------------|
| Flexible | 5% | None |
| 30 Days | 12% | 30 days |
| 90 Days | 25% | 90 days |
| LP Staking (SURV/SOL) | 40% | Variable |

---

## 🏗️ Technical Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           USER                                  │
│                    (Phantom/Solflare)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
 ┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
 │   GAME CLIENT   │ │   WEB3    │ │    BACKEND      │
 │  (React/Canvas) │ │  GATEWAY  │ │   (Supabase)    │
 │                 │ │           │ │                 │
 │ • Game Logic    │ │ • Wallet  │ │ • Leaderboard   │
 │ • UI/UX         │ │ • Balance │ │ • Anti-Cheat    │
 │ • Local Score   │ │ • Claim   │ │ • Reward Queue  │
 └────────┬────────┘ └─────┬─────┘ └────────┬────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                      SOLANA BLOCKCHAIN                          │
 │                                                                 │
 │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
 │  │  SPL Token   │  │   Metaplex   │  │   Custom     │          │
 │  │   ($SURV)    │  │  (NFT Mint)  │  │   Program    │          │
 │  │              │  │              │  │  (Staking)   │          │
 │  └──────────────┘  └──────────────┘  └──────────────┘          │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

### File Structure (In-Game)

```
crypto-cyber-survivors/
├── src/
│   ├── services/
│   │   └── web3/
│   │       ├── walletService.ts      # Phantom connection
│   │       ├── tokenService.ts       # $SURV balance, transfer
│   │       ├── nftService.ts         # Achievement NFT claim
│   │       └── stakingService.ts     # Staking contract interaction
│   ├── components/
│   │   └── web3/
│   │       ├── WalletButton.tsx      # Connect/Disconnect
│   │       ├── TokenBalance.tsx      # Balance display
│   │       └── ClaimRewards.tsx      # Reward claim button
│   └── hooks/
│       ├── useWallet.ts              # Wallet state hook
│       └── useTokenBalance.ts        # Real-time balance hook
```

### Separate Token Project

```
crypto-cyber-token/               # Separate Repository
├── programs/
│   ├── staking/                  # Anchor staking program
│   └── rewards/                  # Reward distribution program
├── scripts/
│   ├── create-token.ts           # Token creation (one-time)
│   ├── create-metadata.ts        # Metaplex metadata
│   └── initial-distribution.ts   # Initial distribution
├── tests/
│   └── staking.test.ts
└── README.md
```

---

## 📅 Implementation Phases

### Phase 0: Preparation (1-2 Weeks) ⬜

| Task | Duration | Priority |
|-------|------|---------|
| Finalize token design decisions | 2 days | ⭐⭐⭐⭐⭐ |
| Solana CLI & Anchor installation | 1 day | ⭐⭐⭐⭐⭐ |
| Create test wallet (Devnet) | 1 hour | ⭐⭐⭐⭐⭐ |
| Metaplex account and metadata preparation | 1 day | ⭐⭐⭐⭐ |
| Logo and branding assets | 2 days | ⭐⭐⭐ |

### Phase 1: Token Creation (1 Week) ⬜

| Task | Duration | Dependency |
|-------|------|------------|
| SPL Token creation (Devnet) | 1 hour | Phase 0 |
| Adding Metaplex metadata | 2 hours | Token creation |
| Token Authority multi-sig setup | 1 day | - |
| Test mint & transfer | 1 day | - |
| Mainnet token deploy | 1 hour | All tests OK |

### Phase 2: Game Integration (2 Weeks) ⬜

| Task | Duration | File |
|-------|------|-------|
| Wallet Adapter installation | 2 hours | - |
| walletService.ts | 4 hours | src/services/web3/ |
| tokenService.ts | 4 hours | src/services/web3/ |
| WalletButton component | 4 hours | src/components/web3/ |
| TokenBalance component | 2 hours | src/components/web3/ |
| MainMenu wallet integration | 4 hours | src/components/screens/ |
| Reward display on GameOver screen | 4 hours | src/components/screens/ |

### Phase 3: Backend Reward System (2 Weeks) ⬜

| Task | Duration | Technology |
|-------|------|-----------|
| Supabase reward_claims table | 2 hours | PostgreSQL |
| Game session signature & validation | 1 day | Edge Function |
| Reward calculation service | 1 day | TypeScript |
| Server-side token transfer (keypair) | 1 day | @solana/web3.js |
| Anti-cheat: Replay hash validation | 2 days | - |
| Rate limiting & abuse prevention | 1 day | - |

### Phase 4: NFT Achievement System (1 Week) ⬜

| Task | Duration | Technology |
|-------|------|-----------|
| Metaplex Candy Machine setup | 1 day | Metaplex |
| Achievement metadata JSONs | 1 day | IPFS |
| nftService.ts (mint & claim) | 1 day | @metaplex-foundation |
| Achievement unlock trigger | 4 hours | EventBus |
| UI: View NFT collection | 1 day | React |

### Phase 5: Staking & Governance (2 Weeks) ⬜

| Task | Duration | Technology |
|-------|------|-----------|
| Anchor staking program | 1 week | Rust/Anchor |
| stakingService.ts | 2 days | @coral-xyz/anchor |
| Staking UI | 2 days | React |
| Governance proposal UI | 2 days | React |
| DAO voting mechanism | 3 days | Realms or Custom |

### Phase 6: Mainnet Launch (1 Week) ⬜

| Task | Duration | Criticality |
|-------|------|-----------|
| Security audit (contracts) | Variable | 🔴 Critical |
| Mainnet token deploy | 1 hour | 🔴 Critical |
| Create liquidity pool (Raydium) | 4 hours | 🔴 Critical |
| CoinGecko/CoinMarketCap listing | 1 week | 🟡 Medium |
| Launch announcement | 1 day | 🟡 Medium |

---

## 🔐 Security

### Token Authority

```
┌─────────────────────────────────────────┐
│           MULTI-SIG WALLET              │
│         (3/5 Signatures Required)       │
├─────────────────────────────────────────┤
│  • Founder 1                            │
│  • Founder 2                            │
│  • Technical Lead                       │
│  • Community Representative             │
│  • External Consultant                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         TOKEN MINT AUTHORITY            │
│  • Minting new tokens                   │
│  • Changing authority                   │
│  • Freeze (emergency)                   │
└─────────────────────────────────────────┘
```

### Anti-Cheat Mechanisms

| Mechanism | Description |
|-----------|----------|
| **Replay Hash** | Unique hash for each game session, prevents repeat submissions |
| **Server-Side Validation** | Score logic is recalculated on the backend |
| **Rate Limiting** | Maximum number of daily claims per wallet |
| **Signature Verification** | Game client signature is verified on the backend |
| **Anomaly Detection** | Automatic flag for impossible scores |

---

## ⚠️ Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|----------|------|------------|
| **Bot/Cheat Attack** | High | High | Multi-layer anti-cheat, CAPTCHA, behavior analysis |
| **Token Price Crash** | Medium | High | Gradual vesting, buy-back mechanism, utility-focused design |
| **Smart Contract Bug** | Low | Critical | Professional audit, bug bounty program |
| **Solana Network Congestion** | Medium | Medium | Transaction retry logic, priority fee |
| **Regulatory Uncertainty** | Medium | High | Legal consulting, geo-blocking if necessary |

---

## 📚 Resources

### Technical Documents
- [Solana SPL Token Docs](https://spl.solana.com/token)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter)

### Related Project Documents
- [MASTER_ROADMAP.md](./MASTER_ROADMAP.md)
- [LEADERBOARD_ARCHITECTURE.md](./LEADERBOARD_ARCHITECTURE.md)

---

## ✅ Next Steps

- [ ] Phase 0: Preparation
  - [ ] Finalize token name and symbol ($SURV?)
  - [ ] Finalize tokenomics ratios
  - [ ] Logo design
  - [ ] Create Solana Devnet wallet

- [ ] Phase 1: Token Creation (Devnet)
  - [ ] SPL Token mint
  - [ ] Metaplex metadata
  - [ ] Test transfers

---

> 💡 **Note:** This document is a living document. It will be updated based on community feedback and market conditions.

// END OF PROTOCOL
