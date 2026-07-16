# CI-Gated Deploy and Lint Hardening Design

**Date:** 2026-07-13

**Status:** Approved

## Objective

Make successful GitHub CI the only normal path to Railway production deployment while closing the identified test, lint, hook, and Docker validation gaps across the frontend, API server, and market aggregator.

## Scope

This design covers:

1. Railway GitHub autodeploy gating for all three application services.
2. CI execution of frontend, API server, and aggregator tests and validation.
3. Correct, cross-platform pre-commit and pre-push feedback.
4. ESLint, TypeScript, Prettier, and lint-staged coverage alignment.
5. Deterministic Docker dependency installation and consistent build validation.
6. Explicit separation between normal CI-gated deployment and manual recovery deployment.

## Non-Goals

- No gameplay, authentication, economy, market calculation, or database schema changes.
- No replacement of GitHub Actions, Railway, Husky, ESLint, Vitest, or npm.
- No production deployment during implementation.
- No automatic rollback system.
- No requirement to run the complete release gate on every local push.
- No unrelated cleanup of application warnings outside the currently reported lint findings.

## Current Evidence

- GitHub Actions runs the root release gate, an E2E smoke job, and a backend `validate` matrix.
- Backend `validate` scripts do not run package tests.
- Root Vitest includes the legacy `railway-market-server/test/**` path but not the primary backend `tests/**` directories or aggregator tests.
- The pre-push hook derives changed files from `HEAD~1` instead of the actual refs supplied to the hook.
- The pre-push hook validates only the API server and omits the aggregator.
- The lint-staged TypeScript glob does not match root-level `App.tsx` or `index.tsx`.
- Root ESLint ignores both Railway packages, E2E tests, and `scripts/**`; package ESLint commands lint only `src/`.
- Current lint runs pass with one frontend warning, 26 API server warnings, and no aggregator warnings because no warning budget is enforced.
- Both backend Dockerfiles use `npm install` despite committed lockfiles; the API server Dockerfile bypasses its package build/lint lifecycle by invoking `tsc` directly.

## Design Decisions

### 1. Railway Wait for CI Is the Production Gate

The frontend, API server, and aggregator services will remain connected to their GitHub source and production branch. Railway's `Wait for CI` option will be enabled for each service.

Normal production flow becomes:

```text
push to main -> GitHub Actions -> all required jobs pass -> Railway deployment proceeds
                                      |
                                      +-> any job fails -> Railway deployment is skipped
```

This is an operational Railway setting and cannot be guaranteed by repository configuration alone. The implementation checklist and release runbook must therefore include verification evidence for each service.

### 2. CI Owns Complete Repository Validation

The root build job will continue to run `npm run check:release-gate`. The backend matrix will run, in order, dependency installation, typecheck, lint, package tests, and build for both Railway packages.

The existing E2E smoke job remains dependent on the root build job. Railway must wait for the complete workflow, including backend and E2E jobs, before deploying a commit.

Backend package scripts will expose one authoritative `validate` command containing:

```text
typecheck -> lint -> test -> build
```

The root Vitest configuration will no longer be treated as the owner of backend package tests. Each independent package runs its own tests with its own config and runtime assumptions.

### 3. Local Hooks Provide Fast Feedback, Not Deployment Authority

Pre-commit will continue to operate only on staged files. Its globs will be split by responsibility:

- root-level and frontend TypeScript;
- API server source and tests;
- aggregator source and tests;
- UI components;
- supported JSON and CSS files.

Root-level TypeScript files must be matched explicitly. Railway package files must invoke their package-local lint/typecheck commands instead of being silently accepted by root ESLint ignores.

Pre-push will delegate to a cross-platform Node script. The script will parse the standard Git pre-push input records, derive every pushed commit range, and detect affected packages across multi-commit, force-update, new-branch, and deletion cases. It will run:

- a non-mutating root verification when root application files changed;
- API server `validate` when API server files changed;
- aggregator `validate` when aggregator files changed.

The local hook is allowed to be narrower than CI. Skipping hooks does not bypass the production gate because Railway waits for CI.

### 4. Validation Scope Is Explicit

Each Railway package will receive lint and TypeScript project coverage for both `src/**` and `tests/**`. Test files may have narrowly scoped ESLint relaxations for test-only patterns, but production async-safety rules remain errors.

Root ESLint will gain dedicated coverage for:

- Playwright E2E TypeScript with Node and Playwright globals;
- critical repository scripts used by build, security, deploy, and hook workflows.

Generated output, third-party code, reports, and temporary audit files remain ignored. The design does not require linting every simulation or archived script if it is outside release tooling; the exact included script list must be explicit in configuration.

### 5. Warning Debt Is Removed Before Enforcement

The existing frontend warning and API server async-handler warnings will be resolved without disabling their rules globally. Express async handlers will use a typed adapter or equivalent error-forwarding boundary so rejected promises reach Express error handling.

After the baseline is clean, CI lint commands will enforce zero warnings with `--max-warnings=0`. Test-only exceptions must be configured by file scope rather than inline blanket disables.

### 6. Formatting Policy Is Symmetric

Both Railway packages will follow the same formatting ownership model. The preferred model is package-local `format` and `format:check` scripts, with root Prettier excluding both packages. CI uses non-mutating `format:check` only if formatting becomes a required gate.

The ineffective lint-staged Markdown formatter will be removed while global Markdown remains ignored. Re-enabling Markdown formatting is outside this hardening scope.

### 7. Docker Builds Are Deterministic

Both Railway Dockerfiles will use `npm ci` for builder dependencies and `npm ci --omit=dev` for runtime dependencies. Docker image construction will compile production artifacts but will not duplicate the complete test suite already required by CI.

Both Dockerfiles will use package scripts rather than direct compiler invocation so package lifecycle behavior remains consistent. CI is the quality authority; Docker build remains a deterministic artifact-construction step.

### 8. Manual Deploy Is a Break-Glass Path

Normal production deployment is GitHub-source autodeploy gated by CI. Existing ambiguous Railway CLI scripts will be renamed or supplemented with explicit service-specific manual commands for frontend, API server, and aggregator.

Manual commands must:

- include the target service explicitly;
- be documented as recovery or operator-only paths;
- require the normal release gate unless an incident commander explicitly authorizes bypass;
- never be invoked by routine `npm run deploy`.

`npm run deploy` may continue to push `main`, but its documentation must state that pushing does not itself guarantee deployment; successful CI releases the waiting Railway deployment.

## Components and Responsibilities

### GitHub Actions Workflow

Owns complete automated verification and exposes the commit's pass/fail status to Railway.

### Railway Service Settings

Own the `Wait for CI` production release condition for frontend, API server, and aggregator.

### Package Validation Scripts

Own repeatable typecheck, lint, test, and build sequences within each package boundary.

### Husky Hooks

Provide local feedback and delegate non-trivial push-range logic to a testable Node script.

### ESLint and TypeScript Configurations

Define production, test, E2E, and release-script scopes without relying on silent ignore behavior.

### Dockerfiles

Produce reproducible runtime images from committed lockfiles after CI approval.

## Error Handling

- Any required GitHub Actions job failure leaves the Railway deployment skipped.
- A package validation failure returns a non-zero exit code and blocks the local hook or CI job that invoked it.
- The pre-push parser treats malformed input or an unresolvable non-deletion ref as a validation failure, not as an empty change set.
- Deleted refs do not trigger package validation because they deploy no new source.
- Async Express handler rejections are forwarded to the existing error middleware and are not swallowed.
- Manual Railway deployment commands fail unless the project, environment, and service target are explicit.
- Existing successful production deployments remain untouched during tooling rollout.

## Testing Strategy

### Hook and Scope Tests

- Root-level `App.tsx` and `index.tsx` match the frontend lint-staged task.
- API server and aggregator files invoke only their package-local validation tasks.
- Multi-commit push ranges detect changes from every pushed commit.
- New branches, force updates, deleted refs, and multiple ref records are handled deterministically.
- Malformed pre-push input fails closed.

### Package Validation Tests

- API server `tests/**` run under the API package config.
- Aggregator `tests/**` run under the aggregator package config.
- Package test files parse under their ESLint TypeScript project.
- Existing frontend and backend lint warnings are reduced to zero.

### CI Verification

- A deliberately failing API test fails the backend matrix.
- A deliberately failing aggregator test fails the backend matrix.
- A root release-gate failure prevents a successful workflow.
- E2E smoke remains downstream of the root build.
- The final workflow is green only when root, both backend packages, and E2E smoke pass.

### Docker Verification

- Both Docker images build from a clean checkout with lockfiles unchanged.
- Lockfile/package manifest mismatch causes `npm ci` to fail.
- Both containers start and pass their `/health` checks.

### Railway Operational Verification

- Each application service displays `Wait for CI` enabled.
- A controlled failing workflow produces a skipped Railway deployment.
- A subsequent successful workflow allows deployment and reaches a healthy state.

## Rollout Sequence

### Phase A: CI Test Coverage

1. Make backend package test ownership explicit.
2. Add package tests to backend `validate`.
3. Update the CI matrix.
4. Verify all existing backend tests pass before changing Railway settings.

### Phase B: Lint and Type Coverage

1. Add test, E2E, and critical script lint scopes.
2. Correct lint-staged root and package globs.
3. Resolve existing warnings.
4. Enforce zero warnings in CI.

### Phase C: Hook Reliability

1. Add push-range parser tests.
2. Implement the Node pre-push validator.
3. Reduce Husky shell files to thin quoted delegates.
4. Verify Windows Git Bash and Linux behavior.

### Phase D: Deterministic Builds and Commands

1. Align Dockerfiles on `npm ci` and package scripts.
2. Make formatting ownership symmetric.
3. Clarify normal and manual deploy commands and documentation.
4. Build both Docker images locally or in CI.

### Phase E: Railway CI Gate Activation

1. Confirm the updated workflow is green on `main`.
2. Enable `Wait for CI` for one non-critical service first.
3. Prove a failed workflow skips deployment.
4. Prove a successful workflow deploys and passes healthcheck.
5. Enable `Wait for CI` for the remaining application services.
6. Record service-level evidence in the release runbook.

## Rollback

- CI changes can be reverted independently without changing running Railway deployments.
- Hook changes can be reverted without weakening the Railway CI gate.
- Dockerfile changes can be reverted to the last successful image-building commit.
- If `Wait for CI` integration behaves unexpectedly, disable autodeploy for the affected service rather than allowing unconditional production deploys; operators can deploy the last verified commit manually.
- Manual deploy commands remain available for recovery but are not the normal release path.

## Acceptance Criteria

- All three Railway application services wait for successful GitHub CI before deploying production commits.
- Failed required workflows produce skipped Railway deployments.
- API server and aggregator tests run in CI and fail their jobs on regression.
- Root-level TypeScript, backend tests, aggregator changes, E2E tests, and critical release scripts have explicit lint coverage.
- Root, API server, and aggregator lint commands complete with zero warnings under CI enforcement.
- Pre-push correctly evaluates every pushed ref range and validates each affected package.
- Both backend Dockerfiles use `npm ci` and package lifecycle scripts consistently.
- Normal deployment documentation describes GitHub push, successful CI, and Railway release as separate stages.
- Manual deployment commands are service-specific and documented as break-glass operations.
- No production deployment occurs as part of implementing these changes.

## Operational Ownership

- Repository CI, hooks, lint, tests, Dockerfiles, and documentation: code implementation workflow.
- Railway `Wait for CI` activation and evidence: Railway service configuration with explicit project, environment, and service targeting.
- Production deployment approval and emergency bypass: operations owner or incident commander.
