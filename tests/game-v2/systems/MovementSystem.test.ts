import { describe, expect, it } from 'vitest';

import { PLAYER_MOVE_SPEED, SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Player;

const createPlayer = (): { world: World; player: number; slot: number } => {
  const world = new World(4);
  const player = world.createEntity(PLAYER_MASK);
  return { world, player, slot: world.slotOf(player) };
};

const intent = (moveX: number, moveY: number, dashPressed = false): PlayerIntent => ({
  moveX,
  moveY,
  dashPressed,
});

const movementState = (world: World): unknown => ({
  masks: [...world.masks],
  generations: [...world.generations],
  x: [...world.x],
  y: [...world.y],
  previousX: [...world.previousX],
  previousY: [...world.previousY],
  velocityX: [...world.velocityX],
  velocityY: [...world.velocityY],
  lastFacingX: [...world.lastFacingX],
  lastFacingY: [...world.lastFacingY],
});

const seedMovementState = (world: World, slot: number): void => {
  world.x[slot] = 12;
  world.y[slot] = -8;
  world.previousX[slot] = 4;
  world.previousY[slot] = -3;
  world.velocityX[slot] = 2;
  world.velocityY[slot] = -1;
  world.lastFacingX[slot] = 0.6;
  world.lastFacingY[slot] = -0.8;
};

describe('MovementSystem', () => {
  it('moves one fixed tick at exactly six world units per second', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 1,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(1, 0),
    });

    expect(world.x[slot]).toBeCloseTo(0.1);
    expect(world.y[slot]).toBe(0);
    expect(world.previousX[slot]).toBe(0);
    expect(world.previousY[slot]).toBe(0);
    expect(world.velocityX[slot]).toBe(6);
    expect(world.velocityY[slot]).toBe(0);
  });

  it('normalizes diagonal input before writing velocity and displacement', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 2,
      deltaSeconds: 0.5,
      intent: intent(1, -1),
    });

    expect(world.velocityX[slot]).toBeCloseTo(4.242640687119286);
    expect(world.velocityY[slot]).toBeCloseTo(-4.242640687119286);
    expect(world.x[slot]).toBeCloseTo(2.121320343559643);
    expect(world.y[slot]).toBeCloseTo(-2.121320343559643);
    expect(
      Math.hypot(world.velocityX[slot] ?? 0, world.velocityY[slot] ?? 0)
    ).toBeCloseTo(PLAYER_MOVE_SPEED);
  });

  it('defensively clamps caller input whose magnitude exceeds one', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 3,
      deltaSeconds: 1,
      intent: intent(3, 4),
    });

    expect(world.velocityX[slot]).toBeCloseTo(3.6);
    expect(world.velocityY[slot]).toBeCloseTo(4.8);
    expect(world.x[slot]).toBeCloseTo(3.6);
    expect(world.y[slot]).toBeCloseTo(4.8);
  });

  it('captures the current position before integrating the new position', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.x[slot] = 7;
    world.y[slot] = -3;
    world.previousX[slot] = 100;
    world.previousY[slot] = 200;

    movement.step(world, player, {
      tick: 4,
      deltaSeconds: 0.25,
      intent: intent(-1, 0),
    });

    expect(world.previousX[slot]).toBe(7);
    expect(world.previousY[slot]).toBe(-3);
    expect(world.x[slot]).toBeCloseTo(5.5);
    expect(world.y[slot]).toBe(-3);
  });

  it('writes zero velocity and produces no drift for zero intent even with dash pressed', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.x[slot] = -2;
    world.y[slot] = 9;
    world.velocityX[slot] = 5;
    world.velocityY[slot] = -4;

    movement.step(world, player, {
      tick: 5,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(0, 0, true),
    });

    expect(world.x[slot]).toBe(-2);
    expect(world.y[slot]).toBe(9);
    expect(world.previousX[slot]).toBe(-2);
    expect(world.previousY[slot]).toBe(9);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
  });

  it('updates facing from normalized movement and preserves it while idle', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 6,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(-1, 1),
    });
    expect(world.lastFacingX[slot]).toBeCloseTo(-0.7071067811865476);
    expect(world.lastFacingY[slot]).toBeCloseTo(0.7071067811865476);

    movement.step(world, player, {
      tick: 7,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(0, 0),
    });
    expect(world.lastFacingX[slot]).toBeCloseTo(-0.7071067811865476);
    expect(world.lastFacingY[slot]).toBeCloseTo(0.7071067811865476);
  });

  it('moves approximately six world units over sixty fixed ticks', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    const playerIntent = intent(1, 0);

    for (let tick = 0; tick < SIMULATION_HZ; tick += 1) {
      movement.step(world, player, {
        tick,
        deltaSeconds: 1 / SIMULATION_HZ,
        intent: playerIntent,
      });
    }

    expect(world.x[slot]).toBeCloseTo(6, 4);
    expect(world.y[slot]).toBe(0);
    expect(world.previousX[slot]).toBeCloseTo(5.9, 4);
  });

  it('rejects stale handles without mutating movement-observable stores', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.destroyEntity(player);
    seedMovementState(world, slot);
    const before = movementState(world);

    expect(() =>
      movement.step(world, player, {
        tick: 1,
        deltaSeconds: 1 / SIMULATION_HZ,
        intent: intent(1, 0),
      })
    ).toThrow(/stale/i);
    expect(movementState(world)).toEqual(before);
  });

  it('rejects a live entity missing any required component without mutation', () => {
    const masks = [
      ComponentMask.Transform | ComponentMask.Velocity,
      ComponentMask.Transform | ComponentMask.Player,
      ComponentMask.Velocity | ComponentMask.Player,
    ];

    for (const mask of masks) {
      const world = new World(4);
      const entity = world.createEntity(mask);
      const slot = world.slotOf(entity);
      const movement = new MovementSystem();
      seedMovementState(world, slot);
      const before = movementState(world);

      expect(() =>
        movement.step(world, entity, {
          tick: 1,
          deltaSeconds: 1 / SIMULATION_HZ,
          intent: intent(1, 0),
        })
      ).toThrow(/component/i);
      expect(movementState(world)).toEqual(before);
    }
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid tick %s atomically',
    invalidTick => {
      const { world, player, slot } = createPlayer();
      const movement = new MovementSystem();
      seedMovementState(world, slot);
      const before = movementState(world);

      expect(() =>
        movement.step(world, player, {
          tick: invalidTick,
          deltaSeconds: 1 / SIMULATION_HZ,
          intent: intent(1, 0),
        })
      ).toThrow(/tick|integer|finite/i);
      expect(movementState(world)).toEqual(before);
    }
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid delta %s atomically',
    invalidDelta => {
      const { world, player, slot } = createPlayer();
      const movement = new MovementSystem();
      seedMovementState(world, slot);
      const before = movementState(world);

      expect(() =>
        movement.step(world, player, {
          tick: 1,
          deltaSeconds: invalidDelta,
          intent: intent(1, 0),
        })
      ).toThrow(/delta|positive|finite/i);
      expect(movementState(world)).toEqual(before);
    }
  );

  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [Number.NEGATIVE_INFINITY, 0],
    [0, Number.NaN],
    [0, Number.POSITIVE_INFINITY],
    [0, Number.NEGATIVE_INFINITY],
  ])('rejects non-finite intent (%s, %s) atomically', (moveX, moveY) => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    seedMovementState(world, slot);
    const before = movementState(world);

    expect(() =>
      movement.step(world, player, {
        tick: 1,
        deltaSeconds: 1 / SIMULATION_HZ,
        intent: intent(moveX, moveY),
      })
    ).toThrow(/intent|finite/i);
    expect(movementState(world)).toEqual(before);
  });
});
