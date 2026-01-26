# Skill: Generate Vitest Mock
## Description
Generates robust, type-safe mocks for TypeScript services and React hooks to be used in Vitest. It prevents "undefined property" errors by analyzing the source file and creating a complete mock structure.

## Usage
Use this skill when you need to mock a complex service (like `AudioService`, `MarketService`) or a custom hook and want to ensure all public methods are covered.

## Strategy

### 1. Singleton Service Mocking
For classes exported as singletons (e.g., `audio`, `marketService`):
- Analyze the source class to find all `public` methods and properties.
- Create a `vi.mock` block that returns an object matching the structure.
- Use `vi.fn()` for all methods.
- **Crucial:** Assign reasonable default return values (e.g., `false` for booleans, `[]` for arrays, `Promise.resolve()` for async).

### 2. React Component Mocking
For components that are hard to render in tests (e.g., `Canvas` elements, `HeavyChart`):
- Create a mock that returns a simple `div` with a `data-testid`.
- This allows checking for existence without rendering the heavy logic.
- Example: `MyComponent: () => <div data-testid="my-component" />`

### 3. Hook Mocking
For custom hooks (e.g., `useDevice`, `useLanguage`):
- Mock the module path.
- Export a function that returns the expected state object.
- **Project Specific:** For `useLanguage`, always mock the `t` function to return the key: `t: (k) => k`.

## Template
```typescript
// Mock [ServiceName]
vi.mock('../../services/[ServiceName]', () => ({
  [instanceName]: {
    methodOne: vi.fn(),
    methodTwo: vi.fn().mockReturnValue(true),
    asyncMethod: vi.fn().mockResolvedValue([]),
  }
}));
```
