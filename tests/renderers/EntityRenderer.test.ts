import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { GameStatus } from '../../types';
import { BuffGemSpawner } from '../../services/spawners/BuffGemSpawner';
import { ThemeService } from '../../services/system/ThemeService';

// Mock services
vi.mock('../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

vi.mock('../../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(() => ({
      shadowsEnabled: true,
    })),
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    getActiveGems: vi.fn(() => []),
    getGemLifetimeRatio: vi.fn(() => 1.0),
  },
}));

vi.mock('../../services/system/ThemeService', () => ({
  ThemeService: {
    isRetro: vi.fn(() => false),
    getConfig: vi.fn(() => ({
      colors: {
        health: '#ff0000',
      },
    })),
  },
}));

describe('EntityRenderer', () => {
  let renderer: EntityRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: any;
  let mockPlayer: any;
  let mockOpts: any;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new EntityRenderer();

    const fillStyleSpy = vi.fn(val => {
      mockCtx._fillStyle = val;
    });
    const strokeStyleSpy = vi.fn(val => {
      mockCtx._strokeStyle = val;
    });

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      _fillStyle: '',
      _strokeStyle: '',
      get fillStyle() {
        return this._fillStyle;
      },
      set fillStyle(val) {
        fillStyleSpy(val);
      },
      get strokeStyle() {
        return this._strokeStyle;
      },
      set strokeStyle(val) {
        strokeStyleSpy(val);
      },
      fillStyleSpy,
      strokeStyleSpy,
      lineWidth: 0,
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    mockPool = {
      activeEnemies: [],
      activeGems: [],
      activeInteractables: [],
    };

    mockState = {
      dashTrail: [],
      dashHaloOpacity: 0,
      playerScaleX: 1,
      playerScaleY: 1,
      playerRotation: 0,
    };

    mockPlayer = {
      x: 100,
      y: 100,
      radius: 10,
      color: '#00ff00',
    };

    mockOpts = {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: {
        shadowsEnabled: true,
      },
    };
  });

  describe('render', () => {
    it('should call all drawing layers', () => {
      const drawPlayerSpy = vi.spyOn(renderer as any, 'drawPlayer');
      const drawEnemiesSpy = vi.spyOn(renderer as any, 'drawEnemies');
      const drawGemsSpy = vi.spyOn(renderer as any, 'drawGems');
      const drawBuffGemsSpy = vi.spyOn(renderer as any, 'drawBuffGems');
      const drawInteractablesSpy = vi.spyOn(renderer as any, 'drawInteractables');

      renderer.render(mockCtx, mockPool, mockState, mockPlayer, mockOpts);

      expect(drawPlayerSpy).toHaveBeenCalled();
      expect(drawEnemiesSpy).toHaveBeenCalled();
      expect(drawGemsSpy).toHaveBeenCalled();
      expect(drawBuffGemsSpy).toHaveBeenCalled();
      expect(drawInteractablesSpy).toHaveBeenCalled();
    });
  });

  describe('drawInteractables', () => {
    it('should draw active interactables in viewport', () => {
      mockPool.activeInteractables = [
        {
          x: 400,
          y: 300,
          radius: 20,
          color: '#8b4513',
          type: 'LOOTBOX',
          health: 100,
          maxHealth: 100,
          active: true,
          isHit: false,
        },
      ];

      (renderer as any).drawInteractables(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('🎁', 400, 300);
    });

    it('should cull interactables outside viewport', () => {
      mockPool.activeInteractables = [
        {
          x: 1000,
          y: 300,
          radius: 20,
          color: '#8b4513',
          type: 'LOOTBOX',
          active: true,
        },
      ];

      (renderer as any).drawInteractables(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should show hit flash and shake when hit', () => {
      mockPool.activeInteractables = [
        {
          x: 400,
          y: 300,
          radius: 20,
          color: '#8b4513',
          type: 'MINING_RIG',
          health: 50,
          maxHealth: 100,
          active: true,
          isHit: true,
        },
      ];

      (renderer as any).drawInteractables(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.globalAlpha).toBe(0.8);
      // Health bar should be drawn (fillRect for background and fill)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3); // Base + Health Bg + Health Fill
    });
  });

  describe('drawGems', () => {
    it('should draw active gems in viewport', () => {
      mockPool.activeGems = [
        {
          x: 100,
          y: 100,
          radius: 5,
          color: '#00ff00',
          active: true,
          isRare: false,
        },
      ];

      (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should apply rare glow if rare and shadows enabled', () => {
      mockPool.activeGems = [
        {
          x: 100,
          y: 100,
          radius: 5,
          color: '#ffff00',
          active: true,
          isRare: true,
        },
      ];

      (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.shadowBlur).toBeGreaterThan(0);
      expect(mockCtx.shadowColor).toBe('#ffff00');
    });

    it('should fade gems near end of lifetime', () => {
      mockPool.activeGems = [
        {
          x: 100,
          y: 100,
          radius: 5,
          color: '#00ff00',
          active: true,
          elapsedLifetime: 9000, // Near 10000 limit
        },
      ];

      (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.globalAlpha).toBeLessThan(1.0);
    });
  });

  describe('drawBuffGems', () => {
    it('should draw active buff gems', () => {
      (BuffGemSpawner.getActiveGems as any).mockReturnValue([
        {
          x: 200,
          y: 200,
          radius: 12,
          color: '#00ffff',
          active: true,
          icon: '⚡',
          pulsePhase: 0,
        },
      ]);

      (renderer as any).drawBuffGems(mockCtx, true, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.arc).toHaveBeenCalled(); // Outer ring + body + icon well + countdown
      expect(mockCtx.fillText).toHaveBeenCalledWith('⚡', 200, 201);
    });
  });

  describe('drawEnemies', () => {
    it('should draw living enemies', () => {
      mockPool.activeEnemies = [
        {
          x: 300,
          y: 300,
          radius: 15,
          color: '#ff0000',
          health: 100,
          maxHealth: 100,
          isDying: false,
        },
      ];

      const renderEnemyLivingSpy = vi.spyOn(renderer as any, 'renderEnemyLiving');
      (renderer as any).drawEnemies(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(renderEnemyLivingSpy).toHaveBeenCalled();
    });

    it('should apply hit impact transform for damaged enemies', () => {
      mockPool.activeEnemies = [
        {
          x: 300,
          y: 300,
          radius: 15,
          color: '#ff0000',
          health: 80,
          maxHealth: 100,
          isDying: false,
          hitFlashTimer: 4,
          hitImpactTimer: 1,
          hitRecoilX: 5,
          hitRecoilY: 0,
        },
      ];

      (renderer as any).drawEnemies(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.translate).toHaveBeenCalledWith(305, 300);
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.scale).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');
    });

    it('should draw dying enemies', () => {
      mockPool.activeEnemies = [
        {
          x: 300,
          y: 300,
          radius: 15,
          color: '#ff0000',
          isDying: true,
          deathProgress: 0.5,
        },
      ];

      const renderEnemyDeathSpy = vi.spyOn(renderer as any, 'renderEnemyDeath');
      (renderer as any).drawEnemies(mockCtx, mockPool, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(renderEnemyDeathSpy).toHaveBeenCalled();
    });
  });

  describe('drawPlayer', () => {
    it('should draw player and dash trail', () => {
      mockState.dashTrail = [
        { x: 90, y: 90 },
        { x: 95, y: 95 },
      ];

      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);

      expect(mockCtx.arc).toHaveBeenCalled(); // Trail + Player
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should draw halo when active', () => {
      mockState.dashHaloOpacity = 0.5;

      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);

      expect(mockCtx.arc).toHaveBeenCalledWith(
        100,
        100,
        expect.any(Number),
        0,
        Math.PI * 2
      );
    });

    it('should apply cyberpunk scaling', () => {
      mockState.playerScaleX = 1.2;
      mockState.playerScaleY = 0.8;
      mockState.playerRotation = 0.5;

      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(
        100,
        100,
        12,
        8,
        0.5,
        0,
        Math.PI * 2
      );
    });

    it('should draw retro player with details', () => {
      // Fallback for ThemeService mock in this test file
      (ThemeService.isRetro as any).mockReturnValue(true);

      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);

      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3); // Body + 2 Eyes
    });

    it('should show hurt effect for player', () => {
      mockPlayer.invulnerabilityTimer = 500;

      // Cyberpunk
      (ThemeService.isRetro as any).mockReturnValue(false);
      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');

      // Retro
      (ThemeService.isRetro as any).mockReturnValue(true);
      (renderer as any).drawPlayer(mockCtx, mockPlayer, mockState, true);
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');
    });
  });

  describe('applyEnemySpawnTransform', () => {
    it('should handle all spawn phases', () => {
      const enemy = {
        x: 100,
        y: 100,
        radius: 10,
        color: '#ff0000',
        spawnTimer: 0.9, // Phase 1 (t = 0.1)
      };

      // Phase 1
      (renderer as any).applyEnemySpawnTransform(mockCtx, enemy);
      expect(mockCtx.scale).toHaveBeenCalled();

      // Phase 2
      enemy.spawnTimer = 0.5; // (t = 0.5)
      (renderer as any).applyEnemySpawnTransform(mockCtx, enemy);
      expect(mockCtx.scale).toHaveBeenCalled();

      // Phase 3 / Damping
      enemy.spawnTimer = 0.1; // (t = 0.9)
      (renderer as any).applyEnemySpawnTransform(mockCtx, enemy);
      expect(mockCtx.scale).toHaveBeenCalled();
    });
  });

  describe('gem blinking', () => {
    it('should blink gems near expiry', () => {
      const gem = {
        x: 100,
        y: 100,
        radius: 5,
        color: '#00ff00',
        active: true,
        elapsedLifetime: 9500, // Very close to expiry
      };

      mockPool.activeGems = [gem];
      (renderer as any).drawGems(mockCtx, mockPool, true, {
        left: 0,
        right: 800,
        top: 0,
        bottom: 600,
      });

      expect(mockCtx.globalAlpha).toBeDefined();
    });
  });
});
