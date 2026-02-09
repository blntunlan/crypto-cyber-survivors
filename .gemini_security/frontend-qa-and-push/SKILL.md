---
name: frontend-qa-and-push
description: Run tests, fix errors, lint, and push changes to GitHub. Use when you need to ensure code quality before finalizing a task and pushing to the main branch.
---

# Frontend QA and Push Workflow

This skill automates the standard Quality Assurance flow for the Dify/Crypto Survivors frontend project.

## Workflow Steps

### 1. Test Execution
Run the unit and integration tests using:
```bash
npm run test
```
If tests fail, analyze the `stdout` and `stderr` output, read the failing files, and fix the logic until all tests pass.

### 2. Linting and Formatting
Run linting to ensure coding standards:
```bash
npm run lint
```
If errors are found, try automated fixing first:
```bash
npm run lint:fix
```
Manually resolve any remaining linting errors (e.g., unused variables, floating promises).

### 3. Granular Commits
Group related changes into logical commits. Follow conventional commit standards (feat:, fix:, chore:, etc.). 
Example:
```bash
git add <files_for_fix_1> ; git commit -m "fix: resolve test failures in X component"
git add <files_for_lint> ; git commit -m "fix: resolve lint errors"
```
**Windows Compatibility Note:** Always use `;` instead of `&&` to combine commands.

### 4. Push to Remote
Push the finalized commits to the main branch:
```bash
git push origin main
```

## Best Practices
- **Adhere to Performance Laws:** Ensure no memory allocations in loops during fixes.
- **Mock Network Requests:** Use MSW when adding or fixing tests involving APIs.
- **Singleton Awareness:** Reset singletons between test runs if necessary.