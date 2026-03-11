import { describe, expect, it } from 'vitest';
import { GameStatus, type GameState } from '../../../types';
import type { PhaseInput, TickContext } from '../../../services/gameplay/contracts';
import {
  CombatPhase,
  EffectsPhase,
  InputPhase,
  PhysicsPhase,
  SpawnPhase,
} from '../../../services/gameplay/phases';

type ScaffoldPhaseName = 'input' | 'combat' | 'spawn' | 'physics' | 'effects';

const createFakeTickContext = (): TickContext => ({
  clock: {
    frame: 1,
    nowMs: 1_000,
    deltaMs: 16,
    elapsedMs: 16,
  },
  status: GameStatus.PLAYING,
  dimensions: {
    width: 1280,
    height: 720,
  },
  world: {
    player: { current: null },
    gameState: { current: {} as unknown as GameState },
    pool: {
      current: {
        activeEnemies: [],
        activeBullets: [],
        activeGems: [],
        activeParticles: [],
      },
    },
  },
  marketData: {
    price: 100,
    volume: 1_000,
    pnl: 0,
    effectivePnl: 0,
    leverage: 1,
    rsi: 50,
    difficulty: 1,
    momentum: 0,
  },
  telemetry: {},
});

const createPhaseInput = <TPhase extends ScaffoldPhaseName>(
  phase: TPhase
): PhaseInput<TPhase> => ({
  phase,
  context: createFakeTickContext(),
  shared: {},
});

const phaseCases = [
  {
    phase: 'input' as const,
    execute: () => new InputPhase().execute(createPhaseInput('input')),
  },
  {
    phase: 'combat' as const,
    execute: () => new CombatPhase().execute(createPhaseInput('combat')),
  },
  {
    phase: 'spawn' as const,
    execute: () => new SpawnPhase().execute(createPhaseInput('spawn')),
  },
  {
    phase: 'physics' as const,
    execute: () => new PhysicsPhase().execute(createPhaseInput('physics')),
  },
  {
    phase: 'effects' as const,
    execute: () => new EffectsPhase().execute(createPhaseInput('effects')),
  },
] as const;

describe('Gameplay scaffold phases', () => {
  it.each(phaseCases)(
    '$phase phase returns continue control with deterministic baseline metadata',
    ({ phase, execute }) => {
      const first = execute();
      const second = execute();

      expect(first.control).toBe('continue');
      expect(second.control).toBe('continue');
      expect(first.shared?.__phase).toEqual({
        phase,
        baseline: true,
        mode: 'pass-through',
      });
      expect(second.shared?.__phase).toEqual(first.shared?.__phase);
    }
  );

  it('combat phase writes didAttack into shared contract when runtime dependencies exist', () => {
    const context = createFakeTickContext();
    context.world.player.current = {
      x: 100,
      y: 100,
      radius: 12,
      color: '#fff',
      speed: 5,
      level: 1,
      exp: 0,
      nextLevelExp: 100,
      hp: 100,
      maxHp: 100,
      invulnerabilityTimer: 0,
      scoreMultiplier: 1,
      attackSpeed: 1,
      attackRange: 1,
      critChance: 0,
      critDamage: 1.5,
      magnetRange: 1,
      luck: 1,
      hpRegen: 0,
      damageReduction: 0,
      expBonus: 1,
      coinMultiplier: 1,
      attackPower: 1,
      projectileSpeed: 1,
      maxProjectiles: 1,
      dashDistance: 1,
      pickupRadius: 1,
      cdr: 0,
    };

    const shared: Record<string, unknown> = {
      deltaTime: 16,
      width: 1280,
      height: 720,
      combatSystem: {
        processAutoFire: () => true,
      },
    };

    const result = new CombatPhase().execute({
      phase: 'combat',
      context,
      shared: shared as Record<string, never>,
    });

    expect(result.control).toBe('continue');
    expect(shared.didAttack).toBe(true);
  });
});
