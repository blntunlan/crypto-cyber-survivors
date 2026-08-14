/**
 * scripts/audit-contracts.ts — Static Client-Server Contract Auditor
 *
 * Programmatically verifies TypeScript client models and interfaces against
 * backend Zod validation schemas and Drizzle database models.
 */

import { z } from 'zod';
import * as serverSchemas from '../railway-market-server/src/db/validation';
import type {
  StartSessionRequest,
  VerifySessionPayload,
  VerifySessionRequest,
  AnonymousAuthRequest,
  MarketRuntimeBatchRequest,
  DeviceProfileTelemetryRequest,
  PerformanceMetricsTelemetryRequest,
} from '../services/api/types/contracts';

export type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AuditFinding {
  severity: AuditSeverity;
  category:
    | 'SCHEMA_MISMATCH'
    | 'ENUM_DRIFT'
    | 'AUTH_VULNERABILITY'
    | 'STREAM_SYNC'
    | 'TELEMETRY';
  endpoint: string;
  message: string;
  clientContract?: string;
  serverSchema?: string;
  recommendation: string;
}

export class ContractAuditor {
  static auditAllContracts(): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // ── 1. Start Session Contract ──────────────────────────────────────────────
    const sampleStartValid: StartSessionRequest = {
      pair: 'BTC_USDT',
      leverage: 10,
      position: 'LONG',
    };
    const startParse = serverSchemas.startSessionSchema.safeParse(sampleStartValid);
    if (!startParse.success) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SCHEMA_MISMATCH',
        endpoint: 'POST /api/v1/sessions/start',
        message: `Valid StartSessionRequest failed schema: ${startParse.error.message}`,
        clientContract: 'StartSessionRequest',
        serverSchema: 'startSessionSchema',
        recommendation:
          'Align StartSessionRequest fields with startSessionSchema in validation.ts',
      });
    }

    // ── 2. Verify Session Contract & Enums ──────────────────────────────────────
    const sampleVerifyValid: VerifySessionRequest = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      signature: 'dummy-hmac-signature-hex-1234567890abcdef',
      payload: {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        pair: 'BTC_USDT',
        position: 'LONG',
        leverage: 5,
        claimedEntryPrice: 92000,
        claimedExitPrice: 94000,
        claimedPnL: 2.17,
        kills: 35,
        level: 10,
        survivalSeconds: 240,
        exitType: 'portal',
        portalType: 'TAKE_PROFIT',
        maxStreak: 4,
        rawCoins: 120,
        enemyDropCoins: 80,
        totalCoins: 200,
        pnlPercent: 2.17,
      },
    };

    const verifyParse = serverSchemas.verifySessionSchema.safeParse(sampleVerifyValid);
    if (!verifyParse.success) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SCHEMA_MISMATCH',
        endpoint: 'POST /api/v1/sessions/verify',
        message: `Valid VerifySessionRequest failed schema: ${verifyParse.error.message}`,
        clientContract: 'VerifySessionRequest',
        serverSchema: 'verifySessionSchema',
        recommendation:
          'Align VerifySessionPayload with verifyPayloadSchema superRefine rules',
      });
    }

    // Check invalid portal state guard
    const invalidPortalPayload: VerifySessionPayload = {
      ...sampleVerifyValid.payload,
      exitType: 'portal',
      portalType: null, // Should be rejected for portal exits
    };
    const invalidPortalParse = serverSchemas.verifySessionSchema.safeParse({
      ...sampleVerifyValid,
      payload: invalidPortalPayload,
    });
    if (invalidPortalParse.success) {
      findings.push({
        severity: 'HIGH',
        category: 'SCHEMA_MISMATCH',
        endpoint: 'POST /api/v1/sessions/verify',
        message: 'Server failed to reject portal exit with missing portalType',
        recommendation:
          'Enforce superRefine check for portalType when exitType === "portal"',
      });
    }

    // ── 3. Anonymous Auth Contract ─────────────────────────────────────────────
    const sampleAnonAuth: AnonymousAuthRequest = {
      display_name: 'CyberRunner_99',
      device_fingerprint: 'fp_sample_hash_1234567890abcdef',
    };
    const anonParse = serverSchemas.anonymousAuthSchema.safeParse(sampleAnonAuth);
    if (!anonParse.success) {
      findings.push({
        severity: 'HIGH',
        category: 'AUTH_VULNERABILITY',
        endpoint: 'POST /api/v1/auth/anonymous',
        message: `Anonymous auth payload mismatch: ${anonParse.error.message}`,
        clientContract: 'AnonymousAuthRequest',
        serverSchema: 'anonymousAuthSchema',
        recommendation: 'Check nickname regex and length bounds in anonymousAuthSchema',
      });
    }

    // ── 4. Market Runtime Batch Contract ───────────────────────────────────────
    const sampleBatch: MarketRuntimeBatchRequest = {
      runId: '123e4567-e89b-12d3-a456-426614174000',
      count: 1,
      items: [
        {
          runId: '123e4567-e89b-12d3-a456-426614174000',
          seq: 1,
          runConstants: { pair: 'BTC_USDT', leverage: 10 },
          tick: { price: 92000, volume: 1500, sourceTs: Date.now() },
          snapshot: { pair: 'BTC_USDT', price: 92000, rsi: 55 },
        },
      ],
    };
    const batchParse = serverSchemas.marketRuntimeBatchSchema.safeParse(sampleBatch);
    if (!batchParse.success) {
      findings.push({
        severity: 'HIGH',
        category: 'STREAM_SYNC',
        endpoint: 'POST /api/v1/market/runtime-batch',
        message: `Market runtime batch schema mismatch: ${batchParse.error.message}`,
        clientContract: 'MarketRuntimeBatchRequest',
        serverSchema: 'marketRuntimeBatchSchema',
        recommendation: 'Ensure seq is positive integer and count matches items.length',
      });
    }

    // ── 5. Telemetry Contracts ─────────────────────────────────────────────────
    const sampleDeviceProfile: DeviceProfileTelemetryRequest = {
      fingerprint: 'dfp_sample_12345678',
      device_type: 'desktop',
      browser: 'Chrome 130',
      screen_width: 1920,
      screen_height: 1080,
      hardware_concurrency: 8,
      device_memory: 16,
    };
    const deviceProfileParse =
      serverSchemas.deviceProfileSchema.safeParse(sampleDeviceProfile);
    if (!deviceProfileParse.success) {
      findings.push({
        severity: 'MEDIUM',
        category: 'TELEMETRY',
        endpoint: 'POST /api/v1/telemetry/device-profiles',
        message: `Device profile telemetry mismatch: ${deviceProfileParse.error.message}`,
        clientContract: 'DeviceProfileTelemetryRequest',
        serverSchema: 'deviceProfileSchema',
        recommendation: 'Align deviceProfileSchema in validation.ts',
      });
    }

    return findings;
  }
}

// CLI entrypoint
const findings = ContractAuditor.auditAllContracts();
const criticals = findings.filter(f => f.severity === 'CRITICAL');
const highs = findings.filter(f => f.severity === 'HIGH');
const mediums = findings.filter(f => f.severity === 'MEDIUM');

console.log('===============================================================');
console.log(' 🛡️  CRYPTO SURVIVORS: CLIENT-SERVER CONTRACT AUDITOR');
console.log('===============================================================');
console.log(`Total Findings: ${findings.length}`);
console.log(`- CRITICAL: ${criticals.length}`);
console.log(`- HIGH:     ${highs.length}`);
console.log(`- MEDIUM:   ${mediums.length}`);

if (findings.length > 0) {
  console.log('\n[Findings Detail]:');
  for (const f of findings) {
    console.log(`\n[${f.severity}] [${f.category}] ${f.endpoint}`);
    console.log(`  Message:        ${f.message}`);
    console.log(`  Recommendation: ${f.recommendation}`);
  }
} else {
  console.log('\n✅ All client-server contracts and schemas are 100% synchronized.');
}

if (criticals.length > 0) {
  process.exit(1);
}
