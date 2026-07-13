# Railway Production Hardening Design

**Date:** 2026-07-13

**Status:** Approved

## Objective

Eliminate rejected product-telemetry writes and reduce production infrastructure exposure without combining unrelated changes into one irreversible maintenance event.

## Scope

This design covers four independently verifiable workstreams:

1. Prevent the local-only zero UUID from reaching product telemetry as a profile foreign key.
2. Remove stale Supabase variables from Railway production after proving that runtime code does not consume them.
3. Disable the Postgres public TCP proxy after proving all application traffic uses Railway private networking.
4. Verify backup availability and complete a restore drill into an isolated temporary database.

## Non-Goals

- No changes to authentication behavior, gameplay, rewards, or market calculations.
- No database schema relaxation and no insertion of a fake profile row for the zero UUID.
- No removal of the `product_telemetry_events.profile_id` foreign key.
- No production database mutation for the restore drill.
- No simultaneous rollout of all four workstreams.

## Current Evidence

- All four production services are currently healthy: `crypto-survivors`, `market-server`, `market-aggregator`, and `Postgres`.
- Postgres logs contain repeated `product_telemetry_events_profile_id_fkey` violations for `00000000-0000-4000-a000-000000000000`.
- `ProductAnalyticsService` accepts that sentinel as a syntactically valid UUID and sends it as `profile_id`.
- The telemetry route also accepts the sentinel as a syntactically valid UUID before the database rejects it.
- Runtime repository search found no use of `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_WEBHOOK_SECRET` outside archived documentation and historical tests.
- Runtime repository search found no `DATABASE_PUBLIC_URL`, `psql`, or direct public Postgres dependency.
- `market-server` and `market-aggregator` use `DATABASE_URL`; their Railway services are expected to resolve it through a Postgres reference/private domain.
- The Postgres service exposes a public TCP proxy on port `5432`.

## Design Decisions

### 1. Treat Local Identity as Non-Persistable Telemetry Identity

The client will centralize the rule that local-only and anonymous identifiers are not valid persisted profile IDs. `ProductAnalyticsService` will send `profile_id: null` when the candidate is:

- the local-only zero UUID;
- an `anon_` identifier;
- absent; or
- not a valid UUID.

The server will independently normalize the zero UUID to `null`. Client validation improves behavior, while server validation protects the public telemetry endpoint from stale clients and direct callers.

The event itself remains accepted because product analytics supports pre-authentication activity. Only the invalid profile association is removed.

### 2. Preserve the Database Foreign Key

The database constraint is behaving correctly and remains unchanged. The application must not create a synthetic profile for development identity, because that would contaminate production analytics and profile counts.

### 3. Remove Railway Variables in Two Batches

Stale variables will be removed only after a fresh code/config inventory:

1. Frontend batch: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Backend batch: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_WEBHOOK_SECRET`.

Each batch gets its own deployment and smoke-test gate. Secret values are never printed or copied into reports. If any removed secret remains valid at the former provider, it must be rotated or revoked after successful removal.

### 4. Disable Public Postgres Access as a Separate Change

The public TCP proxy will be disabled only after confirming:

- both backend services reference the Postgres private `DATABASE_URL`;
- no repository script depends on `DATABASE_PUBLIC_URL`;
- application healthchecks and core API flows pass immediately before the change.

After disabling the proxy, the deployment state is not changed. The following production smoke tests must pass:

- `market-server` health endpoint;
- `market-aggregator` health endpoint;
- profile/auth request;
- session start and verification path;
- market SSE stream;
- database cleanup/leaderboard cron health visible in logs.

If private connectivity fails, the rollback is to restore the TCP proxy while preserving the private connection variables.

### 5. Restore Into Isolation

Backup verification has two levels:

1. Confirm Railway reports an available, recent backup for the production Postgres volume.
2. Restore the selected backup into a temporary isolated Postgres service or environment that has no production application references.

The restore drill validates schema presence, migration history, representative row counts, and foreign-key integrity using read-only queries. The temporary restore service is deleted only after results are recorded and deletion is explicitly approved.

## Rollout Sequence

### Phase A: Telemetry Fix

1. Add failing client and server tests for the zero UUID.
2. Implement client normalization.
3. Implement server normalization.
4. Run targeted tests, package validation, and the repository baseline gate.
5. Deploy application services through the normal Git-based release path.
6. Observe Postgres and API logs for at least 24 hours.

Exit condition: no new zero-UUID telemetry foreign-key violations appear after the deployment timestamp.

### Phase B: Variable Cleanup

1. Re-run runtime reference inventory.
2. Capture variable names only for rollback documentation.
3. Remove frontend variables and deploy the frontend.
4. Run frontend/auth/API smoke tests.
5. Remove backend variables and deploy `market-server`.
6. Run auth, profile, session, wallet, leaderboard, and telemetry smoke tests.
7. Revoke or rotate still-valid Supabase credentials.

Exit condition: application behavior is unchanged and no missing-variable errors appear in build or runtime logs.

### Phase C: Private-Only Postgres

1. Confirm private database references in both backend services.
2. Run pre-change health and transaction smoke tests.
3. Disable the public TCP proxy.
4. Repeat the health and transaction smoke tests.
5. Observe Postgres connection and application logs for at least one normal cleanup/refresh cycle.

Exit condition: all application paths remain healthy and no connection errors occur.

### Phase D: Backup Restore Drill

1. Identify the newest eligible backup and record its timestamp.
2. Provision an isolated restore target.
3. Restore without changing production service references.
4. Run read-only integrity checks.
5. Record recovery point and elapsed restore time.
6. Request approval before deleting the temporary resource.

Exit condition: the restored database passes integrity checks and the recovery procedure is documented.

## Error Handling and Rollback

- Telemetry code rollback: redeploy the previous successful Git commit. The database schema does not change.
- Variable cleanup rollback: restore only the removed variable names from Railway's prior configuration, then redeploy the affected service.
- TCP proxy rollback: recreate the public proxy on port `5432`; do not alter private `DATABASE_URL` references.
- Restore drill failure: preserve production unchanged, capture the failed stage and logs, and stop before deleting diagnostic resources.
- Any `5xx`, healthcheck failure, authentication regression, or database connection error blocks progression to the next phase.

## Testing Strategy

### Unit and Route Tests

- Client analytics sends `profile_id: null` for the zero UUID.
- Client analytics sends `profile_id: null` for `anon_` and malformed identifiers.
- Client analytics preserves a real UUID.
- Telemetry route converts the zero UUID to `null`.
- Telemetry route preserves a real UUID.
- Product events remain accepted without a profile.

### Validation Gates

- Targeted root Vitest tests for `ProductAnalyticsService`.
- Targeted market-server route tests for product telemetry.
- `npm run validate` in `railway-market-server`.
- Root `npm run check:baseline` before release.

### Production Verification

- Fresh Railway status reports all services healthy.
- Latest build and runtime logs contain no missing-variable or connection errors.
- HTTP logs contain no new `5xx` regression.
- Postgres logs contain no new zero-UUID telemetry FK violations after Phase A.
- Metrics show no abnormal CPU, memory, disk, or connection-pressure increase.

## Acceptance Criteria

- Zero-UUID product telemetry writes no longer violate the profile foreign key.
- Anonymous and pre-login product events continue to be stored with `profile_id = null`.
- All seven stale Supabase variable names are absent from production Railway services.
- Removed Supabase credentials are revoked or rotated if they remain valid.
- Postgres has no public TCP proxy and both application backends remain healthy over private networking.
- A recent backup is restored into isolation and passes documented integrity checks.
- Every phase has an independently tested rollback path.
- No secret values are written to source control, logs, or audit documentation.

## Operational Ownership

- Code and tests: repository implementation workflow.
- Deploy verification, variable cleanup, and network change: Railway MCP/CLI with explicit project, environment, and service IDs.
- Credential revocation: provider-side operation performed only after Railway cleanup succeeds.
- Temporary restore deletion: destructive action requiring explicit user confirmation.
