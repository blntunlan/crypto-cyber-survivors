import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { errorReports, cheatAttempts, deviceProfiles, performanceMetrics } from '../db/schema';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/errors — Submit error reports (public, no auth required)
 * Accepts single report or batch array.
 */
router.post('/errors', asyncHandler(async (req: Request, res: Response) => {
  try {
    const reports = Array.isArray(req.body) ? req.body : [req.body];

    if (reports.length === 0) {
      res.status(400).json({ error: 'No reports provided' });
      return;
    }

    const batch = reports.slice(0, 50);
    const db = getDb();

    await db.insert(errorReports).values(
      batch.map((report: Record<string, unknown>) => ({
        errorType: (report.errorType ?? report.error_type ?? 'unknown') as string,
        message: (report.errorMessage ?? report.message ?? 'No message') as string,
        stackTrace: (report.stackTrace ?? report.stack_trace ?? null) as string | null,
        severity: (report.severity ?? 'medium') as string,
        category: (report.category ?? 'runtime') as string,
        pageUrl: (report.url ?? report.page_url ?? null) as string | null,
        browserInfo: (report.userAgent ?? report.browser_info ?? null) as string | null,
        contextData: report.context ?? report.context_data ?? {},
        status: 'new',
      }))
    );

    res.json({ accepted: batch.length });
  } catch (error) {
    Logger.error('[Telemetry] Error report insert failed:', error);
    res.status(500).json({ error: 'Failed to store error reports' });
  }
}));

/**
 * POST /api/v1/cheat-reports — Submit cheat detection reports (public)
 */
router.post('/cheat-reports', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { profileId, sessionId, cheatType, details, severity } = req.body as {
      profileId?: string;
      sessionId?: string;
      cheatType?: string;
      details?: Record<string, unknown>;
      severity?: string;
    };

    if (!cheatType) {
      res.status(400).json({ error: 'cheatType is required' });
      return;
    }

    const db = getDb();

    await db.insert(cheatAttempts).values({
      profileId: profileId ?? null,
      sessionId: sessionId ?? null,
      cheatType,
      details: details ?? {},
      severity: severity ?? 'medium',
    });

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Cheat report insert failed:', error);
    res.status(500).json({ error: 'Failed to store cheat report' });
  }
}));

/**
 * POST /api/v1/telemetry/device-profiles — Upsert device profile (public)
 */
router.post('/device-profiles', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      fingerprint,
      device_type,
      browser,
      screen_width,
      screen_height,
      hardware_concurrency,
      device_memory,
      recommended_profile,
      benchmark_score,
    } = req.body as Record<string, unknown>;

    if (!fingerprint) {
      res.status(400).json({ error: 'fingerprint is required' });
      return;
    }

    const db = getDb();

    await db
      .insert(deviceProfiles)
      .values({
        fingerprint: fingerprint as string,
        deviceType: (device_type as string) ?? null,
        browser: (browser as string) ?? null,
        screenWidth: (screen_width as number) ?? null,
        screenHeight: (screen_height as number) ?? null,
        hardwareConcurrency: (hardware_concurrency as number) ?? null,
        deviceMemory: (device_memory as string) ?? null,
        recommendedProfile: (recommended_profile as string) ?? null,
        benchmarkScore: (benchmark_score as string) ?? null,
      })
      .onConflictDoUpdate({
        target: deviceProfiles.fingerprint,
        set: {
          deviceType: sql`COALESCE(EXCLUDED.device_type, ${deviceProfiles.deviceType})`,
          browser: sql`COALESCE(EXCLUDED.browser, ${deviceProfiles.browser})`,
          screenWidth: sql`COALESCE(EXCLUDED.screen_width, ${deviceProfiles.screenWidth})`,
          screenHeight: sql`COALESCE(EXCLUDED.screen_height, ${deviceProfiles.screenHeight})`,
          hardwareConcurrency: sql`COALESCE(EXCLUDED.hardware_concurrency, ${deviceProfiles.hardwareConcurrency})`,
          deviceMemory: sql`COALESCE(EXCLUDED.device_memory, ${deviceProfiles.deviceMemory})`,
          recommendedProfile: sql`COALESCE(EXCLUDED.recommended_profile, ${deviceProfiles.recommendedProfile})`,
          benchmarkScore: sql`COALESCE(EXCLUDED.benchmark_score, ${deviceProfiles.benchmarkScore})`,
          lastSeenAt: sql`now()`,
        },
      });

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Device profile upsert failed:', error);
    res.status(500).json({ error: 'Failed to store device profile' });
  }
}));

/**
 * POST /api/v1/telemetry/performance-metrics — Insert performance metrics (public)
 */
router.post('/performance-metrics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const db = getDb();

    await db.insert(performanceMetrics).values({
      profileId: (body.profile_id as string) ?? null,
      sessionId: (body.session_id as string) ?? null,
      devicePlatform: (body.device_platform as string) ?? null,
      deviceModel: (body.device_model as string) ?? null,
      osInfo: (body.os_info as string) ?? null,
      memoryGb: (body.memory_gb as string) ?? null,
      cpuCores: (body.cpu_cores as number) ?? null,
      avgFps: (body.avg_fps as string) ?? null,
      minFps: (body.min_fps as string) ?? null,
      maxFps: (body.max_fps as string) ?? null,
      frameDrops: (body.frame_drops as number) ?? 0,
      resolution: (body.resolution as string) ?? null,
      gpuInfo: (body.gpu_info as string) ?? null,
      metadata: body.metadata ?? {},
    });

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Performance metrics insert failed:', error);
    res.status(500).json({ error: 'Failed to store performance metrics' });
  }
}));

export default router;
