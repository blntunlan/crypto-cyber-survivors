/**
 * Metrics Configuration
 *
 * Central configuration for the metrics collection system.
 * Easy to enable/disable and configure for different environments.
 *
 * Future: Can be extended to support remote database connections.
 */

export interface MetricsConfig {
  /**
   * Master switch - enables/disables all metrics collection
   * Set to false to completely disable metrics (zero performance impact)
   */
  enabled: boolean;

  /**
   * Enable debug panel in development mode
   */
  showDebugPanel: boolean;

  /**
   * Storage configuration
   */
  storage: {
    /**
     * Storage type: 'local' | 'remote' (future)
     */
    type: 'local' | 'remote';

    /**
     * Maximum sessions to store locally
     */
    maxLocalSessions: number;

    /**
     * Remote API endpoint (for future database integration)
     */
    remoteEndpoint?: string;

    /**
     * API key for remote storage (for future database integration)
     */
    apiKey?: string;
  };

  /**
   * Sampling configuration
   */
  sampling: {
    /**
     * How often to sample PnL and difficulty (ms)
     */
    intervalMs: number;

    /**
     * Enable detailed enemy tracking (can be expensive)
     */
    trackEnemyLifetimes: boolean;

    /**
     * Enable bullet tracking (can be expensive)
     */
    trackBullets: boolean;
  };

  /**
   * Privacy configuration
   */
  privacy: {
    /**
     * Anonymize session IDs
     */
    anonymize: boolean;

    /**
     * Include timestamp in exports
     */
    includeTimestamp: boolean;
  };
}

/**
 * Default metrics configuration
 *
 * IMPORTANT: Change 'enabled' to false to completely disable metrics
 */
export const METRICS_CONFIG: MetricsConfig = {
  // =============================================
  // 🎚️ MASTER SWITCH - Set to false to disable
  // =============================================
  enabled: true,

  // Debug panel (only shows in dev mode anyway)
  showDebugPanel: true,

  // Storage settings
  storage: {
    type: 'local', // 'local' for now, 'remote' for future database
    maxLocalSessions: 100,
    remoteEndpoint: undefined, // Future: 'https://api.yourserver.com/metrics'
    apiKey: undefined, // Future: API authentication
  },

  // Sampling settings
  sampling: {
    intervalMs: 1000, // Sample every 1 second
    trackEnemyLifetimes: true,
    trackBullets: true,
  },

  // Privacy settings
  privacy: {
    anonymize: false,
    includeTimestamp: true,
  },
};

/**
 * Environment-based configuration override
 *
 * You can also control via environment variables:
 * - VITE_METRICS_ENABLED=true/false
 * - VITE_METRICS_REMOTE_ENDPOINT=https://...
 */
export function getMetricsConfig(): MetricsConfig {
  const config = { ...METRICS_CONFIG };

  // Override from environment variables if available
  if (import.meta?.env) {
    // Master switch from env
    if (import.meta.env.VITE_METRICS_ENABLED !== undefined) {
      config.enabled = import.meta.env.VITE_METRICS_ENABLED === 'true';
    }

    // Remote endpoint from env
    if (import.meta.env.VITE_METRICS_REMOTE_ENDPOINT) {
      config.storage.remoteEndpoint = import.meta.env.VITE_METRICS_REMOTE_ENDPOINT;
      config.storage.type = 'remote';
    }

    // API key from env
    if (import.meta.env.VITE_METRICS_API_KEY) {
      config.storage.apiKey = import.meta.env.VITE_METRICS_API_KEY;
    }
  }

  return config;
}

/**
 * Quick helper to check if metrics are enabled
 */
export function isMetricsEnabled(): boolean {
  return getMetricsConfig().enabled;
}

/**
 * Quick helper to check if debug panel should show
 */
export function shouldShowDebugPanel(): boolean {
  const config = getMetricsConfig();
  return config.enabled && config.showDebugPanel;
}
