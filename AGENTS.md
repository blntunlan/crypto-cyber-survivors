# Repository Guidelines

## Project Structure & Module Organization
Primary app code lives at the repo root and is organized by domain:
- `components/`, `hooks/`, `services/`, `stores/`, `contexts/`, `config/`, `types/`, `utils/`
- Tests are split into `tests/` (unit/integration) and `e2e/` (Playwright end-to-end).
- Static assets and PWA files are in `public/`.
- Database and backend integration assets are in `supabase/`.
- `railway-market-server/` is a separate TypeScript service for market/anti-cheat infrastructure.

## Build, Test, and Development Commands
- `npm run dev` - starts Vite dev server on port 3000.
- `npm run build` - syncs docs and creates production build.
- `npm run preview` - serves the production build locally.
- `npm run lint` / `npm run lint:fix` - run ESLint (or auto-fix).
- `npm run format` - format with Prettier.
- `npm run test` - run Vitest suite.
- `npm run test:coverage` - generate coverage report (V8, HTML + text).
- `npm run test:e2e` - run Playwright tests in `e2e/`.
- `cd railway-market-server && npm run validate` - typecheck, lint, and build companion server.

## Coding Style & Naming Conventions
- Use 2-space indentation, LF line endings, and UTF-8 (`.editorconfig`).
- Prettier rules: single quotes, semicolons, trailing commas (`.prettierrc`).
- TypeScript is strict (`tsconfig.json`); avoid `any` in app code.
- Naming patterns:
  - Components: `PascalCase.tsx` (for example, `components/screens/MainMenu.tsx`)
  - Hooks: `useX.ts` (for example, `hooks/useGameEvents.ts`)
  - Services/types: domain-oriented files under `services/` and `types/`

## Testing Guidelines
- Unit/integration tests: `tests/**/*.test.ts` and `tests/**/*.test.tsx`.
- E2E tests: `e2e/**/*.spec.ts`.
- Coverage focuses on `services/**`, `components/**`, and `factories/**`; no enforced threshold in config, so include meaningful tests for changed behavior.
- Before opening a PR, run: `npm run lint && npm run test && npm run build` (CI baseline).

## Commit & Pull Request Guidelines
- Conventional Commits are required (commitlint): `feat:`, `fix:`, `test:`, `chore:`, etc.; optional scopes are common (`feat(auth): ...`).
- Husky + lint-staged run checks on commit (ESLint, Prettier, related Vitest tests).
- PRs should use `.github/PULL_REQUEST_TEMPLATE.md`:
  - clear description + linked issue (`Fixes #...`)
  - test evidence (unit/e2e/manual)
  - screenshots for UI changes
  - checklist completed before review
