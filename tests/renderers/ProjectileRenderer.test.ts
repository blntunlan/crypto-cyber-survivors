import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectileRenderer } from '../../services/renderers/ProjectileRenderer';
import { ThemeService } from '../../services/system/ThemeService';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { type GameState, type Player, GameStatus } from '../../types';

describe('ProjectileRenderer', () => {
  let renderer: ProjectileRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: GameState;
  let mockPlayer: Player;

  beforeEach(() => {
    renderer = new ProjectileRenderer();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      lineCap: '',
      shadowBlur: 0,
    };

    mockPool = {
      activeBullets: [],
    } as unknown as IPoolManager;

    mockState = {} as GameState;
    mockPlayer = { x: 0, y: 0 } as Player;

    ThemeService.setTheme('cyberpunk');
  });

  it('should render cyberpunk projectiles correctly', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 0,
        radius: 5,
        color: '#fff',
        isCrit: false,
        isSuperCrit: false,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalledWith(100, 100);
    expect(mockCtx.rotate).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('should cull off-screen projectiles', () => {
    mockPool.activeBullets = [
      {
        x: -500, // Way off screen
        y: -500,
        vx: 10,
        vy: 0,
        radius: 5,
        color: '#fff',
        isCrit: false,
        isSuperCrit: false,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    // Should not call translate/rotate for culled bullet
    expect(mockCtx.translate).not.toHaveBeenCalled();
  });

  it('should render super crit projectiles with unique visuals', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 10,
        radius: 5,
        color: '#fff',
        isCrit: true,
        isSuperCrit: true,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    // Super crit calls arc for pulse flare
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.globalAlpha).toBeDefined();
  });

  it('should render crit projectiles correctly', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 10,
        radius: 5,
        color: '#fff',
        isCrit: true,
        isSuperCrit: false,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    expect(mockCtx.arc).toHaveBeenCalled(); // Impact flare
  });

  it('should render retro projectiles when retro theme is enabled', () => {
    ThemeService.setTheme('retro-16bit');

    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 0,
        radius: 8,
        color: '#ff0000',
        isCrit: false,
        isSuperCrit: false,
        active: true,
      },
      {
        x: 200,
        y: 200,
        vx: 10,
        vy: 0,
        radius: 8,
        color: '#00ff00',
        isCrit: true,
        isSuperCrit: false,
        active: true,
      },
      {
        x: 300,
        y: 300,
        vx: 10,
        vy: 0,
        radius: 8,
        color: '#0000ff',
        isCrit: true,
        isSuperCrit: true,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    // In retro mode, fillRect is used for squares
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
  });

  it('should cull projectiles in retro mode', () => {
    ThemeService.setTheme('retro-16bit');

    mockPool.activeBullets = [
      {
        x: 1000, // Off screen
        y: 1000,
        vx: 10,
        vy: 0,
        radius: 8,
        color: '#ff0000',
        isCrit: false,
        isSuperCrit: false,
        active: true,
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });
});
