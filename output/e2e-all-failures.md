# E2E Failure Report

Generated at: 2026-02-18T12:48:55.327Z
Total failures: 1
Stats: expected=136, unexpected=1, flaky=0, skipped=335

## 1. [mobile-chrome] should verify permanent HUD components (Health & Kernel)
- File: e2e/hud-elements.spec.ts:71:3
- Suite: hud-elements.spec.ts > HUD Elements E2E
- Status: failed
- Error: Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
- Repro: `npx playwright test e2e/hud-elements.spec.ts --project=mobile-chrome -g "should verify permanent HUD components (Health & Kernel)"`

