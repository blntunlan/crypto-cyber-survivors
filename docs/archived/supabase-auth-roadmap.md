# Supabase & Authentication Infrastructure Roadmap

> Generated: 2026-04-03 | Updated: 2026-04-04 | Status: ALL PHASES COMPLETE (P0-P6)

## Executive Summary

Crypto Survivors uses **Supabase exclusively for authentication** (anonymous + OAuth), with all data operations flowing through Railway PostgreSQL. The current auth implementation is **well-architected** (JWT auto-refresh, PKCE OAuth, ES256+HS256 verification, offline support) but has **critical gaps** in security hardening, observability, and auth service coverage.

This roadmap addresses 5 priority areas across 6 phases, sequenced by risk/impact.

---

## Current Architecture Snapshot

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React 19 SPA)                     │
├─────────────────────────────────────────────────────────────┤
│  SupabaseAuthService (880 LOC)                               │
│    ├─ signInAnonymously(nickname)                            │
│    ├─ signInWithOAuth(provider) — PKCE flow                  │
│    ├─ onAuthStateChange → EventBus('authStateChanged')       │
│    └─ Error mapping (Turkish localization)                    │
│                                                               │
│  UserContext (281 LOC)                                        │
│    ├─ login() → Supabase anon → Railway POST /profile        │
│    ├─ logout() → clear local + Supabase signOut               │
│    └─ offline fallback (keeps stored user on network error)  │
│                                                               │
│  useAuthStore (Zustand, 79 LOC)                              │
│    ├─ user, session, loading, error, authStage               │
│    └─ Stages: LOGIN → OTP_VERIFY → NICKNAME_SETUP → COMPLETE│
│                                                               │
│  UserPersistenceService (227 LOC)                            │
│    ├─ localStorage: 'crypto_survivors_user'                  │
│    ├─ Cookie fallback (Base64)                               │
│    └─ 150ms async retry for Safari                           │
│                                                               │
│  RailwayClient (106 LOC)                                     │
│    ├─ Auto-attach Bearer JWT to all API calls                │
│    └─ 401 → refreshSession() → retry once                   │
├─────────────────────────────────────────────────────────────┤
│                    RAILWAY API SERVER                         │
├─────────────────────────────────────────────────────────────┤
│  auth.ts middleware (208 LOC)                                │
│    ├─ ES256: JWKS fetch + 10min cache                        │
│    ├─ HS256: SUPABASE_JWT_SECRET fallback                    │
│    ├─ Extract sub → req.authUserId                           │
│    └─ TokenExpiredError/JsonWebTokenError → 401              │
│                                                               │
│  16 protected routes (JWT required)                          │
│  14 public routes (no auth)                                  │
│  Session HMAC verification (per-session secret)              │
└─────────────────────────────────────────────────────────────┘
```

### Auth Providers Configured
| Provider | Status | Flow |
|----------|--------|------|
| Anonymous | ✅ Active (primary) | signInAnonymously → nickname entry |
| Twitter/X | ✅ Active | OAuth 2.0 PKCE via TwitterAuthService |
| Google | ⚙️ Configured | OAuth (email + profile scopes) |
| Discord | ⚙️ Configured | OAuth (identify + email scopes) |
| GitHub | ⚙️ Configured | OAuth (read:user + user:email scopes) |
| Apple | ⚙️ Configured | OAuth (email + name scopes) |
| Twitch | ⚙️ Configured | OAuth (user:read:email scopes) |
| Phantom (Solana) | ⚙️ Optional | Message signing, wallet link only |

### Key Files Reference

| File | LOC | Purpose |
|------|-----|---------|
| `services/supabase/client.ts` | 65 | Client init, config validation |
| `services/auth/SupabaseAuthService.ts` | 880 | Core auth (login, OAuth, events) |
| `services/auth/UserSessionService.ts` | 190 | Session management |
| `services/auth/UserPersistenceService.ts` | 227 | localStorage/cookie persistence |
| `services/auth/ProfileService.ts` | 303 | Profile CRUD via Railway |
| `services/auth/TwitterAuthService.ts` | 300+ | Twitter OAuth PKCE |
| `services/auth/PhantomAuthService.ts` | 150+ | Solana wallet auth |
| `contexts/UserContext.tsx` | 281 | React auth context + login flow |
| `stores/useAuthStore.ts` | 79 | Zustand auth state |
| `services/api/RailwayClient.ts` | 106 | JWT attachment + retry |
| `railway-market-server/src/middleware/auth.ts` | 208 | Server JWT verification |
| `components/screens/NicknameEntryScreen.tsx` | 427 | Auth UI |
| `components/screens/TwitterCallback.tsx` | 173 | OAuth callback handler |
| `components/settings/ProfileSettings.tsx` | 631 | OAuth linking/unlinking |
| `components/hub/PlayerProfile.tsx` | 588 | Profile modal (4 tabs) |
| `types/supabase.ts` | auto | Generated Supabase types |
| `types/supabase-extended.ts` | 73 | Custom views/functions types |

---

## Audit Findings

### ✅ Strengths (Keep)

1. **JWT Dual-Algorithm Support** — ES256 (new projects) + HS256 (legacy) with JWKS caching (10min TTL)
2. **PKCE OAuth** — Twitter uses secure PKCE flow, state validation with 10min expiry
3. **Auto Token Refresh** — Supabase SDK `autoRefreshToken: true` + RailwayClient single-retry on 401
4. **Offline Resilience** — Network errors don't sign out; stored user retained for offline play
5. **Anonymous Play** — Full game accessible without auth via `createAnonymousProfileId()`
6. **Session HMAC** — Per-session random secret, HMAC-SHA256 verification, one-time use
7. **Atomic Coin Operations** — `credit_coins()` PostgreSQL function with ledger entry
8. **Security Headers** — CSP, HSTS, X-Frame-Options, rate limiting on production server
9. **EventBus Integration** — `authStateChanged`, `twitterLoginSuccess`, `twitterUnlinked` for decoupled auth events
10. **Three-Tier Persistence** — localStorage → cookie fallback → async retry (Safari PWA compat)

### ⚠️ Critical Gaps

| # | Gap | Severity | Location | Impact |
|---|-----|----------|----------|--------|
| G1 | **No API rate limiting** | 🔴 Critical | `railway-market-server` | DDoS, abuse, coin farming |
| G2 | **OAuth tokens stored in plaintext** | 🔴 Critical | `identities` table | Token theft on DB breach |
| G3 | **No audit logging** | 🟠 High | All servers | No forensics capability |
| G4 | **SupabaseAuthService 0-4% coverage** | 🟠 High | `tests/services/auth/` | Regressions undetected |
| G5 | **No protected route guards** | 🟡 Medium | `GameScreenRouter.tsx` | Implicit auth checks only |
| G6 | **Missing token refresh endpoint** | 🟡 Medium | Railway API | Mid-game JWT expiry → lost session |
| G7 | **No JWKS key pinning** | 🟡 Medium | `auth.ts` middleware | JWKS endpoint compromise risk |
| G8 | **Profile nickname no regex** | 🟡 Medium | `POST /api/v1/profile` | XSS if reflected unescaped |
| G9 | **OAuth provider status unknown** | 🟡 Medium | Supabase dashboard | Google/Discord/GitHub untested |
| G10 | **Supabase types stale** | 🟡 Medium | `types/supabase.ts` | Schema drift risk |
| G11 | **No session secret recovery** | 🟢 Low | `sessions.ts` | Page refresh → lost verification |
| G12 | **Device fingerprint spoofable** | 🟢 Low | `device_profiles` | Single-factor only |

### 🔑 Exposed Secrets (Immediate Action)

| Secret | File | Risk |
|--------|------|------|
| `SUPABASE_JWT_SECRET` | `railway-market-server/.env` | 🔴 JWT forgery if repo public |
| `TWITTER_CLIENT_SECRET` | `.env` | 🔴 OAuth impersonation |
| `SUPABASE_ANON_KEY` | `.env` | 🟡 Limited by RLS, but exposed |

---

## Roadmap

### Phase 0 — Secret Rotation & Immediate Security (Day 1-2)

**Priority: 🔴 Critical | Effort: Small | Risk if skipped: Total auth bypass**

#### Tasks

- [ ] **0.1** Rotate `SUPABASE_JWT_SECRET` in Supabase dashboard → update Railway env var
- [ ] **0.2** Rotate `TWITTER_CLIENT_SECRET` in Twitter Developer Portal → update Railway env var
- [ ] **0.3** Regenerate `SUPABASE_ANON_KEY` if repo was ever public
- [ ] **0.4** Move ALL secrets to Railway environment variables exclusively
- [ ] **0.5** Add `.env` and `railway-market-server/.env` to `.gitignore` (verify `.env.local` already ignored)
- [ ] **0.6** Create `.env.example` files with placeholder values only
- [ ] **0.7** Run `git filter-branch` or BFG Repo Cleaner to purge secrets from git history (if repo was public)
- [ ] **0.8** Verify `SUPABASE_URL` JWKS endpoint accessible from Railway

#### Validation
```bash
# Verify secret rotation
curl -s https://nymgxiyrpaqcdlxqmhhd.supabase.co/auth/v1/.well-known/jwks.json | jq '.keys | length'
# Should return >= 1

# Verify Railway env vars
mcp__railway-mcp-server__list-variables  # Check SUPABASE_JWT_SECRET, DATABASE_URL, TWITTER_CLIENT_SECRET
```

---

### Phase 1 — API Rate Limiting & Input Validation (Week 1)

**Priority: 🔴 Critical | Effort: Medium | Risk if skipped: DDoS, coin farming, XSS**

#### Tasks

- [ ] **1.1** Install `express-rate-limit` in `railway-market-server`
- [ ] **1.2** Configure rate limiters:
  ```
  Global:           100 req/min per IP
  Auth routes:      20 req/min per IP
  Write routes:     50 req/min per JWT user
  Session verify:   1 req per sessionId (total, not per minute)
  Telemetry:        10 req/min per IP
  Leaderboard:      30 req/min per IP
  ```
- [ ] **1.3** Add nickname validation regex: `/^[a-zA-Z0-9_]{3,16}$/`
  - `POST /api/v1/profile` body validation (Zod schema)
  - `NicknameValidator` client-side (already exists, verify server-side)
- [ ] **1.4** Add `CHECK` constraint on `profiles.display_name` in schema
- [ ] **1.5** Sanitize all user-generated content returned in API responses (XSS prevention)
- [ ] **1.6** Add `helmet` middleware to Railway server for additional security headers
- [ ] **1.7** Enforce `Content-Type: application/json` on all POST/PATCH routes

#### Files to Modify
- `railway-market-server/src/index.ts` — Add rate limit middleware
- `railway-market-server/src/routes/profile.ts` — Nickname validation
- `railway-market-server/src/db/schema.sql` — CHECK constraint migration
- `railway-market-server/src/validation.ts` — Zod schemas

#### Tests
```bash
npx vitest run tests/services/auth/  # Existing auth tests
cd railway-market-server && npm run validate
```

---

### Phase 2 — Auth Service Testing & MSW Coverage (Week 1-2)

**Priority: 🟠 High | Effort: Medium | Risk if skipped: Regression in auth flow**

#### Tasks

- [ ] **2.1** Create MSW handlers for Supabase auth endpoints:
  ```typescript
  // tests/mocks/supabase-handlers.ts
  handlers = [
    http.post('*/auth/v1/token*', () => mockSession()),
    http.get('*/auth/v1/user', () => mockUser()),
    http.post('*/auth/v1/signup', () => mockSignup()),
    http.post('*/auth/v1/logout', () => ok()),
    http.get('*/auth/v1/.well-known/jwks.json', () => mockJWKS()),
  ];
  ```
- [ ] **2.2** Write unit tests for `SupabaseAuthService`:
  - `signInAnonymously()` — happy path + error mapping
  - `signInWithOAuth()` — provider URL generation, PKCE flow
  - `onAuthStateChange()` — all 6 event types
  - `signOut()` — cleanup verification
  - Error mapping — Turkish error messages
  - Target: **60%+ coverage** (from current 0-4%)
- [ ] **2.3** Write unit tests for `UserContext`:
  - `login()` — anonymous flow + Railway profile creation
  - `logout()` — persistence clearing + Supabase signout
  - Network error resilience (offline fallback)
  - Local vs remote mode detection
- [ ] **2.4** Write unit tests for `UserPersistenceService`:
  - Three-tier restore (localStorage → cookie → async retry)
  - Safari edge case (150ms delay)
  - Clear all storages
- [ ] **2.5** Write unit tests for `ProfileService`:
  - Profile validation flow
  - New user detection
  - Server error handling
- [ ] **2.6** Write unit tests for `RailwayClient`:
  - JWT attachment
  - 401 → refresh → retry flow
  - Refresh failure handling
- [ ] **2.7** Add integration test: full login → play → logout cycle

#### Coverage Targets
| Service | Current | Target |
|---------|---------|--------|
| SupabaseAuthService | ~4% | 60% |
| UserContext | ~10% | 70% |
| UserPersistenceService | ~15% | 80% |
| ProfileService | ~20% | 70% |
| RailwayClient | ~30% | 80% |

---

### Phase 3 — OAuth Provider Verification & Hardening (Week 2-3)

**Priority: 🟠 High | Effort: Medium | Risk if skipped: Broken OAuth, token theft**

#### Tasks

- [ ] **3.1** Verify all OAuth providers in Supabase dashboard:
  - [ ] Google — test login flow end-to-end
  - [ ] Discord — test login flow end-to-end
  - [ ] GitHub — test login flow end-to-end
  - [ ] Apple — test login flow end-to-end
  - [ ] Twitch — test login flow end-to-end
  - [ ] Twitter/X — already working, verify callback URLs match production
- [ ] **3.2** Configure Supabase redirect URLs:
  ```
  https://crypto-survivors.com/auth/callback
  https://crypto-survivors.up.railway.app/auth/callback
  http://localhost:3000/auth/callback (dev only)
  ```
- [ ] **3.3** Encrypt OAuth tokens at rest:
  - Option A: Use `pgcrypto` extension for column-level encryption
  - Option B: Encrypt/decrypt in application layer before DB write
  - Columns: `identities.access_token`, `identities.refresh_token`
- [ ] **3.4** Add OAuth token rotation:
  - Check `token_expires_at` on provider link request
  - Auto-refresh expired tokens using `refresh_token`
  - Remove stale tokens (>30 days expired, no refresh)
- [ ] **3.5** Add provider badge display for all OAuth providers:
  - Currently only Twitter has full UI support
  - `ProfileSettings.tsx` already handles linking/unlinking
  - Add provider-specific icons and status for Google, Discord, GitHub, Apple, Twitch
- [ ] **3.6** Implement "last provider" protection:
  - Already partially implemented (line 482 ProfileSettings)
  - Add server-side validation: `DELETE /api/v1/identities/:provider` should check remaining providers > 0
- [ ] **3.7** Add Playwright E2E tests for OAuth flows (mock provider):
  ```typescript
  test('can link and unlink Google provider', async ({ page }) => { ... });
  test('cannot unlink last auth method', async ({ page }) => { ... });
  ```

#### Supabase Dashboard Checklist
- [ ] Auth > URL Configuration > Site URL matches production
- [ ] Auth > URL Configuration > Redirect URLs include all valid origins
- [ ] Auth > Providers > Each enabled provider has valid client ID/secret
- [ ] Auth > Email Templates > Custom templates (not default Supabase)
- [ ] Auth > Rate Limits > Email: 3/hour, SMS: off
- [ ] Auth > Sessions > JWT expiry: 3600s (1 hour)
- [ ] Auth > Sessions > Refresh token rotation: enabled

---

### Phase 4 — Audit Logging & Observability (Week 3-4)

**Priority: 🟠 High | Effort: Medium | Risk if skipped: No forensics, no incident response**

#### Tasks

- [ ] **4.1** Create `audit_log` table:
  ```sql
  CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_audit_log_profile ON audit_log(profile_id);
  CREATE INDEX idx_audit_log_action ON audit_log(action);
  CREATE INDEX idx_audit_log_created ON audit_log(created_at);
  ```
- [ ] **4.2** Add audit logging middleware:
  ```typescript
  // Actions to log:
  'auth.login'           // Successful login
  'auth.logout'          // Logout
  'auth.token_refresh'   // Token refresh
  'auth.failed'          // Failed auth attempt
  'profile.create'       // Profile creation
  'profile.update'       // Profile update
  'identity.link'        // OAuth provider linked
  'identity.unlink'      // OAuth provider unlinked
  'wallet.credit'        // Coins credited
  'wallet.spend'         // Coins spent (meta purchase)
  'session.start'        // Game session started
  'session.verify'       // Session verified
  'session.suspicious'   // Suspicious activity detected
  ```
- [ ] **4.3** Add cleanup function (90 day retention):
  ```sql
  CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_ago INT DEFAULT 90, batch_size INT DEFAULT 5000)
  RETURNS INT AS $$ ... $$;
  ```
- [ ] **4.4** Add admin query views:
  ```sql
  CREATE VIEW v_auth_activity AS
  SELECT profile_id, action, COUNT(*), MAX(created_at)
  FROM audit_log
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY profile_id, action;
  ```
- [ ] **4.5** Add failed auth attempt tracking:
  - Log IP, user agent, failure reason
  - Alert on >10 failed attempts from same IP in 5 minutes
- [ ] **4.6** Add `/api/v1/admin/audit` endpoint (admin-only, separate auth)

---

### Phase 5 — Auth Architecture Improvements (Week 4-6)

**Priority: 🟡 Medium | Effort: Large | Risk if skipped: Technical debt accumulation**

#### Tasks

- [ ] **5.1** Add `AuthGuard` component:
  ```typescript
  // components/auth/AuthGuard.tsx
  export const AuthGuard: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
    children,
    fallback = <NicknameEntryScreen />,
  }) => {
    const { isAuthenticated, isLoading } = useUser();
    if (isLoading) return <LoadingSpinner />;
    if (!isAuthenticated) return fallback;
    return children;
  };
  ```
- [ ] **5.2** Refactor `SupabaseAuthService` (880 LOC → <300 LOC):
  - Extract `OAuthFlowManager` — OAuth-specific logic
  - Extract `AuthEventHandler` — EventBus integration
  - Extract `AuthErrorMapper` — Turkish error mapping
  - Keep core: init, signIn, signOut, getSession
- [ ] **5.3** Add JWKS key pinning:
  ```typescript
  // Whitelist expected key IDs from Supabase
  const PINNED_KEY_IDS = ['key-id-from-supabase'];
  // Reject tokens with unknown kid
  ```
- [ ] **5.4** Add session secret recovery mechanism:
  - Store encrypted sessionSecret in server session
  - Add `GET /api/v1/sessions/:id/recover` endpoint (auth required)
  - Return sessionSecret only to session owner
- [ ] **5.5** Regenerate Supabase types:
  ```bash
  npm run supabase:gen
  ```
  - Verify generated types match Railway schema
  - Update `types/supabase-extended.ts` if new views/functions added
- [ ] **5.6** Add auth metrics to `/stats` endpoint:
  ```json
  {
    "auth": {
      "activeJWTs": 42,
      "failedAuthLast24h": 3,
      "oauthLinksToday": 7,
      "anonymousUsersToday": 128
    }
  }
  ```
- [ ] **5.7** Add Phantom wallet integration to ProfileSettings:
  - Currently separate from main auth flow
  - Add wallet address display in profile
  - Add link/unlink UI alongside other providers
- [ ] **5.8** Implement multi-device session management:
  - Show active sessions in profile
  - Allow revoking other sessions
  - Uses Supabase admin API

---

### Phase 6 — Production Hardening & Monitoring (Ongoing)

**Priority: 🟡 Medium | Effort: Ongoing**

#### Tasks

- [ ] **6.1** Set up Supabase auth webhook notifications:
  - `user.signed_in` → sync profile activity
  - `user.deleted` → cascade cleanup in Railway DB
  - `user.updated` → sync email/metadata changes
- [ ] **6.2** Configure Supabase Auth email templates:
  - Custom branding (Crypto Survivors theme)
  - Password reset flow
  - Email verification flow
  - Magic link template
- [ ] **6.3** Add auth health check to `/health` endpoint:
  ```typescript
  // Check Supabase JWKS reachability
  const jwksOk = await fetchJWKS().then(() => true).catch(() => false);
  // Check DB connectivity
  const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
  ```
- [ ] **6.4** Add connection pool monitoring:
  - Log pool exhaustion events
  - Alert when >80% connections in use
  - Consider increasing `max` from 10 if traffic grows
- [ ] **6.5** Add auth-specific error tracking tags:
  ```typescript
  ErrorTracker.addTag('auth-flow');
  ErrorTracker.captureError({
    category: 'auth',
    severity: 'high',
    context: { provider, stage, errorCode }
  });
  ```
- [ ] **6.6** Create Grafana/monitoring dashboard:
  - Auth success/failure rate
  - JWT refresh frequency
  - OAuth provider usage distribution
  - Rate limit hits
  - Audit log volume

---

## Environment Variables Checklist

### Frontend (Vite)
| Variable | Required | Current Status |
|----------|----------|----------------|
| `VITE_SUPABASE_URL` | ✅ | Set in `.env` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Set in `.env` |
| `VITE_RAILWAY_API_URL` | ✅ | Set in `.env` |
| `VITE_MARKET_AGGREGATOR_URL` | Optional | Falls back to RAILWAY_API_URL |
| `VITE_TWITTER_CLIENT_ID` | Optional | Set in `.env` |
| `VITE_TWITTER_REDIRECT_URI` | Optional | Set in `.env` |
| `VITE_CF_PRICE_ORACLE_URL` | Optional | Anti-cheat price oracle |
| `VITE_CF_SESSION_VALIDATOR_URL` | Optional | Anti-cheat session validator |
| `VITE_MARKET_RUNTIME_MODE` | Optional | `legacy`/`dual`/`runtime` |

### Railway API Server
| Variable | Required | Current Status |
|----------|----------|----------------|
| `DATABASE_URL` | ✅ | Railway auto-provisioned |
| `SUPABASE_URL` | ✅ | For JWKS endpoint |
| `SUPABASE_JWT_SECRET` | ✅ | For HS256 fallback |
| `TWITTER_CLIENT_ID` | Optional | For OAuth token exchange |
| `TWITTER_CLIENT_SECRET` | Optional | For OAuth token exchange |
| `PORT` | Optional | Default 3001 |

### Railway Market Aggregator
| Variable | Required | Current Status |
|----------|----------|----------------|
| `DATABASE_URL` | ✅ | Shared with API server |
| `PORT` | Optional | Default 3002 |

---

## Database Schema Auth-Related Tables

```sql
-- Core auth mapping
profiles (
  id UUID PK,
  auth_user_id UUID UNIQUE,  -- Maps to Supabase JWT 'sub' claim
  display_name TEXT,
  avatar_url TEXT,
  ...
)

-- OAuth provider links
identities (
  id UUID PK,
  profile_id UUID FK → profiles,
  provider TEXT,              -- 'twitter', 'google', 'discord', 'github'
  provider_user_id TEXT,
  provider_username TEXT,
  access_token TEXT,          -- ⚠️ PLAINTEXT (Phase 3.3 encrypts)
  refresh_token TEXT,         -- ⚠️ PLAINTEXT
  token_expires_at TIMESTAMPTZ,
  UNIQUE(provider, provider_user_id)
)

-- Virtual wallet (auto-created by trigger)
virtual_accounts (
  id UUID PK,
  profile_id UUID FK → profiles UNIQUE,
  gold_balance BIGINT CHECK (>= 0),
  ...
)

-- Immutable transaction history
ledger (
  id UUID PK,
  profile_id UUID FK → profiles,
  type TEXT,                  -- 'game_reward', 'meta_purchase', etc.
  amount BIGINT,
  balance_after BIGINT,
  reference_id UUID,          -- session_id
  ...
)

-- Game sessions (HMAC verified)
sessions (
  id UUID PK,
  profile_id UUID FK → profiles,
  session_secret TEXT NOT NULL, -- Random 32 bytes hex
  is_verified BOOLEAN,
  ...
)

-- Proposed: Audit log (Phase 4)
audit_log (
  id UUID PK,
  profile_id UUID FK → profiles,
  action TEXT,
  resource TEXT,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ
)
```

---

## Success Metrics

| Metric | Current | Phase | Target |
|--------|---------|-------|--------|
| Secrets in git | 3+ exposed | P0 | 0 |
| API rate limiting | None | P1 | All routes covered |
| SupabaseAuthService coverage | ~4% | P2 | 60%+ |
| UserContext coverage | ~10% | P2 | 70%+ |
| OAuth providers tested | 1 (Twitter) | P3 | All 6 verified |
| Audit log coverage | 0 actions | P4 | 12+ action types |
| Auth service LOC | 880 (monolith) | P5 | <300 (split into 4) |
| Failed auth forensics | No data | P4 | Full IP/UA/reason logging |
| JWT refresh reliability | Manual refresh only | P5 | Auto + recovery endpoint |

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation Phase |
|------|-------------|--------|------------------|
| JWT secret leaked | High (in git) | Critical | P0 |
| DDoS on public endpoints | Medium | High | P1 |
| OAuth token theft | Low | High | P3 |
| Auth regression in deploy | Medium | Medium | P2 |
| Supabase JWKS compromise | Very Low | Critical | P5 |
| Mid-game JWT expiry | Medium | Low | P5 |

---

## Open Questions

1. **Supabase Free Tier Limits** — Is the project hitting any Supabase auth rate limits? Check Supabase dashboard > Auth > Usage.
2. **Anonymous → OAuth Upgrade** — When an anonymous user links an OAuth provider, does Supabase correctly merge the identities? Test this flow.
3. **Multi-Tab Support** — If user logs out in one tab, do other tabs detect the signout? (Supabase `onAuthStateChange` should handle this via `SIGNED_OUT` event across tabs.)
4. **JWT Expiry Duration** — Current Supabase default is 3600s (1 hour). Should this be shorter for security or longer for UX?
5. **Admin Dashboard Auth** — Is there a separate admin auth mechanism, or does it piggyback on regular user auth?
6. **GDPR/Privacy** — Are there data deletion endpoints for user account removal? (`DELETE /api/v1/profile` + Supabase `admin.deleteUser()`?)
