import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  METRICS_CONFIG,
  getMetricsConfig,
  isMetricsEnabled,
  shouldShowDebugPanel,
} from '../../../config/MetricsConfig';

const defaultStorage = {
  type: METRICS_CONFIG.storage.type,
  remoteEndpoint: METRICS_CONFIG.storage.remoteEndpoint,
  apiKey: METRICS_CONFIG.storage.apiKey,
};

describe('MetricsConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();

    METRICS_CONFIG.storage.type = defaultStorage.type;
    METRICS_CONFIG.storage.remoteEndpoint = defaultStorage.remoteEndpoint;
    METRICS_CONFIG.storage.apiKey = defaultStorage.apiKey;
  });

  it('uses local storage defaults', () => {
    const config = getMetricsConfig();

    expect(config.enabled).toBe(true);
    expect(config.storage.type).toBe('local');
    expect(config.storage.maxLocalSessions).toBe(100);
    expect(isMetricsEnabled()).toBe(true);
    expect(shouldShowDebugPanel()).toBe(true);
  });

  it('respects env override for master metrics toggle', () => {
    vi.stubEnv('VITE_METRICS_ENABLED', 'false');

    expect(isMetricsEnabled()).toBe(false);
    expect(shouldShowDebugPanel()).toBe(false);
  });

  it('switches to remote storage when endpoint and key are set', () => {
    vi.stubEnv('VITE_METRICS_REMOTE_ENDPOINT', 'https://metrics.example.com');
    vi.stubEnv('VITE_METRICS_API_KEY', 'test-key');

    const config = getMetricsConfig();

    expect(config.storage.type).toBe('remote');
    expect(config.storage.remoteEndpoint).toBe('https://metrics.example.com');
    expect(config.storage.apiKey).toBe('test-key');
  });
});
