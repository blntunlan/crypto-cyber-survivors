import { describe, expect, it } from 'vitest';

import { PLAYER_MOVE_SPEED, SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { MOVE_SPEED_PASSIVE } from '@/game-v2/config/PassiveRegistry';
import {
  PASSIVE_MAX_LEVEL,
  PASSIVE_MOVE_SPEED_BY_LEVEL,
} from '@/game-v2/contracts/PassiveSlot';
import { MovementSystem } from '@/game-v2/systems/MovementSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Player |
  ComponentMask.PassiveLoadout;

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
  dashRemainingSeconds: [...world.dashRemainingSeconds],
  movementOverride: [...world.movementOverride],
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

describe('MovementSystem passive speed', () => {
  it('walks at the base speed with no passive held', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    expect(movement.moveSpeedOf(world, player)).toBe(PLAYER_MOVE_SPEED);
    expect(movement.moveSpeedLevelOf(world, player)).toBe(0);
    expect(movement.moveSpeedUpgradable(world, player)).toBe(true);

    movement.step(world, player, {
      tick: 0,
      deltaSeconds: 1,
      intent: { moveX: 1, moveY: 0, dashPressed: false },
    });

    expect(world.x[slot]).toBeCloseTo(PLAYER_MOVE_SPEED, 6);
  });

  it('walks at the authored speed of every move-speed level', () => {
    const passives = new PassiveLoadoutSystem();

    for (let level = 1; level <= PASSIVE_MAX_LEVEL; level += 1) {
      const { world, player, slot } = createPlayer();
      const movement = new MovementSystem(passives);

      for (let step = 0; step < level; step += 1) {
        passives.addOrLevelUp(world, player, MOVE_SPEED_PASSIVE.id);
      }

      const authored = PASSIVE_MOVE_SPEED_BY_LEVEL[level] as number;

      expect(movement.moveSpeedOf(world, player)).toBe(authored);
      expect(movement.moveSpeedLevelOf(world, player)).toBe(level);
      expect(movement.moveSpeedUpgradable(world, player)).toBe(
        level < PASSIVE_MAX_LEVEL
      );

      movement.step(world, player, {
        tick: 0,
        deltaSeconds: 1,
        intent: { moveX: 1, moveY: 0, dashPressed: false },
      });

      expect(world.x[slot]).toBeCloseTo(authored, 6);
      expect(world.velocityX[slot]).toBeCloseTo(authored, 6);
    }
  });

  it('refuses to move at a level no authored speed exists for', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)] =
      MOVE_SPEED_PASSIVE.code;
    world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)] = PASSIVE_MAX_LEVEL + 1;

    expect(() => movement.moveSpeedOf(world, player)).toThrow(
      'passive move-speed level has no authored speed'
    );
  });

  it('rejects a player entity without the passive component', () => {
    const world = new World(4);
    const player = world.createEntity(
      ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Player
    );
    const movement = new MovementSystem();

    expect(() => movement.moveSpeedOf(world, player)).toThrow(
      'entity does not own a passive loadout'
    );
    expect(() =>
      movement.step(world, player, {
        tick: 0,
        deltaSeconds: 1 / SIMULATION_HZ,
        intent: { moveX: 1, moveY: 0, dashPressed: false },
      })
    ).toThrow('player entity is missing required components');
  });
});

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

  it('preserves sub-unit cardinal strength while facing the unit direction', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 31,
      deltaSeconds: 0.5,
      intent: intent(0.5, 0),
    });

    expect(world.velocityX[slot]).toBe(3);
    expect(world.velocityY[slot]).toBe(0);
    expect(world.x[slot]).toBe(1.5);
    expect(world.y[slot]).toBe(0);
    expect(world.lastFacingX[slot]).toBe(1);
    expect(world.lastFacingY[slot]).toBe(0);
  });

  it('preserves a sub-unit vector while normalizing its facing separately', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();

    movement.step(world, player, {
      tick: 32,
      deltaSeconds: 1,
      intent: intent(0.3, 0.4),
    });

    expect(world.velocityX[slot]).toBeCloseTo(1.8);
    expect(world.velocityY[slot]).toBeCloseTo(2.4);
    expect(world.x[slot]).toBeCloseTo(1.8);
    expect(world.y[slot]).toBeCloseTo(2.4);
    expect(world.lastFacingX[slot]).toBeCloseTo(0.6);
    expect(world.lastFacingY[slot]).toBeCloseTo(0.8);
  });

  it('clamps huge finite axes to finite unit velocity and facing', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.x[slot] = 2;
    world.y[slot] = -5;

    movement.step(world, player, {
      tick: 33,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(Number.MAX_VALUE, -Number.MAX_VALUE),
    });

    expect(world.previousX[slot]).toBe(2);
    expect(world.previousY[slot]).toBe(-5);
    expect(world.velocityX[slot]).toBeCloseTo(4.242640687119286);
    expect(world.velocityY[slot]).toBeCloseTo(-4.242640687119286);
    expect(world.lastFacingX[slot]).toBeCloseTo(0.7071067811865476);
    expect(world.lastFacingY[slot]).toBeCloseTo(-0.7071067811865476);
    expect(Number.isFinite(world.x[slot])).toBe(true);
    expect(Number.isFinite(world.y[slot])).toBe(true);
    expect(Number.isFinite(world.velocityX[slot])).toBe(true);
    expect(Number.isFinite(world.velocityY[slot])).toBe(true);
    expect(
      Math.hypot(world.velocityX[slot] ?? 0, world.velocityY[slot] ?? 0)
    ).toBeCloseTo(PLAYER_MOVE_SPEED);
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

  it('integrates only dash velocity during movement override and preserves facing', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.x[slot] = 5;
    world.y[slot] = -2;
    world.previousX[slot] = 100;
    world.previousY[slot] = 200;
    world.velocityX[slot] = 12;
    world.velocityY[slot] = -4;
    world.lastFacingX[slot] = 1;
    world.lastFacingY[slot] = 0;
    world.dashRemainingSeconds[slot] = 0.18;
    world.movementOverride[slot] = 1;

    movement.step(world, player, {
      tick: 40,
      deltaSeconds: 0.05,
      intent: intent(-1, 1),
    });

    expect(world.previousX[slot]).toBe(5);
    expect(world.previousY[slot]).toBe(-2);
    expect(world.x[slot]).toBeCloseTo(5.6);
    expect(world.y[slot]).toBeCloseTo(-2.2);
    expect(world.dashRemainingSeconds[slot]).toBeCloseTo(0.13);
    expect(world.movementOverride[slot]).toBe(1);
    expect(world.velocityX[slot]).toBe(12);
    expect(world.velocityY[slot]).toBe(-4);
    expect(world.lastFacingX[slot]).toBe(1);
    expect(world.lastFacingY[slot]).toBe(0);
  });

  it('uses only the final partial dash time and discards ordinary movement leftover', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    world.x[slot] = 2;
    world.y[slot] = 3;
    world.velocityX[slot] = 16;
    world.velocityY[slot] = 0;
    world.lastFacingX[slot] = 1;
    world.dashRemainingSeconds[slot] = 0.005;
    world.movementOverride[slot] = 1;

    movement.step(world, player, {
      tick: 41,
      deltaSeconds: 1 / SIMULATION_HZ,
      intent: intent(-1, 0),
    });

    expect(world.previousX[slot]).toBe(2);
    expect(world.previousY[slot]).toBe(3);
    expect(world.x[slot]).toBeCloseTo(2.08);
    expect(world.y[slot]).toBe(3);
    expect(world.dashRemainingSeconds[slot]).toBe(0);
    expect(world.movementOverride[slot]).toBe(0);
    expect(world.velocityX[slot]).toBe(0);
    expect(world.velocityY[slot]).toBe(0);
    expect(world.lastFacingX[slot]).toBe(1);
    expect(world.lastFacingY[slot]).toBe(0);
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

  it('rejects a non-boolean dash edge atomically through the shared context boundary', () => {
    const { world, player, slot } = createPlayer();
    const movement = new MovementSystem();
    seedMovementState(world, slot);
    const before = movementState(world);

    expect(() =>
      movement.step(world, player, {
        tick: 1,
        deltaSeconds: 1 / SIMULATION_HZ,
        intent: { moveX: 1, moveY: 0, dashPressed: 1 } as unknown as PlayerIntent,
      })
    ).toThrow(/dash|boolean/i);
    expect(movementState(world)).toEqual(before);
  });

  it.each([
    ['current x', (world: World, slot: number) => (world.x[slot] = Number.NaN)],
    [
      'dash velocity',
      (world: World, slot: number) => (world.velocityX[slot] = Infinity),
    ],
    [
      'dash remaining',
      (world: World, slot: number) => (world.dashRemainingSeconds[slot] = Number.NaN),
    ],
  ])(
    'rejects malformed %s during override without partial mutation',
    (_name, forge) => {
      const { world, player, slot } = createPlayer();
      const movement = new MovementSystem();
      seedMovementState(world, slot);
      world.movementOverride[slot] = 1;
      forge(world, slot);
      const before = movementState(world);

      expect(() =>
        movement.step(world, player, {
          tick: 42,
          deltaSeconds: 1 / SIMULATION_HZ,
          intent: intent(1, 0),
        })
      ).toThrow(/finite|dash|position|velocity/i);
      expect(movementState(world)).toEqual(before);
    }
  );
});
