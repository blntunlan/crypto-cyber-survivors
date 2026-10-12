import { describe, expect, it } from 'vitest';

import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import {
  levelXpThreshold,
  MVP1_MAX_PLAYER_LEVEL,
  MVP1_TOTAL_BUILD_PICKS,
} from '@/game-v2/config/LevelCurve';
import { MVP1_PASSIVE_REGISTRY } from '@/game-v2/config/PassiveRegistry';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { ABILITY_MAX_TIER, ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { PASSIVE_MAX_LEVEL, PASSIVE_SLOT_COUNT } from '@/game-v2/contracts/PassiveSlot';
import { CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { CombatSystem } from '@/game-v2/systems/CombatSystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

/**
 * `V2-112` acceptance evidence.
 *
 * Before this task `ProgressionSystem` granted exactly one level-up per run, so
 * design §5.1's four-slot cap, §5.2's three-tier path, and §5.3's five-level
 * passive path were reachable only through contract tests against injected
 * registries (V2-ADR-039), never through play. This drives the real
 * reset -> kill -> level-up -> upgrade chain until the build is capped.
 */

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Health |
  ComponentMask.Body |
  ComponentMask.Player |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;

const context = (tick: number): StepContext => ({
  tick,
  deltaSeconds: 1 / SIMULATION_HZ,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

/** A kill batch worth exactly `xp`, dropped on the player so it collects at once. */
const killWorth = (xp: number): CombatStepResult => {
  const one = (value: number): Float32Array => Float32Array.from([value]);

  return {
    killCount: 1,
    killX: one(0),
    killY: one(0),
    killXp: one(xp),
    playerDied: false,
  };
};

describe('a full build is reachable through play (V2-112)', () => {
  it('levels repeatedly until every offerable slot is capped, then stops', () => {
    const world = new World(64);
    const player = world.createEntity(PLAYER_MASK);
    const playerSlot = world.slotOf(player);
    const lifecycle = new GameV2Lifecycle();
    const commandRecorder = new CommandRecorder();

    const abilityLoadout = new AbilityLoadoutSystem();
    const passiveLoadout = new PassiveLoadoutSystem();
    const offerSystem = new LevelUpOfferSystem(abilityLoadout, passiveLoadout);
    const progression = new ProgressionSystem(
      lifecycle,
      commandRecorder,
      abilityLoadout,
      passiveLoadout,
      offerSystem
    );
    const combat = new CombatSystem();
    const weapons = new WeaponSystem(undefined, abilityLoadout);

    combat.resetPlayer(world, player);
    weapons.resetPlayer(world, player);
    progression.resetPlayer(world, player);
    lifecycle.start();

    expect(world.level[playerSlot]).toBe(1);

    let tick = 0;
    let cardsResolved = 0;

    // Each iteration feeds exactly the XP the current level costs, so the run
    // climbs one level per card — the V2-ADR-081 contract — rather than
    // skipping levels on an oversized batch.
    while (
      (world.level[playerSlot] ?? 0) < MVP1_MAX_PLAYER_LEVEL &&
      cardsResolved <= MVP1_TOTAL_BUILD_PICKS
    ) {
      const level = world.level[playerSlot] ?? 0;
      const result = progression.step(
        world,
        player,
        killWorth(levelXpThreshold(level)),
        context(tick),
        new DeterministicRng(1 + tick)
      );
      tick += 1;

      expect(result.leveledUp).toBe(true);
      expect(lifecycle.phase).toBe('level-up');

      const candidates = offerSystem.candidatesAt(world, player);
      const choice = candidates.findIndex(candidate => candidate !== null);
      expect(choice).toBeGreaterThanOrEqual(0);

      progression.resolveUpgrade(world, player, {
        tick,
        type: 'choose-upgrade',
        choiceIndex: choice as 0 | 1 | 2,
      });
      cardsResolved += 1;
      tick += 1;
    }

    // Every pick the registries can offer was taken, exactly once each.
    expect(cardsResolved).toBe(MVP1_TOTAL_BUILD_PICKS);
    expect(world.level[playerSlot]).toBe(MVP1_MAX_PLAYER_LEVEL);

    // Design §5.1 and §5.2: every ability slot the registry can fill is
    // occupied, and each is at its authored ceiling.
    const filledAbilitySlots = Math.min(ABILITY_SLOT_COUNT, MVP1_ABILITY_REGISTRY.size);
    expect(abilityLoadout.occupiedCount(world, player)).toBe(filledAbilitySlots);
    for (let index = 0; index < filledAbilitySlots; index += 1) {
      expect(
        abilityLoadout.identityAt(world, player, index as 0 | 1 | 2 | 3)
      ).not.toBeNull();
      expect(abilityLoadout.tierAt(world, player, index as 0 | 1 | 2 | 3)).toBe(
        ABILITY_MAX_TIER
      );
    }

    // Design §5.3: every passive slot the registry can fill is at max level.
    const filledPassiveSlots = Math.min(PASSIVE_SLOT_COUNT, MVP1_PASSIVE_REGISTRY.size);
    expect(filledPassiveSlots).toBeGreaterThan(0);
    for (let index = 0; index < filledPassiveSlots; index += 1) {
      expect(
        passiveLoadout.levelAt(world, player, index as 0 | 1 | 2 | 3 | 4 | 5)
      ).toBe(PASSIVE_MAX_LEVEL);
    }

    // A further kill neither levels nor opens an offer, and does not throw
    // `no offerable candidates exist` — the cap and pool exhaustion coincide
    // by construction (V2-ADR-080).
    const afterCap = progression.step(
      world,
      player,
      killWorth(9999),
      context(tick),
      new DeterministicRng(99)
    );

    expect(afterCap.leveledUp).toBe(false);
    expect(afterCap.offerPending).toBe(false);
    expect(lifecycle.phase).toBe('playing');
    expect(world.level[playerSlot]).toBe(MVP1_MAX_PLAYER_LEVEL);
  });
});
