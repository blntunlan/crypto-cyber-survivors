import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplayPlayerService } from '../../../services/replay/ReplayPlayerService';
import { EventBus } from '../../../services/core/EventBus';
import { railwayClient } from '../../../services/api/RailwayClient';
import { Logger } from '../../../services/system/Logger';
import { type PlaybackData } from '../../../types/replayPlayback';

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const makeV2Replay = (): PlaybackData => ({
  version: 2,
  sessionId: 's1',
  duration: 5000,
  finalLevel: 5,
  totalKills: 10,
  leverage: 1,
  position: 'LONG',
  snapshots: [
    { t: 0, px: 100, py: 100, hp: 100, level: 1 },
    { t: 500, px: 200, py: 100, hp: 90, level: 2 },
    { t: 1000, px: 300, py: 100, hp: 80, level: 3 },
  ],
  events: [],
});

const makeV3Replay = (): PlaybackData => ({
  version: 3,
  sessionId: 's1',
  duration: 5000,
  finalLevel: 5,
  totalKills: 10,
  leverage: 1,
  position: 'LONG',
  snapshots: [
    { t: 0, px: 100, py: 100, hp: 100, level: 1 },
    { t: 500, px: 200, py: 100, hp: 90, level: 2 },
  ],
  events: [],
  enemyFrames: [
    {
      t: 0,
      e: [
        { i: 1, t: 0, x: 50, y: 60 },
        { i: 2, t: 1, x: 150, y: 160 },
      ],
    },
    {
      t: 1000,
      e: [
        { i: 1, t: 0, x: 70, y: 80 },
        { i: 2, t: 1, x: 170, y: 180 },
      ],
    },
  ],
  typeTable: Object.keys(
    // Minimal type table — indices 0 and 1 must exist
    { bear: 0, bull: 0 } as Record<string, number>
  ),
});

describe('ReplayPlayerService', () => {
  const mockedRailwayGet = vi.mocked(railwayClient.get);
  const mockedLoggerError = vi.mocked(Logger.error);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ReplayPlayerService.reset();
  });

  afterEach(() => {
    ReplayPlayerService.reset();
    vi.useRealTimers();
  });

  describe('loadReplay', () => {
    it('should initialize playback state', () => {
      const replay = makeV3Replay();
      ReplayPlayerService.loadReplay(replay);

      const result = ReplayPlayerService.tick(0);
      expect(result.done).toBe(false);
      expect(result.ghost).toBeDefined();
      expect(result.ghost!.x).toBe(100);
      expect(result.ghost!.y).toBe(100);
    });

    it('should emit replayLoaded event', () => {
      const handler = vi.fn();
      const unsub = EventBus.on('replayLoaded', handler);

      ReplayPlayerService.loadReplay(makeV3Replay());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          replayId: 's1',
          duration: 5000,
          totalKills: 10,
        })
      );
      unsub();
    });
  });

  describe('loadReplayFromServer', () => {
    it('should fetch, decode, and load replay data', async () => {
      const replay = makeV3Replay();
      mockedRailwayGet.mockResolvedValueOnce({
        replayData: btoa(JSON.stringify(replay)),
      });

      await expect(ReplayPlayerService.loadReplayFromServer('replay-1')).resolves.toBe(
        true
      );

      expect(mockedRailwayGet).toHaveBeenCalledWith('/api/v1/replays/replay-1');
      expect(ReplayPlayerService.getReplay()).toMatchObject({
        version: 3,
        sessionId: 's1',
        totalKills: 10,
      });
    });

    it('should return false and log when replay loading fails', async () => {
      mockedRailwayGet.mockRejectedValueOnce(new Error('network down'));

      await expect(ReplayPlayerService.loadReplayFromServer('missing')).resolves.toBe(
        false
      );

      expect(ReplayPlayerService.getReplay()).toBeNull();
      expect(mockedLoggerError).toHaveBeenCalledWith(
        '[ReplayPlayer] Failed to load replay'
      );
    });
  });

  describe('tick — player ghost', () => {
    it('should advance time and move ghost', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());

      // At t=0, ghost is at (100, 100)
      // At t=500, ghost is at (200, 100)
      // At t=250 (halfway), ghost should be at (150, 100)
      const result = ReplayPlayerService.tick(250);
      expect(result.ghost!.x).toBeCloseTo(150, 0);
      expect(result.ghost!.y).toBeCloseTo(100, 0);
    });

    it('should return done when duration exceeded', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());
      const result = ReplayPlayerService.tick(6000);
      expect(result.done).toBe(true);
    });

    it('should respect playback speed', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());
      ReplayPlayerService.setSpeed(2);

      // At 2x speed, 250ms tick advances 500ms in replay time
      const result = ReplayPlayerService.tick(250);
      expect(result.ghost!.x).toBeCloseTo(200, 0);
    });
  });

  describe('tick — enemy reconstruction (v3)', () => {
    it('should reconstruct enemies from enemyFrames', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());

      const result = ReplayPlayerService.tick(0);
      expect(result.enemies).toBeDefined();
      expect(result.enemies!.length).toBe(2);
    });

    it('should interpolate enemy positions between frames', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());

      // Frame A at t=0: enemy-1 at (50, 60)
      // Frame B at t=1000: enemy-1 at (70, 80)
      // At t=500 (alpha=0.5): enemy-1 should be at (60, 70)
      const result = ReplayPlayerService.tick(500);
      const enemy1 = result.enemies!.find(e => e.id === 1);
      expect(enemy1).toBeDefined();
      expect(enemy1!.x).toBeCloseTo(60, 0);
      expect(enemy1!.y).toBeCloseTo(70, 0);
    });

    it('should use frame A position when no frame B', () => {
      const replay = makeV3Replay();
      // Only one frame at t=0
      replay.enemyFrames = [{ t: 0, e: [{ i: 1, t: 0, x: 50, y: 60 }] }];

      ReplayPlayerService.loadReplay(replay);
      const result = ReplayPlayerService.tick(500);
      expect(result.enemies!.length).toBe(1);
      expect(result.enemies![0]!.x).toBe(50);
      expect(result.enemies![0]!.y).toBe(60);
    });

    it('should resolve enemy type from typeTable', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());
      const result = ReplayPlayerService.tick(0);
      const enemy = result.enemies![0]!;
      expect(enemy.type).toBe('bear');
      expect(enemy.color).toBeDefined();
      expect(enemy.radius).toBeGreaterThan(0);
    });

    it('should include newly spawned enemies from frame B', () => {
      const replay = makeV3Replay();
      // Frame B has an extra enemy not in frame A
      replay.enemyFrames = [
        { t: 0, e: [{ i: 1, t: 0, x: 50, y: 60 }] },
        {
          t: 1000,
          e: [
            { i: 1, t: 0, x: 70, y: 80 },
            { i: 2, t: 0, x: 200, y: 200 },
          ],
        },
      ];

      ReplayPlayerService.loadReplay(replay);
      // At t=500 (alpha=0.5), the new enemy should be included
      const result = ReplayPlayerService.tick(500);
      expect(result.enemies!.length).toBe(2);
      const newEnemy = result.enemies!.find(e => e.id === 2);
      expect(newEnemy).toBeDefined();
      expect(newEnemy!.x).toBe(200);
      expect(newEnemy!.y).toBe(200);
    });

    it('should not interpolate enemies missing from frame B (killed)', () => {
      const replay = makeV3Replay();
      // Enemy in frame A but not in frame B (killed between frames)
      replay.enemyFrames = [
        { t: 0, e: [{ i: 1, t: 0, x: 50, y: 60 }] },
        { t: 1000, e: [] },
      ];

      ReplayPlayerService.loadReplay(replay);
      const result = ReplayPlayerService.tick(500);
      // Enemy should still appear at frame A position (no interpolation)
      expect(result.enemies!.length).toBe(1);
      expect(result.enemies![0]!.x).toBe(50);
    });
  });

  describe('tick — v2 backward compatibility', () => {
    it('should return empty enemies for v2 replays', () => {
      ReplayPlayerService.loadReplay(makeV2Replay());
      const result = ReplayPlayerService.tick(100);
      expect(result.enemies).toEqual([]);
    });

    it('should still play ghost for v2 replays', () => {
      ReplayPlayerService.loadReplay(makeV2Replay());
      const result = ReplayPlayerService.tick(250);
      expect(result.ghost).toBeDefined();
      expect(result.ghost!.x).toBeCloseTo(150, 0);
    });
  });

  describe('tick — events', () => {
    it('should return events at their timestamp', () => {
      const replay = makeV3Replay();
      replay.events = [
        { t: 100, type: 'kill', data: { id: 1, type: 'bear' } },
        { t: 300, type: 'spawn', data: { id: 2, type: 'bull', x: 0, y: 0 } },
      ];

      ReplayPlayerService.loadReplay(replay);
      const result = ReplayPlayerService.tick(200);
      expect(result.events).toHaveLength(1);
      expect(result.events![0]!.type).toBe('kill');
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());
      ReplayPlayerService.tick(100);
      ReplayPlayerService.reset();

      const result = ReplayPlayerService.tick(100);
      expect(result.done).toBe(true);
      expect(result.ghost).toBeUndefined();
    });
  });

  describe('getReplay', () => {
    it('should return loaded replay', () => {
      const replay = makeV3Replay();
      ReplayPlayerService.loadReplay(replay);
      expect(ReplayPlayerService.getReplay()).toBe(replay);
    });

    it('should return null after reset', () => {
      ReplayPlayerService.loadReplay(makeV3Replay());
      ReplayPlayerService.reset();
      expect(ReplayPlayerService.getReplay()).toBeNull();
    });
  });

  describe('fetchMyReplays', () => {
    it('should return replay summaries from the API', async () => {
      const replays = [
        {
          id: 'replay-1',
          sessionId: 's1',
          score: 1200,
          durationMs: 5000,
          createdAt: '2026-07-06T00:00:00.000Z',
          finalLevel: 5,
          totalKills: 10,
        },
      ];
      mockedRailwayGet.mockResolvedValueOnce({ replays });

      await expect(ReplayPlayerService.fetchMyReplays()).resolves.toEqual(replays);
      expect(mockedRailwayGet).toHaveBeenCalledWith('/api/v1/replays/mine');
    });

    it('should return an empty list when replay listing fails', async () => {
      mockedRailwayGet.mockRejectedValueOnce(new Error('network down'));

      await expect(ReplayPlayerService.fetchMyReplays()).resolves.toEqual([]);
    });
  });
});
