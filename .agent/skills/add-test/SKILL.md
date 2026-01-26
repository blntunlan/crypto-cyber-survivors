---
name: add-test
description: Create tests for a component, service, or utility following project patterns
---

# Add Test Skill

Proje test pattern'lerine uygun test dosyası oluştur.

## Usage

```
/add-test [file-path]
```

## Test Frameworks

- **Unit Tests**: Vitest
- **E2E Tests**: Playwright

## Unit Test Template

### Service Test

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceName } from '../services/ServiceName';
import { EventBus } from '../services/EventBus';

// Mock dependencies
vi.mock('../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ServiceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ServiceName.initialize();
  });

  afterEach(() => {
    ServiceName.dispose();
  });

  describe('initialization', () => {
    it('should initialize correctly', () => {
      expect(ServiceName).toBeDefined();
    });

    it('should warn if already initialized', () => {
      ServiceName.initialize(); // Second call
      // Assert warning logged
    });
  });

  describe('update', () => {
    it('should update correctly with deltaTime', () => {
      ServiceName.update(16); // ~60fps
      // Assert expected behavior
    });
  });

  describe('events', () => {
    it('should handle gameReset event', () => {
      EventBus.emit('gameReset');
      // Assert reset occurred
    });
  });
});
```

### Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../components/ComponentName';

// Mock hooks
vi.mock('../stores/gameStore', () => ({
  useGameStore: () => ({
    player: { health: 100 },
    isPlaying: true,
  }),
}));

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<ComponentName onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should update on prop change', () => {
    const { rerender } = render(<ComponentName value={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    
    rerender(<ComponentName value={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
```

### Utility Test

```typescript
import { describe, it, expect } from 'vitest';
import { utilityFunction } from '../utils/utilityName';

describe('utilityFunction', () => {
  it('should handle normal input', () => {
    expect(utilityFunction('input')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(utilityFunction('')).toBe('');
    expect(utilityFunction(null)).toBeNull();
  });

  it('should throw on invalid input', () => {
    expect(() => utilityFunction(undefined)).toThrow();
  });
});
```

## E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for game to load
    await page.waitForSelector('[data-testid="game-canvas"]');
  });

  test('should complete user flow', async ({ page }) => {
    // Act
    await page.click('[data-testid="start-button"]');
    
    // Assert
    await expect(page.locator('[data-testid="game-hud"]')).toBeVisible();
  });

  test('should handle error state', async ({ page }) => {
    // Simulate error condition
    await page.evaluate(() => {
      // Mock error scenario
    });
    
    // Assert error handling
    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

## Test Locations

| Type | Location |
|------|----------|
| Service tests | `tests/services/` |
| Component tests | `tests/components/` |
| Hook tests | `tests/hooks/` |
| E2E tests | `e2e/` |

## Common Mocks

### gameStore Mock

```typescript
vi.mock('../stores/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    player: {
      x: 400, y: 300, health: 100,
      speed: 200, damage: 10,
    },
    enemies: [],
    gems: [],
    isPlaying: true,
    isPaused: false,
  })),
}));
```

### EventBus Mock

```typescript
vi.mock('../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));
```

### Canvas Mock

```typescript
beforeEach(() => {
  const canvas = document.createElement('canvas');
  canvas.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    // ... other methods
  }));
});
```

## Running Tests

```bash
# turbo
npm run test              # All tests
npm run test -- ServiceName  # Specific file
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:e2e          # Playwright tests
```

## Coverage Goals

- **Minimum**: %80 line coverage
- **Functions**: Tüm public metodlar test edilmeli
- **Edge cases**: Null, undefined, empty, boundary değerleri
- **Error paths**: Error handling logic'i test et
