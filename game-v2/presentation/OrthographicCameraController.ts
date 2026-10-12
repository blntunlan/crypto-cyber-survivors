import { OrthographicCamera } from 'three';

import {
  TOP_DOWN_CAMERA_FAR,
  TOP_DOWN_CAMERA_HEIGHT,
  TOP_DOWN_CAMERA_NEAR,
  TOP_DOWN_CAMERA_UP_X,
  TOP_DOWN_CAMERA_UP_Y,
  TOP_DOWN_CAMERA_UP_Z,
  TOP_DOWN_CAMERA_VISIBLE_HEIGHT,
} from '@/game-v2/config/Mvp0Config';

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be positive and finite`);
  }
};

const assertFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

export class OrthographicCameraController {
  public readonly camera: OrthographicCamera;

  private readonly verticalSpan: number;
  private currentVisibleWidth: number;

  public constructor(visibleHeight = TOP_DOWN_CAMERA_VISIBLE_HEIGHT) {
    assertPositiveFinite(visibleHeight, 'visible height');

    const halfHeight = visibleHeight / 2;
    this.verticalSpan = visibleHeight;
    this.currentVisibleWidth = visibleHeight;
    this.camera = new OrthographicCamera(
      -halfHeight,
      halfHeight,
      halfHeight,
      -halfHeight,
      TOP_DOWN_CAMERA_NEAR,
      TOP_DOWN_CAMERA_FAR
    );
    this.camera.position.set(0, TOP_DOWN_CAMERA_HEIGHT, 0);
    this.camera.up.set(
      TOP_DOWN_CAMERA_UP_X,
      TOP_DOWN_CAMERA_UP_Y,
      TOP_DOWN_CAMERA_UP_Z
    );
    this.camera.lookAt(0, 0, 0);
  }

  public get visibleWidth(): number {
    return this.currentVisibleWidth;
  }

  public get visibleHeight(): number {
    return this.verticalSpan;
  }

  public resize(viewportWidth: number, viewportHeight: number): void {
    assertPositiveFinite(viewportWidth, 'viewport width');
    assertPositiveFinite(viewportHeight, 'viewport height');

    const visibleWidth = (this.verticalSpan * viewportWidth) / viewportHeight;
    const halfWidth = visibleWidth / 2;
    const halfHeight = this.verticalSpan / 2;
    this.currentVisibleWidth = visibleWidth;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  public follow(playerX: number, playerZ: number): void {
    assertFinite(playerX, 'player X');
    assertFinite(playerZ, 'player Z');

    this.camera.position.x = playerX;
    this.camera.position.z = playerZ;
  }
}
