import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PoolManager } from '../../../../services/combat/PoolManager';
import { LootCacheSystem } from '../../../../services/gameplay/loot/LootCacheSystem';
import { EffectRenderer } from '../../../../services/renderers/EffectRenderer';
import { GameStatus, type GameState, type Player } from '../../../../types';

const createEventBus = () => {
  const listeners = new Map<string, (data: unknown) => void>();
  const emissions: Array<{ event: string; data: unknown }> = [];
  return {
    emissions,
    on: vi.fn((event: string, callback: (data: unknown) => void) => {
      listeners.set(event, callback);
      return () => listeners.delete(event);
    }),
    emit: vi.fn((event: string, data: unknown) => {
      emissions.push({ event, data });
    }),
    dispatch(event: string, data: unknown): void {
      listeners.get(event)?.(data);
    },
  };
};

const createContext = (): CanvasRenderingContext2D =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    globalAlpha: 1,
  }) as unknown as CanvasRenderingContext2D;

describe('Market Cache presentation integration', () => {
  beforeEach(() => {
    PoolManager.getInstance().clearAll();
  });

  it('renders Shift+B forced fragment feedback without persistence or pity mutation', () => {
    const random = {
      nextFloat: vi.fn(() => 0),
      reset: vi.fn(),
    };
    const eventBus = createEventBus();
    const pool = PoolManager.getInstance();
    const player = {
      x: 400,
      y: 300,
      radius: 16,
      hp: 100,
      maxHp: 100,
      exp: 25,
      nextLevelExp: 100,
      level: 3,
    } as Player;
    const state = {
      shake: 0,
      critFlash: 0,
      critFlashColor: '#fff',
      rsiVisualState: 'NEUTRAL',
      atrPercent: 0,
      whaleEventTimer: 0,
      spawnRateMultiplier: 1,
      lastFireTime: 0,
    } as GameState;
    const system = new LootCacheSystem({
      rng: random,
      eventBus,
      applicator: { apply: vi.fn() },
      audio: {
        playSlotTick: vi.fn(),
        playAnticipation: vi.fn(),
        playSlotWin: vi.fn(),
        playJackpot: vi.fn(),
        playCoinShower: vi.fn(),
        playMultiplierChime: vi.fn(),
      },
      isOverclockActive: () => false,
    });

    system.beginRun(77);
    eventBus.dispatch('debugLootCacheSpawnRequested', { mode: 'jackpot' });
    system.update({
      deltaMs: 0,
      elapsedSeconds: 0,
      width: 800,
      height: 600,
      reducedMotion: true,
      showParticles: false,
      particleMultiplier: 0,
      pool,
      player,
      state,
    });
    const cache = pool.activeInteractables[0]!;
    expect(
      system.tryOpen(cache, {
        elapsedSeconds: 0,
        reducedMotion: true,
        pool,
        player,
        state,
      })
    ).toBe(true);
    system.update({
      deltaMs: 260,
      elapsedSeconds: 0,
      width: 800,
      height: 600,
      reducedMotion: true,
      showParticles: false,
      particleMultiplier: 0,
      pool,
      player,
      state,
    });

    const fragment = pool.activeFloatingTexts.find(
      text => text.text === '◆ ENCRYPTED FRAGMENT'
    );
    expect(fragment).toMatchObject({ alwaysVisible: true, stationary: true });
    expect(
      eventBus.emissions.some(item => item.event === 'cosmeticFragmentEarned')
    ).toBe(false);
    expect((system as any).pityMisses).toBe(0);

    const ctx = createContext();
    new EffectRenderer().render(ctx, pool, state, player, {
      width: 800,
      height: 600,
      status: GameStatus.PLAYING,
      graphics: {
        showParticles: false,
        showDamageNumbers: false,
        showScreenShake: false,
        reducedMotion: true,
      },
    });
    expect(ctx.fillText).toHaveBeenCalledWith(
      '◆ ENCRYPTED FRAGMENT',
      expect.any(Number),
      expect.any(Number)
    );

    system.dispose();
  });
});
