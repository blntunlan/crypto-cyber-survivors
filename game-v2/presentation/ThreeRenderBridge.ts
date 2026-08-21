import { Object3D, type InstancedMesh } from 'three';

import {
  type RenderCategorySnapshot,
  type RenderSnapshot,
} from '@/game-v2/contracts/RenderSnapshot';
import { validateRenderCategoryStorage } from '@/game-v2/presentation/RenderSnapshotValidator';
import { type ThreeScene } from '@/game-v2/presentation/ThreeScene';

const assertCount = (count: number, capacity: number, name: string): void => {
  if (
    !Number.isFinite(count) ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > capacity
  ) {
    throw new RangeError(`${name} count exceeds typed-array capacity`);
  }
};

const assertCategory = (
  category: RenderCategorySnapshot,
  count: number,
  storageCapacity: number,
  sceneCapacity: number,
  name: string
): void => {
  assertCount(count, storageCapacity, name);
  if (count > sceneCapacity) {
    throw new RangeError(`${name} count exceeds scene capacity`);
  }

  for (let index = 0; index < count; index += 1) {
    const previousX = category.previousX[index];
    const previousY = category.previousY[index];
    const currentX = category.currentX[index];
    const currentY = category.currentY[index];
    const radius = category.radius[index];
    if (
      !Number.isFinite(previousX) ||
      !Number.isFinite(previousY) ||
      !Number.isFinite(currentX) ||
      !Number.isFinite(currentY) ||
      !Number.isFinite(radius)
    ) {
      throw new RangeError(`${name} active-prefix values must be finite`);
    }
    if ((radius ?? -1) < 0) {
      throw new RangeError(`${name} radius must not be negative`);
    }
  }
};

const interpolate = (previous: number, current: number, alpha: number): number =>
  previous + (current - previous) * alpha;

export class ThreeRenderBridge {
  private readonly scratch = new Object3D();

  public constructor(private readonly threeScene: ThreeScene) {}

  public sync(snapshot: RenderSnapshot, alpha: number): void {
    this.threeScene.assertMutable();
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
      throw new RangeError('render interpolation alpha must be finite and in [0, 1]');
    }

    const playerCapacity = validateRenderCategoryStorage(snapshot.player, 'player');
    const enemyCapacity = validateRenderCategoryStorage(snapshot.enemies, 'enemy');
    const projectileCapacity = validateRenderCategoryStorage(
      snapshot.projectiles,
      'projectile'
    );
    const xpPickupCapacity = validateRenderCategoryStorage(
      snapshot.xpPickups,
      'XP pickup'
    );
    if (playerCapacity !== 1) {
      throw new RangeError('player storage capacity must be exactly one');
    }
    assertCategory(snapshot.player, snapshot.playerCount, playerCapacity, 1, 'player');
    if (snapshot.playerCount > 1) {
      throw new RangeError('player count must be zero or one');
    }
    assertCategory(
      snapshot.enemies,
      snapshot.enemyCount,
      enemyCapacity,
      this.threeScene.enemyCapacity,
      'enemy'
    );
    assertCategory(
      snapshot.projectiles,
      snapshot.projectileCount,
      projectileCapacity,
      this.threeScene.projectileCapacity,
      'projectile'
    );
    assertCategory(
      snapshot.xpPickups,
      snapshot.xpPickupCount,
      xpPickupCapacity,
      this.threeScene.xpPickupCapacity,
      'XP pickup'
    );

    this.syncPlayer(snapshot.player, snapshot.playerCount, alpha);
    this.syncInstances(
      snapshot.enemies,
      snapshot.enemyCount,
      alpha,
      this.threeScene.enemyMesh
    );
    this.syncInstances(
      snapshot.projectiles,
      snapshot.projectileCount,
      alpha,
      this.threeScene.projectileMesh
    );
    this.syncInstances(
      snapshot.xpPickups,
      snapshot.xpPickupCount,
      alpha,
      this.threeScene.xpPickupMesh
    );
  }

  public dispose(): void {
    this.threeScene.dispose();
  }

  private syncPlayer(
    player: RenderCategorySnapshot,
    count: number,
    alpha: number
  ): void {
    const mesh = this.threeScene.playerMesh;
    mesh.visible = count === 1;
    if (count === 0) {
      return;
    }

    mesh.position.set(
      interpolate(player.previousX[0] ?? 0, player.currentX[0] ?? 0, alpha),
      0,
      interpolate(player.previousY[0] ?? 0, player.currentY[0] ?? 0, alpha)
    );
    mesh.scale.setScalar(player.radius[0] ?? 0);
  }

  private syncInstances(
    category: RenderCategorySnapshot,
    count: number,
    alpha: number,
    mesh: InstancedMesh
  ): void {
    for (let index = 0; index < count; index += 1) {
      this.scratch.position.set(
        interpolate(
          category.previousX[index] ?? 0,
          category.currentX[index] ?? 0,
          alpha
        ),
        0,
        interpolate(
          category.previousY[index] ?? 0,
          category.currentY[index] ?? 0,
          alpha
        )
      );
      this.scratch.scale.setScalar(category.radius[index] ?? 0);
      this.scratch.updateMatrix();
      mesh.setMatrixAt(index, this.scratch.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
