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
    createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    }));
    createGain = vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
    }));
    resume = vi.fn(() => Promise.resolve());
    destination = {};
}

Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContext,
});

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
