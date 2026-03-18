import { Router, type Request, type Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDb } from '../db';
import { profiles, sessions, gameReplays } from '../db/schema';
import { getProfileId } from '../db/helpers';
import { Logger } from '../utils/logger';

const router = Router();

const MAX_REPLAY_SIZE = 500_000; // 500KB

/**
 * POST /api/v1/replays/save — Save a game replay
 */
router.post('/save', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      sessionId, score, durationMs, finalLevel, totalKills,
      pair, position, leverage, replayData,
    } = req.body as {
      sessionId?: string;
      score?: number;
      durationMs?: number;
      finalLevel?: number;
      totalKills?: number;
      pair?: string;
      position?: string;
      leverage?: number;
      replayData?: string;
    };

    if (!sessionId || !replayData || !pair || !position) {
      res.status(400).json({ error: 'sessionId, replayData, pair, and position are required' });
      return;
    }

    const profileId = await getProfileId(req.authUserId!);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const replayBuffer = Buffer.from(replayData, 'base64');
    if (replayBuffer.length > MAX_REPLAY_SIZE) {
      res.status(413).json({ error: `Replay too large: ${replayBuffer.length} bytes (max ${MAX_REPLAY_SIZE})` });
      return;
    }

    const db = getDb();

    // Verify session belongs to this profile
    const sessionRows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.profileId, profileId)))
      .limit(1);

    if (sessionRows.length === 0) {
      res.status(403).json({ error: 'Session not found or not owned by user' });
      return;
    }

    const rows = await db
      .insert(gameReplays)
      .values({
        sessionId,
        profileId,
        score: score ?? 0,
        durationMs: durationMs ?? 0,
        finalLevel: finalLevel ?? 1,
        totalKills: totalKills ?? 0,
        pair,
        position,
        leverage: leverage ?? 1,
        replayData: replayBuffer,
        replaySize: replayBuffer.length,
      })
      .onConflictDoNothing({ target: gameReplays.sessionId })
      .returning({ id: gameReplays.id });

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
    const profileId = await getProfileId(req.authUserId!);
    if (!profileId) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const db = getDb();
    const rows = await db
      .select({
        id: gameReplays.id,
        sessionId: gameReplays.sessionId,
        score: gameReplays.score,
        durationMs: gameReplays.durationMs,
        finalLevel: gameReplays.finalLevel,
        totalKills: gameReplays.totalKills,
        pair: gameReplays.pair,
        position: gameReplays.position,
        leverage: gameReplays.leverage,
        replaySize: gameReplays.replaySize,
        version: gameReplays.version,
        createdAt: gameReplays.createdAt,
      })
      .from(gameReplays)
      .where(eq(gameReplays.profileId, profileId))
      .orderBy(desc(gameReplays.score))
      .limit(10);

    res.json({ replays: rows });
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
    const db = getDb();

    const rows = await db
      .select({
        id: gameReplays.id,
        sessionId: gameReplays.sessionId,
        score: gameReplays.score,
        durationMs: gameReplays.durationMs,
        finalLevel: gameReplays.finalLevel,
        totalKills: gameReplays.totalKills,
        pair: gameReplays.pair,
        position: gameReplays.position,
        leverage: gameReplays.leverage,
        version: gameReplays.version,
        replayData: gameReplays.replayData,
        createdAt: gameReplays.createdAt,
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
      })
      .from(gameReplays)
      .innerJoin(profiles, eq(gameReplays.profileId, profiles.id))
      .where(eq(gameReplays.id, replayId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Replay not found' });
      return;
    }

    const r = rows[0];

    res.json({
      id: r.id,
      sessionId: r.sessionId,
      player: {
        nickname: r.nickname,
        avatarUrl: r.avatarUrl,
      },
      score: r.score,
      durationMs: r.durationMs,
      finalLevel: r.finalLevel,
      totalKills: r.totalKills,
      pair: r.pair,
      position: r.position,
      leverage: r.leverage,
      version: r.version,
      replayData: r.replayData.toString('base64'),
      createdAt: r.createdAt,
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
    const db = getDb();

    const rows = await db
      .select({
        id: gameReplays.id,
        score: gameReplays.score,
        durationMs: gameReplays.durationMs,
        finalLevel: gameReplays.finalLevel,
        totalKills: gameReplays.totalKills,
        position: gameReplays.position,
        leverage: gameReplays.leverage,
        replaySize: gameReplays.replaySize,
        createdAt: gameReplays.createdAt,
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
      })
      .from(gameReplays)
      .innerJoin(profiles, eq(gameReplays.profileId, profiles.id))
      .where(eq(gameReplays.pair, pair))
      .orderBy(desc(gameReplays.score))
      .limit(20);

    res.json({
      pair,
      replays: rows.map(r => ({
        id: r.id,
        player: { nickname: r.nickname, avatarUrl: r.avatarUrl },
        score: r.score,
        durationMs: r.durationMs,
        finalLevel: r.finalLevel,
        totalKills: r.totalKills,
        position: r.position,
        leverage: r.leverage,
        replaySize: r.replaySize,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    Logger.error('[Replays] Top error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
