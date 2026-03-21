# :Mag: Backend & DB Gap Analysis

> **Date**: 2026-03-19 | **Method**: Orchestrated code review across backend, DB, and docs surfaces
> **Primary Sources**: `railway-market-server/src/index.ts`, `src/routes/*.ts`, `src/db/schema.ts`, `src/db/migrate.ts`, `docs/DATABASE_SCHEMA.md`, `docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md`, `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md`

## :Summary: Executive Summary

The current runtime architecture is materially ahead of the documentation set.

- `docs/DATABASE_SCHEMA.md` is mostly aligned with the Railway PostgreSQL model.
- The broader backend/API contract is not documented in one place.
- The worst active-document conflicts have been cleaned up, but the report remains useful as a record of what was wrong on 2026-03-19.
- Stored procedures, public ingestion surfaces, and auth guardrail assumptions are under-documented relative to their operational risk.

## :CheckCircle: What Is Already Well Covered

| Area | Current Coverage | Notes |
|---|---|---|
| Table inventory | Strong | `docs/DATABASE_SCHEMA.md` tracks the 16-table Railway PostgreSQL model well |
| High-level topology | Medium | `docs/DATABASE_SCHEMA.md` correctly frames Supabase Auth vs Railway PostgreSQL |
| Auth intent | Medium | `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` now captures the current identity/runtime boundary, but deeper provider-specific operational detail is still light |
| DB object ownership | Weak | Functions/views/triggers exist in code and SQL but are not consistently surfaced in architecture docs |
| API contract | Weak | No central route matrix with auth, payload, response, and failure modes |

## :AlertTriangle: High-Priority Gaps

| Gap | Evidence | Impact | Priority |
|---|---|---|---|
| No single backend API contract document | Request/response schema knowledge is fragmented across route files | Frontend drift, onboarding friction, harder incident response | P0 |
| Historical Supabase DB topology is preserved only in archive | `docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md` still contains the old `players`, `game_sessions`, `price_logs`, and edge-function model, but it is no longer part of the active docs surface | Residual confusion is lower, but engineers should still avoid treating archived reports as runtime truth | Resolved |
| Auth architecture doc was stale | `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` previously referenced RLS, `handle_new_user()`, and Supabase-managed table semantics; the active doc now reflects the current boundary | Historical confusion addressed in active docs; archived migration notes still exist for context | Resolved |
| Stored procedure dependencies are not explicit in docs | `credit_coins`, `transfer_meta_coins`, `purchase_meta_upgrade`, cleanup functions, and leaderboard views drive runtime behavior but are scattered across SQL | Root-cause analysis requires source spelunking | P1 |
| Public ingestion surfaces lack guardrail docs | `/sessions/sync` and `/api/v1/telemetry/*` accept broad client payloads with partial validation | Security review and abuse hardening are harder to reason about | P1 |
| Market SSE contract is under-documented | `marketStream.ts` payload, heartbeat behavior, and history warmup contract only exist in code | Client/runtime integration risk during refactors | P1 |
| Cleanup/retention behavior is implicit | Cleanup cron and PG retention helpers are not captured in backend ops docs | Production data growth and retention policy become tribal knowledge | P2 |

## :Bug: Concrete Documentation Conflicts

### 1. Railway PostgreSQL vs legacy Supabase DB report

`docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md` still states:

- Supabase PostgreSQL is the active app database
- `players`, `game_sessions`, and `price_logs` are live table names
- Supabase edge functions `start-session` and `verify-game` are active runtime dependencies
- RLS corrections are part of the active integration state

Current code contradicts this:

- Runtime DB access is through Railway PostgreSQL via `DATABASE_URL`
- Active tables are defined in `railway-market-server/src/db/schema.ts`
- Session start/verify now live in Express route handlers under `src/routes/sessions.ts`
- Supabase is used for auth trust, not app persistence

### 2. Auth architecture doc vs current persistence model

`docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` previously referenced:

- RLS as the protection model for app tables
- Supabase DB triggers/functions such as `handle_new_user()`
- older wallet/profile persistence assumptions that do not map to current Railway PostgreSQL schema

Current code uses:

- Supabase JWT verification in backend middleware
- `profiles.auth_user_id` lookup to resolve app identity
- PostgreSQL triggers `handle_new_profile()` and `handle_new_meta_progression()` inside Railway DB

## :Database: DB-Specific Gaps

| Area | Missing or Weak Coverage | Recommended Doc Action |
|---|---|---|
| Table-to-route mapping | `docs/DATABASE_SCHEMA.md` does not clearly map each table to the route modules that read/write it | Add route ownership column or cross-reference section |
| Functions/views/triggers | Present, but not treated as first-class runtime contracts | Add dedicated DB object dependency section |
| Migration model | Startup-applied inlined migrations are not described as the deploy mechanism | Document `_migrations` table, boot-time migration behavior, and rollback expectations |
| Retention strategy | `cleanup_old_*` helpers and replay pruning are not summarized in one place | Add retention and pruning section |
| Validation mismatch | Some route payloads are zod-backed, others are still manual casts | Add doc section on validated vs weakly validated write surfaces |

## :Server: Backend-Specific Gaps

| Area | Missing or Weak Coverage | Recommended Doc Action |
|---|---|---|
| Route matrix | No central path/auth/payload/response/failure table | Add dedicated API contract doc |
| Reward pipeline | HMAC verification and DB reward RPC chain not described end-to-end | Add reward verification sequence diagram |
| SSE contract | No payload field list or client lifecycle note | Document stream payload, heartbeat, reconnect assumptions, history warmup |
| Telemetry ingestion | Public write endpoints and batch semantics not documented | Add telemetry surface and abuse considerations |
| Debug and health operations | `/health`, `/stats`, `/debug`, `/cleanup` are discoverable only in code | Add operational endpoints section |

## :ClipboardList: Recommended Documentation Backlog

### P0

1. Add and maintain a canonical backend route contract document.
2. Keep `docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md` archived and out of the active navigation surface.
3. Keep `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` focused on the current identity/runtime boundary and avoid reintroducing DB-era assumptions.

### P1

1. Extend `docs/DATABASE_SCHEMA.md` with functions/views/triggers and route ownership.
2. Add reward verification and economy write-path documentation.
3. Add market stream and telemetry ingestion docs.

### P2

1. Add operational runbook notes for migrations, cleanup, and debug endpoints.
2. Add data-retention policy notes for price history, telemetry, cheat reports, and replay pruning.

## :Hammer: Recommended Next Edits

| File | Suggested Change |
|---|---|
| `docs/DATABASE_SCHEMA.md` | Add cross-links to route ownership and stored procedures |
| `docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md` | Keep archived; do not treat it as current architecture |
| `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` | Split current-state auth flow from legacy Supabase DB/RLS content |
| `docs/architecture/BACKEND_DB_ARCHITECTURE.md` | Treat as the living current-state architecture source |

## :Flag: Conclusion

The codebase already has a coherent backend/DB runtime, but the documentation stack is split between one mostly-current schema reference and several stale transition-era documents. The highest-value correction is not more prose in many places; it is reducing ambiguity by making one current-state architecture doc authoritative and aggressively labeling or retiring legacy documents that still describe the old system.
