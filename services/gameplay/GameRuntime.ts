import { CombatSystem } from '../combat/CombatSystem';
import { PoolManager } from '../combat/PoolManager';
import { PhysicsSystem } from '../combat/PhysicsSystem';
import { SpawnSystem } from '../combat/SpawnSystem';
import { SpawnExecutor } from '../combat/SpawnExecutor';
import { CollisionSystem } from '../combat/physics/CollisionSystem';
import { CollectionSystem } from '../combat/physics/CollectionSystem';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { type ICombatSystem } from '../interfaces/ICombatSystem';
import { type IGameRenderer } from '../interfaces/IGameRenderer';
import { type IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';
import { GameRenderer } from '../renderers/GameRenderer';
import { ProjectileRenderer } from '../renderers/ProjectileRenderer';
import { audio } from '../audio';
import { MarketAudioReactor } from '../audio/MarketAudioReactor';
import { PresentationDirector } from '../presentation/PresentationDirector';
import { DirectorEffectApplier } from '../director/effects/DirectorEffectApplier';
import { ZoneField } from '../director/zones/ZoneField';
import { ZoneDirector } from '../director/zones/ZoneDirector';
import { ZoneEffectResolver } from '../director/zones/ZoneEffectResolver';
import { EventBus } from '../core/EventBus';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { MomentumWindowDecorator } from '../patterns/decorators/buffs/MomentumWindowDecorator';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';
import { createGamePresentationCueAdapter } from '../presentation/GamePresentationCueAdapter';
import { type EventBusPresentationCueAdapter } from '../presentation/EventBusPresentationCueAdapter';
import { SeededRng } from '../director/SeededRng';
import { LootCacheSystem } from './loot/LootCacheSystem';
import { LootCacheRewardResolver } from './loot/LootCacheRewardResolver';
import { LootCacheRewardApplicator } from './loot/LootCacheRewardApplicator';
import { type ILootCacheSystem } from '../interfaces/ILootCacheSystem';
import {
  createDifficultyRuntime,
  type DifficultyRuntime,
} from '../difficulty/runtime/DifficultyRuntime';
import { type DifficultyRuntimeMode } from '../director/DirectorRuntimeMode';
import { getDirectorRuntimeConfig } from '../../config/directorRuntime';
import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';
import { RESET_PRIORITY, ResetOrchestrator } from '../core/ResetOrchestrator';

export type CreateGameRuntimeOptions = {
  difficultyMode?: DifficultyRuntimeMode;
};

export type GameRuntime = {
  poolManager: PoolManager;
  renderer: IGameRenderer;
  combatSystem: ICombatSystem;
  physicsSystem: IPhysicsSystem;
  spawnSystem: ISpawnSystem;
  spawnExecutor: SpawnExecutor;
  difficultyRuntime: DifficultyRuntime;
  directorEffectApplier: DirectorEffectApplier;
  zoneField: ZoneField;
  presentationDirector: PresentationDirector;
  presentationCueAdapter: EventBusPresentationCueAdapter;
  difficultyContext: typeof difficultyContext;
  lootCacheSystem: ILootCacheSystem;
  reset: () => void;
  dispose: () => void;
};

export function createGameRuntime(options: CreateGameRuntimeOptions = {}): GameRuntime {
  const poolManager = new PoolManager();
  const renderer = new GameRenderer(
    undefined,
    undefined,
    new ProjectileRenderer(),
    undefined
  );
  const combatSystem = new CombatSystem(audio);
  const lootCacheRng = new SeededRng(0);
  const lootCacheRewardResolver = new LootCacheRewardResolver(lootCacheRng);
  const lootCacheRewardApplicator = LootCacheRewardApplicator;
  const lootCacheSystem = new LootCacheSystem({
    rng: lootCacheRng,
    resolver: lootCacheRewardResolver,
    applicator: lootCacheRewardApplicator,
  });
  const difficultySnapshotRef: { current: RuntimeDifficultySnapshot | null } = {
    current: null,
  };
  const collectionSystem = new CollectionSystem(
    undefined,
    lootCacheSystem,
    () => difficultySnapshotRef.current
  );
  const physicsSystem = new PhysicsSystem(
    undefined,
    new CollisionSystem(),
    collectionSystem
  );
  const spawnSystem = new SpawnSystem();
  const spawnExecutor = new SpawnExecutor();
  const difficultyRuntime = createDifficultyRuntime(
    options.difficultyMode ?? getDirectorRuntimeConfig().mode,
    {
      onSnapshotCommitted: snapshot => {
        difficultySnapshotRef.current = snapshot;
      },
    }
  );
  const presentationDirector = new PresentationDirector();
  const presentationCueAdapter = createGamePresentationCueAdapter();
  const zoneField = new ZoneField();
  const zoneDirector = new ZoneDirector(zoneField);
  const zoneEffects = new ZoneEffectResolver(zoneField);
  const directorEffectApplier = new DirectorEffectApplier(
    {
      applyMomentumWindow: () => {
        BuffManager.addBuff(MomentumWindowDecorator);
        return true;
      },
      dropLiquidity: (x, y) => {
        // Contract §10: a fixed-value utility drop, never a token grant.
        BuffGemSpawner.spawnGem('diamond', x, y);
      },
      applyZoneDamage: (amount, remainingHp, x, y) => {
        EventBus.emit('directorZoneDamage', { amount });
        // Reported through the normal hit channel so metrics, the Director
        // input inbox, and feedback all stay consistent with contact damage.
        EventBus.emit('playerHit', {
          damage: amount,
          remainingHp,
          sourceX: x,
          sourceY: y,
          enemyType: 'zone',
        });
      },
    },
    { zoneDirector, zoneEffects }
  );
  difficultyRuntime.setBlockedPositionQuery((x, y) =>
    zoneField.containsActive('SAFE_LANE', x, y)
  );
  const unregisterDifficultyReset = ResetOrchestrator.registerResetHandler(
    RESET_PRIORITY.DIFFICULTY_RUNTIME,
    'DifficultyRuntime',
    () => difficultyRuntime.reset()
  );

  const reset = () => {
    lootCacheSystem.reset();
    poolManager.clearAll();
    spawnSystem.reset();
    spawnExecutor.reset();
    difficultyRuntime.reset();
    difficultySnapshotRef.current = null;
    difficultyContext.reset();
    presentationDirector.reset();
    directorEffectApplier.reset();
    zoneField.reset();
    MarketAudioReactor.clearPresentationAmbience();
  };

  const dispose = () => {
    unregisterDifficultyReset();
    lootCacheSystem.dispose();
    difficultyRuntime.dispose();
    difficultyContext.reset();
    presentationDirector.reset();
    MarketAudioReactor.clearPresentationAmbience();

    if ('dispose' in spawnSystem && typeof spawnSystem.dispose === 'function') {
      spawnSystem.dispose();
    } else {
      spawnSystem.reset();
    }

    if ('dispose' in poolManager && typeof poolManager.dispose === 'function') {
      poolManager.dispose();
    } else {
      poolManager.clearAll();
    }
  };

  return {
    poolManager,
    renderer,
    combatSystem,
    physicsSystem,
    spawnSystem,
    spawnExecutor,
    difficultyRuntime,
    directorEffectApplier,
    zoneField,
    presentationDirector,
    presentationCueAdapter,
    difficultyContext,
    lootCacheSystem,
    reset,
    dispose,
  };
}
