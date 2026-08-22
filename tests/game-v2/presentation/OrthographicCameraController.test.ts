import { describe, expect, it, vi } from 'vitest';

import { Vector3 } from 'three';

import { OrthographicCameraController } from '@/game-v2/presentation/OrthographicCameraController';
import { sceneZOf } from '@/game-v2/presentation/WorldToScene';

const cameraState = (controller: OrthographicCameraController): unknown => {
  const { camera } = controller;
  return {
    visibleWidth: controller.visibleWidth,
    visibleHeight: controller.visibleHeight,
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
    near: camera.near,
    far: camera.far,
    position: camera.position.toArray(),
    rotation: camera.rotation.toArray(),
    quaternion: camera.quaternion.toArray(),
    up: camera.up.toArray(),
    projection: camera.projectionMatrix.toArray(),
  };
};

describe('screen orientation', () => {
  it('puts simulation +Y at the top of the screen and +X on the right', () => {
    const controller = new OrthographicCameraController();
    controller.resize(1280, 800);
    controller.camera.updateMatrixWorld(true);

    const above = new Vector3(0, 0, sceneZOf(5)).project(controller.camera);
    const right = new Vector3(5, 0, sceneZOf(0)).project(controller.camera);

    expect(above.y).toBeGreaterThan(0);
    expect(above.x).toBeCloseTo(0, 6);
    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBeCloseTo(0, 6);
  });

  it('follows the player without rotating the view', () => {
    const controller = new OrthographicCameraController();
    controller.resize(1280, 800);
    controller.follow(3, sceneZOf(4));
    controller.camera.updateMatrixWorld(true);

    const player = new Vector3(3, 0, sceneZOf(4)).project(controller.camera);
    const aboveThePlayer = new Vector3(3, 0, sceneZOf(6)).project(controller.camera);

    expect(player.x).toBeCloseTo(0, 6);
    expect(player.y).toBeCloseTo(0, 6);
    expect(aboveThePlayer.y).toBeGreaterThan(player.y);
  });
});

describe('OrthographicCameraController', () => {
  it.each([
    [1600, 900, 32],
    [4, 3, 24],
    [21, 9, 42],
  ] as const)(
    'keeps the 18-unit vertical span at %dx%d while deriving width %d',
    (viewportWidth, viewportHeight, expectedWidth) => {
      const controller = new OrthographicCameraController(18);
      const projectionBeforeResize = controller.camera.projectionMatrix.toArray();
      const updateProjectionMatrix = vi.spyOn(
        controller.camera,
        'updateProjectionMatrix'
      );

      controller.resize(viewportWidth, viewportHeight);

      expect(controller.visibleHeight).toBe(18);
      expect(controller.visibleWidth).toBe(expectedWidth);
      expect(controller.camera.left).toBe(-expectedWidth / 2);
      expect(controller.camera.right).toBe(expectedWidth / 2);
      expect(controller.camera.top).toBe(9);
      expect(controller.camera.bottom).toBe(-9);
      expect(updateProjectionMatrix).toHaveBeenCalledTimes(1);
      expect(controller.camera.projectionMatrix.toArray()).not.toEqual(
        projectionBeforeResize
      );
    }
  );

  it('starts at a centered fixed top-down combat orientation and preserves it', () => {
    const controller = new OrthographicCameraController(18);
    const initialQuaternion = controller.camera.quaternion.toArray();
    const initialRotation = controller.camera.rotation.toArray();
    const initialUp = controller.camera.up.toArray();

    expect(controller.visibleWidth).toBe(18);
    expect(controller.visibleHeight).toBe(18);
    expect(controller.camera.position.toArray()).toEqual([0, 40, 0]);
    expect(controller.camera.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(controller.camera.up.toArray()).toEqual([0, 0, -1]);
    expect(controller.camera.near).toBe(0.1);
    expect(controller.camera.far).toBe(200);

    controller.follow(-6, 11);
    controller.resize(1600, 900);
    controller.follow(9, -3);

    expect(controller.camera.position.toArray()).toEqual([9, 40, -3]);
    expect(controller.camera.rotation.toArray()).toEqual(initialRotation);
    expect(controller.camera.quaternion.toArray()).toEqual(initialQuaternion);
    expect(controller.camera.up.toArray()).toEqual(initialUp);
    expect(controller.camera.near).toBe(0.1);
    expect(controller.camera.far).toBe(200);
  });

  it('follows player X/Z directly without changing height or projection', () => {
    const controller = new OrthographicCameraController(18);
    controller.resize(1600, 900);
    const projectionBeforeFollow = controller.camera.projectionMatrix.toArray();

    controller.follow(12.5, -7.25);

    expect(controller.camera.position.toArray()).toEqual([12.5, 40, -7.25]);
    expect(controller.camera.projectionMatrix.toArray()).toEqual(
      projectionBeforeFollow
    );
  });

  it('accepts fractional positive CSS viewport dimensions', () => {
    const controller = new OrthographicCameraController(18);

    controller.resize(300.5, 200.25);

    expect(controller.visibleHeight).toBe(18);
    expect(controller.visibleWidth).toBeCloseTo(27.01123595505618);
    expect(controller.camera.left).toBeCloseTo(-13.50561797752809);
    expect(controller.camera.right).toBeCloseTo(13.50561797752809);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid visible height %s before publishing a controller',
    invalidHeight => {
      expect(() => new OrthographicCameraController(invalidHeight)).toThrow(
        /visible height|positive|finite/i
      );
    }
  );

  it.each([
    [0, 900],
    [1600, 0],
    [-1, 900],
    [1600, -1],
    [Number.NaN, 900],
    [1600, Number.NaN],
    [Number.POSITIVE_INFINITY, 900],
    [1600, Number.POSITIVE_INFINITY],
  ] as const)('rejects invalid resize %s x %s atomically', (width, height) => {
    const controller = new OrthographicCameraController(18);
    controller.resize(1600, 900);
    const before = cameraState(controller);

    expect(() => controller.resize(width, height)).toThrow(/viewport|positive|finite/i);
    expect(cameraState(controller)).toEqual(before);
  });

  it.each([
    [Number.NaN, 0],
    [0, Number.NaN],
    [Number.POSITIVE_INFINITY, 0],
    [0, Number.NEGATIVE_INFINITY],
  ] as const)('rejects invalid follow %s, %s atomically', (playerX, playerZ) => {
    const controller = new OrthographicCameraController(18);
    controller.resize(1600, 900);
    controller.follow(3, 4);
    const before = cameraState(controller);

    expect(() => controller.follow(playerX, playerZ)).toThrow(/player|finite/i);
    expect(cameraState(controller)).toEqual(before);
  });
});
