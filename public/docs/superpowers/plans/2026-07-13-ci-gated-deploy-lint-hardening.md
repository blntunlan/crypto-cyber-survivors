# CI-Gated Deploy and Lint Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make successful GitHub CI the normal production deployment gate for all Railway application services while closing backend test, hook, lint, formatting, and Docker validation gaps.

**Architecture:** GitHub Actions owns the authoritative root and package validation graph; Railway GitHub autodeploys wait for that graph before releasing. Husky remains a fast local feedback layer and delegates pushed-ref analysis to a tested TypeScript script. Each package owns its test, lint, typecheck, format, and build configuration, while Docker only creates deterministic artifacts after CI approval.

**Tech Stack:** Node.js 20+, npm, GitHub Actions, Railway GitHub autodeploys, Husky 9, lint-staged 16, ESLint 9 flat config, TypeScript 5.x, Vitest 4, Docker.

## Global Constraints

- Do not deploy production while changing repository tooling.
- Do not commit or push unless the user explicitly requests it.
- Preserve the user's existing untracked temporary audit files.
- Keep `npm run check:release-gate` as the root release authority.
- Keep package tests isolated in their own package configs.
- Local hooks provide feedback; successful GitHub CI remains the production authority.
- Use type-only imports and avoid `any` in application and tooling TypeScript.
- Make Docker installs reproducible with committed lockfiles.
- Do not globally disable async-safety lint rules to remove warnings.

---

### Task 1: Make Backend Tests Required by Package Validation and CI

**Files:**
- Modify: `railway-market-server/package.json`
- Modify: `railway-market-aggregator/package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: existing package-local `vitest.config.ts` files with `tests/**/*.test.ts` includes.
- Produces: identical `validate` contracts in both backend packages: `typecheck -> lint -> test -> build`.

- [ ] **Step 1: Prove the current CI contract omits package tests**

Run:

```powershell
node -e "for (const p of ['railway-market-server/package.json','railway-market-aggregator/package.json']) { const j=require('./'+p); if (j.scripts.validate.includes('test')) process.exit(1); console.log(p+': test missing'); }"
```

Expected: both packages print `test missing`.

- [ ] **Step 2: Make package validation authoritative**

In both backend `package.json` files, remove `prebuild` and set these scripts exactly:

```json
{
  "build": "tsc",
  "lint": "eslint src/ tests/ vitest.config.ts --max-warnings=0",
  "lint:fix": "eslint src/ tests/ vitest.config.ts --fix --max-warnings=0",
  "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
  "test": "vitest run",
  "validate": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```

The new `tsconfig.test.json` files arrive in Task 2; until then, `typecheck` is expected to fail because the referenced config does not exist.

- [ ] **Step 3: Remove legacy backend tests from root Vitest ownership**

Change the root `vitest.config.ts` include list to:

```ts
include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
```

- [ ] **Step 4: Keep the CI backend matrix on the package contract**

Retain the existing matrix services and change the step label at `.github/workflows/ci.yml` to document the expanded contract:

```yaml
- name: Validate (typecheck + lint + test + build)
  run: cd ${{ matrix.service }} && npm run validate
```

- [ ] **Step 5: Verify package tests are discoverable independently**

Run:

```powershell
npm --prefix railway-market-server test -- --reporter=dot
npm --prefix railway-market-aggregator test -- --reporter=dot
```

Expected: both commands discover tests under their package `tests/` directory; neither reports `No test files found`.

---

### Task 2: Add Backend Test TypeScript and ESLint Coverage

**Files:**
- Create: `railway-market-server/tsconfig.test.json`
- Create: `railway-market-aggregator/tsconfig.test.json`
- Modify: `railway-market-server/eslint.config.mjs`
- Modify: `railway-market-aggregator/eslint.config.mjs`

**Interfaces:**
- Consumes: Task 1 package scripts.
- Produces: a type-aware ESLint and `tsc` project covering `src/**`, `tests/**`, and `vitest.config.ts` in each backend package.

- [ ] **Step 1: Capture the current parsing failure for a package test**

Run:

```powershell
npm --prefix railway-market-server exec eslint -- tests/middleware/auth.test.ts
npm --prefix railway-market-aggregator exec eslint -- tests/middleware/rateLimit.test.ts
```

Expected: parsing errors report that the test files are outside the configured TypeScript project.

- [ ] **Step 2: Add the API server test TypeScript project**

Create `railway-market-server/tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Add the aggregator test TypeScript project**

Create `railway-market-aggregator/tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Point package ESLint at the test-aware project**

In both backend ESLint configs, replace `parserOptions.project` with:

```js
parserOptions: {
  project: './tsconfig.test.json',
  tsconfigRootDir: __dirname,
},
```

Add a scoped test override after the production rule block:

```js
{
  files: ['tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off',
  },
},
```

- [ ] **Step 5: Verify test parsing and typechecking**

Run:

```powershell
npm --prefix railway-market-server run typecheck
npm --prefix railway-market-aggregator run typecheck
npm --prefix railway-market-server exec eslint -- tests/middleware/auth.test.ts
npm --prefix railway-market-aggregator exec eslint -- tests/middleware/rateLimit.test.ts
```

Expected: no project parsing errors. Any real test type or lint errors are fixed narrowly before proceeding.

---

### Task 3: Replace Fragile Pre-Push Diff Logic with a Tested Cross-Platform Validator

**Files:**
- Create: `scripts/pre-push-validate.ts`
- Create: `tests/scripts/prePushValidate.test.ts`
- Modify: `.husky/pre-push`
- Modify: `.husky/commit-msg`
- Modify: `package.json`

**Interfaces:**
- Produces: `parsePrePushInput(input: string): PushUpdate[]`.
- Produces: `classifyChangedFiles(files: readonly string[]): ValidationScope`.
- Produces: `collectChangedFiles(updates: readonly PushUpdate[], git: GitRunner): Set<string>`.
- Consumes: package `validate` scripts from Task 1.

- [ ] **Step 1: Write failing parser and scope tests**

Create `tests/scripts/prePushValidate.test.ts` with these tests:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  classifyChangedFiles,
  collectChangedFiles,
  parsePrePushInput,
  ZERO_SHA,
} from '../../scripts/pre-push-validate';

describe('parsePrePushInput', () => {
  it('parses multiple pushed refs', () => {
    const input = [
      'refs/heads/main aaaa refs/heads/main bbbb',
      'refs/heads/release cccc refs/heads/release dddd',
    ].join('\n');
    expect(parsePrePushInput(input)).toHaveLength(2);
  });

  it('fails closed for malformed records', () => {
    expect(() => parsePrePushInput('refs/heads/main only-two-fields')).toThrow(
      'Malformed pre-push record'
    );
  });
});

describe('collectChangedFiles', () => {
  it('uses every normal pushed range and skips deleted refs', () => {
    const git = vi.fn((args: readonly string[]) =>
      args.at(-1) === 'bbbb..aaaa'
        ? 'railway-market-server/src/index.ts\n'
        : 'components/AppShell.tsx\n'
    );
    const files = collectChangedFiles(
      [
        { localRef: 'refs/heads/main', localSha: 'aaaa', remoteRef: 'refs/heads/main', remoteSha: 'bbbb' },
        { localRef: 'refs/heads/release', localSha: 'cccc', remoteRef: 'refs/heads/release', remoteSha: 'dddd' },
        { localRef: '(delete)', localSha: ZERO_SHA, remoteRef: 'refs/heads/old', remoteSha: 'eeee' },
      ],
      git
    );
    expect(files).toEqual(new Set(['railway-market-server/src/index.ts', 'components/AppShell.tsx']));
  });
});

describe('classifyChangedFiles', () => {
  it('separates root, API server, and aggregator scopes', () => {
    expect(
      classifyChangedFiles([
        'App.tsx',
        'railway-market-server/src/index.ts',
        'railway-market-aggregator/src/index.ts',
      ])
    ).toEqual({ root: true, server: true, aggregator: true });
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
npx vitest run tests/scripts/prePushValidate.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `scripts/pre-push-validate.ts` does not exist.

- [ ] **Step 3: Implement the parser, diff collector, and command runner**

Create `scripts/pre-push-validate.ts` with these exported contracts:

```ts
import { execFileSync, spawnSync } from 'node:child_process';
import process from 'node:process';

export const ZERO_SHA = '0000000000000000000000000000000000000000';

export type PushUpdate = {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
};

export type ValidationScope = {
  root: boolean;
  server: boolean;
  aggregator: boolean;
};

export type GitRunner = (args: readonly string[], input?: string) => string;

export function parsePrePushInput(input: string): PushUpdate[];
export function collectChangedFiles(
  updates: readonly PushUpdate[],
  git: GitRunner
): Set<string>;
export function classifyChangedFiles(files: readonly string[]): ValidationScope;
```

Implementation requirements:

- trim blank input lines;
- require exactly four whitespace-delimited fields per non-empty line;
- skip records whose `localSha` equals `ZERO_SHA`;
- use `<remoteSha>..<localSha>` for existing remote refs;
- for a new remote ref, compute the empty tree with `git hash-object -t tree --stdin` and diff `<emptyTree>..<localSha>`;
- normalize `\` to `/` before classification;
- classify `railway-market-server/**` and `railway-market-aggregator/**` independently;
- classify any remaining release-relevant path as root;
- run `npm run check:push` for root changes;
- run `npm --prefix railway-market-server run validate` for API server changes;
- run `npm --prefix railway-market-aggregator run validate` for aggregator changes;
- propagate the first non-zero child exit code.

Only execute the CLI path when `import.meta.url` resolves to `process.argv[1]`, so unit tests can import the module without starting validation.

- [ ] **Step 4: Add a non-mutating root push check**

Add to root `package.json`:

```json
"check:push": "npm run typecheck && npm run lint && npm run check:director-reference"
```

- [ ] **Step 5: Reduce shell hooks to quoted delegates**

Replace `.husky/pre-push` with:

```sh
#!/usr/bin/env sh
npx tsx scripts/pre-push-validate.ts
```

Change `.husky/commit-msg` to:

```sh
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 6: Verify the parser and shell syntax**

Run:

```powershell
npx vitest run tests/scripts/prePushValidate.test.ts --pool=forks --maxWorkers=1
& "C:\Program Files\Git\bin\sh.exe" -n .husky/pre-push
& "C:\Program Files\Git\bin\sh.exe" -n .husky/commit-msg
```

Expected: tests PASS and both shell syntax checks exit 0. If Git Bash cannot start in the sandbox, record that environmental limitation and rely on CI's Ubuntu shell check.

---

### Task 4: Correct lint-staged, E2E, Release-Script, and Warning Coverage

**Files:**
- Modify: `package.json`
- Modify: `eslint.config.js`
- Create: `eslint.release.config.js`
- Modify: `railway-market-server/src/middleware/auth.ts`
- Modify: `components/admin/DifficultyV2Monitor.tsx`
- Modify: `railway-market-server/tests/middleware/auth.test.ts`
- Replace: `scripts/run-market-typecheck.js` with `scripts/run-package-typecheck.mjs`

**Interfaces:**
- Consumes: Task 2 package lint projects.
- Consumes: existing `asyncHandler` utility.
- Produces: zero-warning lint commands and staged-file coverage for root, API server, and aggregator.

- [ ] **Step 1: Add a failing auth middleware rejection test**

Extend `railway-market-server/tests/middleware/auth.test.ts` with a test that mocks the account lookup to reject and asserts the Express `next` function receives the error rather than creating an unhandled rejection.

Use the exported middleware as a `RequestHandler` and await a microtask before asserting:

```ts
const databaseError = new Error('database unavailable');
mockLimit.mockRejectedValueOnce(databaseError);
requireAuth(request, response, next);
await Promise.resolve();
expect(next).toHaveBeenCalledWith(databaseError);
```

- [ ] **Step 2: Run the focused auth test and verify failure**

Run:

```powershell
npm --prefix railway-market-server test -- tests/middleware/auth.test.ts
```

Expected: FAIL because the current async middleware catches or rejects outside Express's `next(error)` boundary.

- [ ] **Step 3: Wrap auth middleware with the existing async boundary**

Refactor `railway-market-server/src/middleware/auth.ts` to:

```ts
import { asyncHandler } from '../utils/asyncHandler';

export const requireAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Preserve existing header, JWT, account status, and request-context logic.
  // Remove the outer catch that converts unexpected database errors into JWT errors.
  // Keep JWT verification error mapping narrowly around verifyRailwayAccessToken.
});
```

The final implementation must preserve existing 401/403 responses while forwarding unexpected database failures to `next(error)` through `asyncHandler`.

- [ ] **Step 4: Fix the frontend unnecessary-condition warning at its source**

Run ESLint on `components/admin/DifficultyV2Monitor.tsx`, inspect line 52, and remove only the condition proven impossible by the type system. Preserve rendered output for all reachable states.

- [ ] **Step 5: Add root E2E lint coverage**

Remove `e2e/**` from global ignores in `eslint.config.js`. Add an E2E override:

```js
{
  files: ['e2e/**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off',
    'react-refresh/only-export-components': 'off',
  },
},
```

Temporary `**/*.tmp.*` files remain ignored.

- [ ] **Step 6: Add explicit release-script lint configuration**

Create `eslint.release.config.js` using `@eslint/js`, `typescript-eslint`, and Node globals. Scope it to these release-critical files:

```text
scripts/check-beta-env.ts
scripts/check-docs-navigation.mjs
scripts/check-reset-coverage.mjs
scripts/check-singleton-regressions.mjs
scripts/generate-sitemap.ts
scripts/pre-push-validate.ts
scripts/run-package-typecheck.mjs
scripts/security-check.js
scripts/sync-docs.js
```

Use type-aware rules only for TypeScript files through the root TypeScript project; apply standard recommended rules to JS/MJS files.

Add root scripts:

```json
"lint": "eslint . --max-warnings=0 && npm run lint:release-scripts",
"lint:fix": "eslint . --fix --max-warnings=0 && npm run lint:release-scripts -- --fix",
"lint:release-scripts": "eslint --config eslint.release.config.js --max-warnings=0"
```

- [ ] **Step 7: Generalize the package typecheck helper**

Replace `scripts/run-market-typecheck.js` with `scripts/run-package-typecheck.mjs` that accepts exactly one package name from this allowlist:

```js
const ALLOWED_PACKAGES = new Set([
  'railway-market-server',
  'railway-market-aggregator',
]);
```

It must ignore lint-staged file arguments after the package name, spawn `npm run typecheck` in the selected package, and propagate spawn errors and exit codes.

- [ ] **Step 8: Split lint-staged globs by package ownership**

Replace the TypeScript tasks in root `package.json` with:

```json
"*.{ts,tsx}": [
  "eslint --fix --no-warn-ignored",
  "prettier --write",
  "vitest related --run --pool=forks --maxWorkers=1 --bail=1"
],
"!(public|coverage|dist|node_modules|playwright-report|test-results|remotion-video|.agent|.agents|railway-market-server|railway-market-aggregator)/**/*.{ts,tsx}": [
  "eslint --fix --no-warn-ignored",
  "prettier --write",
  "vitest related --run --pool=forks --maxWorkers=1 --bail=1"
],
"railway-market-server/{src,tests}/**/*.ts": [
  "npm --prefix railway-market-server exec eslint -- --fix --no-warn-ignored",
  "prettier --write",
  "node scripts/run-package-typecheck.mjs railway-market-server"
],
"railway-market-aggregator/{src,tests}/**/*.ts": [
  "npm --prefix railway-market-aggregator exec eslint -- --fix --no-warn-ignored",
  "prettier --write",
  "node scripts/run-package-typecheck.mjs railway-market-aggregator"
]
```

Keep the UI consistency task. Remove the duplicate unconditional UI audit from `.husky/pre-commit`, leaving only `npx lint-staged`.

- [ ] **Step 9: Remove the ineffective Markdown staged task**

Delete the `**/*.md` lint-staged entry because `.prettierignore` intentionally ignores all Markdown.

- [ ] **Step 10: Verify zero-warning lint and targeted tests**

Run:

```powershell
npm run lint
npm --prefix railway-market-server run lint
npm --prefix railway-market-aggregator run lint
npm --prefix railway-market-server test -- tests/middleware/auth.test.ts
npx vitest run tests/scripts/prePushValidate.test.ts --pool=forks --maxWorkers=1
```

Expected: every command exits 0 with zero warnings.

---

### Task 5: Align Formatting and Deterministic Docker Builds

**Files:**
- Modify: `.prettierignore`
- Modify: `railway-market-server/package.json`
- Modify: `railway-market-aggregator/package.json`
- Modify: `railway-market-server/Dockerfile`
- Modify: `railway-market-aggregator/Dockerfile`

**Interfaces:**
- Consumes: package scripts from Tasks 1 and 2.
- Produces: symmetric package formatting commands and reproducible image dependency installation.

- [ ] **Step 1: Make formatting ownership symmetric**

Add `railway-market-aggregator` beside `railway-market-server` in root `.prettierignore`.

Add to both backend package scripts:

```json
"format": "prettier --write src tests *.config.* package.json tsconfig*.json Dockerfile",
"format:check": "prettier --check src tests *.config.* package.json tsconfig*.json Dockerfile"
```

If Prettier rejects `Dockerfile` because no parser is inferred, remove it from both package scripts and format Dockerfiles manually; keep the two package scripts identical.

- [ ] **Step 2: Make API server Docker installs deterministic**

Change `railway-market-server/Dockerfile` builder and runtime installs to:

```dockerfile
RUN npm ci
...
RUN npm ci --omit=dev
```

Replace direct compilation with:

```dockerfile
RUN npm run build
```

- [ ] **Step 3: Make aggregator Docker installs deterministic**

Change both aggregator install commands to `npm ci` / `npm ci --omit=dev`; retain `RUN npm run build`.

- [ ] **Step 4: Verify formatting and Docker definitions**

Run:

```powershell
npm --prefix railway-market-server run format:check
npm --prefix railway-market-aggregator run format:check
rg -n "npm install|npx tsc" railway-market-server/Dockerfile railway-market-aggregator/Dockerfile
```

Expected: format checks pass and `rg` returns no matches.

If Docker is available, run:

```powershell
docker build -t crypto-survivors-market-server:audit railway-market-server
docker build -t crypto-survivors-market-aggregator:audit railway-market-aggregator
```

Expected: both images build successfully. Do not install Docker as part of this task if unavailable.

---

### Task 6: Clarify CI-Gated and Manual Deployment Documentation

**Files:**
- Modify: `package.json`
- Modify: `docs/workflows/BETA_LAUNCH_RUNBOOK.md`
- Generated by docs sync: `public/docs/workflows/BETA_LAUNCH_RUNBOOK.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: CI workflow from Task 1 and package validation contracts.
- Produces: one documented normal path and three explicitly targeted manual recovery commands.

- [ ] **Step 1: Add explicit manual service commands**

Replace ambiguous Railway scripts with service-specific break-glass commands using explicit service names:

```json
"railway:frontend:deploy:manual": "railway up --service crypto-survivors",
"railway:api:deploy:manual": "railway up --service market-server --path-as-root railway-market-server",
"railway:aggregator:deploy:manual": "railway up --service market-aggregator --path-as-root railway-market-aggregator"
```

Retain:

```json
"deploy": "git push origin main"
```

because the normal path is push -> CI -> Railway Wait for CI, not CLI upload.

- [ ] **Step 2: Update the release runbook**

Change backend prerequisites to include both packages and tests. Replace direct service deploy rows with:

```text
Push main -> observe all required GitHub Actions jobs -> confirm Railway waiting deployment proceeds only after CI success.
```

Add a break-glass subsection listing the three manual commands, required incident-lead approval, explicit target verification, and post-deploy smoke requirements.

- [ ] **Step 3: Update repository agent guidance**

Update `AGENTS.md` and `CLAUDE.md` so commands and CI descriptions match the new package `validate`, aggregator command, and CI-gated production path. Do not duplicate the full runbook.

- [ ] **Step 4: Sync docs and verify navigation**

Run:

```powershell
npm run docs:sync
npm run docs:check
git diff --exit-code -- docs/workflows/BETA_LAUNCH_RUNBOOK.md public/docs/workflows/BETA_LAUNCH_RUNBOOK.md
```

Expected: docs checks pass. The final diff command may report differences in path context but the mirrored file contents must be byte-identical; if needed verify with `Get-FileHash`.

---

### Task 7: Run Repository Gates and Activate Railway Wait for CI

**Files:**
- Verify: files modified by Tasks 1-6.
- Operational setting: Railway frontend service `Wait for CI`.
- Operational setting: Railway API server service `Wait for CI`.
- Operational setting: Railway aggregator service `Wait for CI`.

**Interfaces:**
- Consumes: all repository changes from Tasks 1-6.
- Produces: green repository gates and recorded CI-gated Railway service settings.

- [ ] **Step 1: Run focused package gates**

Run:

```powershell
npm --prefix railway-market-server run validate
npm --prefix railway-market-aggregator run validate
```

Expected: typecheck, lint, tests, and build pass in both packages.

- [ ] **Step 2: Run root focused tooling tests and lint**

Run:

```powershell
npx vitest run tests/scripts/prePushValidate.test.ts --pool=forks --maxWorkers=1
npm run lint
npm run typecheck
```

Expected: all commands pass with zero lint warnings.

- [ ] **Step 3: Run the authoritative root release gate**

Run:

```powershell
npm run check:release-gate
```

Expected: root baseline and Director release tests pass. Do not repair unrelated failures; report them separately.

- [ ] **Step 4: Verify the final working tree scope**

Run:

```powershell
git status --short
git diff --check
git diff --stat
```

Expected: only planned tooling, configuration, tests, docs, and generated docs mirror changes appear, plus the user's pre-existing untracked temporary audit files.

- [ ] **Step 5: Enable Railway Wait for CI without deploying**

For each GitHub-linked production application service—frontend, API server, and aggregator—open service settings and enable `Wait for CI`. Confirm the trigger branch is `main` and do not invoke `railway up`, redeploy, restart, or variable mutation.

Expected: all three services show `Wait for CI` enabled. If the connected Railway tooling cannot mutate this GitHub integration setting, stop and provide the exact dashboard steps rather than substituting an unconditional CLI deployment.

- [ ] **Step 6: Record activation evidence**

Add a dated entry to the runbook evidence log containing service names, trigger branch, `Wait for CI` state, and the GitHub workflow name. Do not include tokens, project secrets, or environment variable values.

- [ ] **Step 7: Report the controlled-failure verification separately**

Do not intentionally push a failing commit in this implementation. Record that the next protected test commit or staging rehearsal must prove:

```text
failed workflow -> Railway deployment SKIPPED
successful workflow -> Railway deployment proceeds -> /health passes
```

Expected: repository implementation is complete without a production deployment; the operational rehearsal remains an explicit release activity.
