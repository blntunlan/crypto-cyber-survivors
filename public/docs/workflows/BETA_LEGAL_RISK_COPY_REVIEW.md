# Beta Legal Risk Copy Review

> **Status** live
> Owner: Product, Legal, Security, Data Engineering

Bu belge beta öncesi market data, crypto language, rewards, wallet, telemetry ve privacy metinleri için engineering copy review contractıdır. Hukuki danışmanlık yerine geçmez; prod/beta açılışı öncesi counsel veya yetkili legal owner tarafından onaylanmalıdır.

## Scope

| Alan | Beta copy kararı |
|---|---|
| Market data | Oyun zorluğunu etkileyen eğlence verisi olarak anlatılır |
| Crypto language | Gerçek trading, yatırım veya getiri vaadi yapılmaz |
| Rewards | Gold/meta coins sanal oyun içi ilerleme olarak anlatılır |
| Wallet | Opsiyonel kimlik/profil bağlantısı olarak anlatılır; para çekme veya finansal hak vaadi yoktur |
| Telemetry | Error, performance, device profile ve cheat report amaçları açık yazılır |
| Beta status | Denge, data availability, reset ve downtime ihtimali açık tutulur |

## Approved Copy

| Context | Approved wording |
|---|---|
| Market disclaimer | Crypto Survivors uses live or delayed market data as gameplay input. It is not a trading platform and does not provide financial advice. |
| Risk disclaimer | Market-driven difficulty can change quickly. In-game volatility is for entertainment and balancing only. |
| Rewards disclaimer | Gold, meta coins, upgrades, scores, and leaderboard entries are virtual game features with no cash value. |
| Wallet disclaimer | Wallet connection is optional and used for identity or profile linking where available. It does not create a brokerage, exchange, custody, or withdrawal relationship. |
| Telemetry disclosure | During beta, the game may collect crash reports, performance metrics, device capability data, session diagnostics, and cheat-detection telemetry to improve stability and fair play. |
| Beta reset notice | Beta progress, balances, leaderboards, replay data, and telemetry records may be reset, migrated, or deleted before public launch. |

## Disallowed Copy

| Do not say | Reason |
|---|---|
| Earn real crypto by playing | Implies financial reward or token payout |
| Trade BTC inside the game | The game does not execute trades |
| Guaranteed rewards | Rewards are virtual and server-verified |
| Risk-free | Market-driven gameplay and beta instability both carry gameplay risk |
| Wallet required | Wallet connection is not required for core gameplay |
| Investment strategy | The game must not imply advice, signals, or portfolio guidance |

## UI Placement Requirements

| Surface | Required note |
|---|---|
| Landing or first-run onboarding | Not financial advice, entertainment-only market data, beta reset notice |
| Pair or position selection | Gameplay-only market mechanics; no trading execution |
| Wallet/profile screen | Wallet optional; no custody, withdrawal, brokerage, or cash-value promise |
| Reward/wallet balance UI | Virtual currency only; server verification is source of truth |
| Settings or privacy area | Telemetry categories and purpose |
| Admin/beta ops notes | Beta data may be reset or deleted |

## Telemetry and Privacy Disclosure

Telemetry collection must be described as stability and fair-play support. The minimum disclosure is:

- error reports: error type, message, stack trace where available, page URL, browser info, context data
- performance metrics: FPS, frame drops, resolution, GPU/device hints, runtime diagnostics metadata
- device profiles: fingerprint, device type, browser, screen size, hardware concurrency, memory, benchmark score
- cheat reports: profile/session references where available, cheat type, details, severity
- auth/profile data: anonymous account id, linked identity metadata, nickname, optional wallet address

Telemetry must not be described as reward authority. Reward settlement remains server-side session verification and ledger writes.

## Beta Terms Checklist

- Beta data can be reset.
- Service can be unavailable or degraded.
- Market stream can disconnect or fall back to synthetic data.
- Replays are optional and can fail to save.
- Virtual balances and scores are not cash or crypto assets.
- Abuse, automation, tampering, and exploit attempts can lead to reset or restriction.
- Users should not use game output for financial decisions.

## Implementation Notes

`README.md` and player-facing UI copy still use strong crypto/game marketing language. That is acceptable for brand tone only if the approved disclaimers above are present in first-run, wallet/reward, and privacy-adjacent surfaces before beta launch.

The active backend telemetry contract is documented in [Beta Backend API Contract](/docs/workflows/BETA_BACKEND_API_CONTRACT). Reward settlement is documented in [Rewards and Verification](/docs/workflows/rewards-and-verification). Replay failure behavior is documented in [Replay and Validation](/docs/architecture/REPLAY_AND_VALIDATION).

## Beta Acceptance

- No player-facing text says or implies real-money earning, investment advice, guaranteed rewards, or actual trading.
- First-run or landing copy includes entertainment-only and beta reset language.
- Wallet copy states optional identity/profile use and no custody/withdrawal relationship.
- Telemetry copy lists collection categories and stability/fair-play purpose.
- Reward copy states virtual-only balances and server verification.
- Legal owner reviews this document before public beta launch.
