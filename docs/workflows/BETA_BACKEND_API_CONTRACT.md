# Beta Backend API Contract

> **Status** live
> Owner: Backend, QA, Security

Bu belge Railway API server için beta sırasında aktif kabul edilen endpoint, auth, payload, response, hata, rate limit ve DB ownership sözleşmesini sabitler. Kaynak otorite `railway-market-server/src/index.ts`, `railway-market-server/src/routes/` ve `railway-market-server/src/db/validation.ts` dosyalarıdır.

## Global Sözleşme

| Alan | Sözleşme |
|---|---|
| Base path | `/api/v1/*`; health/debug dışı monitoring pathleri kökte kalır |
| Body limit | JSON body `1mb` |
| CORS | `crypto-survivors.com`, Railway/Vercel prod hostları ve local dev hostları |
| Auth | Protected endpointler `Authorization: Bearer <Railway access token>` ister |
| Admin auth | `Authorization: Bearer <ADMIN_API_SECRET>` |
| Error shape | Hata response gövdesi `{ "error": string }` formatını kullanır |
| Rate headers | `express-rate-limit` standard headers açık, legacy headers kapalı |

## Auth ve Rate Limit

| Scope | Prefix | Limit | Auth |
|---|---|---|---|
| Global | tüm server | 100 req/min/IP | Yok |
| Auth | `/api/auth/twitter`, `/api/v1/auth`, `/api/v1/profile` | 20 req/min/IP | Route bazlı |
| Write | `/api/v1/sessions`, `/api/v1/wallet`, `/api/v1/economy`, `/api/v1/identities`, `/api/v1/meta`, `/api/v1/challenges`, `/api/v1/replays`, `/api/v1/market` | 50 req/min/IP | Route bazlı |
| Telemetry | `/api/v1/telemetry` | 10 req/min/IP | Yok |
| Leaderboard | `/api/v1/leaderboard` | 30 req/min/IP | Yok |
| Admin | `/api/v1/admin` | Global limiter dışında route limiter yok | Admin secret |

## Monitoring

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | Yok | `{ status, service, uptime, timestamp, dbConnected, authMode }` |
| GET | `/stats` | Yok | Runtime memory ve PostgreSQL pool metrikleri |
| GET | `/debug` | Admin secret | DB table counts, pool stats, recent errors, recent cheats |
| GET | `/` | Yok | API service landing/identity response |

## Auth ve Profile

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/anonymous` | Yok | `display_name?`, `device_fingerprint?` | `201` access token, account, profile, wallet | `400`, `409`, `500` |
| GET | `/api/v1/profile` | Bearer | Yok | Profile row | `401`, `404`, `500` |
| POST | `/api/v1/profile` | Bearer | `nickname`, `avatar_url?` | `201` profile row veya mevcut profile | `400`, `401`, `409`, `500` |
| PATCH | `/api/v1/profile` | Bearer | `nickname?`, `avatar_url?` | Updated profile row | `400`, `401`, `404`, `409`, `500` |

Nickname `3..16` karakterdir ve yalnızca harf, rakam, `_`, `-` kabul eder. Railway JWT yoksa protected route `500 Auth not configured` döner; geçersiz veya eksik token `401` döner.

## Session ve Reward

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/sessions/start` | Bearer | `pair`, `leverage 1..500`, `position LONG/SHORT` | `{ sessionId, startTime, sessionSecret }` | `400`, `401`, `404`, `500` |
| POST | `/api/v1/sessions/sync` | Bearer | `sessionId`, `sessionData` whitelist | `{ id }` | `400`, `401`, `403`, `404`, `409`, `500` |
| POST | `/api/v1/sessions/verify` | Bearer | `sessionId`, `signature`, signed `payload` | Verification result, reward, wallet, claim metadata | `400`, `401`, `403`, `404`, `409`, `500` |
| GET | `/api/v1/sessions/:id/recover` | Bearer | Yok | `410` disabled | `410` |

`sessions/start` dönen `sessionSecret` yalnızca HMAC imzası için ilk response içinde verilir. `sessions/recover` kapalıdır ve session secret recovery beta sözleşmesinde yasaktır.

## Session Payload Guardrails

| Alan | Kural |
|---|---|
| `payload.sessionId` | Body `sessionId` ile aynı UUID olmalı |
| `pair`, `position`, `leverage` | Server session state ile aynı olmalı |
| `signature` | `sessionSecret` ile HMAC-SHA256 signable payload imzası olmalı |
| `exitType` | `portal`, `death`, `afk_death`, `cycle_complete` |
| `portalType` | Yalnızca `exitType=portal` için zorunlu; `TAKE_PROFIT`, `STOP_LOSS`, `FLOW_EXIT`, `FORCED` |
| `kills`, `level`, `survivalSeconds`, `maxStreak` | Server trusted metric normalization ile sınanır |
| Reward authority | Kalıcı coin credit yalnızca `sessions/verify` atomic transaction içinde yapılır |
| Idempotency | Verified session ikinci kez verify edilirse `409 Already verified` döner |

`sessions/sync` yalnızca `entry_price`, `exit_price`, `survival_seconds`, `kills`, `level`, `exit_type`, `portal_type` alanlarını günceller. Ownership, trade terms, reward, verification state ve secret server-owned kalır.

## Economy ve Wallet

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/economy/wallet` | Bearer | Yok | `{ wallet, ledger[] }` | `401`, `404`, `500` |
| POST | `/api/v1/economy/claim-run-reward` | Bearer | `session_id`, `idempotency_key` | Idempotent claim response | `400`, `401`, `404`, `409`, `500` |
| GET | `/api/v1/wallet/balance` | Bearer | Yok | `{ balance }` legacy virtual account balance | `401`, `404`, `500` |

Beta wallet authority `/api/v1/economy/wallet` ve `wallets`, `ledger_entries`, `reward_claims` tablolarıdır. `/api/v1/wallet/balance` legacy compatibility endpointtir; yeni client persistent balance için economy wallet kullanır.

## Market Runtime Audit

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/market/runtime-batch` | Bearer | `runId?`, `count`, `items[]` | `{ accepted, duplicates, runId }` | `400`, `401`, `404`, `500` |

Batch `count` değeri `items.length` ile aynı olmalıdır. Her item `runId`, `seq`, `runConstants`, `tick`, `snapshot` taşır. `(account_id, run_id, seq)` duplicate kayıtlar idempotent olarak `duplicates` sayılır.

## Leaderboard ve Challenges

| Method | Path | Auth | Payload veya Query | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/leaderboard` | Yok | `pair?`, `limit 1..100`, `offset`, `sort` | `{ data, limit, offset, sort }` | `500` |
| GET | `/api/v1/challenges/today` | Yok | Yok | Daily challenge | `500` |
| GET | `/api/v1/challenges/weekly` | Yok | Yok | Weekly challenge | `500` |
| POST | `/api/v1/challenges/complete` | Bearer | `challengeId`, `sessionId`, `score`, optional metrics | Completion response | `400`, `401`, `403`, `404`, `409`, `500` |
| GET | `/api/v1/challenges/:challengeId/leaderboard` | Yok | Yok | `{ challengeId, entries[] }` | `500` |
| GET | `/api/v1/challenges/status` | Bearer | Yok | `{ completions[] }` | `401`, `404`, `500` |

Leaderboard dynamic sort yalnızca whitelist alanlarına izin verir: `max_survival_time`, `total_kills`, `high_score`, `total_sessions`.

## Meta Progression

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/meta/state` | Bearer | Yok | Meta wallet/upgrades state | `401`, `404`, `500` |
| POST | `/api/v1/meta/purchase` | Bearer | `upgradeId` | `{ upgradeId, newLevel, newMetaCoins, cost }` | `400`, `401`, `404`, `409`, `500` |
| POST | `/api/v1/meta/transfer` | Bearer | Deprecated | `410` disabled | `410`, `500` |
| GET | `/api/v1/meta/leaderboard` | Yok | Yok | `{ entries[] }` | `500` |

Meta transfer endpoint beta sözleşmesinde kapalıdır; meta rewards `sessions/verify` sırasında uygulanır.

## Identities ve Replays

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/identities` | Bearer | `provider`, `provider_user_id`, optional token fields | Linked identity metadata | `400`, `401`, `404`, `500` |
| DELETE | `/api/v1/identities/:provider` | Bearer | Yok | Deleted identity result | `400`, `401`, `404`, `500` |
| POST | `/api/v1/replays/save` | Bearer | `sessionId`, `replayData`, `pair`, `position`, optional metrics | `{ replayId, size }` | `400`, `401`, `403`, `409`, `413`, `500` |
| GET | `/api/v1/replays/mine` | Bearer | Yok | `{ replays[] }` metadata | `401`, `404`, `500` |
| GET | `/api/v1/replays/:replayId` | Yok | Yok | Replay payload with base64 data | `404`, `500` |
| GET | `/api/v1/replays/top/:pair` | Yok | Yok | `{ pair, replays[] }` | `500` |

Replay payload maximum size `500KB` decoded binarydir. Replay row ownership session ownership üzerinden doğrulanır ve save yalnızca `sessions.is_verified = true` olduğunda kabul edilir. Replay save reward HMAC parçası değildir; save failure wallet, ledger veya session verification state değiştirmez.

## Telemetry

| Method | Path | Auth | Payload | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/telemetry/errors` | Yok | Single report veya batch array, max 50 accepted | `{ accepted }` | `400`, `500` |
| POST | `/api/v1/telemetry/cheat-reports` | Yok | `cheatType`, optional profile/session/details/severity | `{ accepted: true }` | `400`, `500` |
| POST | `/api/v1/telemetry/device-profiles` | Yok | `fingerprint` ve optional device fields | `{ accepted: true }` | `400`, `500` |
| POST | `/api/v1/telemetry/performance-metrics` | Yok | FPS, device, session metadata | `{ accepted: true }` | `500` |
| POST | `/api/v1/telemetry/product-events` | Yok | Single event veya batch array, allowlisted `event_type`, max 50 accepted | `{ accepted }` | `400`, `500` |

Telemetry public ingest rate limitedir ve kullanıcı-facing gameplay authority değildir. Anti-cheat ve product traction kararları client telemetry’ye güvenerek kalıcı reward yazmaz.

## Admin

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | Admin secret | System, users, sessions, economy, security, telemetry, product traction, audit summary ve top players |
| GET | `/api/v1/admin/audit` | Admin secret | Recent audit log entries, optional `action` filter |

Admin secret beta/prod ortamında zorunludur. Secret yoksa server ephemeral secret üretir; bu sadece local/dev fallback kabul edilir.

Dashboard telemetry summary `errorReports24h`, `cheatAttempts24h`, `performanceMetrics24h`, `avgFps24h` ve `activeDeviceProfiles24h` alanlarını döndürür. Product summary `productEvents24h`, `walletConnects24h`, `uniqueWallets24h`, `seasonParticipants24h`, `questCompletions24h`, `leaderboardSubmissions24h` ve `referralJoins24h` alanlarını döndürür.

## DB Ownership

| Domain | Server-owned tables/views | Notes |
|---|---|---|
| Auth/profile | `accounts`, `account_identities`, `profiles`, `identities` | Account/profile ownership Railway JWT `account_id`/`sub` üzerinden bağlanır |
| Session/reward | `sessions`, `price_history`, `reward_claims`, `wallets`, `ledger_entries` | Verification transaction reward authoritydir |
| Market audit | `market_runtime_audit` | Runtime tick/snapshot audit insertleri idempotent seq ile yapılır |
| Meta/challenges | `meta_progression`, `daily_challenges`, `challenge_completions`, `challenge_seed_log`, `v_meta_leaderboard`, `v_challenge_leaderboard` | Challenge seed ve completion audit server-owned |
| Telemetry | `error_reports`, `cheat_attempts`, `device_profiles`, `performance_metrics`, `product_telemetry_events` | Public ingest, analytics/triage ve investor traction amaçlıdır |
| Replay | `game_replays` | Session owner save eder; public read endpointleri metadata/replay sunar |
| Leaderboard | `v_leaderboard` | Public read view; dynamic sort whitelist uygulanır |

## Beta Kabul Kriteri

- Protected endpointler auth token olmadan `401` döndürür.
- Auth configured değilse protected route `500 Auth not configured` ile fail-fast yapar.
- Session verify HMAC, ownership, idempotency ve server-trusted metric normalization uygular.
- Wallet balance kalıcı olarak yalnızca server-side ledger transaction ile artar.
- Public ingest endpointleri rate limit altındadır ve reward/state authority değildir.
- Admin endpointler yalnızca `ADMIN_API_SECRET` ile erişilir.
- Admin dashboard error report, cheat attempt, performance metrics ve active device profile özetlerini görünür kılar.
