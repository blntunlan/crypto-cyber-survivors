/**
 * Test Setup File
 *
 * Configures testing environment with jest-dom matchers
 * and mocks browser APIs not available in jsdom.
 */

import '@testing-library/jest-dom';

import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// MSW Setup
const server = setupServer(...handlers);

// Use vitest hooks
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Audio (Howler)
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    fade: vi.fn(),
    volume: vi.fn(),
    mute: vi.fn(),
    on: vi.fn(),
  })),
  Howler: {
    mute: vi.fn(),
    volume: vi.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock AudioContext for audio tests
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn().mockImplementation(() => ({
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  createGain = vi.fn().mockImplementation(() => ({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
  }));
  createBiquadFilter = vi.fn().mockImplementation(() => ({
    type: 'lowpass',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  resume = vi.fn().mockImplementation(() => Promise.resolve());
  close = vi.fn().mockImplementation(() => Promise.resolve());
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

// Mock import.meta.env
// Note: Vitest handles this via vi.stubGlobal or by defining it in vitest.config.ts
// We do both for maximum reliability across different test runners
vi.stubGlobal('import.meta', {
  env: {
    DEV: true,
    PROD: false,
    MODE: 'test',
    VITE_API_BASE_URL: 'https://test-api.railway.app',
    VITE_RAILWAY_API_URL: 'https://test-api.railway.app',
  },
});

// Polyfill for Response.clone if missing in some JSDOM versions used by MSW
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (typeof Response !== 'undefined' && !Response.prototype.clone) {
  Response.prototype.clone = function () {
    return this;
  };
}

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 16);
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  clearTimeout(id);
});

// Global WebSocket mock
vi.stubGlobal(
  'WebSocket',
  vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    readyState: 0,
  }))
);

// Mock scrollIntoView (not implemented in JSDOM)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock fetch for translations
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    ok: true,
    status: 200,
  } as Response)
);
