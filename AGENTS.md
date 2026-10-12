# Crypto Survivors Agent Guide

Verified against repository source and configuration on 2026-09-02.

Crypto Survivors is a real-time, market-driven survival game built with React 19,
TypeScript 5.8, Vite 6, and Three.js. The repository targets Node 20 and stable
60 FPS on mobile and desktop.

## Start Here

- Preserve unrelated working-tree changes; this repository is often edited by
  several tools at once.
- Read the guide that matches the files being changed. Rules are scoped: the
  legacy `/` game and the deterministic `/game-v2` runtime are different engines.
- When `graphify-out/graph.json` exists, begin codebase discovery with
  `graphify query`, `graphify path`, or `graphify explain`; run
  `graphify update .` after code changes.
- Use `@/*` for root-relative imports. Root TypeScript, Vite, and Vitest share
  this alias.

## Essential Commands

- `npm run dev` — sync docs, generate the sitemap, and start Vite on port 3000.
- `npm run test` — run root tests plus `railway-market-server/test/**`.
- `npm run typecheck` — run the root TypeScript check.
- `npm run check:release-gate` — CI build gate: baseline plus director tests.
- `npm run docs:check` — validate documentation navigation.
- Run `npm run validate` inside either `railway-*` package after changing it.

## Non-Negotiable Boundaries

- Keep 60 Hz data out of React state and avoid allocation in hot loops.
- Durable rewards are server-verified; do not add optimistic credit paths.
- Railway/Postgres is authoritative. Supabase references are historical only.
- New legacy singletons require architecture registration and reset coverage;
  prefer explicit dependency injection for new session state.
- Do not refresh Playwright screenshot baselines during ordinary validation.

## Detailed Instructions

- [Architecture and runtimes](agent-instructions/architecture.md)
- [Game V2 deterministic runtime](agent-instructions/game-v2.md)
- [Performance and production UI](agent-instructions/performance-ui.md)
- [Backend, data, and security](agent-instructions/backend-security.md)
- [TypeScript and code organization](agent-instructions/code-conventions.md)
- [Testing, gates, and workflow](agent-instructions/testing-workflow.md)
