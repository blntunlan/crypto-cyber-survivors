import {
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_MAX_LIVE_PROJECTILES,
  MVP0_WORLD_CAPACITY,
} from '@/game-v2/config/Mvp0Config';
import {
  RenderSnapshot,
  type RenderSnapshotCapacities,
} from '@/game-v2/contracts/RenderSnapshot';
import { createRunIdentity, type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import { OrthographicCameraController } from '@/game-v2/presentation/OrthographicCameraController';
import { RenderSnapshotWriter } from '@/game-v2/presentation/RenderSnapshotWriter';
import { ThreeRenderBridge } from '@/game-v2/presentation/ThreeRenderBridge';
import { ThreeScene, type RendererPort } from '@/game-v2/presentation/ThreeScene';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { InputRecorder } from '@/game-v2/replay/InputRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import {
  GameV2Runtime,
  type IntentSource,
  type RuntimePresentation,
} from '@/game-v2/runtime/GameV2Runtime';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { SimulationClock } from '@/game-v2/runtime/SimulationClock';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { DashSystem } from '@/game-v2/systems/DashSystem';
import { EnemySystem } from '@/game-v2/systems/EnemySystem';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { World } from '@/game-v2/world/World';

const UINT32_MAX = 0xffffffff;

/**
 * XP pickups have no lifetime in MVP-0, so the only bound on how many can exist
 * is world capacity; giving the pickup category the whole capacity means the
 * world runs out before the render snapshot does, leaving exactly one failure
 * mode to reason about.
 */
export const MVP0_RENDER_CAPACITIES: RenderSnapshotCapacities = Object.freeze({
  enemyCapacity: MVP0_MAX_LIVE_ENEMIES,
  projectileCapacity: MVP0_MAX_LIVE_PROJECTILES,
  xpPickupCapacity: MVP0_WORLD_CAPACITY,
});

export type Mvp0RenderTarget = {
  canvas: HTMLCanvasElement;
  createRenderer: (canvas: HTMLCanvasElement) => RendererPort;
};

export type Mvp0RuntimeOptions = {
  runIdentity: RunIdentity;
  intentSource: IntentSource;
  /** Omit for a headless runtime: replay, verification, and unit tests. */
  renderTarget?: Mvp0RenderTarget | null;
};

const createPresentation = (target: Mvp0RenderTarget): RuntimePresentation => {
  const renderer = target.createRenderer(target.canvas);
  const scene = new ThreeScene(renderer, MVP0_RENDER_CAPACITIES);
  const bridge = new ThreeRenderBridge(scene);
  const camera = new OrthographicCameraController();

  return {
    present: (snapshot, alpha) => {
      bridge.sync(snapshot, alpha);

      // The bridge already interpolated the player mesh, so following it here
      // keeps one owner of the interpolation rule.
      if (snapshot.playerCount === 1) {
        camera.follow(scene.playerMesh.position.x, scene.playerMesh.position.z);
      }

      scene.render(camera.camera);
    },
    resize: (viewportWidth, viewportHeight) => {
      camera.resize(viewportWidth, viewportHeight);
      scene.setSize(viewportWidth, viewportHeight, false);
    },
    dispose: () => {
      // Disposes the scene, which disposes the renderer it was given.
      bridge.dispose();
    },
  };
};

/** The single production composition of the MVP-0 runtime. */
export const createMvp0Runtime = (options: Mvp0RuntimeOptions): GameV2Runtime => {
  const lifecycle = new GameV2Lifecycle();
  const commandRecorder = new CommandRecorder();
  const targetingSystem = new TargetingSystem();
  const weaponSystem = new WeaponSystem(targetingSystem);

  return new GameV2Runtime({
    world: new World(MVP0_WORLD_CAPACITY),
    rng: new DeterministicRng(options.runIdentity.seed),
    clock: new SimulationClock(),
    lifecycle,
    runIdentity: options.runIdentity,
    intentSource: options.intentSource,
    inputRecorder: new InputRecorder(),
    commandRecorder,
    renderSnapshot: new RenderSnapshot(MVP0_RENDER_CAPACITIES),
    renderSnapshotWriter: new RenderSnapshotWriter(),
    dashSystem: new DashSystem(),
    movementSystem: new MovementSystem(),
    enemySystem: new EnemySystem(),
    weaponSystem,
    combatSystem: new CombatSystem(),
    progressionSystem: new ProgressionSystem(lifecycle, commandRecorder, weaponSystem),
    presentation:
      options.renderTarget === undefined || options.renderTarget === null
        ? null
        : createPresentation(options.renderTarget),
  });
};

/**
 * Resolves the run a browser session should play.
 *
 * `?seed=<uint32>` pins both the seed and the run id so a manual or automated
 * session is reproducible; without it the seed comes from `randomSeed` and the
 * run id from the seed, which keeps the identity derivable from the recording
 * alone.
 */
export const resolveRunIdentity = (
  search: string,
  randomSeed: () => number
): RunIdentity => {
  const requested = new URLSearchParams(search).get('seed')?.trim();

  // `Number('')` is 0, so an empty `?seed=` would otherwise pin every such
  // session to seed 0 instead of falling back to a fresh one.
  const parsed =
    requested === undefined || requested.length === 0 ? Number.NaN : Number(requested);
  const seed =
    Number.isInteger(parsed) && parsed >= 0 && parsed <= UINT32_MAX
      ? parsed
      : randomSeed();

  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new RangeError('random seed must be a finite unsigned 32-bit integer');
  }

  return createRunIdentity(`mvp0-${seed}`, seed);
};
