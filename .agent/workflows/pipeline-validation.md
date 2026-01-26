---
description: Stage 2 - Systematic Validation (Testing & Coverage)
---

# 🧪 Stage 2: Systematic Validation

We verify the integrity of the release candidate using the full automated testing suite.

## 🏃 Testing Suite

### 1. Unit & Integration Tests (Vitest)
// turbo
```bash
npm run test:coverage
```
- [ ] **Pass Rate**: 100%
- [ ] **Global Coverage**: >75% (Target 80% for critical services)

### 2. End-to-End Tests (Playwright)
// turbo
```bash
npm run test:e2e
```
- [ ] **Smoke Test**: Login, Start Game, Die, Submit Score.
- [ ] **Responsive Test**: Run on Mobile viewport.
- [ ] **Market Simulation**: Test performance under high volatility simulation.

## 🏗️ Build Verification
// turbo
```bash
npm run build
```
- [ ] Ensure build completes without warnings.
- [ ] Verify `dist/` contains all assets.

---
Proceed to `/pipeline-release` if all tests are green.
