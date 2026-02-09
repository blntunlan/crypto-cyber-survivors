# Error Patterns Reference

## Test Error Patterns

### AssertionError Patterns

```
Pattern: Expected X, received Y
─────────────────────────────────────────
Error:   expect(received).toBe(expected)
         Expected: 100
         Received: 99

Analysis:
1. Check if test expectation is correct
2. Check if source code calculation is correct
3. For floating point: use toBeCloseTo()

Fix Examples:
─────────────────────────────────────────
// If rounding issue:
- expect(result).toBe(100);
+ expect(result).toBeCloseTo(100, 2);

// If source code is wrong:
// Fix the source, not the test

// If test expectation outdated:
- expect(result).toBe(100);
+ expect(result).toBe(99); // Updated per new spec
```

### TypeError Patterns

```
Pattern: Cannot read property 'X' of undefined
─────────────────────────────────────────
Error:   TypeError: Cannot read property 'position' of undefined

Analysis:
1. Object not initialized
2. Missing mock
3. Async timing issue

Fix Examples:
─────────────────────────────────────────
// Missing mock:
+ vi.mock('services/PlayerService', () => ({
+   getPlayer: () => ({ position: { x: 0, y: 0 } })
+ }));

// Missing initialization:
+ beforeEach(() => {
+   PlayerService.reset();
+ });

// Async issue:
- const player = getPlayer();
+ const player = await getPlayer();
```

### Timeout Patterns

```
Pattern: Timeout - Async callback was not invoked
─────────────────────────────────────────
Error:   Timeout - Async callback was not invoked within 5000ms

Analysis:
1. Missing await
2. Promise not resolved
3. Missing act() wrapper
4. Infinite loop in code

Fix Examples:
─────────────────────────────────────────
// Missing await:
- render(<AsyncComponent />);
- expect(screen.getByText('loaded')).toBeInTheDocument();
+ render(<AsyncComponent />);
+ await waitFor(() => {
+   expect(screen.getByText('loaded')).toBeInTheDocument();
+ });

// Missing act:
- fireEvent.click(button);
+ await act(async () => {
+   fireEvent.click(button);
+ });
```

### Module Not Found

```
Pattern: Cannot find module 'X'
─────────────────────────────────────────
Error:   Cannot find module '@/services/GameEngine'

Analysis:
1. Wrong import path
2. Missing alias configuration
3. File doesn't exist
4. Missing mock for external module

Fix Examples:
─────────────────────────────────────────
// Wrong path:
- import { GameEngine } from '@/services/GameEngine';
+ import { GameEngine } from '../../services/GameEngine';

// Missing mock:
+ vi.mock('@/services/GameEngine', () => ({
+   GameEngine: { getInstance: () => mockEngine }
+ }));
```

### Act Warning

```
Pattern: Warning: An update was not wrapped in act(...)
─────────────────────────────────────────
Warning: An update to Component inside a test was not wrapped in act(...)

Analysis:
1. State update happening after test assertion
2. Async operation completing unexpectedly
3. Timer/effect running after render

Fix Examples:
─────────────────────────────────────────
// Wrap state updates:
+ await act(async () => {
    fireEvent.click(button);
+   await new Promise(r => setTimeout(r, 0));
+ });

// Use waitFor:
+ await waitFor(() => {
+   expect(component).toHaveState('loaded');
+ });

// Cleanup timers:
+ afterEach(() => {
+   vi.useRealTimers();
+ });
```

---

## Lint Error Patterns

### no-unused-vars

```
Pattern: 'X' is defined but never used
─────────────────────────────────────────
Error:   'handleClick' is defined but never used

Analysis:
1. Variable truly unused → Remove it
2. Used in JSX but not detected → Check export
3. Intentionally kept → Prefix with _

Fix Examples:
─────────────────────────────────────────
// Remove unused:
- const handleClick = () => {};
  // (remove if truly unused)

// Prefix for intentional:
- const handleClick = () => {};
+ const _handleClick = () => {};  // Reserved for future

// Export issue:
- const handleClick = () => {};
+ export const handleClick = () => {};
```

### no-explicit-any

```
Pattern: Unexpected any. Specify a different type
─────────────────────────────────────────
Error:   Unexpected any. Specify a different type.

Analysis:
1. Add proper type annotation
2. Use generic if dynamic
3. Use unknown if truly unknown

Fix Examples:
─────────────────────────────────────────
// Add specific type:
- function process(data: any) {
+ function process(data: GameState) {

// Use generic:
- function process(data: any) {
+ function process<T>(data: T) {

// Use unknown (safer than any):
- function process(data: any) {
+ function process(data: unknown) {
+   if (isGameState(data)) { ... }
```

### react-hooks/exhaustive-deps

```
Pattern: React Hook useEffect has a missing dependency
─────────────────────────────────────────
Error:   React Hook useEffect has a missing dependency: 'value'

Analysis:
1. Add missing dependency
2. Move value inside effect
3. Intentionally omit (rare, document why)

Fix Examples:
─────────────────────────────────────────
// Add dependency:
- useEffect(() => { doSomething(value); }, []);
+ useEffect(() => { doSomething(value); }, [value]);

// Move inside effect:
- const value = computeValue();
- useEffect(() => { doSomething(value); }, []);
+ useEffect(() => { 
+   const value = computeValue();
+   doSomething(value); 
+ }, []);

// Intentional omit (document reason):
  useEffect(() => { 
    doSomething(value); 
+ // eslint-disable-next-line react-hooks/exhaustive-deps
+ // Intentionally run only on mount, value is stable
  }, []);
```

### @typescript-eslint/no-floating-promises

```
Pattern: Promises must be awaited or explicitly marked
─────────────────────────────────────────
Error:   Promises must be awaited, end with a call to .catch, ...

Analysis:
1. Add await
2. Add .catch() for fire-and-forget
3. Add void operator if intentional

Fix Examples:
─────────────────────────────────────────
// Add await:
- fetchData();
+ await fetchData();

// Fire and forget (intentional):
- fetchData();
+ void fetchData();

// With error handling:
- fetchData();
+ fetchData().catch(console.error);
```

---

## Error Priority

Fix in this order:

1. **Syntax Errors** (blocks everything)
2. **Import Errors** (blocks tests from running)
3. **Type Errors** (may cause runtime failures)
4. **Lint Errors** (code quality)
5. **Test Failures** (logic/behavior issues)

## Quick Reference Table

| Error Type | Auto-Fix? | Typical Fix |
|------------|-----------|-------------|
| `semi` | ✅ | lint:fix |
| `quotes` | ✅ | lint:fix |
| `indent` | ✅ | lint:fix |
| `no-unused-vars` | ❌ | Remove or _ prefix |
| `no-explicit-any` | ❌ | Add type |
| `exhaustive-deps` | ❌ | Add dep or disable |
| `AssertionError` | ❌ | Fix test or code |
| `TypeError` | ❌ | Add mock or init |
| `Timeout` | ❌ | Add await/act |
