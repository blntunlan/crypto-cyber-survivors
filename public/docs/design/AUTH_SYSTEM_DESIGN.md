# Auth System Design — Email + Google + Crypto Wallets

> **Status** design spec — not yet implemented
> Owner: Core Engineering
> Created: 2026-06-24
> Supersedes: `docs/archived/supabase-auth-roadmap.md` (Supabase era, archived)

## Purpose

Design specification for a unified authentication system supporting email/password,
Google OAuth, and crypto wallet sign-in (MetaMask via SIWE, Phantom via Solana message signing,
and optional WalletConnect). The system extends the existing Railway-native auth infrastructure
inside `railway-market-server` rather than introducing a separate auth service.

This document captures architectural decisions made on 2026-06-24 for future implementation.
No code has been written yet.

---

## 1. Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Service topology | Extend existing `railway-market-server` | Shared DB, existing `accounts`/`account_identities` tables, `requireAuth` middleware, JWT utils — no new infra |
| Email auth method | Password + email verification | Classic flow, parallels Google OAuth, argon2id hashing |
| Email provider | SMTP via nodemailer | Flexible, no vendor lock-in, configurable SMTP host |
| Google OAuth | Server-side id_token verification | No redirect flow; `google-auth-library` verifies Google public keys |
| Wallet auth — EVM | SIWE (Sign-In with Ethereum, EIP-4361) | Industry standard, `siwe` library, `personal_sign` |
| Wallet auth — Solana | Phantom message signing | `tweetnacl` ed25519 verify, season config is already Solana-themed |
| WalletConnect | Optional, Phase 6 | Mobile wallet support via `@walletconnect/sign-client` cloud relay |
| Anonymous migration | Full login required | Remove anonymous-only flow; existing anon users migrate data on first real login |
| Nickname timing | Post-login setup | Email/Google/wallet don't provide a callsign; ask after login if missing |
| Token model | Short access JWT (15m) + rotating refresh token (30d) | Replaces current 30-day no-refresh JWT |

---

## 2. System Overview

```
+------------------- Frontend (React/Vite) -------------------+
|                                                              |
|  AuthScreen (LoginScreen)                                    |
|    +- EmailLoginForm / EmailSignupForm                       |
|    +- GoogleLoginButton                                      |
|    +- WalletLoginButtons (MetaMask / Phantom)                |
|                                                              |
|  WalletAdapters (services/auth/wallets/)                     |
|    +- EVMWalletAdapter    -> window.ethereum (SIWE)          |
|    +- SolanaWalletAdapter -> window.solana (Phantom)         |
|    +- WalletAdapterRegistry (detect + unified interface)     |
|                                                              |
|  UserContext <- RailwayAuthService <- RailwayClient          |
|    +- AccessToken (15m)  -- RailwayAuthTokenStore            |
|    +- RefreshToken (30d) -- localStorage                     |
|                                                              |
+----------------------------+--------------------------------+
                               | HTTPS + Bearer JWT
                               v
+------------------- railway-market-server (Express) ----------+
|                                                              |
|  /api/v1/auth/*                                              |
|    +- register / login / verify-email / reset-pw             |
|    +- google (id_token verify)                               |
|    +- wallet/nonce -> wallet/verify (SIWE / Solana)          |
|    +- refresh (token rotation)                               |
|    +- link/:provider / unlink/:provider                      |
|    +- migrate (anon -> registered)                           |
|                                                              |
|  Middleware: requireAuth (existing)                          |
|  New: requireVerifiedEmail (optional gate)                   |
|                                                              |
|  Services:                                                   |
|    +- EmailService (nodemailer + SMTP)                       |
|    +- GoogleVerifier (google-auth-library)                   |
|    +- WalletVerifier (siwe + tweetnacl)                      |
|    +- PasswordHasher (argon2)                                |
|                                                              |
+----------------------------+--------------------------------+
                               |
                               v
                        Railway Postgres
                          (shared DB)
```

---

## 3. Current State (As of 2026-06-24)

Understanding the starting point is critical because this design builds on existing infrastructure.

### What exists

- **Supabase is fully removed** from runtime code. No `@supabase/supabase-js` dependency, no Supabase client imports. The `supabase/` directory does not exist. `VITE_SUPABASE_*` env vars remain in `.env`/`.env.local` as vestigial committed secrets (should be removed and rotated).
- **Active auth:** Anonymous nickname sign-in only. `POST /api/v1/auth/anonymous` creates an `accounts` row (type `anonymous`), `profiles`, `wallets`, `account_identities`, then signs an HS256 JWT (30-day expiry, no refresh).
- **Backend (`railway-market-server`):**
  - `accounts` table (UUID PK, `account_type` CHECK: anonymous/registered/service, `status`, `display_name`)
  - `account_identities` table (`provider`, `provider_subject`, `provider_username`, `metadata` JSONB, UNIQUE(provider, provider_subject))
  - `profiles` table (already has `wallet_address TEXT UNIQUE`, `primary_auth_provider`)
  - `wallets` table (in-game gold balance)
  - `requireAuth` middleware — verifies Bearer JWT, checks `accounts.status = 'active'`
  - `utils/railwayJwt.ts` — HS256 sign/verify with issuer/audience claims
  - `services/twitterAuth.ts` — server-side Twitter OAuth 2.0 PKCE (working but frontend doesn't call it)
  - `routes/identities.ts` — link/unlink OAuth identities (encrypts tokens via AES-256-GCM)
- **Frontend:**
  - `contexts/UserContext.tsx` — React Context, the runtime auth state owner
  - `services/auth/RailwayAuthService.ts` — facade; only `signInAnonymously()` works, all other methods return "not available yet" stubs
  - `services/api/RailwayClient.ts` — auto-attaches Bearer token, retries 502/503/504
  - `services/api/RailwayAuthTokenStore.ts` — localStorage token store, auto-evicts expired tokens
  - `components/screens/NicknameEntryScreen.tsx` — the only auth UI (single nickname input)
  - `components/GameAppShell.tsx` — soft-gates game start on nickname presence

### What's missing / broken

- **No token refresh.** JWT expires silently after 30 days → user logged out. `RailwayAuthService.refreshSession()` is a no-op sham.
- **No email/password auth.** No `bcrypt`/`argon2`, no password column, no email verification.
- **No Google OAuth.** No `google-auth-library` on backend, no GSI client on frontend.
- **No crypto wallet auth.** No `ethers`/`viem`/`siwe`/`@solana/*`/`tweetnacl`. `profiles.wallet_address` column exists but is never written. Analytics types define `walletProvider` field but it's always null.
- **`useAuthStore` (Zustand) is dead code** — referenced only in tests, not in production runtime.
- **`OAuthFlowManager` / `AuthEventHandler` are stubs** — all methods return "not available".
- **`VITE_SUPABASE_*` secrets committed in `.env`** — security risk, should be removed.
- **`TWITTER_CLIENT_SECRET` in root `.env`** — exposed to frontend bundle; should live only in `railway-market-server/.env`.
- **AGENTS.md is stale** — still claims "Supabase = Auth only" which is no longer true.

---

## 4. Database Schema Changes

All changes go into a new `MIGRATION_011_auth_full` block in `railway-market-server/src/db/migrate.ts`,
following the existing inlined-SQL migration pattern (idempotent, `IF NOT EXISTS`).

### 4.1 Extend existing tables

```sql
-- accounts: add email + password support
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- account_identities: already supports all providers via (provider, provider_subject)
--   EVM:    provider='siwe',     provider_subject=0xAddress,         metadata={chainId, walletType}
--   Solana: provider='phantom',  provider_subject=Base58Address,     metadata={walletType}
--   Google: provider='google',   provider_subject=googleSubId,       metadata={email, displayName}
--   Email:  provider='email',    provider_subject=emailLowercased
```

### 4.2 New tables

```sql
-- Wallet nonce challenge (SIWE / Solana sign-in)
CREATE TABLE IF NOT EXISTS auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,            -- full SIWE message or Solana message
  nonce TEXT NOT NULL UNIQUE,         -- random hex, single-use
  wallet_address TEXT NOT NULL,
  chain_type TEXT NOT NULL,           -- 'evm' | 'solana'
  chain_id INTEGER,                   -- EVM chainId (1 = mainnet)
  status TEXT DEFAULT 'pending',      -- pending | verified | expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_nonce ON auth_challenges(nonce);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_wallet ON auth_challenges(wallet_address);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,    -- sha256(token), never store raw token
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,    -- sha256(token)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Refresh tokens with rotation + reuse detection
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,    -- sha256(token), never store raw
  family_id UUID NOT NULL,            -- rotation chain; revoke entire family on reuse
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account ON refresh_tokens(account_id);
```

### 4.3 Schema snapshot regeneration

After the migration is applied, regenerate `railway-market-server/src/db/schema.sql` and update
`src/db/schema.ts` (Drizzle ORM schema) to include the new tables/columns so typed queries work.

---

## 5. Backend API Design

All new routes are added to `railway-market-server/src/routes/auth.ts` (existing file) or new
route files mounted in `src/index.ts`. All follow the existing Express + Zod validation pattern.

### 5.1 Email Auth

| Endpoint | Method | Auth | Body | Description |
|---|---|---|---|---|
| `/api/v1/auth/register` | POST | no | `{email, password, nickname?}` | argon2id hash, create account (type=registered), send verification email |
| `/api/v1/auth/login` | POST | no | `{email, password}` | verify hash, mint access + refresh tokens, update `last_login_at` |
| `/api/v1/auth/verify-email` | POST | no | `{token}` | verify token_hash, set `email_verified=true` |
| `/api/v1/auth/resend-verification` | POST | no | `{email}` | generate new token, send email (rate-limited 3/15min) |
| `/api/v1/auth/forgot-password` | POST | no | `{email}` | generate reset token, send email (always returns 200 to prevent enumeration) |
| `/api/v1/auth/reset-password` | POST | no | `{token, newPassword}` | verify token, update hash, revoke all refresh tokens |
| `/api/v1/auth/change-password` | POST | yes | `{currentPassword, newPassword}` | verify current, update hash, revoke all refresh tokens |

**Password requirements:** minimum 8 chars, at least 1 letter + 1 number. Enforced via Zod schema
in `src/db/validation.ts`.

**Email normalization:** lowercase + trim before storage and lookup.

### 5.2 Google OAuth

| Endpoint | Method | Auth | Body | Description |
|---|---|---|---|---|
| `/api/v1/auth/google` | POST | no | `{idToken}` | verify id_token via `google-auth-library`, extract `sub` + `email`, find-or-create account, mint tokens |

**Flow (server-side, no redirect):**
1. Frontend renders Google Sign-In button via Google Identity Services (GSI) client.
2. User clicks → Google returns an `id_token` (JWT) to the frontend callback.
3. Frontend sends `{idToken}` to `POST /api/v1/auth/google`.
4. Backend uses `google-auth-library` `OAuth2Client.verifyIdToken()` to verify the token against
   Google's public keys — extracts `sub` (stable Google user ID), `email`, `name`, `picture`.
5. Lookup `account_identities` where `provider='google'` AND `provider_subject=sub`.
   - Found → load account, mint tokens.
   - Not found → create new account (type=registered, email from Google, email_verified=true if
     Google says `email_verified`), create identity, create profile + wallet, mint tokens.

**Why id_token not authorization code:** Simpler, no redirect URI, no token exchange on backend.
The id_token is short-lived (1 hour) and signed by Google — we verify it server-side. This is the
recommended approach for SPA + API architectures per Google's documentation.

### 5.3 Wallet Auth (EVM + Solana)

Two-step challenge-response flow:

```
Step 1: POST /api/v1/auth/wallet/nonce
  Body: { walletAddress, chainType: 'evm'|'solana', chainId? }
  Response: { nonce, message }

Step 2: POST /api/v1/auth/wallet/verify
  Body: { walletAddress, chainType, signature, nonce }
  Response: { accessToken, refreshToken, account, profile }
```

**Step 1 — Nonce generation:**
1. Validate `walletAddress` format (EVM: `0x` + 40 hex, checksummed; Solana: base58, 32-44 chars).
2. Generate cryptographically random `nonce` (32 bytes hex via `crypto.randomBytes`).
3. Build the sign-in message:
   - **EVM (SIWE, EIP-4361):**
     ```
     crypto-survivors.com wants you to sign in with your Ethereum account:
     0xABCDEF...

     URI: https://crypto-survivors.com
     Version: 1
     Chain ID: 1
     Nonce: <random hex>
     Issued At: <ISO timestamp>
     Expiration Time: <ISO + 5min>
     ```
   - **Solana:**
     ```
     Sign in to Crypto Survivors
     Wallet: <base58 address>
     Nonce: <random hex>
     Timestamp: <ISO>
     ```
4. Insert into `auth_challenges` (status=pending, expires_at=now+5min).
5. Return `{ nonce, message }`.

**Step 2 — Signature verification:**
1. Look up `auth_challenges` by `nonce` — must be `pending` and not expired.
2. Verify signature:
   - **EVM:** Use `siwe` library — parse the SIWE message, verify the signature (`personal_sign`
     recovers the address), check `message.address === walletAddress`, check
     `message.nonce === nonce`, check `message.expirationTime > now`.
   - **Solana:** Use `tweetnacl` — `nacl.sign.detached.verify(messageBytes, signatureBytes,
     publicKeyBytes)`. Verify `publicKey === walletAddress`.
3. Mark challenge as `verified`, set `used_at`.
4. Lookup `account_identities` where `provider='siwe'` (EVM) or `provider='phantom'` (Solana) AND
   `provider_subject=walletAddress`.
   - Found → load account, mint tokens.
   - Not found → create new account (type=registered), create identity (metadata includes
     chainId/chainType), create profile (set `wallet_address`), create wallet, mint tokens.
5. Return access + refresh tokens.

**Security:** Nonce is single-use (status changes to `verified`). 5-minute expiry. One pending
challenge per wallet address at a time (replace existing pending on new nonce request).

### 5.4 Token Refresh (Rotation + Reuse Detection)

```
POST /api/v1/auth/refresh
  Body: { refreshToken }
  Response: { accessToken, refreshToken }   -- new pair, old refresh revoked
```

**Algorithm:**
1. Hash the incoming `refreshToken` with sha256.
2. Look up `refresh_tokens` by `token_hash`.
3. If not found → 401 (invalid token).
4. If `revoked_at IS NOT NULL` → **reuse detected**. Revoke entire `family_id` (all tokens in the
   rotation chain). Return 401. This is a security event — log to `audit_events`.
5. If `expires_at <= now` → 401 (expired).
6. Mint new refresh token (same `family_id`), mark old token as `revoked_at=now`,
   `replaced_by=newToken.id`.
7. Mint new access token (HS256 JWT, 15-min expiry).
8. Return new pair.

**Access token:** HS256 JWT via existing `signRailwayAccessToken()`, but with
`API_JWT_EXPIRES_SECONDS=900` (15 min). Payload: `{sub, account_id, account_type, role, token_use:'access'}`.

**Refresh token:** 256-bit random (`crypto.randomBytes(32).toString('hex')`), stored as sha256 hash.
Plaintext only in HTTP response body. 30-day expiry.

### 5.5 Account Linking (requires auth)

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `POST /api/v1/auth/link/wallet` | `{nonce, signature, chainType}` | Add wallet identity to current account |
| `POST /api/v1/auth/link/google` | `{idToken}` | Add Google identity to current account |
| `DELETE /api/v1/auth/link/:provider` | — | Unlink identity (blocks if it's the last one — existing `identities.ts` pattern) |

This lets a user who registered with email later link their MetaMask wallet, or vice versa.
All linked identities share the same `account_id`.

### 5.6 Anonymous Migration

| Endpoint | Method | Auth | Body | Description |
|---|---|---|---|---|
| `POST /api/v1/auth/migrate` | POST | yes (old anon JWT) | `{targetAccountId}` | Move old anon account data to the newly authenticated account |

**Flow:**
1. User has an old anonymous account (from the current nickname-only flow).
2. User logs in via email/Google/wallet → gets a new registered account.
3. Frontend detects old `crypto_survivors_user` localStorage entry → sends old profileId.
4. Backend migrates: update `profiles.account_id`, `wallets.account_id`, `sessions.profile_id`,
   `meta_progression`, etc. from old account to new. Mark old account as `status='deleted'`.
5. This preserves the player's game history, gold balance, and meta progression.

After a 2-week deprecation window, `POST /api/v1/auth/anonymous` will return a redirect to login.

### 5.7 Rate Limiting

Added to `railway-market-server/src/middleware/rateLimit.ts`:

```typescript
registerLimiter:        3 req / 15 min per IP    // registration abuse
resetLimiter:           3 req / hour per IP       // password reset spam
walletNonceLimiter:    10 req / min per IP        // nonce generation
loginLimiter:           5 req / min per IP        // login brute-force
```

Existing `authLimiter` (20/min) remains as the default for auth routes.

---

## 6. Frontend Architecture

### 6.1 New Files

```
services/auth/wallets/
  +- WalletAdapterBase.ts       # interface: connect(), signMessage(), disconnect()
  +- EVMWalletAdapter.ts        # window.ethereum, SIWE message, personal_sign
  +- SolanaWalletAdapter.ts     # window.solana, signMessage (Phantom)
  +- WalletAdapterRegistry.ts   # detect injected wallets, factory pattern
  +- types.ts                   # WalletType, ChainType, SignedMessage

services/auth/
  +- RailwayAuthService.ts      # EXISTING — extend: register, login, google, wallet, refresh
  +- AuthTokenManager.ts        # proactive token refresh (before access token expires)

services/api/
  +- RailwayClient.ts           # EXISTING — add 401 interceptor + auto-refresh
  +- RailwayAuthTokenStore.ts   # EXISTING — add refresh_token storage

components/auth/
  +- AuthScreen.tsx             # main login screen (tabs: Email / Google / Wallet)
  +- EmailLoginForm.tsx         # email + password login
  +- EmailSignupForm.tsx        # email + password + optional nickname
  +- GoogleLoginButton.tsx      # Google Sign-In (GSI client)
  +- WalletLoginSection.tsx     # MetaMask / Phantom buttons
  +- NicknameSetupScreen.tsx    # post-login nickname setup (refactored NicknameEntryScreen)
  +- EmailVerificationNotice.tsx
  +- PasswordResetRequestForm.tsx
  +- PasswordResetForm.tsx      # token-based reset (redirected from email link)

contexts/
  +- UserContext.tsx            # EXISTING — add auth method selection + auto-refresh
```

### 6.2 Wallet Adapter Interface

```typescript
type WalletType = 'metamask' | 'phantom' | 'walletconnect';
type ChainType = 'evm' | 'solana';

interface WalletAdapter {
  readonly type: WalletType;
  readonly chainType: ChainType;
  isAvailable(): boolean;                 // window.ethereum / window.solana exists?
  connect(): Promise<string>;             // returns wallet address
  signMessage(message: string): Promise<string>;  // returns signature
  disconnect(): Promise<void>;
}
```

**EVMWalletAdapter:**
- `isAvailable()`: `typeof window.ethereum !== 'undefined'`
- `connect()`: `window.ethereum.request({ method: 'eth_requestAccounts' })` → returns `[address]`
- `signMessage()`: `window.ethereum.request({ method: 'personal_sign', params: [message, address] })`

**SolanaWalletAdapter:**
- `isAvailable()`: `typeof window.solana !== 'undefined' && window.solana.isPhantom`
- `connect()`: `window.solana.connect()` → `response.publicKey.toString()`
- `signMessage()`: `window.solana.signMessage(new TextEncoder().encode(message))` →
  `bs58.encode(signature)`

**WalletAdapterRegistry:**
- Detects which wallets are injected in the browser.
- Returns the first available adapter for a given chain type.
- Used by `WalletLoginSection.tsx` to show/hide buttons based on wallet availability.

### 6.3 Auth Flow (Frontend)

```
App boot:
  1. RailwayAuthTokenStore.get() -> access + refresh token present?
  2. Access token valid -> UserContext restore, app continues
  3. Access token expired, refresh token present -> POST /auth/refresh
     success -> new tokens, app continues
     failure -> AuthScreen
  4. No tokens -> AuthScreen

AuthScreen:
  Tab 1: Email -> EmailLoginForm or EmailSignupForm
  Tab 2: Google -> GoogleLoginButton (one click)
  Tab 3: Wallet -> WalletLoginSection (MetaMask / Phantom)

Login success:
  -> Check if profile has nickname (GET /api/v1/profile)
  -> No nickname -> NicknameSetupScreen
  -> Has nickname -> main menu

Proactive refresh:
  AuthTokenManager - schedules refresh 1 minute before access token expiry
  -> emits EventBus('authStateChanged', { type: 'tokenRefreshed' })
  -> RailwayClient uses new token for subsequent requests

RailwayClient 401 interceptor:
  -> On 401 response, attempt one refresh
  -> If refresh succeeds, retry original request with new token
  -> If refresh fails, clear tokens, emit authStateChanged signOut
```

### 6.4 Google Sign-In (Frontend)

Uses Google Identity Services (GSI) client — no redirect, no popup management:

```html
<!-- Add to index.html -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

```typescript
// GoogleLoginButton.tsx
google.accounts.id.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  callback: (response) => {
    // response.credential = id_token (JWT signed by Google)
    RailwayAuthService.signInWithGoogle(response.credential);
  },
});
google.accounts.id.renderButton(buttonEl, { theme: 'outline', size: 'large' });
```

### 6.5 Wallet Login Flow (Frontend)

```
User clicks "MetaMask" button:
  1. WalletAdapterRegistry.getAdapter('evm') -> EVMWalletAdapter
  2. adapter.connect() -> user approves in MetaMask -> returns 0xAddress
  3. POST /api/v1/auth/wallet/nonce { walletAddress, chainType:'evm', chainId:1 }
     -> returns { nonce, message }
  4. adapter.signMessage(message) -> user signs in MetaMask -> returns signature
  5. POST /api/v1/auth/wallet/verify { walletAddress, chainType:'evm', signature, nonce }
     -> returns { accessToken, refreshToken, account, profile }
  6. Store tokens, update UserContext, proceed to nickname check

User clicks "Phantom" button:
  1. WalletAdapterRegistry.getAdapter('solana') -> SolanaWalletAdapter
  2. adapter.connect() -> user approves in Phantom -> returns base58 address
  3. POST /api/v1/auth/wallet/nonce { walletAddress, chainType:'solana' }
     -> returns { nonce, message }
  4. adapter.signMessage(message) -> user signs in Phantom -> returns signature
  5. POST /api/v1/auth/wallet/verify { walletAddress, chainType:'solana', signature, nonce }
     -> returns tokens + account
  6. Store tokens, update UserContext, proceed to nickname check
```

---

## 7. Environment Variables

### 7.1 Frontend (root `.env`)

```env
# New
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com

# Remove (vestigial, security risk — rotate these secrets)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### 7.2 Backend (`railway-market-server/.env`)

```env
# New — Email (SMTP via nodemailer)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@...
SMTP_PASS=...
SMTP_FROM=noreply@crypto-survivors.com
APP_BASE_URL=https://crypto-survivors.com       # for email verification/reset links

# New — Google id_token verification
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com

# Changed — token lifetimes
API_JWT_EXPIRES_SECONDS=900                       # 15 min (was 30 days)
REFRESH_TOKEN_EXPIRES_DAYS=30

# Existing (unchanged)
DATABASE_URL=postgresql://...
API_JWT_SECRET=...                                # HS256 signing secret
TOKEN_ENCRYPTION_SECRET=...                       # AES-256-GCM for OAuth tokens
ADMIN_API_SECRET=...
```

### 7.3 Cleanup

- Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` and `.env.local` — these are
  committed secrets that are no longer used. Rotate them in the Supabase dashboard.
- Move `TWITTER_CLIENT_SECRET` from root `.env` to `railway-market-server/.env` only — it's a
  backend secret that should never be in the frontend bundle.
- Update `.env.example` files to reflect the new variables.

---

## 8. New Dependencies

### 8.1 Backend (`railway-market-server/package.json`)

```json
{
  "dependencies": {
    "argon2": "^0.41.1",           // password hashing (C native, memory-hard)
    "nodemailer": "^6.9.14",        // SMTP email sending
    "google-auth-library": "^9.11.0", // Google id_token verification
    "siwe": "^2.3.2",               // Sign-In with Ethereum (EIP-4361 parser + verifier)
    "tweetnacl": "^1.0.3"           // Solana ed25519 signature verify (lightweight, no native deps)
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.16"
  }
}
```

**Note on `siwe`:** The `siwe` package handles both parsing SIWE messages and verifying EIP-191
`personal_sign` signatures. It uses `ethers` internally for signature recovery — this is the one
place `ethers` enters the dependency tree, but only on the backend, not the frontend bundle.

### 8.2 Frontend (root `package.json`)

```json
{
  "dependencies": {
    "siwe": "^2.3.2"                // SIWE message builder (frontend constructs the message)
  }
}
```

**Minimal dependencies.** `viem`/`ethers` are NOT needed on the frontend — `window.ethereum.request`
with `personal_sign` is sufficient. Phantom's `window.solana.signMessage` needs no SDK.
`bs58` is only needed if we decode Solana addresses (small package, add if necessary).

### 8.3 WalletConnect (Phase 6, optional)

```json
{
  "dependencies": {
    "@walletconnect/sign-client": "^2.11.0"
  }
}
```

Only add when implementing Phase 6. Adds mobile wallet support via cloud relay.

---

## 9. Security Model

| Threat | Mitigation |
|---|---|
| Password brute-force | argon2id (memory-hard, OWASP-recommended), login rate limit (5/min/IP) |
| Password dump leak | argon2id with salt + high memory/time cost parameters |
| Token theft (XSS) | Access token in localStorage (short 15-min TTL). Refresh token rotation + reuse detection |
| Refresh token reuse | Same `family_id` reused token → entire family revoked, security event logged |
| Wallet signature replay | Nonce is single-use, 5-min expiry, `auth_challenges.status` tracking |
| SIWE phishing | Domain-bound message (`URI` field), nonce + expirationTime verified server-side |
| Google token forgery | `google-auth-library` verifies against Google's public keys (JWKS) |
| Email enumeration | `/forgot-password` always returns 200 regardless of account existence |
| Email verification bypass | `email_verified` flag checked by `requireVerifiedEmail` middleware (optional gate) |
| CSRF | API is stateless + Bearer token (not cookie-based) — no CSRF surface |
| Account takeover via linking | Link endpoints require `requireAuth` — only the authenticated owner can link |
| Stale Supabase secrets | Remove `VITE_SUPABASE_*` from `.env`, rotate in Supabase dashboard |

### Password hashing parameters (argon2id)

```typescript
{
  type: argon2.argon2id,
  memoryCost: 19456,   // 19 MiB
  timeCost: 2,          // 2 iterations
  parallelism: 1,
  hashLength: 32,
}
```

These are OWASP-recommended minimums as of 2025.

---

## 10. Anonymous User Migration

**Decision: Full login required.** The current anonymous-only (nickname) flow will be removed.

### Migration sequence

1. **Before deploy:** `POST /api/v1/auth/anonymous` continues to work (backward compat).
2. **After deploy:**
   - App boot detects old `crypto_survivors_user` localStorage entry (anon profileId).
   - AuthScreen is shown (no anonymous option).
   - User logs in via email/Google/wallet → new registered account created.
   - Frontend calls `POST /api/v1/auth/migrate` with old anon profileId.
   - Backend migrates data: `profiles`, `wallets`, `sessions`, `meta_progression`,
     `challenge_completions`, `game_replays` → reassign to new account. Old account marked
     `status='deleted'`.
   - User keeps all game history, gold, and progression.
3. **2 weeks post-deploy:** `POST /api/v1/auth/anonymous` returns 410 Gone with a redirect message.
4. **4 weeks post-deploy:** Remove the anonymous endpoint and all related frontend code paths.

### Code cleanup (during implementation)

- Delete `stores/useAuthStore.ts` (Zustand) — dead code, only referenced in tests.
- Delete or repurpose `services/auth/OAuthFlowManager.ts` — currently all stubs.
- Delete or repurpose `services/auth/AuthEventHandler.ts` — currently a no-op shim.
- Refactor `components/screens/NicknameEntryScreen.tsx` → `components/auth/NicknameSetupScreen.tsx`
  (post-login nickname setup instead of standalone auth).
- Remove `VITE_SUPABASE_*` env vars.
- Move `TWITTER_CLIENT_SECRET` to backend-only env.
- Update `AGENTS.md` — remove "Supabase = Auth only" section, document Railway-native auth.
- Wire `EventBus.emit('authStateChanged', ...)` — the event type exists in `types/events.ts` but
  is never emitted. Auth state changes should emit this for any listeners.

---

## 11. Implementation Phases

Each phase is independently deployable. Run `npm run check:baseline` (typecheck → architecture →
reset-coverage → lint → test → build) after each phase before committing.

### Phase 1 — Database + Email Auth

**Backend:**
- `MIGRATION_011_auth_full` in `migrate.ts` (new tables + account columns)
- Regenerate `schema.sql` + update `schema.ts` (Drizzle)
- `utils/passwordHash.ts` — argon2id hash/verify
- `services/emailService.ts` — nodemailer SMTP, verification + reset email templates
- Extend `routes/auth.ts`: `register`, `login`, `verify-email`, `resend-verification`,
  `forgot-password`, `reset-password`, `change-password`
- `routes/auth.ts`: `refresh` (token rotation + reuse detection)
- New rate limiters: `registerLimiter`, `resetLimiter`, `loginLimiter`
- Zod validation schemas in `db/validation.ts`
- Tests: `tests/routes/auth.test.ts` — all email endpoints + refresh rotation

**Frontend:**
- `components/auth/EmailLoginForm.tsx`, `EmailSignupForm.tsx`
- `components/auth/EmailVerificationNotice.tsx`, `PasswordResetRequestForm.tsx`,
  `PasswordResetForm.tsx`
- Extend `RailwayAuthService`: `register()`, `login()`, `verifyEmail()`, `resetPassword()`
- Extend `RailwayAuthTokenStore`: add `refreshToken` field
- `AuthTokenManager.ts` — proactive refresh
- `RailwayClient.ts` — 401 interceptor + auto-refresh
- `UserContext.tsx` — update for token refresh flow
- Tests: `tests/components/auth/EmailAuth.test.tsx`

**Gate:** `npm run check:baseline` passes. Email login works end-to-end.

### Phase 2 — Google OAuth

**Backend:**
- `services/googleVerifier.ts` — `google-auth-library` id_token verification
- `routes/auth.ts`: `POST /api/v1/auth/google`
- Tests: `tests/routes/auth.test.ts` — Google endpoint with mocked id_token

**Frontend:**
- Add GSI client script to `index.html`
- `components/auth/GoogleLoginButton.tsx`
- Extend `RailwayAuthService`: `signInWithGoogle(idToken)`
- Tests: `tests/components/auth/GoogleLogin.test.tsx`

**Gate:** `npm run check:baseline` passes. Google login works end-to-end.

### Phase 3 — Wallet Auth (EVM + Solana)

**Backend:**
- `services/walletVerifier.ts` — SIWE verify (EVM) + tweetnacl verify (Solana)
- `routes/auth.ts`: `POST /api/v1/auth/wallet/nonce`, `POST /api/v1/auth/wallet/verify`
- `walletNonceLimiter` rate limiter
- Tests: `tests/routes/auth.test.ts` — wallet nonce + verify with generated keypairs

**Frontend:**
- `services/auth/wallets/WalletAdapterBase.ts` — interface
- `services/auth/wallets/EVMWalletAdapter.ts` — MetaMask
- `services/auth/wallets/SolanaWalletAdapter.ts` — Phantom
- `services/auth/wallets/WalletAdapterRegistry.ts` — detection + factory
- `services/auth/wallets/types.ts`
- `components/auth/WalletLoginSection.tsx`
- Extend `RailwayAuthService`: `signInWithWallet(adapter)`
- Tests: `tests/services/auth/wallets/*.test.ts` — adapters with mocked `window.ethereum`/
  `window.solana`

**Gate:** `npm run check:baseline` passes. MetaMask + Phantom login works end-to-end.

### Phase 4 — Frontend UI Integration

**Frontend:**
- `components/auth/AuthScreen.tsx` — main login screen with tabs
- `components/auth/NicknameSetupScreen.tsx` — refactor from `NicknameEntryScreen.tsx`
- Update `GameAppShell.tsx` — gate on `isAuthenticated` (not just nickname)
- Update `GameScreenRouter.tsx` — render AuthScreen when not authenticated
- Wire `EventBus.emit('authStateChanged', ...)` on login/logout/refresh
- Update `useAppInitialization.ts` — re-enable auth restore on boot
- Tests: `tests/components/auth/AuthScreen.test.tsx`, update `tests/App.test.tsx`

**Gate:** `npm run check:baseline` passes. Full login flow works with all three methods.

### Phase 5 — Migration + Cleanup

**Backend:**
- `routes/auth.ts`: `POST /api/v1/auth/migrate`
- Deprecate `POST /api/v1/auth/anonymous` (return 410 with redirect message)
- Tests: `tests/routes/auth.test.ts` — migration endpoint

**Frontend:**
- Migration flow in `UserContext.tsx` — detect old anon localStorage, call migrate
- Delete `stores/useAuthStore.ts`
- Delete/repurpose `services/auth/OAuthFlowManager.ts`, `AuthEventHandler.ts`
- Remove `VITE_SUPABASE_*` from `.env` / `.env.local` / `.env.example`
- Move `TWITTER_CLIENT_SECRET` to `railway-market-server/.env`
- Update `AGENTS.md` — document new auth architecture
- Update `config/architecture/singleton-whitelist.json` if new singletons added
- Update tests that reference deleted files

**Gate:** `npm run check:baseline` passes. No dead code. AGENTS.md accurate.

### Phase 6 — WalletConnect (Optional)

**Frontend:**
- `services/auth/wallets/WalletConnectAdapter.ts`
- Add `@walletconnect/sign-client` dependency
- Update `WalletLoginSection.tsx` — add WalletConnect button
- QR code modal for mobile wallet pairing

**Gate:** `npm run check:baseline` passes. Mobile wallet login works.

---

## 12. Test Strategy

### 12.1 Backend Tests

Location: `railway-market-server/tests/routes/auth.test.ts` (extend existing pattern).

- **Email:** register (success, duplicate email, weak password), login (success, wrong password,
  unverified email), verify-email (success, expired token, invalid token), reset-password flow,
  change-password.
- **Google:** mock `google-auth-library` verifyIdToken — success, invalid token, new user, existing
  user.
- **Wallet:** generate real keypairs (`ethers` for EVM, `tweetnacl` for Solana), sign real messages,
  verify on backend. Test nonce expiry, replay (reuse nonce), wrong address.
- **Refresh:** rotation success, expired refresh, reuse detection (revoked token → family revoked).
- **Migration:** old anon account data moves to new account, old account marked deleted.
- **Rate limiting:** verify limits trigger 429.

### 12.2 Frontend Tests

Location: `tests/components/auth/` and `tests/services/auth/`.

- **Forms:** EmailLoginForm, EmailSignupForm validation + submission.
- **Wallet adapters:** mock `window.ethereum` / `window.solana` — connect, signMessage, disconnect,
  not-available fallback.
- **AuthScreen:** tab switching, method selection.
- **UserContext:** login/logout flows, token restore on boot, auto-refresh on 401.
- **RailwayClient:** 401 interceptor triggers refresh, retry succeeds, refresh fails → logout.

### 12.3 E2E Tests

Location: `e2e/auth.spec.ts`.

- Email login flow (with test SMTP or mock).
- Wallet login flow (mock `window.ethereum` injection via Playwright `addInitScript`).
- Nickname setup after first login.
- Token refresh on expiry.
- Migration of anonymous user data.

---

## 13. File Reference (Existing — Will Be Modified)

| File | Role | Changes |
|---|---|---|
| `railway-market-server/src/routes/auth.ts` | Anonymous auth endpoint | Add email/Google/wallet/refresh/migrate endpoints |
| `railway-market-server/src/db/migrate.ts` | Migration runner | Add `MIGRATION_011_auth_full` |
| `railway-market-server/src/db/schema.sql` | Schema snapshot | Regenerate after migration |
| `railway-market-server/src/db/schema.ts` | Drizzle ORM schema | Add new tables/columns |
| `railway-market-server/src/db/validation.ts` | Zod schemas | Add auth validation schemas |
| `railway-market-server/src/middleware/auth.ts` | `requireAuth` | No change (works as-is) |
| `railway-market-server/src/middleware/rateLimit.ts` | Rate limiters | Add new limiters |
| `railway-market-server/src/utils/railwayJwt.ts` | JWT sign/verify | No change (adjust expiry via env) |
| `railway-market-server/src/index.ts` | Express app | Mount new routes if separate files |
| `services/auth/RailwayAuthService.ts` | Auth facade | Add all new methods |
| `services/api/RailwayClient.ts` | HTTP client | Add 401 interceptor + auto-refresh |
| `services/api/RailwayAuthTokenStore.ts` | Token storage | Add refreshToken field |
| `contexts/UserContext.tsx` | Auth state | Update for new auth methods + refresh |
| `components/GameAppShell.tsx` | App shell | Gate on isAuthenticated |
| `components/screens/NicknameEntryScreen.tsx` | Nickname UI | Refactor to NicknameSetupScreen |
| `hooks/useAppInitialization.ts` | Boot init | Re-enable auth restore |
| `types/events.ts` | EventBus types | `authStateChanged` already declared — wire emitters |
| `services/auth/types.ts` | Auth types | Add wallet/refresh types |

---

## 14. Open Questions (To Resolve During Implementation)

1. **Refresh token storage on frontend:** localStorage (current pattern, XSS-vulnerable) vs
   httpOnly cookie (more secure but needs CORS `credentials` + SameSite config). Current design
   uses localStorage for consistency with existing `RailwayAuthTokenStore`. Consider upgrading to
   httpOnly cookie in a future hardening pass.

2. **Email verification gating:** Should unverified email users be blocked from gameplay, or just
   shown a banner? `requireVerifiedEmail` middleware is optional — decide which routes (if any)
   require it. Recommendation: allow gameplay but block reward claims/leaderboard until verified.

3. **Wallet address display in profile:** `profiles.wallet_address` is UNIQUE — if a user links
   multiple wallets (MetaMask + Phantom), only one can be the "primary". Decide: store primary in
   `profiles.wallet_address`, others in `account_identities.metadata` only.

4. **Twitter OAuth:** Backend `services/twitterAuth.ts` already works. Should we wire the frontend
   in this effort or defer? Currently out of scope for this design but could be Phase 4.5.

5. **Session secret rotation:** `GameSessionService` uses `session_secret` for HMAC verification.
   With shorter-lived access tokens, ensure session secrets survive token refresh (they're keyed
   to profile, not token — should be fine, but verify).

6. **`singleton-whitelist.json`:** New services (`EmailService`, `GoogleVerifier`, `WalletVerifier`,
   `PasswordHasher`, `AuthTokenManager`, `WalletAdapterRegistry`) — decide which are singletons
   (need whitelist entry) vs stateless utilities. `check:architecture` will fail if singletons
   aren't whitelisted.
