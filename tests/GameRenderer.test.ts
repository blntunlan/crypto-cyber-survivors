/**
 * GameRenderer Tests
 *
 * Tests for canvas rendering functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRenderer } from '../services/renderers/GameRenderer';
import { GameStatus, MarketPosition, type GameState } from '../types';
import { type IPoolManager } from '../services/interfaces/IPoolManager';
import { ThemeService } from '../services/system/ThemeService';
import { PortalSystemV2 } from '../services/gameplay/PortalSystemV2';
import { TimeService } from '../services/core/TimeService';

vi.mock('../services/system/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(),
    getConfig: vi.fn(() => ({
      colors: {
        health: '#ff4444',
        accent: '#00ff88',
      },
    })),
  },
}));

vi.mock('../services/gameplay/PortalSystemV2', () => ({
  PortalSystemV2: {
    getPortalState: vi.fn(),
  },
}));

describe('GameRenderer', () => {
  let renderer: GameRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockPool: IPoolManager;
  let mockState: GameState;
  let mockPlayer: any;

  beforeEach(() => {
    TimeService.reset();
    TimeService.setGameTime(0);
    renderer = GameRenderer.getInstance();

    // Mock Canvas Context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    // Mock PoolManager
    mockPool = {
      activeEnemies: [],
      activeBullets: [],
      activeGems: [],
      activeParticles: [],
      activeFloatingTexts: [],
      activeSpeedLines: [],
      activeImpactRings: [],
      activeInteractables: [],
    } as unknown as IPoolManager;

    // Mock GameState
    mockState = {
      damageIndicators: [],
      shake: 0,
      critFlash: 0,
      critFlashColor: '#fff',
      lastFireTime: 0,
      fireTimer: 0,
      dashTrail: [],
      dashTrailAccumulator: 0,
      bgCandles: [
        { x: 100, y: 200, w: 20, h: 50, color: '#22c55e', speed: 1, layer: 1 as const },
      ],
      currentBg: { r: 15, g: 23, b: 42 },
      spawnTimer: 0,
      lastTime: 0,
      levelUpFreeze: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldownTimer: 0,
      isGameOverTriggered: false,
      lastHeartbeatTime: 0,
      doubleDashQueued: false,
      doubleDashUsed: false,
      dashHaloOpacity: 0,
      hitStopTimer: 0,
      playerScaleX: 1,
      playerScaleY: 1,
      playerRotation: 0,
      nearMissTimer: 0,
      nearMissCooldown: 0,
      rsiVisualState: 'NEUTRAL',
      whaleEventTimer: 0,
      targetBg: { r: 15, g: 23, b: 42 },
      interactableSpawnTimer: 0,
      atrPercent: 1,
      spawnRateMultiplier: 1,
      marketPosition: MarketPosition.LONG,
      bgUpdateFrameCounter: 0,
      isMoving: false,
      lastMoveX: 0,
    };

    // Mock Player
    mockPlayer = {
      x: 400,
      y: 300,
      radius: 12,
      color: '#22c55e',
      hp: 100,
      maxHp: 100,
      invulnerabilityTimer: 0,
    };

    // Default Mocks
    vi.mocked(PortalSystemV2.getPortalState).mockReturnValue({
      isActive: false,
      x: 0,
      y: 0,
      radius: 0,
      timeLeft: 0,
      type: 'TAKE_PROFIT',
      portalNumber: 0,
    });
    vi.mocked(ThemeService.isRetro).mockReturnValue(false);
  });

  describe('render', () => {
    it('should save and restore canvas context', () => {
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should apply screen shake when shake > 0', () => {
      mockState.shake = 10;
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.translate).toHaveBeenCalled();
    });

    it('should not apply screen shake while PAUSED', () => {
      mockState.shake = 10;
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PAUSED
      );
      const calls = vi.mocked(mockCtx.translate).mock.calls;
      const shakeCalls = calls.filter(c => c[0] !== 400 || c[1] !== 300);
      expect(shakeCalls).toHaveLength(0);
    });

    it('should not apply screen shake during LEVEL_UP', () => {
      mockState.shake = 10;
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.LEVEL_UP
      );
      const calls = vi.mocked(mockCtx.translate).mock.calls;
      const shakeCalls = calls.filter(c => c[0] !== 400 || c[1] !== 300);
      expect(shakeCalls).toHaveLength(0);
    });

    it('should draw player', () => {
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      // Cyberpunk player draws multiple arcs/glows
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw modern near-miss vignette when active', () => {
      mockState.nearMissTimer = 100;
      vi.mocked(ThemeService.isRetro).mockReturnValue(false);
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    });

    it('should draw retro near-miss vignette when active', () => {
      mockState.nearMissTimer = 100;
      vi.mocked(ThemeService.isRetro).mockReturnValue(true);
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('should draw player damage direction indicators', () => {
      mockState.damageIndicators = [{ sourceX: 500, sourceY: 300, timestamp: 0 }];
      TimeService.setGameTime(100);

      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );

      expect(mockCtx.rotate).toHaveBeenCalledWith(0);
      expect(mockCtx.arc).toHaveBeenCalledWith(
        0,
        0,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockCtx.closePath).toHaveBeenCalled();
      expect(mockState.damageIndicators).toHaveLength(1);
    });

    it('should clean expired player damage direction indicators', () => {
      mockState.damageIndicators = [{ sourceX: 500, sourceY: 300, timestamp: 0 }];
      TimeService.setGameTime(2000);

      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );

      expect(mockState.damageIndicators).toHaveLength(0);
    });

    it('should draw Take Profit portal', () => {
      vi.mocked(PortalSystemV2.getPortalState).mockReturnValue({
        isActive: true,
        x: 500,
        y: 400,
        radius: 50,
        type: 'TAKE_PROFIT',
        timeLeft: 10,
        portalNumber: 1,
      });
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.shadowColor).toBe('#00FF88');
    });
  });

  describe('entity rendering', () => {
    it('should draw active enemies', () => {
      (mockPool as any).activeEnemies = [
        { x: 100, y: 100, radius: 15, color: '#ef4444', health: 50, maxHealth: 100 },
      ];
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw interactables', () => {
      (mockPool as any).activeInteractables = [
        {
          x: 200,
          y: 200,
          radius: 20,
          color: '#ff0',
          health: 100,
          maxHealth: 100,
          type: 'LOOTBOX',
          isHit: false,
        },
      ];
      renderer.render(
        mockCtx,
        800,
        600,
        mockState,
        mockPlayer,
        mockPool,
        GameStatus.PLAYING
      );
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('🎁', 200, 200);
    });
  });
});
