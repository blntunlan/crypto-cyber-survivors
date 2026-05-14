/**
 * SupabaseHealthService - Health checker (stub)
 *
 * Supabase is now auth-only. All data tables are in Railway PostgreSQL.
 * Use the /debug endpoint on the Railway server for database health checks.
 * This service is kept as a stub for backward compatibility.
 */

import { Logger } from './Logger';
import { railwayClient } from '../api/RailwayClient';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    connection: { connected: boolean; latencyMs: number; error?: string };
    tables: never[];
    rls: {
      allTablesProtected: boolean;
      policiesCount: number;
      vulnerabilities: string[];
    };
    performance: { avgQueryTimeMs: number; slowQueries: string[]; indexUsage: string };
    sync: {
      typesInSync: boolean;
      missingTables: string[];
      extraTables: string[];
      schemaVersion: string | null;
    };
  };
  summary: string;
  recommendations: string[];
}

class SupabaseHealthServiceClass {
  private static instance: SupabaseHealthServiceClass | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;

  static getInstance(): SupabaseHealthServiceClass {
    return (SupabaseHealthServiceClass.instance ??= new SupabaseHealthServiceClass());
  }

  /**
   * Run health check via Railway /debug endpoint
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    try {
      const debug = await railwayClient.get<{
        pipeline: { binanceConnected: boolean; dbConnected: boolean };
        database: {
          pool: { totalCount: number; idleCount: number; waitingCount: number };
        };
      }>('/debug');

      const result: HealthCheckResult = {
        status: debug.pipeline.dbConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          connection: { connected: debug.pipeline.dbConnected, latencyMs: 0 },
          tables: [],
          rls: { allTablesProtected: true, policiesCount: 0, vulnerabilities: [] },
          performance: { avgQueryTimeMs: 0, slowQueries: [], indexUsage: 'optimal' },
          sync: {
            typesInSync: true,
            missingTables: [],
            extraTables: [],
            schemaVersion: null,
          },
        },
        summary: `Railway DB: ${debug.pipeline.dbConnected ? 'connected' : 'disconnected'}, Binance: ${debug.pipeline.binanceConnected ? 'connected' : 'disconnected'}`,
        recommendations: [],
      };

      this.lastHealthCheck = result;
      return result;
    } catch (error) {
      Logger.error('[SupabaseHealth] Railway health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          connection: {
            connected: false,
            latencyMs: -1,
            error: 'Railway API unreachable',
          },
          tables: [],
          rls: { allTablesProtected: false, policiesCount: 0, vulnerabilities: [] },
          performance: { avgQueryTimeMs: -1, slowQueries: [], indexUsage: 'poor' },
          sync: {
            typesInSync: false,
            missingTables: [],
            extraTables: [],
            schemaVersion: null,
          },
        },
        summary: 'UNHEALTHY: Railway API unreachable',
        recommendations: ['Check Railway server status and VITE_RAILWAY_API_URL'],
      };
    }
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    try {
      const start = performance.now();
      await railwayClient.get('/health');
      return { ok: true, latencyMs: performance.now() - start };
    } catch {
      return { ok: false, latencyMs: -1 };
    }
  }

  getLastResult(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  async validateTable(
    _tableName: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    return { valid: true, issues: [] };
  }

  reset(): void {
    this.lastHealthCheck = null;
  }
}

export const SupabaseHealthService = SupabaseHealthServiceClass.getInstance();
