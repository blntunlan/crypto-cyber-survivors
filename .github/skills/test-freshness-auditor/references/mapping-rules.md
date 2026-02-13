# Source-to-Test Mapping Rules

Use these heuristics to map files quickly in this repository.

## Canonical Locations

- Source:
  - `components/`
  - `hooks/`
  - `services/`
  - `stores/`
  - `contexts/`
  - `utils/`
  - `factories/`
- Tests:
  - `tests/**/*.test.ts`
  - `tests/**/*.test.tsx`
  - `tests/**/*.spec.ts`
  - `tests/**/*.spec.tsx`
  - `e2e/**/*.spec.ts` (behavioral flows)

## Filename Heuristics

- Match by basename first:
  - `hooks/useMarketData.ts` -> `tests/hooks/useMarketData.test.ts`
  - `components/GameHUD.tsx` -> `tests/GameHUD.test.tsx` or `tests/components/**`
- Accept both `.test.*` and `.spec.*`.
- Treat `index.ts`/`index.tsx` as module-level and map to nearest parent tests.

## Risk Prioritization

Prioritize these first when stale or missing:

- auth/session/security-related modules
- state stores and reducers
- async services and network adapters
- gameplay state transitions and timing logic

## When to Add Integration vs Unit Tests

- Add unit tests for pure logic and single-module behavior.
- Add integration tests when behavior spans store + hook + service.
- Add E2E only for user-visible flows or regression-sensitive interactions.
