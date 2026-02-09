---
name: qa-and-deploy
description: Comprehensive QA workflow (linting, testing, fixing) followed by build, commit, and deployment to GitHub and Railway. Use when the user wants to prepare a release, finalize a PR, or deploy the current state of the project.
---

# QA and Deploy

This skill automates the process of ensuring code quality before pushing to production. It follows a strict "Test-Fix-Build-Commit-Deploy" pipeline.

## Workflow

### 1. Pre-flight Checks (Quality)
Execute the following to ensure the codebase adheres to standards:
- `npm run lint`: Check for code style and syntax errors.
- `npm run format`: Ensure consistent formatting.
- If `lint` fails, automatically run `npm run lint:fix`.

### 2. Testing
Run the unit and integration test suites:
- `npm run test`: Executes Vitest unit tests.
- `npm run test:e2e`: Executes Playwright end-to-end tests.
- **Fixing Phase**: If tests fail, analyze the output, locate the faulty code or test, and attempt to fix it. Rerun tests to verify the fix.

### 3. Build Verification
Ensure the project builds correctly for production:
- `npm run build`: Executes the Vite build process and documentation synchronization.
- If the build fails, investigate build logs and fix the root cause.

### 4. Committing Changes
Once quality is verified, prepare the commit:
- Use `git status` and `git diff` to review changes.
- Follow **Conventional Commits**. See [conventional-commits.md](references/conventional-commits.md) for details.
- Example: `feat: add new difficulty layer and verify with e2e tests`

### 5. Deployment
Push changes to the remote repositories:
- `npm run deploy`: Pushes the `main` branch to GitHub.
- `npm run railway:deploy`: Deploys the application to Railway.
- If a Supabase change was made, consider `npm run supabase:functions:deploy`.

## Guidelines

- **Zero Regression**: Never deploy if any test is failing.
- **Atomic Commits**: Ensure the commit message accurately reflects all QA steps taken.
- **Logs**: If errors persist, check `error_summary.txt` or `frontend-logs.json` for additional context.