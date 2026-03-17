import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const MAX_REPLAY_SIZE = 500_000; // 500KB

/**
 * Helper: resolve profile_id from auth_user_id
 */
async function getProfileId(authUserId: string): Promise<string | null> {
  const { rows } = await query(
    `SELECT id FROM profiles WHERE auth_user_id = $1`,
    [authUserId]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * POST /api/v1/replays/save — Save a game replay
 * Body: { sessionId, score, durationMs, finalLevel, totalKills, pair, position, leverage, replayData }
 * replayData is base64-encoded compressed binary.
 */
router.post('/save', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      score,
      durationMs,
      finalLevel,
      totalKills,
      pair,
      position,
      leverage,
      replayData,
    } = req.body as {
      sessionId?: string;
      score?: number;
      durationMs?: number;
      finalLevel?: number;
      totalKills?: number;
      pair?: string;
      position?: string;
      leverage?: number;
      replayData?: string; // base64
    };

    if (!sessionId || !replayData || !pair || !position) {
      res.status(400).json({ error: 'sessionId, replayData, pair, and position are required' });
      return;
    }

    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Decode base64 replay
    const replayBuffer = Buffer.from(replayData, 'base64');
    if (replayBuffer.length > MAX_REPLAY_SIZE) {
      res.status(413).json({ error: `Replay too large: ${replayBuffer.length} bytes (max ${MAX_REPLAY_SIZE})` });
      return;
    }

    // Verify session belongs to this profile
    const { rows: sessions } = await query(
      `SELECT id FROM sessions WHERE id = $1 AND profile_id = $2`,
      [sessionId, profileId]
    );

    if (sessions.length === 0) {
      res.status(403).json({ error: 'Session not found or not owned by user' });
      return;
    }

    // Insert replay (UNIQUE on session_id prevents duplicates)
    const { rows } = await query(
      `INSERT INTO game_replays
         (session_id, profile_id, score, duration_ms, final_level, total_kills, pair, position, leverage, replay_data, replay_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (session_id) DO NOTHING
       RETURNING id`,
      [
        sessionId,
        profileId,
        score ?? 0,
        durationMs ?? 0,
        finalLevel ?? 1,
        totalKills ?? 0,
        pair,
        position,
        leverage ?? 1,
        replayBuffer,
        replayBuffer.length,
      ]
    );

    if (rows.length === 0) {
      res.status(409).json({ error: 'Replay already exists for this session' });
      return;
    }

    Logger.info(`[Replays] Saved replay ${rows[0].id} for session ${sessionId} (${replayBuffer.length} bytes)`);

    res.json({
      replayId: rows[0].id,
      size: replayBuffer.length,
    });
  } catch (error) {
    Logger.error('[Replays] Save error:', error);
    res.status(500).json({ error: 'Failed to save replay' });
  }
}));

/**
 * GET /api/v1/replays/mine — List current user's replays (metadata only)
 */
router.get('/mine', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const profileId = await getProfileId(req.authUserId as string);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { rows } = await query(
      `SELECT id, session_id, score, duration_ms, final_level, total_kills,
              pair, position, leverage, replay_size, version, created_at
       FROM game_replays
       WHERE profile_id = $1
       ORDER BY score DESC
       LIMIT 10`,
      [profileId]
    );

    res.json({
      replays: rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        score: r.score,
        durationMs: r.duration_ms,
        finalLevel: r.final_level,
        totalKills: r.total_kills,
        pair: r.pair,
        position: r.position,
        leverage: r.leverage,
        replaySize: r.replay_size,
        version: r.version,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    Logger.error('[Replays] Mine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * GET /api/v1/replays/:replayId — Download a specific replay
 */
router.get('/:replayId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { replayId } = req.params;

    const { rows } = await query(
      `SELECT r.*, p.nickname, p.avatar_url
       FROM game_replays r
       JOIN profiles p ON r.profile_id = p.id
       WHERE r.id = $1`,
      [replayId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Replay not found' });
      return;
    }

    const r = rows[0];
    const replayBase64 = (r.replay_data as Buffer).toString('base64');

    res.json({
      id: r.id,
      sessionId: r.session_id,
      player: {
        nickname: r.nickname,
        avatarUrl: r.avatar_url,
      },
      score: r.score,
      durationMs: r.duration_ms,
      finalLevel: r.final_level,
      totalKills: r.total_kills,
      pair: r.pair,
      position: r.position,
      leverage: r.leverage,
      version: r.version,
      replayData: replayBase64,
      createdAt: r.created_at,
    });
  } catch (error) {
    Logger.error('[Replays] Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * GET /api/v1/replays/top/:pair — Top replays for a trading pair
 */
router.get('/top/:pair', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { pair } = req.params;

    const { rows } = await query(
      `SELECT r.id, r.score, r.duration_ms, r.final_level, r.total_kills,
              r.pair, r.position, r.leverage, r.replay_size, r.created_at,
              p.nickname, p.avatar_url
       FROM game_replays r
       JOIN profiles p ON r.profile_id = p.id
       WHERE r.pair = $1
       ORDER BY r.score DESC
       LIMIT 20`,
      [pair]
    );

    res.json({
      pair,
      replays: rows.map(r => ({
        id: r.id,
        player: { nickname: r.nickname, avatarUrl: r.avatar_url },
        score: r.score,
        durationMs: r.duration_ms,
        finalLevel: r.final_level,
        totalKills: r.total_kills,
        position: r.position,
        leverage: r.leverage,
        replaySize: r.replay_size,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    Logger.error('[Replays] Top error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
