import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRenderer } from '../../services/renderers/EntityRenderer';
import { GameStatus } from '../../types';
import { BuffGemSpawner } from '../../services/spawners/BuffGemSpawner';
import { ThemeService } from '../../services/system/ThemeService';
import { TIER_CONFIG } from '../../services/cards/CardSystem';
import { LOOT_CACHE_CONFIG } from '../../config/LootCacheConfig';
import { type LootCacheRarity } from '../../types/lootCache';

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
    const shadowBlurSpy = vi.fn(val => {
      mockCtx._shadowBlur = val;
    });
    const shadowColorSpy = vi.fn(val => {
      mockCtx._shadowColor = val;
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
      moveTo: vi.fn(),
      lineTo: vi.fn(),
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
      shadowBlurSpy,
      shadowColorSpy,
      lineWidth: 0,
      globalAlpha: 1,
      _shadowBlur: 0,
      _shadowColor: '',
      get shadowBlur() {
        return this._shadowBlur;
      },
      set shadowBlur(val) {
        shadowBlurSpy(val);
      },
      get shadowColor() {
        return this._shadowColor;
      },
      set shadowColor(val) {
        shadowColorSpy(val);
      },
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
        showParticles: true,
        showDamageNumbers: true,
        showScreenShake: true,
        shadowsEnabled: true,
        reducedMotion: false,
        disableGlow: false,
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
    const rarities: LootCacheRarity[] = ['common', 'rare', 'epic', 'legendary'];
    const bounds = {
      left: 0,
      right: 800,
      top: 0,
      bottom: 600,
    };

    const drawInteractables = (shadowsEnabled = true) =>
      (renderer as any).drawInteractables(
        mockCtx,
        mockPool,
        bounds,
        mockOpts,
        shadowsEnabled
      );

    const makeLootCache = (
      rarity: LootCacheRarity,
      phase: 'closed' | 'anticipation' | 'opening' | 'reward' = 'closed'
    ) => ({
      x: 400,
      y: 300,
      radius: 20,
      color: '#flat-purple',
      type: 'LOOT_CRATE',
      health: 0.5,
      maxHealth: 1,
      active: true,
      isHit: false,
      lootCacheId: 7,
      lootCacheRarity: rarity,
      lootCachePhase: phase,
      lootCachePhaseElapsedMs: 0,
      lootCacheIdleElapsedMs: 240,
      lootCacheProximity: false,
      lootCacheCoreFlashPending: false,
    });

    it.each(rarities)('draws %s caches with the shared casino tier color', rarity => {
      mockPool.activeInteractables = [makeLootCache(rarity)];

      drawInteractables();

      expect(mockCtx.strokeStyleSpy).toHaveBeenCalledWith(TIER_CONFIG[rarity].color);
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith(TIER_CONFIG[rarity].color);
    });

    it('uses displaced opening transforms only outside reduced motion', () => {
      const cache = makeLootCache('epic', 'opening');
      cache.lootCachePhaseElapsedMs = 140;
      mockPool.activeInteractables = [cache];

      drawInteractables();

      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalled();
      expect(mockCtx.translate).not.toHaveBeenCalledWith(400, 300);

      vi.clearAllMocks();
      mockOpts.graphics.reducedMotion = true;
      drawInteractables();

      expect(mockCtx.translate).toHaveBeenCalledWith(400, 300);
      expect(mockCtx.rotate).not.toHaveBeenCalled();
    });

    it('consumes a local white core signal exactly once', () => {
      const cache = makeLootCache('legendary', 'opening');
      cache.lootCacheCoreFlashPending = true;
      mockPool.activeInteractables = [cache];

      drawInteractables();

      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.arc).toHaveBeenLastCalledWith(0, 0, 15, 0, Math.PI * 2);
      expect(mockCtx.fillRect).not.toHaveBeenCalledWith(0, 0, 800, 600);
      for (const arcCall of mockCtx.arc.mock.calls) {
        expect(arcCall[2]).toBeLessThan(300);
      }
      expect(cache.lootCacheCoreFlashPending).toBe(false);

      vi.clearAllMocks();
      drawInteractables();

      expect(mockCtx.fillStyleSpy).not.toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.arc).not.toHaveBeenCalledWith(0, 0, 15, 0, Math.PI * 2);
    });

    it('gates the opening core only behind reduced motion and disabled glow', () => {
      const cache = makeLootCache('legendary', 'opening');
      mockPool.activeInteractables = [cache];

      cache.lootCacheCoreFlashPending = true;
      mockOpts.graphics.disableGlow = true;
      drawInteractables();
      expect(mockCtx.fillStyleSpy).not.toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.fillRect).not.toHaveBeenCalledWith(0, 0, 800, 600);

      vi.clearAllMocks();
      cache.lootCacheCoreFlashPending = true;
      mockOpts.graphics.disableGlow = false;
      mockOpts.graphics.reducedMotion = true;
      drawInteractables();
      expect(mockCtx.fillStyleSpy).not.toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.fillRect).not.toHaveBeenCalledWith(0, 0, 800, 600);

      vi.clearAllMocks();
      cache.lootCacheCoreFlashPending = true;
      mockOpts.graphics.reducedMotion = false;
      drawInteractables(false);
      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith('#FFFFFF');
      expect(mockCtx.arc).toHaveBeenCalledWith(0, 0, 15, 0, Math.PI * 2);
      expect(mockCtx.fillRect).not.toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('consumes an off-screen core signal instead of deferring it', () => {
      const cache = makeLootCache('epic', 'opening');
      cache.x = 900;
      cache.lootCacheCoreFlashPending = true;
      mockPool.activeInteractables = [cache];

      drawInteractables(false);

      expect(cache.lootCacheCoreFlashPending).toBe(false);
      expect(mockCtx.fillStyleSpy).not.toHaveBeenCalledWith('#FFFFFF');

      vi.clearAllMocks();
      cache.x = 400;
      drawInteractables(false);
      expect(mockCtx.fillStyleSpy).not.toHaveBeenCalledWith('#FFFFFF');
    });

    it('gives every closed rarity distinct non-color tier text', () => {
      const tierText: string[] = [];
      for (const rarity of rarities) {
        vi.clearAllMocks();
        mockPool.activeInteractables = [makeLootCache(rarity)];
        drawInteractables(false);
        tierText.push(
          mockCtx.fillText.mock.calls
            .map((call: [string]) => call[0])
            .find((text: string) => text.includes(rarity.toUpperCase())) ?? ''
        );
      }

      expect(tierText).toEqual(['C COMMON', 'R RARE', 'E EPIC', 'L LEGENDARY']);
      expect(new Set(tierText).size).toBe(4);
    });

    it.each([
      [LOOT_CACHE_CONFIG.feedback.anticipationMs * 0.5, 1.06, 0.92],
      [LOOT_CACHE_CONFIG.feedback.anticipationMs, 1.12, 0.84],
    ])('squashes anticipation at %sms within the configured 40ms', (elapsed, x, y) => {
      const cache = makeLootCache('rare', 'anticipation');
      cache.lootCachePhaseElapsedMs = elapsed;
      mockPool.activeInteractables = [cache];

      drawInteractables();

      expect(mockCtx.scale).toHaveBeenCalledWith(x, y);
    });

    it('progresses opening squash across the configured opening interval', () => {
      const cache = makeLootCache('epic', 'opening');
      const openingDuration =
        LOOT_CACHE_CONFIG.feedback.totalOpeningMs *
          LOOT_CACHE_CONFIG.feedback.rewardPhaseProgress -
        LOOT_CACHE_CONFIG.feedback.anticipationMs;
      mockPool.activeInteractables = [cache];

      cache.lootCachePhaseElapsedMs = 0;
      drawInteractables();
      expect(mockCtx.scale.mock.calls[0]![0]).toBeCloseTo(1.14);
      expect(mockCtx.scale.mock.calls[0]![1]).toBeCloseTo(0.9);

      vi.clearAllMocks();
      cache.lootCachePhaseElapsedMs = openingDuration * 0.5;
      drawInteractables();
      expect(mockCtx.scale.mock.calls[0]![0]).toBeCloseTo(1.07);
      expect(mockCtx.scale.mock.calls[0]![1]).toBeCloseTo(0.95);

      vi.clearAllMocks();
      cache.lootCachePhaseElapsedMs = openingDuration;
      drawInteractables();
      expect(mockCtx.scale.mock.calls[0]![0]).toBeCloseTo(1);
      expect(mockCtx.scale.mock.calls[0]![1]).toBeCloseTo(1);
    });

    it('accelerates the closed-cache pulse in proximity', () => {
      const cache = makeLootCache('rare');
      mockPool.activeInteractables = [cache];

      cache.lootCacheIdleElapsedMs = 0;
      drawInteractables();
      const farStartRadius = mockCtx.arc.mock.calls[0]![2];

      vi.clearAllMocks();
      cache.lootCacheIdleElapsedMs = 100;
      drawInteractables();
      const farEndRadius = mockCtx.arc.mock.calls[0]![2];

      vi.clearAllMocks();
      cache.lootCacheProximity = true;
      cache.lootCacheIdleElapsedMs = 0;
      drawInteractables();
      const nearStartRadius = mockCtx.arc.mock.calls[0]![2];

      vi.clearAllMocks();
      cache.lootCacheIdleElapsedMs = 100;
      drawInteractables();
      const nearEndRadius = mockCtx.arc.mock.calls[0]![2];

      expect(nearEndRadius - nearStartRadius).toBeGreaterThan(
        farEndRadius - farStartRadius
      );
    });

    it('suppresses rarity glow when performance shadows are disabled', () => {
      const cache = makeLootCache('rare');
      cache.lootCacheProximity = true;
      mockPool.activeInteractables = [cache];

      drawInteractables(false);

      expect(mockCtx.shadowColorSpy).not.toHaveBeenCalled();
      expect(mockCtx.shadowBlurSpy).not.toHaveBeenCalled();

      drawInteractables(true);
      expect(mockCtx.shadowColorSpy).toHaveBeenCalledWith(TIER_CONFIG.rare.glowColor);
      expect(mockCtx.shadowBlurSpy).toHaveBeenCalled();
    });

    it('keeps reduced-motion phase feedback readable without shake or fragment travel', () => {
      const cache = makeLootCache('rare', 'reward');
      cache.lootCachePhaseElapsedMs = 400;
      cache.lootCacheProximity = true;
      mockPool.activeInteractables = [cache];
      mockOpts.graphics.reducedMotion = true;

      drawInteractables();

      expect(mockCtx.rotate).not.toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(400, 300);
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('★', 0, 1);
    });

    it('draws an off-screen cache as a clamped rarity edge triangle', () => {
      const cache = makeLootCache('legendary');
      cache.x = 900;
      cache.y = -100;
      mockPool.activeInteractables = [cache];

      drawInteractables();

      expect(mockCtx.fillStyleSpy).toHaveBeenCalledWith(TIER_CONFIG.legendary.color);
      expect(mockCtx.moveTo).toHaveBeenCalledTimes(1);
      expect(mockCtx.lineTo).toHaveBeenCalledTimes(2);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
      const markerCoordinates = [
        ...mockCtx.moveTo.mock.calls,
        ...mockCtx.lineTo.mock.calls,
      ].flat();
      for (let index = 0; index < markerCoordinates.length; index += 2) {
        expect(markerCoordinates[index]).toBeGreaterThanOrEqual(0);
        expect(markerCoordinates[index]).toBeLessThanOrEqual(800);
        expect(markerCoordinates[index + 1]).toBeGreaterThanOrEqual(0);
        expect(markerCoordinates[index + 1]).toBeLessThanOrEqual(600);
      }
    });

    it.each([
      ['common', 'C'],
      ['rare', 'R'],
      ['epic', 'E'],
      ['legendary', 'L'],
    ] as const)('adds a non-color %s tier icon to the edge marker', (rarity, icon) => {
      const cache = makeLootCache(rarity);
      cache.x = 900;
      cache.color = '#same-color';
      mockPool.activeInteractables = [cache];

      drawInteractables(false);

      expect(mockCtx.fillText).toHaveBeenCalledWith(
        icon,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('omits cache health bars while retaining mining-rig health bars', () => {
      mockPool.activeInteractables = [makeLootCache('common')];

      drawInteractables();

      expect(mockCtx.fillRect).not.toHaveBeenCalledWith(380, 272, 40, 4);

      vi.clearAllMocks();
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
          isHit: false,
        },
      ];
      drawInteractables();

      expect(mockCtx.fillRect).toHaveBeenCalledWith(380, 272, 40, 4);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(380, 272, 20, 4);
    });

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
        0,
        0,
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

      expect(mockCtx.ellipse).toHaveBeenCalledWith(0, 0, 12, 8, 0.5, 0, Math.PI * 2);
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
