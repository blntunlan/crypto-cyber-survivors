# Common Mock Patterns for Crypto Survivors

Use these patterns to ensure consistent and type-safe mocking in Vitest.

## 1. Zustand Store (useGameStore)

```typescript
import { vi } from 'vitest';

vi.mock('../stores/gameStore', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      player: { x: 400, y: 300, health: 100, maxHealth: 100, speed: 200 },
      enemies: [],
      gems: [],
      isPlaying: true,
      isPaused: false,
      score: 0,
    };
    return selector ? selector(state) : state;
  }),
}));
```

## 2. EventBus

```typescript
vi.mock('../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));
```

## 3. Singleton Services

When a service uses `getInstance()`, mock it like this:

```typescript
vi.mock('../services/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({
      spawn: vi.fn(),
      despawn: vi.fn(),
      cleanup: vi.fn(),
    })),
  },
}));
```

## 4. Logger (Suppressing Noise)

```typescript
vi.mock('../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
```

## 5. Canvas API

```typescript
const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
};

vi.stubGlobal('HTMLCanvasElement', {
  prototype: {
    getContext: vi.fn(() => mockContext),
  },
});
```
