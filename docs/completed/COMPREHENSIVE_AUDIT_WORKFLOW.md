# 🎮 Crypto Cyber Survivors - Comprehensive Project Audit and Improvement Workflow

> Step-by-step project overhaul guide for Claude Code

---

## 📋 Table of Contents

1. [Project Structure Analysis](#1-project-structure-analysis)
2. [Code Quality and Standards](#2-code-quality-and-standards)
3. [Performance Optimization](#3-performance-optimization)
4. [Test Coverage and Quality](#4-test-coverage-and-quality)
5. [Security Audit](#5-security-audit)
6. [Architecture Improvement](#6-architecture-improvement)
7. [Mobile Optimization](#7-mobile-optimization)
8. [WebSocket and API Integrations](#8-websocket-and-api-integrations)
9. [State Management Review](#9-state-management-review)
10. [Documentation and Maintenance](#10-documentation-and-maintenance)

---

## 1. Project Structure Analysis

### 1.1 File and Folder Organization
**Goal:** Verify that all files in the project are in the correct location and a consistent structure is followed.

**Steps:**
1. List all folders in the root directory and verify their purposes.
2. Examine the organization under the `src/` folder.
3. Check that each folder has a single responsibility (Single Responsibility).
4. Detect duplicate or misplaced files.
5. Check that folder depth is not excessive (max 4-5 levels).

**Checklist:**
- [ ] Is the `components/` folder divided into subfolders? (UI, Game, Screens etc.)
- [ ] Is each service in the `services/` folder independent?
- [ ] Is there business logic in the `utils/` folder? (Should not be)
- [ ] Are `types/` files co-located with related modules?
- [ ] Are test files organized in the same structure as source files?

**Output Format:**
```markdown
## Project Structure Analysis Report
- Total Folders: X
- Total Files: Y
- Average Folder Depth: Z
- Detected Issues: [list]
- Recommendations: [list]
```

---

### 1.2 Naming Consistency
**Goal:** Verify that all file, folder, and component names are consistent.

**Steps:**
1. Check that React components use PascalCase.
2. Check that Utility functions use camelCase.
3. Check that Constants and config files have appropriate naming.
4. Verify that Hook files start with the `use` prefix.
5. Check that Service files use the `Service` or `Manager` suffix.

**Checklist:**
- [ ] Do component file names match component names?
- [ ] Are Index files used correctly?
- [ ] do user Test files have `.test.tsx` or `.spec.ts` extensions?
- [ ] Are Type definitions centralized in the `types/` folder?

---

### 1.3 Import/Export Structure
**Goal:** Detect Barrel exports, circular dependencies, and unnecessary imports.

**Steps:**
1. Perform circular dependency analysis.
2. Detect unused imports.
3. Examine usage of Barrel exports.
4. Check preference for Relative vs absolute imports.
5. Verify simple compatibility for Tree-shaking.

**Check Commands:**
```bash
# Circular dependency check
npx madge --circular --extensions ts,tsx src/

# Unused dependencies
npx depcheck

# Import analysis
npx eslint src/ --ext .ts,.tsx
```

**Output Format:**
```markdown
## Import/Export Analysis
- Circular Dependencies: [list or "None"]
- Unused Imports: [count]
- Barrel Export Usage: [Appropriate/Should be Optimized]
- Tree-shaking Compatibility: [Yes/No]
```

---

## 2. Code Quality and Standards

### 2.1 TypeScript Strict Mode Check
**Goal:** Verify that TypeScript's strict mode features are fully utilized.

**Steps:**
1. Examine `tsconfig.json` and check strict mode settings.
2. Detect usages of `any` and evaluate justifications.
3. Examine `@ts-ignore` and `@ts-expect-error` comments.
4. Detect code blocks lacking type safety.
5. Optimize Generic usages.

**Checklist:**
- [ ] Is `strict: true` active?
- [ ] Is `noImplicitAny: true` active?
- [ ] Is `strictNullChecks: true` active?
- [ ] Is `strictFunctionTypes: true` active?
- [ ] Is `any` usage below 5%?

**Analysis Command:**
```bash
# Count any usage
grep -r "any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Detect ts-ignore usage
grep -r "@ts-ignore\|@ts-expect-error" src/
```

---

### 2.2 ESLint and Prettier Compliance
**Goal:** Verify that code style is consistent and best practices are followed.

**Steps:**
1. Examine ESLint configuration.
2. Check Prettier configuration.
3. Lint all files.
4. Fix auto-fixable issues.
5. List issues requiring manual intervention.

**Check Commands:**
```bash
# Run ESLint
npm run lint

# Prettier check
npx prettier --check "src/**/*.{ts,tsx}"

# Auto-fix
npm run lint:fix
npm run format
```

**Target Metrics:**
- ESLint errors: 0
- ESLint warnings: 0
- Prettier non-compliances: 0

---

### 2.3 Code Complexity Analysis
**Goal:** Detect overly complex functions and refactoring needs.

**Steps:**
1. Calculate Cyclomatic complexity (max should be 10).
2. Perform Cognitive complexity analysis.
3. Detect long functions (>50 lines).
4. Nested depth analysis (max 4 levels).
5. Check parameter count (max 4-5).

**Analysis Tools:**
```bash
# Complexity report
npx ts-complexity src/

# SonarQube-like analysis
npx eslint src/ --ext .ts,.tsx --report-unused-disable-directives
```

**Output Format:**
```markdown
## Code Complexity Report
### High Complexity (>10)
- [file:function] - Complexity: X
  - Recommendation: [refactoring recommendation]

### Long Functions (>50 lines)
- [file:function] - Lines: Y
  - Recommendation: [splitting recommendation]
```

---

### 2.4 Code Smell Detection
**Goal:** Detect bad code smells and offer cleaning recommendations.

**Steps:**
1. Duplication detection (DRY principle violation).
2. Dead code detection.
3. Magic numbers/strings check.
4. Detect God objects.
5. Long parameter list check.

**Check Points:**
- [ ] Is the same code block repeated in more than 3 places?
- [ ] Are there unused functions?
- [ ] Should Hard-coded values be moved to config?
- [ ] Does a single class/component carry too much responsibility?

---

## 3. Performance Optimization

### 3.1 React Performance Review
**Goal:** Detect unnecessary re-renders and performance issues.

**Steps:**
1. Examine usage of `React.memo()`.
2. Check `useMemo()` and `useCallback()` optimizations.
3. Detect Prop drilling issues.
4. Evaluate Context optimization.
5. Check Virtual scrolling usage (for long lists).

**Checklist:**
- [ ] Are expensive calculations wrapped with `useMemo`?
- [ ] Are Callback functions optimized with `useCallback`?
- [ ] Are list renders optimized? (key props, virtualization)
- [ ] Is Context split? (value/dispatch separation)
- [ ] Are Heavy components lazy loaded?

**Profiling Command:**
```bash
# For React DevTools Profiler usage
# Measure component render times in Development build
npm run dev
```

---

### 3.2 Bundle Analysis and Code Splitting
**Goal:** Optimize bundle size and detect unnecessary dependencies.

**Steps:**
1. Create Production build and analyze size.
2. Examine Bundle composition.
3. Review Code splitting strategy.
4. Check Lazy loading usage.
5. Evaluate Tree-shaking effectiveness.

**Analysis Commands:**
```bash
# Bundle analysis
npm run build
npx vite-bundle-visualizer

# Dependency analysis
npm run analyze

# Bundle size report
npx bundlephobia
```

**Target Metrics:**
- Initial bundle size: <500KB (gzipped)
- Total bundle size: <2MB
- Lazy-loaded chunks: Separate for each route
- Vendor chunk: <300KB

---

### 3.3 WebSocket and Network Optimization
**Goal:** Verify that WebSocket connections and network requests are optimized.

**Steps:**
1. Examine WebSocket reconnection strategy.
2. Test Binance/Coinbase fallback mechanism.
3. Check Throttling and debouncing usage.
4. Evaluate Connection pooling strategy.
5. Examine Message batching implementation.

**Checklist:**
- [ ] Is there exponential backoff when WebSocket connection drops?
- [ ] Does fallback work on Primary source timeout?
- [ ] Are Price updates throttled? (e.g., 100ms)
- [ ] Is there a Memory leak risk? (event listener cleanup)
- [ ] Is there a Heartbeat/ping-pong mechanism?

---

### 3.4 Canvas Rendering Optimization
**Goal:** Verify that the game engine can maintain 60 FPS.

**Steps:**
1. Examine `requestAnimationFrame` usage.
2. Check if Dirty rectangle rendering is implemented.
3. Evaluate Object pooling strategy.
4. Examine Sprite batching usage.
5. Test Mobile vs Desktop rendering differences.

**Profiling Points:**
- [ ] Frame time: <16.67ms (60 FPS)
- [ ] GC pauses: Minimized?
- [ ] Canvas context switch: Optimized?
- [ ] Offscreen canvas usage: Appropriate?

**Test Scenario:**
```markdown
1. Spawn 100+ enemies
2. Activate all buffs/debuffs
3. Watch FPS counter (target: 60 FPS stable)
4. Check for leaks in Memory profiler
```

---

## 4. Test Coverage and Quality

### 4.1 Unit Test Analysis
**Goal:** Increase test quality while maintaining >80% coverage.

**Steps:**
1. Examine existing coverage report.
2. Detect Coverage gaps.
3. Evaluate Edge case tests.
4. Check test code maintainability.
5. Detect Flaky tests.

**Analysis Commands:**
```bash
# Coverage report
npm run test:coverage

# Coverage details
npx vitest --coverage --reporter=html

# Flaky test detection
npm run test -- --repeat=10
```

**Coverage Targets:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

---

### 4.2 E2E Test Improvement
**Goal:** Increase stability and coverage of 72 E2E tests.

**Steps:**
1. Review Playwright tests.
2. Detect Test timeout issues.
3. Stabilize Flaky E2E tests.
4. Check Visual regression tests.
5. Increase Mobile E2E coverage.

**Checklist:**
- [ ] Are all critical paths covered by E2E?
- [ ] Is there a Test retry strategy?
- [ ] Are Network mocks used correctly?
- [ ] Is Parallel test execution optimized?
- [ ] Is Test data cleanup performed?

**Important Test Scenarios:**
- Full flow from Game start to game over
- Leverage change and PnL impact
- Mobile touch controls (joystick + drag)
- Network error handling (WebSocket disconnect)
- Leaderboard real-time updates

---

### 4.3 Integration Test Gaps
**Goal:** Verify that integrations between services are tested.

**Steps:**
1. Examine Service integration tests.
2. Test EventBus publish/subscribe flows.
3. Check State machine transitions.
4. Test Supabase edge functions integration.
5. Test WebSocket message handling.

**Testing Required:**
```markdown
- MarketService → DifficultyManager → SpawnSystem flow
- BuffManager → Player stats → Combat calculations
- GameStateMachine state transitions
- Supabase session → verify-game edge function
- Leaderboard real-time subscription
```

---

## 5. Security Audit

### 5.1 Supabase Security Policies
**Goal:** Verify that Row Level Security (RLS) policies are correctly configured.

**Steps:**
1. Check that RLS is enabled for all tables.
2. Verify that Policies follow the principle of least privilege.
3. Examine SECURITY INVOKER vs DEFINER usage.
4. Test Edge function auth checks.
5. Evaluate Public access risks.

**Checklist:**
- [ ] `players` table: Can only owner modify their own data?
- [ ] `game_sessions` table: Is there Session verification?
- [ ] `leaderboard` view: Public read, admin-only write?
- [ ] Edge functions: Do they perform JWT verification?
- [ ] API keys: Stored in Environment variables?

---

### 5.2 XSS and Injection Protection
**Goal:** Detect Frontend security vulnerabilities.

**Steps:**
1. Check User input sanitization.
2. Examine DangerouslySetInnerHTML usage.
3. Detect places with SQL injection risk (edge functions).
4. Evaluate CORS policies.
5. Check Rate limiting implementation.

**Check Points:**
- [ ] Is there HTML injection risk in Usernames/scores?
- [ ] Is data from External APIs sanitized?
- [ ] Are parameterized queries used in Edge functions?
- [ ] Is CORS whitelist correctly configured?

---

### 5.3 Environment Variables and Secrets
**Goal:** Verify that sensitive information is stored securely.

**Steps:**
1. Check that `.env.example` file is up to date.
2. Detect Hard-coded API keys.
3. Check for leaks in Git history.
4. Evaluate Production secrets rotation strategy.
5. Detect secrets exposed in Frontend.

**Security Commands:**
```bash
# Hard-coded secrets detection
npx git-secrets --scan

# Environment variable check
grep -r "process.env" src/ | grep -v "VITE_"

# .env file leak check
git log -p | grep -i "password\|api_key\|secret"
```

---

## 6. Architecture Improvement

### 6.1 EventBus Usage
**Goal:** Verify correct application of Observer pattern and absence of memory leaks.

**Steps:**
1. Check EventBus subscriber cleanups.
2. Evaluate Event type safety.
3. Detect Event flooding issues.
4. Test Unsubscribe mechanism.
5. Examine usage of Event debugging tools.

**Checklist:**
- [ ] Is there unsubscribe in useEffect cleanups?
- [ ] Are Event payloads type-safe?
- [ ] Are Critical events throttled/debounced?
- [ ] Can EventBus.enableTracing() be used for debug?

---

### 6.2 State Management Architecture
**Goal:** Verify optimal usage of Zustand stores.

**Steps:**
1. Check logical separation of Store slices.
2. Optimize Selector usage.
3. Evaluate Immer usage.
4. Examine Persistence strategy.
5. Test DevTools integration.

**Optimization Points:**
- [ ] Are Store slices not too large? (<500 lines)
- [ ] Are Shallow equality checks used correctly?
- [ ] Are Computed values memoized?
- [ ] Does LocalStorage sync create performance issues?

---

### 6.3 Dependency Injection and Service Locator
**Goal:** Verify that service dependencies are manageable.

**Steps:**
1. Examine Service singleton pattern usage.
2. Evaluate Constructor injection vs getter injection.
3. Check Service initialization order.
4. Detect Circular dependency risks.
5. Test Mock/stub support (for unit testing).

**Services to Review:**
```markdown
- MarketService
- DifficultyManager
- SpawnSystem
- CardSystem
- BuffManager
- CombatSystem
- PoolManager
- TimeService
```

---

## 7. Mobile Optimization

### 7.1 Touch Control Quality
**Goal:** Verify that joystick and drag-to-move controls work smoothly.

**Steps:**
1. Examine Touch event handling.
2. Test Joystick dead zone configuration.
3. Evaluate Drag-to-move accuracy.
4. Check Multi-touch support (dash + move).
5. Measure Input lag.

**Test Devices:**
- iOS (iPhone 12+)
- Android (Samsung S21+)
- Tablet (iPad Air)

**Metrics:**
- Touch response time: <50ms
- Joystick precision: ±5 degrees
- Drag smoothness: 60 FPS

---

### 7.2 Responsive HUD Layout
**Goal:** Verify that HUD is readable on all screen sizes.

**Steps:**
1. Check Safe area inset usage.
2. Test Font scaling (0.5x - 1.5x).
3. Examine Landscape vs portrait adaptation.
4. Test Notch/cutout handling.
5. Verify Minimum tap target size (44x44px).

**Test Viewports:**
```markdown
- 375x667 (iPhone SE)
- 390x844 (iPhone 13)
- 393x873 (Pixel 7)
- 820x1180 (iPad)
- 1024x768 (Desktop)
```

---

### 7.3 Performance Profile Switching
**Goal:** Verify that automatic adjustment based on device performance works.

**Steps:**
1. Examine DeviceProfile detection.
2. Test Shadow/filter toggle mechanism.
3. Evaluate Particle effect reduction.
4. Check FPS stabilization strategy.
5. Measure Battery impact.

**Profile Settings:**
```markdown
Low Performance:
- Shadow: Disabled
- Particle Count: 50%
- Max Enemies: 50
- Filter Effects: Minimal

High Performance:
- Shadow: Enabled
- Particle Count: 100%
- Max Enemies: 100+
- Filter Effects: Full
```

---

## 8. WebSocket and API Integrations

### 8.1 Binance WebSocket Resilience
**Goal:** Verify that Primary data source is resilient.

**Steps:**
1. Examine Connection retry logic.
2. Test Exponential backoff implementation.
3. Check Message parsing error handling.
4. Evaluate Heartbeat mechanism.
5. Test Stale data detection.

**Test Scenarios:**
- Network interrupt simulation
- Binance API downtime handling
- Malformed message handling
- Connection flooding prevention

---

### 8.2 Coinbase Fallback Mechanism
**Goal:** Verify that switch to Secondary source is seamless.

**Steps:**
1. Examine Fallback trigger conditions.
2. Measure Switchover latency.
3. Check Data format normalization.
4. Test Dual connection scenario.
5. Evaluate Fallback revert strategy.

**Failover Test:**
```markdown
1. Manually cut Binance connection
2. Observe switch to Coinbase (max 5 seconds)
3. Verify Data continuity
4. Restore Binance
5. Test return to Primary
```

---

### 8.3 Price Data Processing Pipeline
**Goal:** Verify that Market data is processed and used correctly.

**Steps:**
1. Check Price update throttling.
2. Validate Technical indicator calculations (RSI, ATR).
3. Examine Volume aggregation logic.
4. Test Data validation.
5. Evaluate Error recovery mechanism.

**Validation Checks:**
- [ ] Are Price values in reasonable range? (e.g. BTC $10K-$150K)
- [ ] Are Timestamp's chronological?
- [ ] Are Volume spikes filtered?
- [ ] Is Stale data auto-rejected?

---

## 9. State Management Review

### 9.1 GameStore Optimization
**Goal:** Verify that game state is managed performantly.

**Steps:**
1. Analyze State slice sizes.
2. Detect Unnecessary re-renders.
3. Check Selector optimization.
4. Measure Persistence overhead.
5. Perform DevTools profiling.

**Zustand Best Practices:**
- [ ] Are Slices modular? (player, enemies, buffs separate)
- [ ] Are Shallow equality checks used?
- [ ] Is Derived state calculated? (memoization)
- [ ] Does setState perform batch updates?

---

### 9.2 LocalStorage vs Supabase Sync
**Goal:** Verify that offline/online data sync does not conflict.

**Steps:**
1. Examine Conflict resolution strategy.
2. Test Offline-first approach.
3. Optimize Sync frequency.
4. Check Data migration handling.
5. Evaluate Storage quota management.

**Test Scenarios:**
- Offline mode: Play game, then go online
- Concurrent update: Change from two devices simultaneously
- Storage full: Quota exceeded handling

---

## 10. Documentation and Maintenance

### 10.1 Code Documentation Quality
**Goal:** Verify that code maintainability is high.

**Steps:**
1. Check JSDoc/TSDoc coverage.
2. Examine explanation of Complex algorithms.
3. Evaluate Public API documentation.
4. Check Inline comment quality.
5. Review TypeDoc output.

**Documentation Standards:**
- [ ] Public functions: Explained with JSDoc
- [ ] Complex logic: Has Inline comments
- [ ] Type definitions: TSDoc annotations present
- [ ] Examples: Usage examples available

---

### 10.2 README and Documentation Currency
**Goal:** Verify that all documentation is up to date and correct.

**Steps:**
1. Verify feature list in README.md.
2. Test API documentation.
3. Update Architecture diagrams.
4. Review Contributing guide.
5. Check Changelog.

**Checklist:**
- [ ] Do commands in README work?
- [ ] Are Badges up to date? (test count, coverage)
- [ ] Do Screenshots show latest UI?
- [ ] Is Installation guide complete?

---

### 10.3 Technical Debt Inventory
**Goal:** Document accumulated technical debt and prioritize.

**Steps:**
1. Collect `TODO`, `FIXME`, `HACK` comments.
2. Detect Deprecated codes.
3. List Refactoring candidates.
4. Check Dependency updates.
5. Plan Breaking changes.

**Debt Categories:**
```markdown
Critical (P0):
- Security vulnerabilities
- Production bugs
- Performance blockers

High (P1):
- Maintainability issues
- Test coverage gaps
- Major refactoring needs

Medium (P2):
- Code smell cleanup
- Documentation updates
- Minor optimizations

Low (P3):
- Nice-to-have improvements
- Cosmetic changes
```

---

## 📊 Workflow Output Template

Create a report in the following format after completing each workflow step:

```markdown
# Crypto Cyber Survivors - [Workflow Name] Report
Date: YYYY-MM-DD
Examined Area: [area name]

## Summary
- Total Examined Files: X
- Detected Issues: Y
- Critical Issues: Z
- Recommended Improvement: W

## Detailed Findings

### ✅ Successful Areas
1. [Finding 1]
2. [Finding 2]

### ⚠️ Areas Requiring Improvement
1. [Issue 1]
   - Impact: [High/Medium/Low]
   - Recommendation: [solution recommendation]
   - Estimated Effort: [XH]

2. [Issue 2]
   - ...

### 🚨 Critical Issues
1. [Critical issue 1]
   - Priority: P0/P1
   - Risk: [risk description]
   - Immediate Action: [what needs to be done]

## Action Items
- [ ] [Task 1] - Assigned to: [person] - Deadline: [date]
```

// END OF PROTOCOL
