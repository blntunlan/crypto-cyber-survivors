# 🧪 Unit Test AI Agent Workflow
## Crypto Cyber Survivors - Comprehensive Testing Guidelines

---

## 📋 Table of Contents
1. [Pre-Analysis Phase](#1-pre-analysis-phase)
2. [Architecture Understanding](#2-architecture-understanding)
3. [Test Strategy Planning](#3-test-strategy-planning)
4. [Test File Organization](#4-test-file-organization)
5. [Test Case Design](#5-test-case-design)
6. [Mock & Stub Strategy](#6-mock--stub-strategy)
7. [Assertion Patterns](#7-assertion-patterns)
8. [Edge Case Identification](#8-edge-case-identification)
9. [Performance Testing](#9-performance-testing)
10. [Integration Points](#10-integration-points)
11. [Test Maintenance](#11-test-maintenance)
12. [Quality Gates](#12-quality-gates)

---

## 1. Pre-Analysis Phase

### 1.1 Project Context Review
- Read and understand the entire README.md thoroughly
- Identify the core game mechanics and systems
- Note all mentioned architectural patterns (Singleton, Factory, Observer, etc.)
- List all external dependencies (Binance WS, Coinbase WS, Supabase)
- Document the tech stack (React 19, Zustand, Vitest, RTL)
- Understand the performance targets (60 FPS, mobile optimization)

### 1.2 Existing Test Analysis
- Scan the `/tests` directory structure
- Count current test files and their organization
- Identify test coverage gaps by comparing with `/components` and `/services`
- Analyze existing test patterns and conventions
- Note the current pass rate (427 passing mentioned)
- Check for any test utilities or helpers already implemented

### 1.3 File Structure Mapping
- Create a mental map of the codebase hierarchy
- Identify relationships between components and services
- Note which files are pure logic vs UI components
- List all TypeScript type definitions in `/types`
- Document the state management structure in `/stores`
- Map out the event system in `EventBus.ts`

---

## 2. Architecture Understanding

### 2.1 Design Pattern Identification
- **Singleton Services**: Identify all singleton instances (CardSystem, DifficultyManager, EventBus)
  - Understand their initialization requirements
  - Document their public API surface
  - Note any state that needs resetting between tests

- **Factory Pattern**: Locate factory implementations
  - Understand object creation logic
  - Identify all product types created
  - Note any configuration parameters

- **Observer Pattern**: Map the EventBus system
  - List all event types from `types/events.ts`
  - Identify publishers and subscribers for each event
  - Understand event payload structures

- **Object Pooling**: Analyze pooling implementations
  - Understand acquisition and release cycles
  - Note pool size limits and growth strategies
  - Identify what objects are pooled (bullets, enemies, particles)

- **Strategy Pattern**: Find strategy implementations
  - Document all strategy variations (enemy AI, movement)
  - Understand the strategy selection logic

- **Decorator Pattern**: Understand buff/debuff system
  - Map all buff types and their stat modifications
  - Understand stacking rules
  - Note temporal vs permanent effects

### 2.2 Data Flow Analysis
- Trace WebSocket data from Binance/Coinbase to game state
- Understand how market data affects difficulty
- Map the PnL calculation pipeline
- Follow the player action → state change → render cycle
- Identify all async operations and their error paths

### 2.3 State Management
- Analyze Zustand store structure in `/stores/gameStore.ts`
- Identify all state slices and their update patterns
- Understand persistence mechanisms
- Note derived state calculations
- Document action creators and their side effects

---

## 3. Test Strategy Planning

### 3.1 Test Pyramid Definition
- **Unit Tests (70%)**: Pure logic, utilities, helpers, algorithms
  - Services without external dependencies
  - Pure functions and calculations
  - Type utilities and validators
  - Math and physics calculations

- **Integration Tests (20%)**: Component + Service interactions
  - EventBus pub/sub flows
  - State updates from user actions
  - Multi-system interactions (Physics + Collision)
  - WebSocket → State → UI flow

- **E2E Tests (10%)**: Critical user journeys
  - Login flow
  - Game start → first enemy spawn
  - Level up and card selection
  - Pause and resume
  - Mobile control interactions

### 3.2 Priority Matrix
Create a 2x2 matrix for test prioritization:

**High Impact + High Risk**:
- Market data integration and PnL calculations
- Collision detection and physics
- State synchronization across components
- Critical user flows (login, game start)

**High Impact + Low Risk**:
- UI rendering and responsiveness
- Animation and visual effects
- Sound system

**Low Impact + High Risk**:
- Error recovery mechanisms
- Edge case handling in parsers
- Async operation timeouts

**Low Impact + Low Risk**:
- Cosmetic features
- Optional enhancements
- Debug utilities

### 3.3 Coverage Goals
- **Line Coverage**: Target 85%+ for services, 70%+ for components
- **Branch Coverage**: Target 80%+ for conditional logic
- **Function Coverage**: Target 90%+ for public APIs
- **Statement Coverage**: Track but don't obsess over 100%

---

## 4. Test File Organization

### 4.1 File Naming Convention
- Mirror the source file structure exactly
- Use `.test.ts` suffix for logic tests
- Use `.test.tsx` suffix for component tests
- Use `.integration.test.ts` for integration tests
- Use `.e2e.test.ts` for end-to-end tests

### 4.2 Directory Structure
Maintain parallel structure:
```
tests/
├── components/
│   ├── GameEngine.test.tsx
│   ├── GameHUD.test.tsx
│   ├── mobile/
│   │   ├── VirtualJoystick.test.tsx
│   │   └── DragController.test.tsx
│   └── screens/
│       ├── LevelUpScreen.test.tsx
│       └── SettingsScreen.test.tsx
├── services/
│   ├── renderers/
│   │   ├── ProjectileRenderer.test.ts
│   │   └── EntityRenderer.test.ts
│   ├── metrics/
│   │   ├── MetricsStorage.test.ts
│   │   └── MetricsCompiler.test.ts
│   ├── PhysicsSystem.test.ts
│   ├── SpatialGrid.test.ts
│   └── EventBus.test.ts
├── stores/
│   └── gameStore.test.ts
├── hooks/
│   ├── useLerpValue.test.ts
│   └── useDevice.test.ts
├── utils/
│   └── test-helpers.ts
└── integration/
    ├── market-to-difficulty.integration.test.ts
    └── physics-collision.integration.test.ts
```

### 4.3 Test File Structure Template
Each test file should follow this structure:

1. **Import Section**: Organized by source (external → internal → test utils)
2. **Mock Section**: All mocks declared at the top
3. **Setup Helpers**: Reusable factory functions for test data
4. **Teardown Helpers**: Cleanup functions
5. **Test Suites**: Organized by functionality
6. **Happy Path Tests**: Normal operation cases
7. **Edge Case Tests**: Boundary conditions
8. **Error Case Tests**: Exception handling
9. **Integration Tests**: Cross-system interactions

---

## 5. Test Case Design

### 5.1 Naming Convention
Use descriptive, behavior-focused names:

**Good**:
- `should calculate correct PnL for 50x leverage long position`
- `should spawn buff gem when volume threshold exceeded`
- `should reset combo multiplier after 3 second timeout`

**Bad**:
- `test1`
- `PnL test`
- `works correctly`

### 5.2 AAA Pattern (Arrange-Act-Assert)
Every test should clearly separate:

**Arrange**:
- Set up test data and preconditions
- Initialize mocks and stubs
- Configure the system under test

**Act**:
- Execute the single action being tested
- Should be one clear operation

**Assert**:
- Verify the expected outcome
- Check side effects
- Validate state changes

### 5.3 Test Data Factories
Create factory functions for complex test data:

**Principles**:
- Default to valid, realistic data
- Allow selective overrides
- Use named parameters for clarity
- Reuse across test suites
- Keep factories in dedicated utility files

**Factory Types**:
- `createMockPlayer()`: Player entity with stats
- `createMockEnemy()`: Enemy with AI behavior
- `createMockMarketData()`: Realistic price feed
- `createMockCard()`: Card with rarity and effects
- `createMockBuffGem()`: Buff gem configuration

### 5.4 Equivalence Partitioning
For each input, identify equivalence classes:

**Example: Leverage System (1x to 100x)**
- Valid classes: [1-10x], [11-50x], [51-100x]
- Invalid classes: [<1], [>100], [non-integer], [null], [undefined]
- Boundary values: 1, 10, 11, 50, 51, 100

**Example: Kill Combo System**
- Valid classes: [0-4 kills], [5-9 kills], [10-19 kills], [20+ kills]
- Timeout scenarios: [within 3s], [exactly 3s], [after 3s]

### 5.5 Boundary Value Analysis
Test at and around boundaries:

**For numeric ranges**:
- Test: min-1, min, min+1, mid, max-1, max, max+1

**For collections**:
- Test: empty, single item, typical size, at capacity, over capacity

**For timing**:
- Test: immediate, just before timeout, at timeout, after timeout

---

## 6. Mock & Stub Strategy

### 6.1 When to Mock vs Stub vs Spy

**Mock** (behavior verification):
- External API calls (Binance WS, Coinbase WS)
- Supabase database operations
- Browser APIs (localStorage, WebSocket)
- Time-dependent functions (Date.now, setTimeout)

**Stub** (state replacement):
- Static data sources
- Configuration objects
- Simple return values
- Dependency injection points

**Spy** (observation):
- EventBus listeners
- Callback functions
- Render cycles
- State update functions

### 6.2 Mock Isolation Levels

**Level 1: Full Isolation** (Unit Tests)
- Mock all external dependencies
- Mock sibling services
- Use fake timers
- Stub WebSocket connections

**Level 2: Partial Integration** (Integration Tests)
- Use real EventBus
- Use real state management
- Mock only external I/O
- Use real physics calculations

**Level 3: Minimal Mocking** (E2E Tests)
- Only mock external APIs
- Use real browser environment
- Real timers and animations
- Real user interactions

### 6.3 Mock Data Realism
Ensure mocks reflect real-world behavior:

**WebSocket Market Data**:
- Include realistic price movements
- Simulate network latency
- Include occasional disconnects
- Vary message frequency

**Enemy AI**:
- Include pathfinding edge cases
- Simulate collision scenarios
- Include stuck/unstuck behavior

**User Input**:
- Include multi-touch scenarios
- Simulate rapid input changes
- Include invalid input sequences

### 6.4 Singleton Handling
For singleton services:

**Before Each Test**:
- Reset singleton state
- Clear event listeners
- Reset internal counters
- Clear cached data

**After Each Test**:
- Restore original behavior
- Cleanup event handlers
- Verify no memory leaks

**Strategies**:
- Implement `reset()` methods on singletons
- Use dependency injection where possible
- Consider using a service locator for testing

---

## 7. Assertion Patterns

### 7.1 Assertion Specificity
Be as specific as possible:

**Weak** (avoid):
- `expect(result).toBeTruthy()`
- `expect(array).toHaveLength(3)`

**Strong** (prefer):
- `expect(result).toBe(42)`
- `expect(array).toEqual([enemy1, enemy2, enemy3])`

### 7.2 Multiple Assertions
Group related assertions:

**Acceptable** (testing a single behavior with multiple aspects):
- Test one logical outcome
- Verify related state changes
- Check expected side effects

**Avoid** (testing multiple behaviors in one test):
- Multiple unrelated checks
- Testing different scenarios
- Verifying orthogonal concerns

### 7.3 Custom Matchers
Create domain-specific matchers for readability:

**Examples**:
- `toBeWithinPriceRange(expected, tolerance)`
- `toHaveBuffActive(buffType)`
- `toBeInComboState(multiplier)`
- `toHaveSpawnedEnemies(count)`

### 7.4 Async Assertions
Handle async operations properly:

**For Promises**:
- Always await or return promises
- Use `async/await` syntax consistently
- Handle rejections explicitly

**For Timers**:
- Use fake timers (`vi.useFakeTimers()`)
- Advance time explicitly (`vi.advanceTimersByTime()`)
- Clear timers after tests

**For Events**:
- Wait for event emissions
- Use timeout guards
- Verify event ordering

### 7.5 Error Assertions
Test error conditions thoroughly:

**Verify**:
- Error type/class
- Error message content
- Error properties
- Stack trace presence

**Patterns**:
- `expect(() => fn()).toThrow(ExpectedError)`
- `await expect(asyncFn()).rejects.toThrow()`
- Verify error recovery behavior
- Test error propagation

---

## 8. Edge Case Identification

### 8.1 Numeric Edge Cases

**Zero Values**:
- Zero health → player death
- Zero leverage → invalid state
- Zero enemies → wave completion
- Zero XP → level 1 state

**Negative Values**:
- Negative PnL → liquidation risk
- Negative velocity → reverse movement
- Negative combo → reset behavior

**Extreme Values**:
- Max integer for price
- 100x leverage at market extremes
- 999+ kill combo
- Minimum float precision

**Special Numbers**:
- NaN in calculations
- Infinity in division
- Floating point precision errors

### 8.2 Collection Edge Cases

**Empty Collections**:
- No enemies on screen
- No bullets active
- No cards available
- Empty event queue

**Single Element**:
- One enemy remaining
- Single bullet fired
- Only one buff active

**At Capacity**:
- Object pool exhausted
- Max enemies spawned
- Full buff slots
- Event queue overflow

### 8.3 Timing Edge Cases

**Zero Duration**:
- Instant buff expiration
- Zero frame delta time
- Simultaneous events

**Very Long Duration**:
- Hour-long game sessions
- Accumulated floating point errors
- Memory leak scenarios

**Race Conditions**:
- Simultaneous WebSocket messages
- Multiple enemies dying same frame
- Concurrent state updates

### 8.4 State Transition Edge Cases

**Invalid Transitions**:
- Pause during level up
- Restart during animation
- Input during game over

**Missing Transitions**:
- Disconnect during gameplay
- Browser tab switch
- Device sleep mode

**Cyclic Transitions**:
- Rapid pause/unpause
- Quick restart loops
- Buff reapplication

### 8.5 Input Edge Cases

**Mobile Touch**:
- Multi-finger gestures
- Touch outside safe area
- Simultaneous joystick + drag
- Touch during screen rotation

**Keyboard**:
- Multiple keys pressed
- Key held vs tapped
- Invalid key combinations

**WebSocket**:
- Malformed JSON
- Unexpected message types
- Out-of-order messages
- Very high message rate

---

## 9. Performance Testing

### 9.1 Performance Metrics to Track

**Frame Rate Stability**:
- Average FPS over 60 second session
- 1% and 0.1% lows
- Frame time variance
- Dropped frame count

**Memory Usage**:
- Heap size growth rate
- Object allocation rate
- Garbage collection frequency
- Memory leak detection

**Computational Efficiency**:
- Collision detection time per frame
- Pathfinding algorithm time
- Rendering pipeline duration
- Event processing latency

### 9.2 Benchmark Scenarios

**Stress Tests**:
- 100+ enemies on screen
- 500+ active projectiles
- 10+ active buffs simultaneously
- Rapid card upgrades

**Endurance Tests**:
- 30 minute continuous gameplay
- 1000+ enemy kills in one session
- Memory stability over time

**Optimization Validation**:
- Spatial grid vs brute force collision
- Object pooling vs new allocations
- Canvas shadow culling effectiveness

### 9.3 Performance Test Structure

**Setup**:
- Define performance budget (e.g., <16ms per frame)
- Create reproducible test scenarios
- Use performance.now() for measurements
- Run multiple iterations for statistical significance

**Measurement**:
- Record start and end timestamps
- Calculate mean, median, p95, p99
- Track memory snapshots
- Monitor garbage collection

**Assertion**:
- Compare against baseline
- Ensure no regression
- Verify optimization gains
- Check mobile vs desktop differences

### 9.4 Profiling Integration

**Development Profiling**:
- Identify hot paths in code
- Find allocation-heavy functions
- Detect unnecessary re-renders
- Spot event handler leaks

**Test Profiling**:
- Run performance tests with profiler attached
- Generate flame graphs
- Export trace data
- Compare before/after optimization

---

## 10. Integration Points

### 10.1 Service-to-Service Integration

**EventBus Integration**:
- Test event flow between publishers and subscribers
- Verify event payload integrity
- Test event ordering guarantees
- Validate cleanup on unsubscribe

**State Synchronization**:
- Test Zustand store updates from multiple sources
- Verify derived state consistency
- Test persistence and rehydration
- Validate concurrent updates

**Physics + Collision**:
- Test SpatialGrid with PhysicsSystem
- Verify entity movement and collision detection
- Test projectile trajectory calculations
- Validate boundary collision handling

### 10.2 Component-to-Service Integration

**GameEngine + Renderers**:
- Test render loop integration
- Verify frame timing consistency
- Test draw call sequencing
- Validate layer ordering

**GameHUD + State**:
- Test live data binding
- Verify smooth value interpolation (useLerpValue)
- Test conditional rendering based on state
- Validate safe area inset handling

**Mobile Controllers + Input**:
- Test touch event to movement translation
- Verify joystick dead zones
- Test drag-to-move precision
- Validate multi-touch scenarios

### 10.3 External API Integration

**WebSocket Mocking**:
- Create mock WebSocket server
- Simulate realistic message patterns
- Test reconnection logic
- Validate error handling

**Market Data Flow**:
- Test Binance/Coinbase message parsing
- Verify price aggregation logic
- Test PnL calculation from price changes
- Validate difficulty adjustment triggers

**Supabase Integration**:
- Mock database queries
- Test user authentication flow
- Verify leaderboard updates
- Test crash report submission

### 10.4 Cross-System Integration

**Combo System + XP Calculation**:
- Test kill streak to XP multiplier
- Verify level up triggering
- Test combo timeout integration with pause
- Validate buff gem spawn on volume change

**Difficulty Manager + Enemy Spawner**:
- Test market volatility to spawn rate
- Verify leverage impact on enemy stats
- Test PnL-based difficulty scaling
- Validate wave progression logic

---

## 11. Test Maintenance

### 11.1 Test Code Quality

**DRY Principle**:
- Extract common setup to helper functions
- Reuse test data factories
- Share assertion utilities
- Centralize mock configurations

**Readability**:
- Use descriptive variable names
- Add comments for complex scenarios
- Keep tests short and focused
- Group related tests logically

**Maintainability**:
- Avoid hardcoding magic numbers
- Use constants for test data
- Keep mocks close to usage
- Document non-obvious test setups

### 11.2 Test Smell Detection

**Common Smells**:
- Tests that test implementation details
- Tests with excessive setup
- Tests that require manual verification
- Flaky tests that pass/fail randomly
- Tests with sleep/wait calls
- Tests that depend on test order

**Refactoring Strategies**:
- Break down large test suites
- Extract common patterns to utilities
- Replace sleeps with proper async handling
- Isolate tests from each other
- Use beforeEach/afterEach consistently

### 11.3 Test Stability

**Flakiness Prevention**:
- Use deterministic test data
- Mock time-dependent functions
- Avoid race conditions
- Control randomness with seeds
- Use fake timers consistently

**Deterministic Execution**:
- Reset global state before each test
- Clear all mocks and spies
- Restore original implementations
- Clean up event listeners
- Reset singleton instances

### 11.4 Documentation

**Test Documentation**:
- Add JSDoc comments to test utilities
- Document complex test scenarios
- Explain non-obvious assertions
- Link to related implementation code

**README for Tests**:
- Explain test organization
- Document test utilities
- Provide examples of common patterns
- List known test limitations

---

## 12. Quality Gates

### 12.1 Pre-Commit Checks

**Automated Checks**:
- All tests must pass (427+ passing)
- No linting errors (existing 48 warnings acceptable)
- Test coverage must not decrease
- No TypeScript errors
- No console.error in tests

### 12.2 Code Review Checklist

**Test Coverage**:
- [ ] All new functions have corresponding tests
- [ ] All exported functions are tested
- [ ] Edge cases are covered
- [ ] Error paths are tested

**Test Quality**:
- [ ] Tests follow AAA pattern
- [ ] Test names are descriptive
- [ ] No test smells present
- [ ] Mocks are appropriate
- [ ] Assertions are specific

**Integration**:
- [ ] Critical paths have integration tests
- [ ] External dependencies are mocked
- [ ] Async operations are handled correctly

### 12.3 Coverage Thresholds

**Enforce Thresholds**:
- Statements: 80%
- Branches: 75%
- Functions: 85%
- Lines: 80%

**Exception Cases**:
- Exclude generated files
- Exclude type definition files
- Exclude test utilities
- Exclude legacy code (if marked)

### 12.4 Performance Benchmarks

**Required Benchmarks**:
- Frame time < 16ms (60 FPS)
- Collision detection < 5ms per frame
- EventBus dispatch < 1ms
- State update < 2ms

**Regression Detection**:
- Compare against baseline
- Flag >10% performance degradation
- Require explanation for regressions
- Update baseline for intentional changes

### 12.5 Continuous Integration

**CI Pipeline**:
1. Install dependencies
2. Run linter
3. Run type checking
4. Run all tests
5. Generate coverage report
6. Run performance benchmarks
7. Archive test artifacts

**Failure Response**:
- Block merge on test failures
- Require coverage threshold
- Alert on performance regression
- Generate detailed failure reports

---

## 📝 Implementation Checklist

Use this checklist when writing tests for a new file:

- [ ] **Phase 1: Analysis**
  - [ ] Read and understand the source file completely
  - [ ] Identify all exported functions/classes
  - [ ] List all dependencies
  - [ ] Note all side effects

- [ ] **Phase 2: Setup**
  - [ ] Create test file with proper naming
  - [ ] Import necessary dependencies
  - [ ] Set up mocks for external dependencies
  - [ ] Create test data factories

- [ ] **Phase 3: Happy Path**
  - [ ] Write tests for main use cases
  - [ ] Test typical input values
  - [ ] Verify expected outputs
  - [ ] Check state changes

- [ ] **Phase 4: Edge Cases**
  - [ ] Test boundary values
  - [ ] Test empty/null/undefined inputs
  - [ ] Test maximum values
  - [ ] Test invalid inputs

- [ ] **Phase 5: Error Cases**
  - [ ] Test error throwing
  - [ ] Test error recovery
  - [ ] Test error propagation
  - [ ] Verify error messages

- [ ] **Phase 6: Integration**
  - [ ] Test interaction with dependencies
  - [ ] Test event emissions
  - [ ] Test state synchronization
  - [ ] Test async operations

- [ ] **Phase 7: Performance**
  - [ ] Add performance benchmarks if critical path
  - [ ] Verify no memory leaks
  - [ ] Check for unnecessary allocations

- [ ] **Phase 8: Review**
  - [ ] Verify test coverage > 80%
  - [ ] Check for test smells
  - [ ] Ensure deterministic execution
  - [ ] Review test naming and organization

---

## 🎯 Key Principles Summary

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Arrange-Act-Assert**: Keep tests structured and readable
3. **Isolation**: Each test should be independent
4. **Determinism**: Tests should always produce same results
5. **Clarity**: Test names and structure should be self-documenting
6. **Speed**: Tests should run fast for quick feedback
7. **Comprehensive**: Cover happy paths, edge cases, and errors
8. **Maintainable**: Tests should be easy to update when code changes

---

## 🚀 Advanced Testing Techniques

### Property-Based Testing
For complex algorithms (collision detection, pathfinding):
- Generate random valid inputs
- Verify invariants hold for all inputs
- Useful for physics calculations
- Helps find edge cases automatically

### Mutation Testing
To verify test effectiveness:
- Modify production code slightly
- Verify tests catch the mutations
- Improve test quality based on results

### Visual Regression Testing
For canvas rendering:
- Capture reference screenshots
- Compare against current renders
- Detect unintended visual changes
- Especially useful for projectile visuals

### Snapshot Testing
For complex data structures:
- Capture expected output as snapshot
- Verify future runs match snapshot
- Useful for EventBus payloads
- Good for configuration objects

---

## 📚 References & Resources

- **Vitest Documentation**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Testing Best Practices**: https://testingjavascript.com/
- **Test-Driven Development**: Kent Beck's TDD book
- **Working Effectively with Legacy Code**: Michael Feathers

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-24  
**Maintained By**: AI Testing Agent  
**Target Project**: Crypto Cyber Survivors