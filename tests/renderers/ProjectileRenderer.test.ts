import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectileRenderer } from '../../services/renderers/ProjectileRenderer';
import { ThemeService } from '../../services/system/ThemeService';
import { type IPoolManager } from '../../services/interfaces/IPoolManager';
import { type GameState, type Player, GameStatus } from '../../types';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';
import { gradientCache } from '../../utils/GradientCache';
import { ComboSystem } from '../../services/combat/ComboSystem';

vi.mock('../../services/combat/ComboSystem', () => ({
  ComboSystem: {
    getComboColor: vi.fn().mockReturnValue('#00FFFF'),
  },
}));

describe('ProjectileRenderer', () => {
  let renderer: ProjectileRenderer;
  let mockCtx: any;
  let mockPool: any;
  let mockState: GameState;
  let mockPlayer: Player;

  beforeEach(() => {
    gradientCache.clear();
    renderer = new ProjectileRenderer();

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      lineCap: '',
      shadowBlur: 0,
      shadowColor: '',
    };

    mockPool = {
      activeBullets: [],
    } as unknown as IPoolManager;

    mockState = {} as GameState;
    mockPlayer = { x: 0, y: 0 } as Player;

    ThemeService.setTheme('cyberpunk');
    vi.mocked(ComboSystem.getComboColor).mockReturnValue('#00FFFF');
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

  it('should render quantum_bullet without throwing and use radial gradient + trail', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 5,
        color: '#22d3ee',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'quantum_bullet',
        trail: [
          { x: 80, y: 100, age: 160 },
          { x: 90, y: 100, age: 80 },
          { x: 100, y: 100, age: 0 },
        ],
      },
    ];

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    // Quantum path uses a radial gradient for the glow + arcs for core/glow.
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    // Trail polyline strokes segments between points.
    expect(mockCtx.stroke).toHaveBeenCalled();
    // Quantum path does NOT use the cyberpunk rotate/translate path.
    expect(mockCtx.rotate).not.toHaveBeenCalled();
  });

  it('should handle quantum_bullet with no trail (first-tick lazy init)', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 5,
        color: '#22d3ee',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'quantum_bullet',
        // trail intentionally undefined
      },
    ];

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    // Glow + core still render even without trail.
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
  });

  it('uses combo milestone color for quantum bullet trails', () => {
    vi.mocked(ComboSystem.getComboColor).mockReturnValue('#FF6600');

    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 5,
        color: '#22d3ee',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'quantum_bullet',
        trail: [
          { x: 80, y: 100, age: 160 },
          { x: 90, y: 100, age: 80 },
          { x: 100, y: 100, age: 0 },
        ],
      },
    ];

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    expect(mockCtx.strokeStyle).toBe('#FF6600');
  });

  it('should render spread_shot without throwing (cool state, heat <= threshold)', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 4,
        color: '#ffd060',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'spread_shot',
        trail: [
          { x: 80, y: 100, age: 180 },
          { x: 90, y: 100, age: 90 },
          { x: 100, y: 100, age: 0 },
        ],
      },
    ];

    // Force cool heat via DifficultyContext singleton.
    difficultyContext.updateInputs({ normalizedVolume: 0.3 });

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    // Spread uses pellet drawing, not the rotated cyberpunk laser path.
    expect(mockCtx.rotate).not.toHaveBeenCalled();
  });

  it('should render spread_shot without throwing (hot state, heat > threshold)', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 4,
        color: '#ffff88',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'spread_shot',
        trail: [
          { x: 80, y: 100, age: 180 },
          { x: 90, y: 100, age: 90 },
          { x: 100, y: 100, age: 0 },
        ],
      },
    ];

    difficultyContext.updateInputs({ normalizedVolume: 0.9 });

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should handle spread_shot with no trail (first-tick lazy init)', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 5,
        vy: 0,
        radius: 4,
        color: '#ffd060',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'spread_shot',
        // trail intentionally undefined
      },
    ];

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
  });

  it('should render dedicated lab-matched VFX for laser, boomerang, nuke, and orbit', () => {
    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        radius: 8,
        color: '#ff78c8',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'laser',
        phase: 'fire',
        age: 20,
        maxAge: 160,
        beamAngle: 0,
        beamLength: 44,
      },
      {
        x: 160,
        y: 100,
        vx: 3,
        vy: 0,
        radius: 8,
        color: '#a855f7',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'boomerang',
        age: 80,
        trail: [
          { x: 130, y: 100, age: 120 },
          { x: 145, y: 100, age: 60 },
          { x: 160, y: 100, age: 0 },
        ],
      },
      {
        x: 220,
        y: 100,
        vx: 3,
        vy: 0,
        radius: 10,
        color: '#ffbb44',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'aoe_nuke',
        phase: 'flight',
        age: 100,
      },
      {
        x: 280,
        y: 100,
        vx: 0,
        vy: 0,
        radius: 11,
        color: '#44ddff',
        isCrit: false,
        isSuperCrit: false,
        active: true,
        weaponId: 'orbit_shield',
        isOrbiter: true,
        orbitAngle: 0,
        orbitRadius: 55,
      },
    ];

    expect(() =>
      renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
        width: 800,
        height: 600,
        status: GameStatus.PLAYING,
        graphics: {
          showParticles: true,
          showDamageNumbers: true,
          showScreenShake: true,
        },
      })
    ).not.toThrow();

    expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
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

  it('uses combo milestone color for normal bullet tail gradient', () => {
    vi.mocked(ComboSystem.getComboColor).mockReturnValue('#FF6600');
    gradientCache.clear();

    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 0,
        radius: 5,
        color: '#00FFFF',
        isCrit: false,
        isSuperCrit: false,
        active: true,
      },
    ];

    const spy = vi.spyOn(gradientCache, 'getLinearGradient');

    renderer.render(mockCtx, mockPool, mockState, mockPlayer, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: { showParticles: true, showDamageNumbers: true, showScreenShake: true },
    });

    expect(spy).toHaveBeenCalled();
    const stops = spy.mock.calls[0]![5];
    expect(stops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#FF6600' }),
        expect.objectContaining({ color: '#FF660080' }),
      ])
    );
  });

  it('does not apply combo color to crit bullets (keeps bullet color for glow)', () => {
    vi.mocked(ComboSystem.getComboColor).mockReturnValue('#FF6600');
    gradientCache.clear();

    mockPool.activeBullets = [
      {
        x: 100,
        y: 100,
        vx: 10,
        vy: 10,
        radius: 5,
        color: '#FFD700',
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

    // Crit glow uses b.color (#FFD700), not the combo color (#FF6600)
    // strokeStyle is set to glowColor then coreColor during crit rendering
    expect(mockCtx.strokeStyle).not.toBe('#FF6600');
    expect(mockCtx.arc).toHaveBeenCalled(); // Impact flare confirms crit path
  });
});
