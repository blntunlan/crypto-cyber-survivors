import {
  AmbientLight,
  BoxGeometry,
  type Camera,
  Color,
  ConeGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Scene,
} from 'three';

import { type RenderSnapshotCapacities } from '@/game-v2/contracts/RenderSnapshot';
import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';

export type RendererPort = {
  render(scene: Scene, camera: Camera): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  dispose(): void;
};

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

export class ThreeScene {
  public readonly scene: Scene;
  public readonly playerMesh: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
  public readonly enemyMesh: InstancedMesh<OctahedronGeometry, MeshStandardMaterial>;
  public readonly projectileMesh: InstancedMesh<ConeGeometry, MeshStandardMaterial>;
  public readonly xpPickupMesh: InstancedMesh<BoxGeometry, MeshStandardMaterial>;

  public readonly enemyCapacity: number;
  public readonly projectileCapacity: number;
  public readonly xpPickupCapacity: number;

  private readonly renderer: RendererPort;
  private disposed = false;

  public constructor(renderer: RendererPort, capacities: RenderSnapshotCapacities) {
    assertCapacity(capacities.enemyCapacity, 'enemyCapacity');
    assertCapacity(capacities.projectileCapacity, 'projectileCapacity');
    assertCapacity(capacities.xpPickupCapacity, 'xpPickupCapacity');

    this.renderer = renderer;
    this.enemyCapacity = capacities.enemyCapacity;
    this.projectileCapacity = capacities.projectileCapacity;
    this.xpPickupCapacity = capacities.xpPickupCapacity;
    this.scene = new Scene();
    this.scene.background = new Color(0x050812);

    this.playerMesh = new Mesh(
      new IcosahedronGeometry(1, 1),
      new MeshStandardMaterial({ color: 0x35f4ff })
    );
    this.enemyMesh = new InstancedMesh(
      new OctahedronGeometry(1),
      new MeshStandardMaterial({ color: 0xff315f }),
      this.enemyCapacity
    );
    this.projectileMesh = new InstancedMesh(
      new ConeGeometry(0.5, 1, 6),
      new MeshStandardMaterial({ color: 0xfff36b }),
      this.projectileCapacity
    );
    this.xpPickupMesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: 0x59ff91 }),
      this.xpPickupCapacity
    );
    this.enemyMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.projectileMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.xpPickupMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.enemyMesh.frustumCulled = false;
    this.projectileMesh.frustumCulled = false;
    this.xpPickupMesh.frustumCulled = false;
    this.playerMesh.visible = false;
    this.enemyMesh.count = 0;
    this.projectileMesh.count = 0;
    this.xpPickupMesh.count = 0;

    const ambientLight = new AmbientLight(0xffffff, 1.5);
    const directionalLight = new DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(4, 8, 3);
    this.scene.add(
      ambientLight,
      directionalLight,
      this.playerMesh,
      this.enemyMesh,
      this.projectileMesh,
      this.xpPickupMesh
    );
  }

  public assertMutable(): void {
    if (this.disposed) {
      throw new Error('Three scene is disposed');
    }
  }

  public render(camera: Camera): void {
    this.assertMutable();
    this.renderer.render(this.scene, camera);
  }

  public setSize(width: number, height: number, updateStyle: boolean): void {
    this.assertMutable();
    this.renderer.setSize(width, height, updateStyle);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    this.playerMesh.geometry.dispose();
    this.playerMesh.material.dispose();
    this.enemyMesh.geometry.dispose();
    this.enemyMesh.material.dispose();
    this.projectileMesh.geometry.dispose();
    this.projectileMesh.material.dispose();
    this.xpPickupMesh.geometry.dispose();
    this.xpPickupMesh.material.dispose();

    // The instance matrix buffers belong to the mesh, not to its geometry or
    // material, so disposing those two leaves them allocated.
    this.enemyMesh.dispose();
    this.projectileMesh.dispose();
    this.xpPickupMesh.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}
