# Skill: Generate Missing Tests
## Description
Analyzes code coverage gaps and generates targeted Vitest/React-Testing-Library test cases to improve statement, branch, and function coverage. It focuses on filling specific line gaps identified in coverage reports.

## Usage
Activate this skill when you want to increase test coverage for a specific file or set of files that have low coverage.
Input: The file path to improve and (optionally) the specific lines or functions that are uncovered.

## Strategy

### 1. Analysis
- Read the source file to understand the logic of uncovered lines.
- Identify the conditions (branches) required to reach those lines.
- Determine if the file is a:
  - **Service/Class:** Needs direct method calls with specific arguments.
  - **React Component:** Needs `render` with specific props, state, or user interactions (`fireEvent`/`userEvent`).
  - **Hook:** Needs `renderHook` and specific updates.

### 2. Test Generation Rules
- **Mocking:** Mock external dependencies (imports) that are not the subject of the test to isolate the unit. Use `vi.mock`.
- **Setup:** Use `beforeEach` to reset state or mocks.
- **Act:** Perform the specific action that triggers the uncovered logic.
- **Assert:** Verify the outcome (state change, function call, return value) to confirm the line was executed and worked as expected.

### 3. Edge Case Handling
- Focus on `else` blocks, error handling (`try/catch`), and boundary conditions (null/undefined inputs) which are often missed.

## Template (Service)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TargetService } from './TargetService';

describe('TargetService Coverage', () => {
  it('should handle specific edge case', () => {
    // Arrange
    const service = new TargetService();
    // Act
    service.methodWithEdgeCase(null);
    // Assert
    expect(service.state).toBe('fallback');
  });
});
```

## Template (React)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TargetComponent } from './TargetComponent';

describe('TargetComponent Coverage', () => {
  it('should render error state when prop is missing', () => {
    render(<TargetComponent data={undefined} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
```
