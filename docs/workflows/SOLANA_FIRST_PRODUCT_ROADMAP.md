# Solana First Product Roadmap

> **Status** live
> Owner: Product, Growth, Engineering

## Strategy

Crypto Survivors is packaged as a Solana-first consumer crypto game, not as a token launch. The first product objective is investor-grade traction from wallet identity, season participation, quests, leaderboard usage, and referral loops.

The public promise stays legal-safe:

- Live market data is gameplay input, not trading advice.
- Wallet connection is optional identity/profile linking.
- Season points, meta coins, scores, and quest rewards are virtual game features.
- Token, staking, withdrawal, cash-value reward, and NFT minting are outside the first traction phase.

## Product Slice

| Capability | V1 Decision | Runtime Owner |
|---|---|---|
| Anchor ecosystem | Solana-first | Product |
| Wallet scope | Phantom/Solflare-ready identity events, raw wallet not stored in telemetry | Frontend |
| Season scope | `solana-alpha-2026-q3` active season config | Frontend |
| Quest scope | Existing daily/weekly challenge flow is treated as season quest activity | Frontend + Railway |
| Leaderboard scope | Existing Railway leaderboard powers competitive season signal | Frontend + Railway |
| Product telemetry | `/api/v1/telemetry/product-events` stores traction events | Railway |

## Metrics Contract

The investor dashboard must track these 24-hour counters from `product_telemetry_events`:

| Metric | Source Event | Meaning |
|---|---|---|
| `productEvents24h` | all product events | Overall traction event volume |
| `walletConnects24h` | `wallet_connected` | Wallet identity conversion attempts that succeeded |
| `uniqueWallets24h` | distinct wallet hash | Unique connected-wallet signal without raw wallet storage |
| `seasonParticipants24h` | season, quest, leaderboard events | Players taking part in the season loop |
| `questCompletions24h` | `quest_completed` | Challenge-to-season quest completion |
| `leaderboardSubmissions24h` | `leaderboard_submitted` | Verified competitive submissions when enabled |
| `referralJoins24h` | `referral_joined` | Growth loop entry signal |

## Implementation Rules

- Product telemetry is non-authoritative and must never grant rewards.
- Session rewards remain server-verified through `/api/v1/sessions/verify`.
- Raw wallet addresses must not be sent to product telemetry; only a hash is accepted.
- Product events must tolerate API failure without blocking gameplay.
- Quest completion events only fire after Railway confirms challenge completion.

## 90 Day Execution

| Window | Deliverable | Success Evidence |
|---|---|---|
| Days 1-15 | Solana-first copy, product brief, investor narrative, season config | This document and active telemetry contract are live |
| Days 16-35 | Optional wallet connector UI | `wallet_connected` events start appearing |
| Days 36-55 | Season points surface | Player sees season points derived from verified gameplay |
| Days 56-70 | Quest and referral loops | `quest_completed` and `referral_joined` events appear |
| Days 71-90 | Traction sprint | Admin dashboard exports investor metrics |

## Acceptance

- Admin dashboard exposes product traction metrics.
- Product telemetry endpoint accepts only allowlisted event types.
- Wallet analytics stores `wallet_address_hash`, not raw wallet addresses.
- Existing gameplay, reward verification, and leaderboard flows continue without product telemetry.
- Legal copy remains aligned with [Beta Legal Risk Copy Review](/docs/workflows/BETA_LEGAL_RISK_COPY_REVIEW).
