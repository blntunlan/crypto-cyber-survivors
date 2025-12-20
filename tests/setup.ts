/**
 * Test Setup File
 *
 * Configures testing environment with jest-dom matchers
 * and mocks browser APIs not available in jsdom.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
      connect: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn().mockImplementation(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  createBiquadFilter = vi.fn().mockImplementation(() => ({
    type: 'lowpass',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  resume = vi.fn().mockImplementation(() => Promise.resolve());
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    DEV: true,
    PROD: false,
    MODE: 'test',
  },
});

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
