import { describe, expect, it, vi } from 'vitest';
import { GameStatus, type GameState } from '../../../types';
import { createInitialPlayer } from '../../../config/PlayerConfig';
import type { PhaseInput, TickContext } from '../../../services/gameplay/contracts';
import {
  CombatPhase,
  EffectsPhase,
  InputPhase,
  PhysicsPhase,
  SpawnPhase,
} from '../../../services/gameplay/phases';
import { createNeutralRuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';

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

  it('reuses baseline result objects per phase instance to avoid hot-loop allocation', () => {
    const inputPhase = new InputPhase();
    const combatPhase = new CombatPhase();
    const spawnPhase = new SpawnPhase();
    const physicsPhase = new PhysicsPhase();
    const effectsPhase = new EffectsPhase();

    expect(inputPhase.execute(createPhaseInput('input'))).toBe(
      inputPhase.execute(createPhaseInput('input'))
    );
    expect(combatPhase.execute(createPhaseInput('combat'))).toBe(
      combatPhase.execute(createPhaseInput('combat'))
    );
    expect(spawnPhase.execute(createPhaseInput('spawn'))).toBe(
      spawnPhase.execute(createPhaseInput('spawn'))
    );
    expect(physicsPhase.execute(createPhaseInput('physics'))).toBe(
      physicsPhase.execute(createPhaseInput('physics'))
    );
    expect(effectsPhase.execute(createPhaseInput('effects'))).toBe(
      effectsPhase.execute(createPhaseInput('effects'))
    );
  });

  it('combat phase writes didAttack into shared contract when runtime dependencies exist', () => {
    const context = createFakeTickContext();
    context.world.player.current = createInitialPlayer(100, 100, '#fff');

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

  it('spawn phase delegates only an injected plan and world state to its executor', () => {
    const execute = vi.fn(() => ({ executedCount: 2, spentThreat: 2 }));
    const shared: Record<string, unknown> = {
      spawnPlan: { intents: [] },
      spawnExecutor: { execute },
      spawnWorld: { maxActiveEnemies: 20 },
    };

    new SpawnPhase().execute({
      phase: 'spawn',
      context: createFakeTickContext(),
      shared: shared as Record<string, never>,
    });

    expect(execute).toHaveBeenCalledWith(shared.spawnPlan, shared.spawnWorld);
    expect(shared.spawnExecution).toEqual({ executedCount: 2, spentThreat: 2 });
  });

  it('accumulates presentation delta between snapshot revisions', () => {
    const observedDeltas: number[] = [];
    const director = {
      update: vi.fn((input: { deltaSeconds: number }) => {
        observedDeltas.push(input.deltaSeconds);
        return {
          isEnabled: true,
          ambience: { favorable: 0, volatility: 0, bpm: 0, liquidationTension: 0 },
          sensory: { shake: 0, flash: 0, hitStop: 0, audioAccent: 0 },
          cues: [],
        };
      }),
    };
    const target = { apply: vi.fn() };
    const phase = new EffectsPhase(director as never, target);
    const context = createFakeTickContext();
    context.clock.deltaMs = 100;
    context.clock.elapsedMs = 100;
    const snapshot = structuredClone(
      createNeutralRuntimeDifficultySnapshot({
        tick: 1,
        inputRevision: 1,
      })
    ) as any;
    snapshot.meta.revision = 1;
    const shared = {
      difficultyPhaseDecision: { snapshot },
    } as unknown as Record<string, never>;

    phase.execute({ phase: 'effects', context, shared });
    context.clock.elapsedMs = 200;
    phase.execute({ phase: 'effects', context, shared });
    snapshot.meta.revision = 2;
    context.clock.elapsedMs = 300;
    phase.execute({ phase: 'effects', context, shared });

    expect(observedDeltas).toEqual([0.1, 0.2]);
  });

  it('feeds the current authority snapshot into presentation', () => {
    const presentation = {
      isEnabled: true,
      ambience: { favorable: 0, volatility: 0, bpm: 0, liquidationTension: 0 },
      sensory: { shake: 0, flash: 0, hitStop: 0, audioAccent: 0 },
      cues: [],
    };
    const updateCurrent = vi.fn(() => presentation);
    const director = { update: vi.fn(), updateCurrent };
    const target = { apply: vi.fn() };
    const phase = new EffectsPhase(director as never, target);
    const context = createFakeTickContext();
    const currentSnapshot = {
      revision: 7,
      validFromTick: 1,
      pacing: { state: 'BUILD_UP', threatMultiplier: 0.75, remainingSeconds: 40 },
      threat: { target: 0.4, creditRate: 1, availableCredits: 0, maximumCredits: 8 },
      advantage: {
        creditRate: 0,
        availableCredits: 0,
        maximumCredits: 0,
        activeMechanic: null,
      },
      environment: {
        regime: 'CALM',
        presentationIntensity: 0.4,
        isFavorable: true,
      },
      encounter: {
        activeEventFamily: null,
        canStartMarketSurge: false,
        queuedEventFamily: null,
        phase: 'IDLE',
        primaryCardId: null,
        supportCardId: null,
        headwindChannels: [],
      },
    };
    const shared = {
      canonicalMarketFrame: { quality: 'LIVE' },
      difficultyPhaseDecision: {
        authority: 'current',
        activeRevision: 7,
        snapshot: null,
        currentSnapshot,
      },
    } as unknown as Record<string, never>;

    phase.execute({ phase: 'effects', context, shared });

    expect(updateCurrent).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: currentSnapshot, marketStale: false })
    );
    expect(target.apply).toHaveBeenCalledWith(presentation);
  });
});
