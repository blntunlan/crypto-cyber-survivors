# Railway Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop invalid local profile IDs from causing telemetry foreign-key violations, then harden Railway production configuration with verified rollback gates.

**Architecture:** Client and server both normalize the local-only zero UUID to `null` before persistence. The database foreign key remains unchanged. Railway secret cleanup, public database access removal, and backup validation happen as isolated operational phases with a read-back verification after every mutation.

**Tech Stack:** React 19, TypeScript 5.8, Vitest 4, Express, Drizzle ORM, Railway MCP/CLI, Railway Postgres.

## Global Constraints

- Preserve `product_telemetry_events.profile_id` foreign-key integrity; never create a synthetic production profile for the local-only UUID.
- Anonymous/pre-auth product events must still persist with `profile_id = null`.
- Never print, commit, or copy secret values; record variable names only.
- Use exact Railway project `7e349459-edc0-46b1-9e22-908b278ced1e` and production environment `ee6069d4-a540-4b58-85bc-6de7e726f463`.
- Do not change unrelated user worktree changes.
- Do not remove a Railway resource without fresh user approval when the removal is destructive.

---

### Task 1: Normalize local telemetry identity in the client

**Files:**
- Modify: `services/analytics/ProductAnalyticsService.ts`
- Test: `tests/services/analytics/ProductAnalyticsService.test.ts`

**Interfaces:**
- Consumes: `UserSessionService.getProfileId(): string`.
- Produces: POST body with `profile_id: string | null` to `/api/v1/telemetry/product-events`.

- [ ] **Step 1: Write the failing client regression tests**

Add tests that set `mocks.getProfileId` to `00000000-0000-4000-a000-000000000000` and `anon_demo123`, call `ProductAnalyticsService.track({ eventType: 'season_joined' })`, and assert `mocks.post` receives `profile_id: null`.

- [ ] **Step 2: Verify the tests fail before production changes**

Run: `npx vitest run tests/services/analytics/ProductAnalyticsService.test.ts --pool=forks --maxWorkers=1`

Expected: the zero UUID test fails because the request body contains the sentinel UUID.

- [ ] **Step 3: Add minimal client normalization**

Add `LOCAL_ONLY_PROFILE_ID` and a helper that returns `null` for the sentinel, `anon_` values, absent values, and malformed UUIDs; preserve real UUIDs. Use it for the `profile_id` payload field.

- [ ] **Step 4: Verify client behavior**

Run: `npx vitest run tests/services/analytics/ProductAnalyticsService.test.ts --pool=forks --maxWorkers=1`

Expected: all ProductAnalyticsService tests pass.

### Task 2: Defend the public telemetry route

**Files:**
- Modify: `railway-market-server/src/routes/telemetry.ts`
- Test: `railway-market-server/tests/routes/telemetryAdminVisibility.test.ts`

**Interfaces:**
- Consumes: product event request fields `profile_id`, `session_id`, and `event_type`.
- Produces: a Drizzle insert where the local-only UUID maps to `profileId: null`.

- [ ] **Step 1: Write the failing server regression test**

POST a valid `wallet_connected` event with `profile_id: '00000000-0000-4000-a000-000000000000'`, assert HTTP 200, and assert the final `mocks.values` product-event payload includes `profileId: null`.

- [ ] **Step 2: Verify the test fails before production changes**

Run: `npm test -- telemetryAdminVisibility.test.ts`

Working directory: `railway-market-server`

Expected: the inserted payload contains the zero UUID instead of `null`.

- [ ] **Step 3: Add server-side sentinel normalization**

Define `LOCAL_ONLY_PROFILE_ID` beside `UUID_REGEX`. Update `asOptionalUuid` to return `null` when its normalized UUID equals the sentinel, while preserving other valid UUIDs for both profile and session inputs.

- [ ] **Step 4: Verify the route regression and package validation**

Run: `npm test -- telemetryAdminVisibility.test.ts`

Run: `npm run validate`

Working directory: `railway-market-server`

Expected: the route test and package validation both exit with code 0.

### Task 3: Verify code changes before release

**Files:**
- Modify: `docs/superpowers/specs/2026-07-13-railway-production-hardening-design.md` only if verification reveals a design correction.
- Modify: `docs/superpowers/plans/2026-07-13-railway-production-hardening.md` to mark completed local tasks.

- [ ] **Step 1: Run focused cross-package tests**

Run: `npx vitest run tests/services/analytics/ProductAnalyticsService.test.ts railway-market-server/tests/routes/telemetryAdminVisibility.test.ts --pool=forks --maxWorkers=1`

Expected: all targeted tests pass.

- [ ] **Step 2: Run the root release gate**

Run: `npm run check:baseline`

Expected: typecheck, architecture checks, lint, tests, and build pass.

- [ ] **Step 3: Capture the exact release diff**

Run: `git diff -- services/analytics/ProductAnalyticsService.ts tests/services/analytics/ProductAnalyticsService.test.ts railway-market-server/src/routes/telemetry.ts railway-market-server/tests/routes/telemetryAdminVisibility.test.ts`

Expected: only telemetry normalization and regression-test changes appear.

### Task 4: Remove stale Supabase variables with service-level gates

**Files:**
- No repository code changes.
- Record variable names and verification timestamps in `docs/reports/` only if the user requests persistent audit documentation.

**Interfaces:**
- Consumes: Railway production variable names for `crypto-survivors` and `market-server`.
- Produces: services with no Supabase-named variables and healthy deployments.

- [ ] **Step 1: Reconfirm runtime non-use and snapshot names**

Search runtime code excluding docs/tests/e2e for `VITE_SUPABASE_` and `SUPABASE_`. List Railway variable names without values for rollback notes.

- [ ] **Step 2: Remove frontend variables**

Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `crypto-survivors` production. Read the variable list back and run frontend `/health` plus auth/profile smoke requests.

- [ ] **Step 3: Remove backend variables**

Remove `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_WEBHOOK_SECRET` from `market-server` production. Read the variable list back and check build/runtime logs for missing-variable errors.

- [ ] **Step 4: Revoke or rotate retired credentials**

After successful Railway removal, revoke or rotate the former provider credentials without recording secret material in the repository or chat.

### Task 5: Disable public Postgres access with rollback readiness

**Files:**
- No repository code changes.

**Interfaces:**
- Consumes: `market-server` and `market-aggregator` private `DATABASE_URL` references.
- Produces: Postgres with no public TCP proxy on `5432` and healthy private consumers.

- [ ] **Step 1: Perform pre-change checks**

Read service config and current status. Verify backend `DATABASE_URL` values are Railway reference/private-domain expressions and no runtime source uses `DATABASE_PUBLIC_URL`.

- [ ] **Step 2: Validate application paths before mutation**

Check `market-server` and `market-aggregator` health endpoints, profile/auth flow, session verification route, and market SSE connection. Fetch recent logs and require no connection errors.

- [ ] **Step 3: Remove the `5432` public TCP proxy**

Apply the Railway configuration change only after pre-change checks succeed. Record the rollback action: recreate the TCP proxy on `5432` if private consumers fail.

- [ ] **Step 4: Read back and smoke test**

Verify Postgres service config no longer contains `tcpProxies.5432`; re-run the health, auth/profile, session, and SSE checks; inspect logs through one cleanup/leaderboard refresh cycle.

### Task 6: Execute a non-production restore drill

**Files:**
- No repository code changes unless a user-requested audit report is added.

**Interfaces:**
- Consumes: a current production Postgres backup and an isolated restore target.
- Produces: documented backup timestamp, restore duration, schema/migration verification, and integrity result.

- [ ] **Step 1: Confirm backup availability**

Inspect Railway backup metadata for the production Postgres volume and record only the backup timestamp and restore point identifier.

- [ ] **Step 2: Provision an isolated restore target**

Create a temporary database service or isolated environment with no application service references. Do not change production variables.

- [ ] **Step 3: Restore and run read-only integrity queries**

Verify `_migrations` entries, table existence, representative counts for `profiles`, `sessions`, `market_state`, and `product_telemetry_events`, plus foreign-key integrity checks.

- [ ] **Step 4: Obtain explicit deletion approval**

Present restore result and resource cost. Delete the temporary restore target only after explicit user approval.
