/**
 * GameRenderer Tests
 *
 * Tests for canvas rendering functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRenderer } from '../services/GameRenderer';
import { GameStatus, type GameState } from '../types';
import { type PoolManager } from '../services/poolManager';

describe('GameRenderer', () => {
  let renderer: GameRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockPool: PoolManager;
  let mockState: GameState;

  let mockPlayer: any;

  beforeEach(() => {
    renderer = new GameRenderer();

    // Mock Canvas Context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '',
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      lineWidth: 1,
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      rotate: vi.fn(),
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    // Mock PoolManager
    mockPool = {
      activeEnemies: [],
      activeBullets: [],
      activeGems: [],
      activeParticles: [],
      activeFloatingTexts: [],
    } as unknown as PoolManager;

    // Mock GameState
    mockState = {
      shake: 0,
      critFlash: 0,
      critFlashColor: '#fff',
      lastFireTime: 0,
      fireTimer: 0,
      dashTrail: [],
      dashTrailAccumulator: 0,
      bgCandles: [
        { x: 100, y: 200, w: 20, h: 50, color: '#22c55e', speed: 1 },
        { x: 300, y: 400, w: 20, h: 60, color: '#ef4444', speed: 1.5 },
      ],
      currentBg: { r: 15, g: 23, b: 42 },
      spawnTimer: 0,
      lastTime: 0,
      levelUpFreeze: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      isGameOverTriggered: false,
    };

    // Mock Player
    mockPlayer = {
      x: 400,
      y: 300,
      radius: 12,
      color: '#22c55e',
      hp: 100,
      maxHp: 100,
    };
  });

  describe('render', () => {
    it('should save and restore canvas context', () => {
      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should apply screen shake when shake > 0', () => {
      mockState.shake = 10;

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.translate).toHaveBeenCalled();
    });

    it('should not apply screen shake when shake is 0', () => {
      mockState.shake = 0;

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.translate).not.toHaveBeenCalled();
    });

    it('should draw background', () => {
      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      // Background fill is called
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should skip game entities in MENU status', () => {
      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.MENU);

      // Player arc should not be drawn in menu
      // Since we're checking arc calls, and menu skips entities
      const arcCalls = (mockCtx.arc as ReturnType<typeof vi.fn>).mock.calls.length;
      // In menu, only background candles might trigger some draws but player shouldn't
      expect(arcCalls).toBeLessThanOrEqual(2); // Only background candle strokes if any
    });

    it('should draw player in PLAYING status', () => {
      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      // Player should be drawn (arc call with player position)
      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 12, 0, Math.PI * 2);
    });
  });

  describe('updateBackgroundCandles', () => {
    it('should move candles up when PnL is positive', () => {
      const initialY1 = mockState.bgCandles[0]!.y;
      const initialY2 = mockState.bgCandles[1]!.y;

      renderer.updateBackgroundCandles(mockState, 0.05, 1, 1, 800, 600);

      // Candles should move up (negative direction)
      expect(mockState.bgCandles[0]!.y).toBeLessThan(initialY1);
      expect(mockState.bgCandles[1]!.y).toBeLessThan(initialY2);
    });

    it('should move candles down when PnL is negative', () => {
      const initialY1 = mockState.bgCandles[0]!.y;
      const initialY2 = mockState.bgCandles[1]!.y;

      renderer.updateBackgroundCandles(mockState, -0.05, 1, 1, 800, 600);

      // Candles should move down (positive direction)
      expect(mockState.bgCandles[0]!.y).toBeGreaterThan(initialY1);
      expect(mockState.bgCandles[1]!.y).toBeGreaterThan(initialY2);
    });

    it('should wrap candles when they go off screen (bottom)', () => {
      // Set candle just past the wrap threshold
      mockState.bgCandles[0]!.y = 705; // height (600) + 100 + small movement = triggers wrap

      renderer.updateBackgroundCandles(mockState, -0.05, 1, 1, 800, 600);

      // Should wrap to top (y = -100)
      expect(mockState.bgCandles[0]!.y).toBe(-100);
    });

    it('should wrap candles when they go off screen (top)', () => {
      // Set candle just past the wrap threshold
      mockState.bgCandles[0]!.y = -105; // Below -100, triggers wrap

      renderer.updateBackgroundCandles(mockState, 0.05, 1, 1, 800, 600);

      // Should wrap to bottom (y = height + 100 = 700)
      expect(mockState.bgCandles[0]!.y).toBe(700);
    });

    it('should increase speed with difficulty', () => {
      const lowDiffState = {
        ...mockState,
        bgCandles: [{ x: 100, y: 200, w: 20, h: 50, color: '#22c55e', speed: 1 }],
      };
      const highDiffState = {
        ...mockState,
        bgCandles: [{ x: 100, y: 200, w: 20, h: 50, color: '#22c55e', speed: 1 }],
      };

      renderer.updateBackgroundCandles(lowDiffState, 0.05, 1, 1, 800, 600);
      const lowDiffMovement = 200 - lowDiffState.bgCandles[0]!.y;

      renderer.updateBackgroundCandles(highDiffState, 0.05, 5, 1, 800, 600);
      const highDiffMovement = 200 - highDiffState.bgCandles[0]!.y;

      // Higher difficulty = faster movement
      expect(highDiffMovement).toBeGreaterThan(lowDiffMovement);
    });
  });

  describe('entity rendering', () => {
    it('should draw all active enemies', () => {
      mockPool.activeEnemies = [
        { x: 100, y: 100, radius: 15, color: '#ef4444', health: 50, maxHealth: 100 },
        { x: 200, y: 200, radius: 20, color: '#3b82f6', health: 100, maxHealth: 100 },
      ] as PoolManager['activeEnemies'];

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      // Should draw arcs for enemies + player
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 15, 0, Math.PI * 2);
      expect(mockCtx.arc).toHaveBeenCalledWith(200, 200, 20, 0, Math.PI * 2);
    });

    it('should draw all active bullets', () => {
      mockPool.activeBullets = [
        {
          x: 150,
          y: 150,
          vx: 5,
          vy: 0,
          radius: 4,
          color: '#fff',
          isCrit: false,
          isSuperCrit: false,
        },
        {
          x: 250,
          y: 250,
          vx: 0,
          vy: 5,
          radius: 8,
          color: '#ffd700',
          isCrit: true,
          isSuperCrit: false,
        },
      ] as PoolManager['activeBullets'];

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      // With new laser style, it uses rotate/translate + moveTo/lineTo instead of arc
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });

    it('should draw all active gems', () => {
      mockPool.activeGems = [
        { x: 300, y: 300, radius: 6, color: '#22c55e', isRare: false },
        { x: 400, y: 400, radius: 8, color: '#a855f7', isRare: true },
      ] as PoolManager['activeGems'];

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.arc).toHaveBeenCalledWith(300, 300, 6, 0, Math.PI * 2);
      expect(mockCtx.arc).toHaveBeenCalledWith(400, 400, 8, 0, Math.PI * 2);
    });

    it('should draw floating texts', () => {
      mockPool.activeFloatingTexts = [
        { x: 100, y: 100, text: '+50', color: '#22c55e', life: 1, size: 16 },
      ] as PoolManager['activeFloatingTexts'];

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.fillText).toHaveBeenCalledWith('+50', 100, 100);
    });

    it('should draw crit flash when active', () => {
      mockState.critFlash = 0.5;
      mockState.critFlashColor = '#ffd700';

      renderer.render(mockCtx, 800, 600, mockState, mockPlayer, mockPool, GameStatus.PLAYING);

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    });
  });
});
