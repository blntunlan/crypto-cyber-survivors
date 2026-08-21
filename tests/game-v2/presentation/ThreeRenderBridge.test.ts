import {
  DynamicDrawUsage,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';
import { describe, expect, it, vi } from 'vitest';

import { MVP0_CONFIG_VERSION } from '@/game-v2/config/Mvp0Config';
import {
  RenderSnapshot,
  type RenderCategorySnapshot,
} from '@/game-v2/contracts/RenderSnapshot';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { ThreeScene, type RendererPort } from '@/game-v2/presentation/ThreeScene';
import { RenderSnapshotWriter } from '@/game-v2/presentation/RenderSnapshotWriter';
import { ThreeRenderBridge } from '@/game-v2/presentation/ThreeRenderBridge';
import { hashRuntimeCheckpoint } from '@/game-v2/replay/StateHasher';
import { writeCheckpoint } from '@/game-v2/replay/WorldSnapshotWriter';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const TRANSFORM_PLAYER = ComponentMask.Transform | ComponentMask.Player;
const TRANSFORM_ENEMY = ComponentMask.Transform | ComponentMask.Enemy;
const TRANSFORM_PROJECTILE = ComponentMask.Transform | ComponentMask.Projectile;
const TRANSFORM_PICKUP = ComponentMask.Transform | ComponentMask.XpPickup;

const createRenderer = (): RendererPort => ({
  render: vi.fn(),
  setSize: vi.fn(),
  dispose: vi.fn(),
});

const createSnapshot = (
  enemyCapacity = 3,
  projectileCapacity = 3,
  xpPickupCapacity = 3
): RenderSnapshot =>
  new RenderSnapshot({ enemyCapacity, projectileCapacity, xpPickupCapacity });

const createScene = (
  renderer: RendererPort = createRenderer(),
  enemyCapacity = 3,
  projectileCapacity = 3,
  xpPickupCapacity = 3
): ThreeScene =>
  new ThreeScene(renderer, {
    enemyCapacity,
    projectileCapacity,
    xpPickupCapacity,
  });

const setTransform = (
  world: World,
  slot: number,
  values: Readonly<{
    previousX: number;
    previousY: number;
    currentX: number;
    currentY: number;
    radius: number;
  }>
): void => {
  world.previousX[slot] = values.previousX;
  world.previousY[slot] = values.previousY;
  world.x[slot] = values.currentX;
  world.y[slot] = values.currentY;
  world.radius[slot] = values.radius;
};

const snapshotState = (snapshot: RenderSnapshot): unknown => ({
  playerCount: snapshot.playerCount,
  enemyCount: snapshot.enemyCount,
  projectileCount: snapshot.projectileCount,
  xpPickupCount: snapshot.xpPickupCount,
  player: copyCategory(snapshot.player),
  enemies: copyCategory(snapshot.enemies),
  projectiles: copyCategory(snapshot.projectiles),
  xpPickups: copyCategory(snapshot.xpPickups),
});

const copyCategory = (category: RenderSnapshot['enemies']): unknown => ({
  slots: category.slots.slice(),
  previousX: category.previousX.slice(),
  previousY: category.previousY.slice(),
  currentX: category.currentX.slice(),
  currentY: category.currentY.slice(),
  radius: category.radius.slice(),
});

const matrixValues = (scene: ThreeScene): number[] => {
  const matrix = new Matrix4();
  scene.enemyMesh.getMatrixAt(0, matrix);
  return matrix.toArray();
};

const forgeOversizedCategoryStorage = (category: RenderCategorySnapshot): void => {
  Object.defineProperties(category, {
    slots: { value: new Uint16Array(4097) },
    previousX: { value: new Float32Array(4097) },
    previousY: { value: new Float32Array(4097) },
    currentX: { value: new Float32Array(4097) },
    currentY: { value: new Float32Array(4097) },
    radius: { value: new Float32Array(4097) },
  });
};

const sceneState = (scene: ThreeScene): unknown => ({
  playerVisible: scene.playerMesh.visible,
  playerPosition: scene.playerMesh.position.toArray(),
  playerScale: scene.playerMesh.scale.toArray(),
  enemyCount: scene.enemyMesh.count,
  projectileCount: scene.projectileMesh.count,
  xpPickupCount: scene.xpPickupMesh.count,
  enemyMatrix: matrixValues(scene),
  enemyMatrixVersion: scene.enemyMesh.instanceMatrix.version,
  projectileMatrixVersion: scene.projectileMesh.instanceMatrix.version,
  xpPickupMatrixVersion: scene.xpPickupMesh.instanceMatrix.version,
});

const worldHash = (world: World): string =>
  hashRuntimeCheckpoint(
    writeCheckpoint({
      world,
      tick: 17,
      runIdentity: createRunIdentity('render-bridge-test', 0x12345678),
      rngSnapshot: { schemaVersion: 1, state: 0x87654321 },
      lifecycle: { phase: 'playing', sessionEpoch: 1 },
      configVersion: MVP0_CONFIG_VERSION,
    })
  );

describe('RenderSnapshotWriter', () => {
  it('packs every all-bit category match in ascending slot order and ignores partial masks', () => {
    const world = new World(8);
    world.createEntity(ComponentMask.Enemy);
    const player = world.createEntity(TRANSFORM_PLAYER | ComponentMask.Health);
    const firstEnemy = world.createEntity(TRANSFORM_ENEMY | ComponentMask.Body);
    const projectile = world.createEntity(TRANSFORM_PROJECTILE);
    const secondEnemy = world.createEntity(TRANSFORM_ENEMY | ComponentMask.Health);
    const pickup = world.createEntity(TRANSFORM_PICKUP);
    const snapshot = createSnapshot();

    new RenderSnapshotWriter().write(world, snapshot);

    expect(snapshot.playerCount).toBe(1);
    expect(snapshot.enemyCount).toBe(2);
    expect(snapshot.projectileCount).toBe(1);
    expect(snapshot.xpPickupCount).toBe(1);
    expect(snapshot.player.slots[0]).toBe(world.slotOf(player));
    expect(Array.from(snapshot.enemies.slots.slice(0, 2))).toEqual([
      world.slotOf(firstEnemy),
      world.slotOf(secondEnemy),
    ]);
    expect(snapshot.projectiles.slots[0]).toBe(world.slotOf(projectile));
    expect(snapshot.xpPickups.slots[0]).toBe(world.slotOf(pickup));
  });

  it('copies only canonical numeric transform data and never retains the world', () => {
    const world = new World(2);
    const player = world.createEntity(TRANSFORM_PLAYER);
    const slot = world.slotOf(player);
    setTransform(world, slot, {
      previousX: -4,
      previousY: 8,
      currentX: 6,
      currentY: -2,
      radius: 1.5,
    });
    const snapshot = createSnapshot();

    new RenderSnapshotWriter().write(world, snapshot);
    world.x[slot] = 99;

    expect(snapshot.player.previousX[0]).toBe(-4);
    expect(snapshot.player.previousY[0]).toBe(8);
    expect(snapshot.player.currentX[0]).toBe(6);
    expect(snapshot.player.currentY[0]).toBe(-2);
    expect(snapshot.player.radius[0]).toBe(1.5);
    expect(Object.values(snapshot)).not.toContain(world);
  });

  it('publishes zero counts so destroyed entities cannot survive in stale tail bytes', () => {
    const world = new World(2);
    const enemy = world.createEntity(TRANSFORM_ENEMY);
    const snapshot = createSnapshot(1);
    const writer = new RenderSnapshotWriter();
    writer.write(world, snapshot);
    expect(snapshot.enemyCount).toBe(1);

    world.destroyEntity(enemy);
    writer.write(world, snapshot);

    expect(snapshot.enemyCount).toBe(0);
    expect(snapshot.enemies.slots[0]).toBe(0);
  });

  it.each([
    ['enemy overflow', (world: World) => world.createEntity(TRANSFORM_ENEMY)],
    ['second player', (world: World) => world.createEntity(TRANSFORM_PLAYER)],
  ] as const)('rejects %s without changing any output byte or count', (_name, add) => {
    const world = new World(4);
    world.createEntity(_name === 'second player' ? TRANSFORM_PLAYER : TRANSFORM_ENEMY);
    const snapshot = createSnapshot(1);
    const writer = new RenderSnapshotWriter();
    writer.write(world, snapshot);
    const before = snapshotState(snapshot);
    add(world);

    expect(() => writer.write(world, snapshot)).toThrow(/capacity|player/i);
    expect(snapshotState(snapshot)).toEqual(before);
  });

  it('rejects malformed category capacities atomically', () => {
    const world = new World(2);
    world.createEntity(TRANSFORM_ENEMY);
    const snapshot = createSnapshot(2);
    snapshot.enemyCount = 1;
    snapshot.enemies.currentX[0] = 41;
    Object.defineProperty(snapshot.enemies, 'currentY', {
      value: new Float32Array(1),
    });
    const before = snapshotState(snapshot);

    expect(() => new RenderSnapshotWriter().write(world, snapshot)).toThrow(
      /capacity|storage/i
    );
    expect(snapshotState(snapshot)).toEqual(before);
    expect(snapshot.enemyCount).toBe(1);
    expect(snapshot.enemies.currentX[0]).toBe(41);
  });

  it('rejects consistent 4097-slot forged storage before changing output', () => {
    const world = new World(1);
    const snapshot = createSnapshot(1);
    snapshot.enemyCount = 1;
    snapshot.enemies.currentX[0] = 41;
    forgeOversizedCategoryStorage(snapshot.enemies);
    snapshot.enemies.currentX[0] = 41;
    const before = snapshotState(snapshot);

    expect(() => new RenderSnapshotWriter().write(world, snapshot)).toThrow(
      /4096|capacity/i
    );
    expect(snapshotState(snapshot)).toEqual(before);
  });

  it.each([
    ['previous X', (world: World): void => void (world.previousX[0] = Number.NaN)],
    [
      'previous Y',
      (world: World): void => void (world.previousY[0] = Number.POSITIVE_INFINITY),
    ],
    ['current X', (world: World): void => void (world.x[0] = Number.NEGATIVE_INFINITY)],
    ['current Y', (world: World): void => void (world.y[0] = Number.NaN)],
    [
      'radius',
      (world: World): void => void (world.radius[0] = Number.POSITIVE_INFINITY),
    ],
    ['negative radius', (world: World): void => void (world.radius[0] = -0.25)],
  ] as const)('rejects invalid %s atomically', (_name, corrupt) => {
    const world = new World(2);
    world.createEntity(TRANSFORM_PLAYER);
    const snapshot = createSnapshot();
    const writer = new RenderSnapshotWriter();
    writer.write(world, snapshot);
    snapshot.player.currentX[0] = 73;
    const before = snapshotState(snapshot);
    corrupt(world);

    expect(() => writer.write(world, snapshot)).toThrow(/finite|radius/i);
    expect(snapshotState(snapshot)).toEqual(before);
  });
});

describe('ThreeRenderBridge', () => {
  it('marks moving instance buffers dynamic and disables stale bounds culling', () => {
    const scene = createScene();

    for (const mesh of [scene.enemyMesh, scene.projectileMesh, scene.xpPickupMesh]) {
      expect(mesh.instanceMatrix.usage).toBe(DynamicDrawUsage);
      expect(mesh.frustumCulled).toBe(false);
    }
  });

  it.each([
    [0, -2, 4],
    [0.5, 3, 1],
    [1, 8, -2],
  ] as const)(
    'interpolates alpha %s and maps simulation X/Y into Three X/Z',
    (alpha, expectedX, expectedZ) => {
      const world = new World(1);
      const player = world.createEntity(TRANSFORM_PLAYER);
      setTransform(world, world.slotOf(player), {
        previousX: -2,
        previousY: 4,
        currentX: 8,
        currentY: -2,
        radius: 1.5,
      });
      const snapshot = createSnapshot();
      new RenderSnapshotWriter().write(world, snapshot);
      const scene = createScene();

      new ThreeRenderBridge(scene).sync(snapshot, alpha);

      expect(scene.playerMesh.position.toArray()).toEqual([expectedX, 0, expectedZ]);
      expect(scene.playerMesh.scale.toArray()).toEqual([1.5, 1.5, 1.5]);
    }
  );

  it('packs deterministic instance transforms, updates buffers, and never mutates simulation or snapshot', () => {
    const world = new World(4);
    const first = world.createEntity(TRANSFORM_ENEMY);
    const second = world.createEntity(TRANSFORM_ENEMY);
    setTransform(world, world.slotOf(first), {
      previousX: 0,
      previousY: 2,
      currentX: 2,
      currentY: 4,
      radius: 0.5,
    });
    setTransform(world, world.slotOf(second), {
      previousX: 8,
      previousY: 10,
      currentX: 12,
      currentY: 14,
      radius: 2,
    });
    const snapshot = createSnapshot();
    const writer = new RenderSnapshotWriter();
    writer.write(world, snapshot);
    const beforeWorldHash = worldHash(world);
    const beforeSnapshot = snapshotState(snapshot);
    const scene = createScene();
    const beforeVersion = scene.enemyMesh.instanceMatrix.version;
    const beforeProjectileVersion = scene.projectileMesh.instanceMatrix.version;
    const beforeXpPickupVersion = scene.xpPickupMesh.instanceMatrix.version;

    new ThreeRenderBridge(scene).sync(snapshot, 0.5);

    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    scene.enemyMesh.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.toArray()).toEqual([1, 0, 3]);
    expect(scale.toArray()).toEqual([0.5, 0.5, 0.5]);
    scene.enemyMesh.getMatrixAt(1, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.toArray()).toEqual([10, 0, 12]);
    expect(scale.toArray()).toEqual([2, 2, 2]);
    expect(scene.enemyMesh.count).toBe(2);
    expect(scene.enemyMesh.instanceMatrix.version).toBeGreaterThan(beforeVersion);
    expect(scene.projectileMesh.instanceMatrix.version).toBeGreaterThan(
      beforeProjectileVersion
    );
    expect(scene.xpPickupMesh.instanceMatrix.version).toBeGreaterThan(
      beforeXpPickupVersion
    );
    expect(snapshotState(snapshot)).toEqual(beforeSnapshot);
    expect(worldHash(world)).toBe(beforeWorldHash);

    scene.enemyMesh.setMatrixAt(0, new Matrix4().makeTranslation(999, 0, 999));
    expect(worldHash(world)).toBe(beforeWorldHash);
  });

  it('uses exact counts to hide destroyed instances and an absent player', () => {
    const world = new World(4);
    const player = world.createEntity(TRANSFORM_PLAYER);
    const enemy = world.createEntity(TRANSFORM_ENEMY);
    const projectile = world.createEntity(TRANSFORM_PROJECTILE);
    const pickup = world.createEntity(TRANSFORM_PICKUP);
    const snapshot = createSnapshot();
    const writer = new RenderSnapshotWriter();
    const scene = createScene();
    const bridge = new ThreeRenderBridge(scene);
    writer.write(world, snapshot);
    bridge.sync(snapshot, 0);
    expect(scene.playerMesh.visible).toBe(true);
    expect([
      scene.enemyMesh.count,
      scene.projectileMesh.count,
      scene.xpPickupMesh.count,
    ]).toEqual([1, 1, 1]);

    world.destroyEntity(player);
    world.destroyEntity(enemy);
    world.destroyEntity(projectile);
    world.destroyEntity(pickup);
    writer.write(world, snapshot);
    bridge.sync(snapshot, 0);

    expect(scene.playerMesh.visible).toBe(false);
    expect([
      scene.enemyMesh.count,
      scene.projectileMesh.count,
      scene.xpPickupMesh.count,
    ]).toEqual([0, 0, 0]);
  });

  it.each([Number.NaN, Number.NEGATIVE_INFINITY, -0.01, 1.01])(
    'rejects invalid alpha %s before any scene mutation',
    invalidAlpha => {
      const snapshot = createSnapshot();
      snapshot.enemyCount = 1;
      snapshot.enemies.radius[0] = 1;
      const scene = createScene();
      const bridge = new ThreeRenderBridge(scene);
      bridge.sync(snapshot, 0);
      const before = sceneState(scene);

      expect(() => bridge.sync(snapshot, invalidAlpha)).toThrow(/alpha/i);
      expect(sceneState(scene)).toEqual(before);
    }
  );

  it.each([
    ['player', (snapshot: RenderSnapshot): void => void (snapshot.playerCount = 2)],
    ['enemy', (snapshot: RenderSnapshot): void => void (snapshot.enemyCount = 2)],
    [
      'projectile',
      (snapshot: RenderSnapshot): void => void (snapshot.projectileCount = 2),
    ],
    [
      'XP pickup',
      (snapshot: RenderSnapshot): void => void (snapshot.xpPickupCount = 2),
    ],
  ] as const)(
    'rejects forged %s count beyond typed-array capacity before scene mutation',
    (_name, corrupt) => {
      const snapshot = createSnapshot(1, 1, 1);
      const scene = createScene(undefined, 1, 1, 1);
      const bridge = new ThreeRenderBridge(scene);
      bridge.sync(snapshot, 0);
      const before = sceneState(scene);
      corrupt(snapshot);

      expect(() => bridge.sync(snapshot, 0.5)).toThrow(/count|capacity/i);
      expect(sceneState(scene)).toEqual(before);
    }
  );

  it('rejects a count beyond scene instance capacity before any scene mutation', () => {
    const snapshot = createSnapshot(2);
    snapshot.enemyCount = 2;
    snapshot.enemies.radius.fill(1);
    const scene = createScene(undefined, 1);
    const bridge = new ThreeRenderBridge(scene);
    const before = sceneState(scene);

    expect(() => bridge.sync(snapshot, 0.5)).toThrow(/count|capacity/i);
    expect(sceneState(scene)).toEqual(before);
  });

  it('rejects consistent 4097-slot forged storage before changing the scene', () => {
    const snapshot = createSnapshot(1);
    const scene = createScene(undefined, 1);
    const bridge = new ThreeRenderBridge(scene);
    bridge.sync(snapshot, 0);
    forgeOversizedCategoryStorage(snapshot.enemies);
    const before = sceneState(scene);

    expect(() => bridge.sync(snapshot, 0.5)).toThrow(/4096|capacity/i);
    expect(sceneState(scene)).toEqual(before);
  });

  it.each([
    [
      'previous X',
      (snapshot: RenderSnapshot): void =>
        void (snapshot.enemies.previousX[0] = Number.NaN),
    ],
    [
      'previous Y',
      (snapshot: RenderSnapshot): void =>
        void (snapshot.enemies.previousY[0] = Number.POSITIVE_INFINITY),
    ],
    [
      'current X',
      (snapshot: RenderSnapshot): void =>
        void (snapshot.enemies.currentX[0] = Number.NEGATIVE_INFINITY),
    ],
    [
      'current Y',
      (snapshot: RenderSnapshot): void =>
        void (snapshot.enemies.currentY[0] = Number.NaN),
    ],
    [
      'radius',
      (snapshot: RenderSnapshot): void =>
        void (snapshot.enemies.radius[0] = Number.POSITIVE_INFINITY),
    ],
    [
      'negative radius',
      (snapshot: RenderSnapshot): void => void (snapshot.enemies.radius[0] = -1),
    ],
    [
      'player category',
      (snapshot: RenderSnapshot): void => {
        snapshot.playerCount = 1;
        snapshot.player.radius[0] = Number.NaN;
      },
    ],
    [
      'projectile category',
      (snapshot: RenderSnapshot): void => {
        snapshot.projectileCount = 1;
        snapshot.projectiles.radius[0] = Number.NaN;
      },
    ],
    [
      'XP pickup category',
      (snapshot: RenderSnapshot): void => {
        snapshot.xpPickupCount = 1;
        snapshot.xpPickups.radius[0] = Number.NaN;
      },
    ],
  ] as const)('rejects forged active-prefix %s atomically', (_name, corrupt) => {
    const snapshot = createSnapshot();
    snapshot.enemyCount = 1;
    snapshot.enemies.radius[0] = 1;
    const scene = createScene();
    const bridge = new ThreeRenderBridge(scene);
    bridge.sync(snapshot, 0);
    const before = sceneState(scene);
    corrupt(snapshot);

    expect(() => bridge.sync(snapshot, 0.5)).toThrow(/finite|radius/i);
    expect(sceneState(scene)).toEqual(before);
  });

  it('delegates renderer operations with the owned real Three scene', () => {
    const renderer = createRenderer();
    const scene = createScene(renderer);
    const camera = new PerspectiveCamera();

    scene.setSize(1280, 720, false);
    scene.render(camera);

    expect(renderer.setSize).toHaveBeenCalledWith(1280, 720, false);
    expect(renderer.render).toHaveBeenCalledWith(scene.scene, camera);
  });

  it('disposes every owned resource and renderer exactly once and rejects later mutation', () => {
    const renderer = createRenderer();
    const scene = createScene(renderer);
    const bridge = new ThreeRenderBridge(scene);
    const geometries = [
      scene.playerMesh.geometry,
      scene.enemyMesh.geometry,
      scene.projectileMesh.geometry,
      scene.xpPickupMesh.geometry,
    ];
    const materials = [
      scene.playerMesh.material,
      scene.enemyMesh.material,
      scene.projectileMesh.material,
      scene.xpPickupMesh.material,
    ];
    const geometryDisposals = geometries.map(geometry => vi.spyOn(geometry, 'dispose'));
    const materialDisposals = materials.map(material => vi.spyOn(material, 'dispose'));

    bridge.dispose();
    bridge.dispose();

    for (const dispose of [...geometryDisposals, ...materialDisposals]) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(() => bridge.sync(createSnapshot(), 0)).toThrow(/disposed/i);
    expect(() => scene.setSize(1, 1, false)).toThrow(/disposed/i);
    expect(() => scene.render(new PerspectiveCamera())).toThrow(/disposed/i);
  });
});
