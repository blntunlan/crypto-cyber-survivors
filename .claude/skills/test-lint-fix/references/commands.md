# Available Commands Reference

## Test Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run test` | Run all unit tests | Full test suite |
| `npm run test <file>` | Run specific test file | Verify single fix |
| `npm run test:watch` | Watch mode | Development |
| `npm run test:coverage` | With coverage report | Check coverage |

### Test Output Parsing

```bash
# Success output:
✓ services/GameEngine.spec.ts (15 tests) 234ms
✓ hooks/usePlayer.spec.ts (8 tests) 123ms

Test Files  2 passed (2)
     Tests  23 passed (23)

# Failure output:
× services/GameEngine.spec.ts (2 tests | 1 failed) 456ms
  × should calculate damage correctly
    → Expected: 100
       Received: 99
    
 FAIL  Tests: 1 failed, 22 passed
```

## Lint Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run lint` | Check lint errors | Initial check |
| `npm run lint:fix` | Auto-fix lint errors | First fix attempt |
| `npx eslint <file> --fix` | Fix specific file | Targeted fix |

### Lint Output Parsing

```bash
# Error output:
/services/GameEngine.ts
  42:10  error  Unexpected any  @typescript-eslint/no-explicit-any
  67:5   error  'x' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (2 errors, 0 warnings)
  0 errors and 0 warnings potentially fixable with --fix

# Success output:
✔ No ESLint warnings or errors
```

## Format Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run format` | Format all files | After fixes |
| `npx prettier --write <file>` | Format specific file | Quick format |
| `npx prettier --check .` | Check formatting | Verify |

## Combined Commands

```bash
# Full quality check (sequential on Windows)
npm run lint:fix; npm run format; npm run test

# Quick check (lint + test)
npm run lint; npm run test

# Specific file workflow
npx eslint services/GameEngine.ts --fix; npm run test tests/services/GameEngine.spec.ts
```

## Git Commands (for context)

```bash
# Check what changed
git --no-pager status
git --no-pager diff

# After fixes
git add -A
git commit -m "fix: resolve lint and test errors"
```

## Output Capture

Always capture stderr for full error info:

```bash
# Capture both stdout and stderr
npm run lint 2>&1
npm run test 2>&1
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Lint/Test failures |
| 2 | Invalid config/setup |

## Vitest Specific

```bash
# Run tests matching pattern
npm run test -- --grep "GameEngine"

# Run with verbose output
npm run test -- --reporter verbose

# Run single file
npm run test services/GameEngine.spec.ts

# Update snapshots (if using)
npm run test -- -u
```

## ESLint Specific

```bash
# Show fixable errors only
npx eslint . --fix-dry-run

# Specific rules
npx eslint . --rule 'no-unused-vars: off'

# Debug config
npx eslint --print-config src/index.ts
```
