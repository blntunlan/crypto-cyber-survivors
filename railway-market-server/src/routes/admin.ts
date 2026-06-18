import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { getPool } from '../db/pool';
import { Logger } from '../utils/logger';

const router = Router();

function getAdminSecret(): string {
  let secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    process.env.ADMIN_API_SECRET = secret;
    Logger.warn(`[Admin] ADMIN_API_SECRET is not configured in admin route. Generated ephemeral secret: ${secret}`);
  }
  return secret;
}

/**
 * Simple admin auth — checks Bearer token against ADMIN_API_SECRET env var.
 */
function requireAdmin(req: Request, res: Response, next: () => void): void {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${getAdminSecret()}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

type CountRow = { count: string };
type ProviderRow = { provider: string; count: string };
type AuditRow = { action: string; count: string };
type TopPlayer = { nickname: string; total_reward: string; sessions_count: string };
type AverageRow = { avg: string | null };

/**
 * GET /api/v1/admin/dashboard — Comprehensive system dashboard
 */
router.get(
  '/dashboard',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const pool = getPool();

    // --- System ---
    const system = {
      uptime: Math.round(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeVersion: process.version,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        active: pool.totalCount - pool.idleCount,
      },
    };

    // --- Users ---
    let users: Record<string, unknown> = {};
    try {
      const [totalR, todayR, activeR] = await Promise.all([
        pool.query<CountRow>(`SELECT COUNT(*) AS count FROM profiles`),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM profiles WHERE created_at::date = CURRENT_DATE`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM profiles WHERE last_seen_at > now() - INTERVAL '24 hours'`
        ),
      ]);
      users = {
        total: Number(totalR.rows[0]?.count ?? 0),
        newToday: Number(todayR.rows[0]?.count ?? 0),
        active24h: Number(activeR.rows[0]?.count ?? 0),
      };
    } catch {
      users = { error: 'query failed' };
    }

    // --- Sessions ---
    let sessionMetrics: Record<string, unknown> = {};
    try {
      const [total24R, verifiedR, avgDurR] = await Promise.all([
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM sessions WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM sessions WHERE is_verified = true AND created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<{ avg: string }>(
          `SELECT COALESCE(AVG(survival_seconds), 0)::TEXT AS avg FROM sessions WHERE is_verified = true AND created_at > now() - INTERVAL '24 hours'`
        ),
      ]);
      const total24 = Number(total24R.rows[0]?.count ?? 0);
      const verified24 = Number(verifiedR.rows[0]?.count ?? 0);
      sessionMetrics = {
        total24h: total24,
        verified24h: verified24,
        unverified24h: total24 - verified24,
        verificationRate: total24 > 0 ? Math.round((verified24 / total24) * 100) : 0,
        avgSurvivalSeconds: Math.round(Number(avgDurR.rows[0]?.avg ?? 0)),
      };
    } catch {
      sessionMetrics = { error: 'query failed' };
    }

    // --- Economy ---
    let economy: Record<string, unknown> = {};
    try {
      const [totalGoldR, txTodayR, totalMetaR] = await Promise.all([
        pool.query<{ sum: string }>(
          `SELECT COALESCE(SUM(gold_balance), 0)::TEXT AS sum FROM virtual_accounts`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM ledger WHERE created_at::date = CURRENT_DATE`
        ),
        pool.query<{ sum: string }>(
          `SELECT COALESCE(SUM(meta_coins), 0)::TEXT AS sum FROM meta_progression`
        ),
      ]);
      economy = {
        totalGoldInCirculation: Number(totalGoldR.rows[0]?.sum ?? 0),
        transactionsToday: Number(txTodayR.rows[0]?.count ?? 0),
        totalMetaCoins: Number(totalMetaR.rows[0]?.sum ?? 0),
      };
    } catch {
      economy = { error: 'query failed' };
    }

    // --- Auth Providers ---
    let providers: Record<string, number> = {};
    try {
      const { rows } = await pool.query<ProviderRow>(
        `SELECT provider, COUNT(*)::TEXT AS count FROM identities GROUP BY provider ORDER BY count DESC`
      );
      providers = Object.fromEntries(rows.map(r => [r.provider, Number(r.count)]));
    } catch {
      /* ignore */
    }

    // --- Security ---
    let security: Record<string, unknown> = {};
    let telemetry: Record<string, unknown> = {};
    try {
      const [cheatsR, errorsR] = await Promise.all([
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM cheat_attempts WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM error_reports WHERE severity = 'critical' AND created_at > now() - INTERVAL '24 hours'`
        ),
      ]);
      let suspiciousCount = 0;
      try {
        const susR = await pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM audit_log WHERE action = 'session.suspicious' AND created_at > now() - INTERVAL '24 hours'`
        );
        suspiciousCount = Number(susR.rows[0]?.count ?? 0);
      } catch {
        /* audit_log may not exist */
      }
      security = {
        cheatAttempts24h: Number(cheatsR.rows[0]?.count ?? 0),
        criticalErrors24h: Number(errorsR.rows[0]?.count ?? 0),
        suspiciousSessions24h: suspiciousCount,
      };
    } catch {
      security = { error: 'query failed' };
    }

    // --- Telemetry visibility ---
    try {
      const [errorsR, cheatR, perfR, avgFpsR, devicesR] = await Promise.all([
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM error_reports WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM cheat_attempts WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM performance_metrics WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<AverageRow>(
          `SELECT COALESCE(AVG(avg_fps), 0)::TEXT AS avg FROM performance_metrics WHERE created_at > now() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM device_profiles WHERE last_seen_at > now() - INTERVAL '24 hours'`
        ),
      ]);

      telemetry = {
        errorReports24h: Number(errorsR.rows[0]?.count ?? 0),
        cheatAttempts24h: Number(cheatR.rows[0]?.count ?? 0),
        performanceMetrics24h: Number(perfR.rows[0]?.count ?? 0),
        avgFps24h: Math.round(Number(avgFpsR.rows[0]?.avg ?? 0)),
        activeDeviceProfiles24h: Number(devicesR.rows[0]?.count ?? 0),
      };
    } catch {
      telemetry = { error: 'query failed' };
    }

    // --- Audit Log Summary ---
    let auditSummary: Record<string, number> = {};
    try {
      const { rows } = await pool.query<AuditRow>(
        `SELECT action, COUNT(*)::TEXT AS count FROM audit_log WHERE created_at > now() - INTERVAL '24 hours' GROUP BY action ORDER BY count DESC`
      );
      auditSummary = Object.fromEntries(rows.map(r => [r.action, Number(r.count)]));
    } catch {
      /* audit_log may not exist */
    }

    // --- Top Players ---
    let topPlayers: Array<{ nickname: string; totalReward: number; sessions: number }> = [];
    try {
      const { rows } = await pool.query<TopPlayer>(
        `SELECT p.nickname, SUM(s.reward_amount)::TEXT AS total_reward, COUNT(s.id)::TEXT AS sessions_count
         FROM sessions s JOIN profiles p ON s.profile_id = p.id
         WHERE s.is_verified = true AND s.created_at > now() - INTERVAL '24 hours'
         GROUP BY p.nickname
         ORDER BY SUM(s.reward_amount) DESC
         LIMIT 10`
      );
      topPlayers = rows.map(r => ({
        nickname: r.nickname,
        totalReward: Number(r.total_reward),
        sessions: Number(r.sessions_count),
      }));
    } catch {
      /* ignore */
    }

    res.json({
      timestamp: new Date().toISOString(),
      system,
      users,
      sessions: sessionMetrics,
      economy,
      authProviders: providers,
      security,
      telemetry,
      auditSummary,
      topPlayers,
    });
  })
);

/**
 * GET /api/v1/admin/audit — Recent audit log entries
 */
router.get(
  '/audit',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const pool = getPool();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const action = req.query.action as string | undefined;

    try {
      let queryStr = `SELECT al.*, p.nickname
        FROM audit_log al
        LEFT JOIN profiles p ON al.profile_id = p.id`;
      const params: unknown[] = [];

      if (action) {
        queryStr += ` WHERE al.action = $1`;
        params.push(action);
      }

      queryStr += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const { rows } = await pool.query(queryStr, params);
      res.json({ entries: rows, count: rows.length });
    } catch (error) {
      Logger.error('[Admin] Audit query error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  })
);

export default router;
