# Skill: Fix React/Vitest Tests
## Description
Specialized skill for diagnosing and fixing common failures in React components tests using Vitest and React Testing Library. It specifically targets issues related to missing Context Providers, `act()` wrappers, and async rendering timing.

## Usage
Activate this skill when a test fails with errors like:
- `Unable to find an element`
- `An update to Component inside a test was not wrapped in act(...)`
- `ReferenceError: ... is not defined`
- `No ... export is defined on the ... mock`

## Expertise & Rules

### 1. Missing Context Providers (The "Blank Screen" Fix)
If elements aren't found or hooks fail:
- **Diagnosis:** The component likely relies on a global context (Theme, Language, Auth, GameStore) that isn't provided in the test `render`.
- **Fix:**
  - Wrap the component in the test with the specific missing provider.
  - OR, mock the hook directly if the provider logic is too complex (e.g., `vi.mock('../../contexts/useLanguage', ...)`).
  - **Project Specific:** In `crypto-cyber-survivors`, almost all UI components need `LanguageProvider` or a mock of `useLanguage`.

### 2. The `act(...)` Warning Fix
If the console is spammed with `act(...)` warnings:
- **Diagnosis:** State updates (Zustand, React state) are happening outside the test runner's tracking cycle.
- **Fix:**
  - Import `act` from `react` (preferred) or `@testing-library/react`.
  - Wrap triggers: `act(() => { useGameStore.setState(...) })`.
  - Wrap events if necessary (though `userEvent` handles this mostly, manual `fireEvent` might not).

### 3. Vitest Mocking Fixes
If errors say "No export defined":
- **Diagnosis:** A `vi.mock` factory is missing a specific named export that the component imports.
- **Fix:**
  - Use `async (importOriginal) => { ... }` pattern to keep original exports.
  - Explicitly define the missing named export in the return object.
  - Example:
    ```typescript
    vi.mock('./module', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./module')>();
      return {
        ...actual,
        MissingExport: () => <div data-testid="mock" />,
      };
    });
    ```

### 4. Async Timing (The "Not Found" Fix)
If `getByText` fails but the element *should* be there:
- **Diagnosis:** The element renders after a `useEffect` or async operation.
- **Fix:** Switch from `getBy...` to `await findBy...`.

## Example Instruction
"Fix the test failure in `SettingsPanel.test.tsx`. It's missing the LanguageProvider and has act warnings."
