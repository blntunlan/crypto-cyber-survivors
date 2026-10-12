import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';

export type RenderSnapshotCapacities = Readonly<{
  enemyCapacity: number;
  projectileCapacity: number;
  xpPickupCapacity: number;
}>;

export type RenderCategorySnapshot = Readonly<{
  slots: Uint16Array;
  previousX: Float32Array;
  previousY: Float32Array;
  currentX: Float32Array;
  currentY: Float32Array;
  radius: Float32Array;
}>;

const assertCapacity = (capacity: number, name: string): void => {
  if (
    !Number.isFinite(capacity) ||
    !Number.isInteger(capacity) ||
    capacity < 0 ||
    capacity > MAX_WORLD_CAPACITY
  ) {
    throw new RangeError(
      `${name} must be an integer between 0 and ${MAX_WORLD_CAPACITY}`
    );
  }
};

const createCategory = (capacity: number): RenderCategorySnapshot => ({
  slots: new Uint16Array(capacity),
  previousX: new Float32Array(capacity),
  previousY: new Float32Array(capacity),
  currentX: new Float32Array(capacity),
  currentY: new Float32Array(capacity),
  radius: new Float32Array(capacity),
});

export class RenderSnapshot {
  public readonly player: RenderCategorySnapshot;
  public readonly enemies: RenderCategorySnapshot;
  public readonly projectiles: RenderCategorySnapshot;
  public readonly xpPickups: RenderCategorySnapshot;

  public playerCount = 0;
  public enemyCount = 0;
  public projectileCount = 0;
  public xpPickupCount = 0;

  public constructor(capacities: RenderSnapshotCapacities) {
    assertCapacity(capacities.enemyCapacity, 'enemyCapacity');
    assertCapacity(capacities.projectileCapacity, 'projectileCapacity');
    assertCapacity(capacities.xpPickupCapacity, 'xpPickupCapacity');

    this.player = createCategory(1);
    this.enemies = createCategory(capacities.enemyCapacity);
    this.projectiles = createCategory(capacities.projectileCapacity);
    this.xpPickups = createCategory(capacities.xpPickupCapacity);
  }
}
