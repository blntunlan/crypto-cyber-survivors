import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplayRecorderService } from '../../../services/replay/ReplayRecorderService';
import { EventBus } from '../../../services/core/EventBus';
import { type EnemyId } from '../../../config/EnemyRegistry';
import { type Enemy } from '../../../types';

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    post: vi.fn().mockResolvedValue({ replayId: 'test-replay-id', size: 100 }),
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

const makeEnemy = (
  id: string,
  type: EnemyId,
  x: number,
  y: number,
  overrides: Partial<Enemy> = {}
): Enemy =>
  ({
    x,
    y,
    type,
    id,
    radius: 14,
    color: '#ff0000',
    speed: 100,
    health: 100,
    maxHealth: 100,
    damage: 10,
    isElite: false,
    ...overrides,
  }) as Enemy;

describe('ReplayRecorderService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ReplayRecorderService.reset();
  });

  afterEach(() => {
    ReplayRecorderService.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('startRecording', () => {
    it('should initialize recording state', () => {
      ReplayRecorderService.startRecording('session-1', 5, 'LONG', 'BTC');
      expect(ReplayRecorderService.isRecording()).toBe(true);
    });

    it('should reset previous data on new recording', () => {
      ReplayRecorderService.startRecording('session-1', 5, 'LONG', 'BTC');
      vi.advanceTimersByTime(600);
      ReplayRecorderService.tick(16, 100, 200, 80, 3, []);

      ReplayRecorderService.startRecording('session-2', 10, 'SHORT', 'ETH');
      const data = ReplayRecorderService.stopRecording();
      expect(data.sessionId).toBe('session-2');
      expect(data.snapshots).toHaveLength(0);
    });
  });

  describe('tick — player snapshots', () => {
    it('should capture player snapshot every 500ms', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');

      // Frame 1: 16ms each, need ~32 frames to cross 500ms
      for (let i = 0; i < 32; i++) {
        ReplayRecorderService.tick(16, 100 + i, 200, 80, 1, []);
      }

      const data = ReplayRecorderService.stopRecording();
      expect(data.snapshots.length).toBeGreaterThanOrEqual(1);
      expect(data.snapshots[0]).toMatchObject({
        px: expect.any(Number),
        py: expect.any(Number),
        hp: 80,
        level: 1,
      });
    });

    it('should not capture snapshot before 500ms', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.tick(400, 100, 200, 80, 1, []);
      const data = ReplayRecorderService.stopRecording();
      expect(data.snapshots).toHaveLength(0);
    });
  });

  describe('tick — enemy frames', () => {
    it('bounds enemy snapshot memory while preserving the full run timeline', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      const enemies: Enemy[] = [];
      for (let i = 0; i < 200; i++) {
        enemies.push(makeEnemy(`enemy-${i + 1}`, 'bear', i * 2, i * 3));
      }

      for (let second = 0; second < 120; second++) {
        ReplayRecorderService.tick(1000, 100, 200, 80, 1, enemies);
      }

      const data = ReplayRecorderService.stopRecording();
      const enemyFrames = data.enemyFrames ?? [];
      const snapshotCount = enemyFrames.reduce((sum, frame) => sum + frame.e.length, 0);

      expect(snapshotCount).toBeLessThanOrEqual(10_000);
      expect(enemyFrames[0]?.t).toBeLessThanOrEqual(2_000);
      expect(enemyFrames.at(-1)?.t).toBeGreaterThanOrEqual(119_000);
    });

    it('should capture enemy frame every 1000ms', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      const enemies: Enemy[] = [
        makeEnemy('enemy-1', 'bear', 50, 60),
        makeEnemy('enemy-2', 'bull', 150, 160),
      ];

      // Advance ~1000ms
      for (let i = 0; i < 64; i++) {
        ReplayRecorderService.tick(16, 100, 200, 80, 1, enemies);
      }

      const data = ReplayRecorderService.stopRecording();
      expect(data.version).toBe(3);
      expect(data.enemyFrames).toBeDefined();
      expect(data.enemyFrames!.length).toBeGreaterThanOrEqual(1);
      expect(data.enemyFrames![0]!.e).toHaveLength(2);
    });

    it('should not capture enemy frame before 1000ms', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.tick(900, 100, 200, 80, 1, [
        makeEnemy('enemy-1', 'bear', 50, 60),
      ]);
      const data = ReplayRecorderService.stopRecording();
      expect(data.enemyFrames).toHaveLength(0);
    });

    it('should cap enemies at 200 per frame', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      const enemies: Enemy[] = [];
      for (let i = 0; i < 250; i++) {
        enemies.push(makeEnemy(`enemy-${i + 1}`, 'bear', i * 10, i * 10));
      }

      for (let i = 0; i < 64; i++) {
        ReplayRecorderService.tick(16, 100, 200, 80, 1, enemies);
      }

      const data = ReplayRecorderService.stopRecording();
      expect(data.enemyFrames![0]!.e.length).toBeLessThanOrEqual(200);
    });

    it('should include typeTable with enemy type strings', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');

      for (let i = 0; i < 64; i++) {
        ReplayRecorderService.tick(16, 100, 200, 80, 1, [
          makeEnemy('enemy-1', 'bear', 50, 60),
        ]);
      }

      const data = ReplayRecorderService.stopRecording();
      expect(data.typeTable).toBeDefined();
      expect(data.typeTable!.length).toBeGreaterThan(0);
      expect(data.typeTable).toContain('bear');
      expect(data.typeTable).toContain('bull');
    });

    it('should resolve type index correctly in snapshots', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      const typeTable = ReplayRecorderService.getTypeTable();
      const bearIndex = typeTable.indexOf('bear');

      for (let i = 0; i < 64; i++) {
        ReplayRecorderService.tick(16, 100, 200, 80, 1, [
          makeEnemy('enemy-1', 'bear', 50, 60),
        ]);
      }

      const data = ReplayRecorderService.stopRecording();
      const snap = data.enemyFrames![0]!.e[0]!;
      expect(snap.t).toBe(bearIndex);
    });
  });

  describe('EventBus subscriptions', () => {
    it('should record spawn events from EventBus', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');

      EventBus.emit('enemySpawned', {
        spawnId: 42,
        enemyType: 'bear',
        x: 100,
        y: 200,
        isElite: false,
      });

      const data = ReplayRecorderService.stopRecording();
      const spawnEvent = data.events.find(e => e.type === 'spawn');
      expect(spawnEvent).toBeDefined();
      expect(spawnEvent!.data).toMatchObject({ id: 42, type: 'bear', x: 100, y: 200 });
    });

    it('timestamps events from accumulated replay delta instead of wall time', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.tick(100, 0, 0, 100, 1, []);
      vi.advanceTimersByTime(1000);

      EventBus.emit('enemySpawned', {
        spawnId: 42,
        enemyType: 'bear',
        x: 100,
        y: 200,
        isElite: false,
      });

      const data = ReplayRecorderService.stopRecording();
      expect(data.events[0]?.t).toBe(100);
    });

    it('should record kill events from EventBus', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');

      EventBus.emit('enemyKilled', {
        x: 50,
        y: 60,
        type: 'bear',
        enemyId: 'enemy-42',
        isCrit: false,
      });

      const data = ReplayRecorderService.stopRecording();
      const killEvent = data.events.find(e => e.type === 'kill');
      expect(killEvent).toBeDefined();
      expect(killEvent!.data).toMatchObject({ id: 42, type: 'bear' });
    });

    it('should count totalKills from kill events', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');

      for (let i = 0; i < 5; i++) {
        EventBus.emit('enemyKilled', {
          x: 0,
          y: 0,
          type: 'bear',
          enemyId: `enemy-${i + 1}`,
          isCrit: false,
        });
      }

      const data = ReplayRecorderService.stopRecording();
      expect(data.totalKills).toBe(5);
    });

    it('should not record events after stopRecording', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      const data = ReplayRecorderService.stopRecording();

      EventBus.emit('enemySpawned', {
        spawnId: 99,
        enemyType: 'bear',
        x: 0,
        y: 0,
        isElite: false,
      });

      expect(data.events).toHaveLength(0);
    });
  });

  describe('stopRecording', () => {
    it('should return version 3 data', () => {
      ReplayRecorderService.startRecording('s1', 5, 'LONG', 'BTC');
      const data = ReplayRecorderService.stopRecording();
      expect(data.version).toBe(3);
      expect(data.leverage).toBe(5);
      expect(data.position).toBe('LONG');
      expect(data.enemyFrames).toEqual([]);
      expect(data.typeTable).toBeDefined();
    });

    it('should stop recording', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.stopRecording();
      expect(ReplayRecorderService.isRecording()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.tick(600, 100, 200, 80, 1, [
        makeEnemy('enemy-1', 'bear', 50, 60),
      ]);

      ReplayRecorderService.reset();

      expect(ReplayRecorderService.isRecording()).toBe(false);
    });

    it('should unsubscribe from EventBus', () => {
      const unsubscribeSpawn = vi.fn();
      const unsubscribeKill = vi.fn();
      const onSpy = vi.spyOn(EventBus, 'on');
      onSpy.mockReturnValueOnce(unsubscribeSpawn);
      onSpy.mockReturnValueOnce(unsubscribeKill);

      ReplayRecorderService.startRecording('s1', 1, 'LONG', 'BTC');
      ReplayRecorderService.reset();

      expect(unsubscribeSpawn).toHaveBeenCalledOnce();
      expect(unsubscribeKill).toHaveBeenCalledOnce();
    });
  });
});
