import { Router, type Request, type Response } from 'express';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/errors — Submit error reports (public, no auth required)
 * Accepts single report or batch array.
 */
router.post('/errors', async (req: Request, res: Response) => {
  try {
    const reports = Array.isArray(req.body) ? req.body : [req.body];

    if (reports.length === 0) {
      res.status(400).json({ error: 'No reports provided' });
      return;
    }

    // Batch insert (max 50 per request)
    const batch = reports.slice(0, 50);

    for (const report of batch) {
      await query(
        `INSERT INTO error_reports (error_type, message, stack_trace, severity, category, page_url, browser_info, context_data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')`,
        [
          report.errorType ?? report.error_type ?? 'unknown',
          report.errorMessage ?? report.message ?? 'No message',
          report.stackTrace ?? report.stack_trace ?? null,
          report.severity ?? 'medium',
          report.category ?? 'runtime',
          report.url ?? report.page_url ?? null,
          report.userAgent ?? report.browser_info ?? null,
          JSON.stringify(report.context ?? report.context_data ?? {}),
        ]
      );
    }

    res.json({ accepted: batch.length });
  } catch (error) {
    Logger.error('[Telemetry] Error report insert failed:', error);
    res.status(500).json({ error: 'Failed to store error reports' });
  }
});

/**
 * POST /api/v1/cheat-reports — Submit cheat detection reports (public)
 */
router.post('/cheat-reports', async (req: Request, res: Response) => {
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

    await query(
      `INSERT INTO cheat_attempts (profile_id, session_id, cheat_type, details, severity)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        profileId ?? null,
        sessionId ?? null,
        cheatType,
        JSON.stringify(details ?? {}),
        severity ?? 'medium',
      ]
    );

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Cheat report insert failed:', error);
    res.status(500).json({ error: 'Failed to store cheat report' });
  }
});

/**
 * POST /api/v1/telemetry/device-profiles — Upsert device profile (public)
 */
router.post('/device-profiles', async (req: Request, res: Response) => {
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

    await query(
      `INSERT INTO device_profiles (fingerprint, device_type, browser, screen_width, screen_height, hardware_concurrency, device_memory, recommended_profile, benchmark_score, first_seen_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (fingerprint) DO UPDATE SET
         device_type = COALESCE(EXCLUDED.device_type, device_profiles.device_type),
         browser = COALESCE(EXCLUDED.browser, device_profiles.browser),
         screen_width = COALESCE(EXCLUDED.screen_width, device_profiles.screen_width),
         screen_height = COALESCE(EXCLUDED.screen_height, device_profiles.screen_height),
         hardware_concurrency = COALESCE(EXCLUDED.hardware_concurrency, device_profiles.hardware_concurrency),
         device_memory = COALESCE(EXCLUDED.device_memory, device_profiles.device_memory),
         recommended_profile = COALESCE(EXCLUDED.recommended_profile, device_profiles.recommended_profile),
         benchmark_score = COALESCE(EXCLUDED.benchmark_score, device_profiles.benchmark_score),
         last_seen_at = NOW()`,
      [
        fingerprint,
        device_type ?? null,
        browser ?? null,
        screen_width ?? null,
        screen_height ?? null,
        hardware_concurrency ?? null,
        device_memory ?? null,
        recommended_profile ?? null,
        benchmark_score ?? null,
      ]
    );

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Device profile upsert failed:', error);
    res.status(500).json({ error: 'Failed to store device profile' });
  }
});

/**
 * POST /api/v1/telemetry/performance-metrics — Insert performance metrics (public)
 */
router.post('/performance-metrics', async (req: Request, res: Response) => {
  try {
    const {
      profile_id,
      session_id,
      device_platform,
      device_model,
      os_info,
      memory_gb,
      cpu_cores,
      avg_fps,
      min_fps,
      max_fps,
      frame_drops,
      resolution,
      gpu_info,
      metadata,
    } = req.body as Record<string, unknown>;

    await query(
      `INSERT INTO performance_metrics (profile_id, session_id, device_platform, device_model, os_info, memory_gb, cpu_cores, avg_fps, min_fps, max_fps, frame_drops, resolution, gpu_info, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        profile_id ?? null,
        session_id ?? null,
        device_platform ?? null,
        device_model ?? null,
        os_info ?? null,
        memory_gb ?? null,
        cpu_cores ?? null,
        avg_fps ?? null,
        min_fps ?? null,
        max_fps ?? null,
        frame_drops ?? 0,
        resolution ?? null,
        gpu_info ?? null,
        JSON.stringify(metadata ?? {}),
      ]
    );

    res.json({ accepted: true });
  } catch (error) {
    Logger.error('[Telemetry] Performance metrics insert failed:', error);
    res.status(500).json({ error: 'Failed to store performance metrics' });
  }
});

export default router;
