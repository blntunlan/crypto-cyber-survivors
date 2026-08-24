import {
  LAST_ISSUABLE_ENTITY_GENERATION,
  RETIRED_ENTITY_GENERATION,
  type EntityId,
} from '@/game-v2/contracts/EntityId';
import { ABILITY_SLOT_COUNT, abilityStoreIndex } from '@/game-v2/contracts/AbilitySlot';
import {
  OFFER_CANDIDATE_COUNT,
  offerStoreIndex,
} from '@/game-v2/contracts/LevelUpOffer';
import { PASSIVE_SLOT_COUNT, passiveStoreIndex } from '@/game-v2/contracts/PassiveSlot';
import { ALL_COMPONENT_MASK } from '@/game-v2/world/ComponentMask';
import { MAX_WORLD_CAPACITY } from '@/game-v2/config/Mvp0Config';

const MAX_UINT32 = 0xffffffff;

const assertCapacity = (capacity: number): void => {
  if (
    !Number.isFinite(capacity) ||
    !Number.isInteger(capacity) ||
    capacity <= 0 ||
    capacity > MAX_WORLD_CAPACITY
  ) {
    throw new RangeError(
      `capacity must be a positive integer no greater than ${MAX_WORLD_CAPACITY}`
    );
  }
};

const assertComponentMask = (mask: number): void => {
  if (
    !Number.isSafeInteger(mask) ||
    mask <= 0 ||
    mask > MAX_UINT32 ||
    (mask & ~ALL_COMPONENT_MASK) !== 0
  ) {
    throw new RangeError('component mask must contain only known component bits');
  }
};

export class World {
  public readonly masks: Uint32Array;
  public readonly generations: Uint32Array;
  public readonly freeSlots: Uint16Array;
  public readonly x: Float32Array;
  public readonly y: Float32Array;
  public readonly previousX: Float32Array;
  public readonly previousY: Float32Array;
  public readonly velocityX: Float32Array;
  public readonly velocityY: Float32Array;
  public readonly radius: Float32Array;
  public readonly health: Float32Array;
  public readonly maxHealth: Float32Array;
  public readonly faction: Int8Array;
  public readonly lastFacingX: Float32Array;
  public readonly lastFacingY: Float32Array;
  public readonly dashDirectionX: Float32Array;
  public readonly dashDirectionY: Float32Array;
  public readonly dashRemainingSeconds: Float32Array;
  public readonly invulnerabilityTicksRemaining: Uint16Array;
  public readonly dashCooldownTicksRemaining: Uint16Array;
  public readonly dashCharges: Uint8Array;
  public readonly movementOverride: Uint8Array;
  public readonly enemySpeed: Float32Array;
  public readonly contactDamage: Float32Array;
  public readonly contactCooldownTicksRemaining: Uint16Array;
  public readonly xpValue: Float32Array;
  public readonly projectileDamage: Float32Array;
  public readonly lifetimeTicksRemaining: Uint16Array;
  /**
   * Telegraphed enemy attacks (`V2-300`). Every archetype writes into
   * these shared columns at spawn regardless of `behavior`
   * (`0`/`'none'` for the three untelegraphed archetypes), mirroring
   * `enemySpeed`/`contactDamage`'s own "no per-entity archetype store"
   * precedent (V2-ADR-069/V2-ADR-164). `enemyTelegraphBehavior`:
   * `0`=none, `1`=charger, `2`=bloater, `3`=sniper.
   * `enemyTelegraphPhase`: `0`=ready, `1`=telegraphing, `2`=active,
   * `3`=cooldown.
   */
  public readonly enemyTelegraphBehavior: Uint8Array;
  public readonly enemyTelegraphPhase: Uint8Array;
  public readonly enemyTelegraphTicksRemaining: Uint16Array;
  public readonly enemyTelegraphDurationTicks: Uint16Array;
  public readonly enemyTelegraphActiveDurationTicks: Uint16Array;
  public readonly enemyTelegraphCooldownTicks: Uint16Array;
  public readonly enemyTelegraphEffectDamage: Float32Array;
  public readonly enemyTelegraphEffectRadius: Float32Array;
  public readonly enemyTelegraphEffectRange: Float32Array;
  public readonly enemyTelegraphDashSpeed: Float32Array;
  /**
   * The sniper's aim direction (normalized), locked at the instant its
   * telegraph begins rather than recomputed at resolution — the player
   * gets the full telegraph window to move off this line before it
   * resolves. Unused (`0`) for every other behavior.
   */
  public readonly enemyTelegraphAimX: Float32Array;
  public readonly enemyTelegraphAimY: Float32Array;
  /**
   * `ABILITY_SLOT_COUNT` entries per world slot, addressed through
   * `abilitySlotIndexOf` (V2-111, V2-ADR-076). A cooldown belongs to the
   * weapon occupying an ability slot, so every occupied `auto` slot advances
   * its own cadence independently.
   */
  public readonly weaponCooldownTicksRemaining: Uint16Array;
  public readonly xp: Float32Array;
  public readonly level: Uint16Array;
  public readonly xpPickupValue: Float32Array;
  /**
   * Market-independent Convergence (`V2-109`, V2-ADR-073): accumulated
   * XP-equivalent kill points and the latched "reached" edge flag (`0` or
   * `1`). Lives directly on the player's `World` row with no separate
   * component gate, mirroring `xp`/`level`.
   */
  public readonly convergence: Float32Array;
  public readonly convergenceReached: Uint8Array;
  /**
   * Ability loadout state, `ABILITY_SLOT_COUNT` entries per world slot
   * (V2-ADR-036). Address them only through `abilitySlotIndexOf`; an empty slot
   * stores identity code `0` and tier `0`.
   */
  public readonly abilitySlotIdentity: Uint8Array;
  public readonly abilitySlotTier: Uint8Array;
  /**
   * Passive loadout state, `PASSIVE_SLOT_COUNT` entries per world slot
   * (V2-ADR-040). Address them only through `passiveSlotIndexOf`; an empty slot
   * stores identity code `0` and level `0`.
   */
  public readonly passiveSlotIdentity: Uint8Array;
  public readonly passiveSlotLevel: Uint8Array;
  /**
   * The current level-up offer, `OFFER_CANDIDATE_COUNT` entries per world
   * slot (V2-ADR-049). Address them only through `offerSlotIndexOf`; an
   * empty candidate stores kind `0` and code `0`.
   */
  public readonly offerCandidateKind: Uint8Array;
  public readonly offerCandidateCode: Uint8Array;
  /** The RNG-seeded default candidate index, one byte per world slot. */
  public readonly offerDefaultIndex: Uint8Array;
  /**
   * Per-run reroll/banish charges, one byte per world slot, `0` or `1`
   * (V2-ADR-056). Gated by the existing `LevelUpOffer` component bit rather
   * than a new one; a spent charge stays spent for the rest of the run even
   * after the offer that consumed it resolves and clears.
   */
  public readonly rerollCharges: Uint8Array;
  public readonly banishCharges: Uint8Array;
  /**
   * The single banished identity for this run, if any (V2-ADR-058). One slot
   * per world slot is enough because only one banish is ever possible per
   * run. `kind` is `0` (empty) until a banish is spent.
   */
  public readonly bannedCandidateKind: Uint8Array;
  public readonly bannedCandidateCode: Uint8Array;

  private readonly capacity: number;
  private freeSlotsInUse: number;
  private entitiesInUse = 0;

  public constructor(capacity: number) {
    assertCapacity(capacity);
    this.capacity = capacity;
    this.masks = new Uint32Array(capacity);
    this.generations = new Uint32Array(capacity);
    this.freeSlots = new Uint16Array(capacity);
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.previousX = new Float32Array(capacity);
    this.previousY = new Float32Array(capacity);
    this.velocityX = new Float32Array(capacity);
    this.velocityY = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.health = new Float32Array(capacity);
    this.maxHealth = new Float32Array(capacity);
    this.faction = new Int8Array(capacity);
    this.lastFacingX = new Float32Array(capacity);
    this.lastFacingY = new Float32Array(capacity);
    this.dashDirectionX = new Float32Array(capacity);
    this.dashDirectionY = new Float32Array(capacity);
    this.dashRemainingSeconds = new Float32Array(capacity);
    this.invulnerabilityTicksRemaining = new Uint16Array(capacity);
    this.dashCooldownTicksRemaining = new Uint16Array(capacity);
    this.dashCharges = new Uint8Array(capacity);
    this.movementOverride = new Uint8Array(capacity);
    this.enemySpeed = new Float32Array(capacity);
    this.contactDamage = new Float32Array(capacity);
    this.contactCooldownTicksRemaining = new Uint16Array(capacity);
    this.xpValue = new Float32Array(capacity);
    this.projectileDamage = new Float32Array(capacity);
    this.lifetimeTicksRemaining = new Uint16Array(capacity);
    this.enemyTelegraphBehavior = new Uint8Array(capacity);
    this.enemyTelegraphPhase = new Uint8Array(capacity);
    this.enemyTelegraphTicksRemaining = new Uint16Array(capacity);
    this.enemyTelegraphDurationTicks = new Uint16Array(capacity);
    this.enemyTelegraphActiveDurationTicks = new Uint16Array(capacity);
    this.enemyTelegraphCooldownTicks = new Uint16Array(capacity);
    this.enemyTelegraphEffectDamage = new Float32Array(capacity);
    this.enemyTelegraphEffectRadius = new Float32Array(capacity);
    this.enemyTelegraphEffectRange = new Float32Array(capacity);
    this.enemyTelegraphDashSpeed = new Float32Array(capacity);
    this.enemyTelegraphAimX = new Float32Array(capacity);
    this.enemyTelegraphAimY = new Float32Array(capacity);
    this.weaponCooldownTicksRemaining = new Uint16Array(capacity * ABILITY_SLOT_COUNT);
    this.xp = new Float32Array(capacity);
    this.level = new Uint16Array(capacity);
    this.xpPickupValue = new Float32Array(capacity);
    this.convergence = new Float32Array(capacity);
    this.convergenceReached = new Uint8Array(capacity);
    this.abilitySlotIdentity = new Uint8Array(capacity * ABILITY_SLOT_COUNT);
    this.abilitySlotTier = new Uint8Array(capacity * ABILITY_SLOT_COUNT);
    this.passiveSlotIdentity = new Uint8Array(capacity * PASSIVE_SLOT_COUNT);
    this.passiveSlotLevel = new Uint8Array(capacity * PASSIVE_SLOT_COUNT);
    this.offerCandidateKind = new Uint8Array(capacity * OFFER_CANDIDATE_COUNT);
    this.offerCandidateCode = new Uint8Array(capacity * OFFER_CANDIDATE_COUNT);
    this.offerDefaultIndex = new Uint8Array(capacity);
    this.rerollCharges = new Uint8Array(capacity);
    this.banishCharges = new Uint8Array(capacity);
    this.bannedCandidateKind = new Uint8Array(capacity);
    this.bannedCandidateCode = new Uint8Array(capacity);
    this.freeSlotsInUse = capacity;

    for (let slot = 0; slot < capacity; slot += 1) {
      this.freeSlots[slot] = capacity - slot - 1;
    }
  }

  public get activeCount(): number {
    return this.entitiesInUse;
  }

  public get freeSlotCount(): number {
    return this.freeSlotsInUse;
  }

  public createEntity(mask: number): EntityId {
    assertComponentMask(mask);

    if (this.freeSlotsInUse === 0) {
      throw new RangeError('entity capacity exhausted');
    }

    const nextFreeSlotCount = this.freeSlotsInUse - 1;
    const slot = this.freeSlots[nextFreeSlotCount];

    if (slot === undefined) {
      throw new Error('free slot stack is corrupt');
    }

    const generation = this.generations[slot];

    if (generation === undefined) {
      throw new Error('entity generation storage is corrupt');
    }

    if (generation > LAST_ISSUABLE_ENTITY_GENERATION) {
      throw new Error('retired slot cannot be allocated');
    }

    this.freeSlotsInUse = nextFreeSlotCount;
    this.entitiesInUse += 1;
    this.masks[slot] = mask;

    return this.entityIdOf(slot);
  }

  /**
   * Encodes a store slot into this world's canonical entity handle.
   *
   * This method is the single owner of the `generation * capacity + slot`
   * handle encoding. `createEntity` returns through it, and no consumer may
   * re-derive the rule from a component-store length; `capacity` stays private
   * so this contract cannot be bypassed.
   *
   * Rules for invalid input:
   * - A `slot` that is not an integer inside `[0, capacity)` throws
   *   `RangeError`. Non-finite and fractional slots fail the same check.
   * - A slot whose generation is `RETIRED_ENTITY_GENERATION` throws
   *   `RangeError`. A retired slot can never be allocated again, so it owns no
   *   issuable handle; returning the sentinel-encoded number would hand the
   *   caller a value that only looks like an entity.
   *
   * A currently-free but still reusable slot does encode: the returned id
   * carries that slot's live generation, and because the slot's mask is zero
   * `isAlive` reports it as dead, so it can never be mistaken for a live
   * entity.
   *
   * The method allocates nothing on the success path and is safe to call from
   * per-tick system loops.
   */
  public entityIdOf(slot: number): EntityId {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      throw new RangeError('slot must be an integer inside the world capacity');
    }

    const generation = this.generations[slot];

    if (generation === undefined) {
      throw new Error('entity generation storage is corrupt');
    }

    if (generation === RETIRED_ENTITY_GENERATION) {
      throw new RangeError('retired slot has no entity handle');
    }

    return generation * this.capacity + slot;
  }

  /**
   * Encodes one ability slot of one world slot into its store index.
   *
   * This method is the single owner of the `slot * ABILITY_SLOT_COUNT + index`
   * stride (V2-ADR-036), for the same reason `entityIdOf` owns the handle
   * encoding: a consumer re-deriving the rule from a store length would read or
   * write another entity's loadout the moment either layout changed.
   */
  public abilitySlotIndexOf(slot: number, abilityIndex: number): number {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      throw new RangeError('slot must be an integer inside the world capacity');
    }

    if (
      !Number.isInteger(abilityIndex) ||
      abilityIndex < 0 ||
      abilityIndex >= ABILITY_SLOT_COUNT
    ) {
      throw new RangeError('ability slot index must be an integer inside the loadout');
    }

    return abilityStoreIndex(slot, abilityIndex);
  }

  /**
   * Encodes one passive slot of one world slot into its store index, mirroring
   * `abilitySlotIndexOf` (V2-ADR-040).
   */
  public passiveSlotIndexOf(slot: number, passiveIndex: number): number {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      throw new RangeError('slot must be an integer inside the world capacity');
    }

    if (
      !Number.isInteger(passiveIndex) ||
      passiveIndex < 0 ||
      passiveIndex >= PASSIVE_SLOT_COUNT
    ) {
      throw new RangeError('passive slot index must be an integer inside the loadout');
    }

    return passiveStoreIndex(slot, passiveIndex);
  }

  /**
   * Encodes one offer candidate slot of one world slot into its store index,
   * mirroring `abilitySlotIndexOf`/`passiveSlotIndexOf` (V2-ADR-049).
   */
  public offerSlotIndexOf(slot: number, candidateIndex: number): number {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      throw new RangeError('slot must be an integer inside the world capacity');
    }

    if (
      !Number.isInteger(candidateIndex) ||
      candidateIndex < 0 ||
      candidateIndex >= OFFER_CANDIDATE_COUNT
    ) {
      throw new RangeError('offer candidate index must be an integer inside the offer');
    }

    return offerStoreIndex(slot, candidateIndex);
  }

  public destroyEntity(entity: EntityId): void {
    const slot = this.slotOf(entity);
    const generation = this.generations[slot];

    if (generation === undefined) {
      throw new Error('entity generation storage is corrupt');
    }

    this.clearSlot(slot);
    this.entitiesInUse -= 1;

    if (generation < LAST_ISSUABLE_ENTITY_GENERATION) {
      this.generations[slot] = generation + 1;
      this.freeSlots[this.freeSlotsInUse] = slot;
      this.freeSlotsInUse += 1;
    } else {
      this.generations[slot] = RETIRED_ENTITY_GENERATION;
    }
  }

  public isAlive(entity: EntityId): boolean {
    if (!Number.isSafeInteger(entity) || entity < 0) {
      return false;
    }

    const slot = entity % this.capacity;

    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity) {
      return false;
    }

    const generation = Math.floor(entity / this.capacity);
    const storedGeneration = this.generations[slot];
    const mask = this.masks[slot];

    return (
      storedGeneration !== undefined &&
      mask !== undefined &&
      mask !== 0 &&
      storedGeneration === generation
    );
  }

  public slotOf(entity: EntityId): number {
    if (!this.isAlive(entity)) {
      throw new RangeError('stale entity');
    }

    return entity % this.capacity;
  }

  public hasComponents(entity: EntityId, requiredMask: number): boolean {
    assertComponentMask(requiredMask);
    const slot = this.slotOf(entity);
    const mask = this.masks[slot];

    if (mask === undefined) {
      throw new Error('entity component storage is corrupt');
    }

    return (mask & requiredMask) === requiredMask;
  }

  public reset(): void {
    let nextFreeSlotCount = 0;

    for (let slot = 0; slot < this.capacity; slot += 1) {
      const mask = this.masks[slot];
      const wasAlive = mask !== undefined && mask !== 0;
      this.clearSlot(slot);
      const generation = this.generations[slot];

      if (generation === undefined) {
        throw new Error('entity generation storage is corrupt');
      }

      if (wasAlive) {
        this.generations[slot] =
          generation < LAST_ISSUABLE_ENTITY_GENERATION
            ? generation + 1
            : RETIRED_ENTITY_GENERATION;
      }
    }

    for (let slot = this.capacity - 1; slot >= 0; slot -= 1) {
      const generation = this.generations[slot];

      if (generation === undefined) {
        throw new Error('entity generation storage is corrupt');
      }

      if (generation < RETIRED_ENTITY_GENERATION) {
        this.freeSlots[nextFreeSlotCount] = slot;
        nextFreeSlotCount += 1;
      }
    }

    this.entitiesInUse = 0;
    this.freeSlotsInUse = nextFreeSlotCount;
  }

  private clearSlot(slot: number): void {
    this.masks[slot] = 0;
    this.x[slot] = 0;
    this.y[slot] = 0;
    this.previousX[slot] = 0;
    this.previousY[slot] = 0;
    this.velocityX[slot] = 0;
    this.velocityY[slot] = 0;
    this.radius[slot] = 0;
    this.health[slot] = 0;
    this.maxHealth[slot] = 0;
    this.faction[slot] = 0;
    this.lastFacingX[slot] = 0;
    this.lastFacingY[slot] = 0;
    this.dashDirectionX[slot] = 0;
    this.dashDirectionY[slot] = 0;
    this.dashRemainingSeconds[slot] = 0;
    this.invulnerabilityTicksRemaining[slot] = 0;
    this.dashCooldownTicksRemaining[slot] = 0;
    this.dashCharges[slot] = 0;
    this.movementOverride[slot] = 0;
    this.enemySpeed[slot] = 0;
    this.contactDamage[slot] = 0;
    this.contactCooldownTicksRemaining[slot] = 0;
    this.xpValue[slot] = 0;
    this.projectileDamage[slot] = 0;
    this.lifetimeTicksRemaining[slot] = 0;
    this.enemyTelegraphBehavior[slot] = 0;
    this.enemyTelegraphPhase[slot] = 0;
    this.enemyTelegraphTicksRemaining[slot] = 0;
    this.enemyTelegraphDurationTicks[slot] = 0;
    this.enemyTelegraphActiveDurationTicks[slot] = 0;
    this.enemyTelegraphCooldownTicks[slot] = 0;
    this.enemyTelegraphEffectDamage[slot] = 0;
    this.enemyTelegraphEffectRadius[slot] = 0;
    this.enemyTelegraphEffectRange[slot] = 0;
    this.enemyTelegraphDashSpeed[slot] = 0;
    this.enemyTelegraphAimX[slot] = 0;
    this.enemyTelegraphAimY[slot] = 0;
    this.xp[slot] = 0;
    this.level[slot] = 0;
    this.xpPickupValue[slot] = 0;
    this.convergence[slot] = 0;
    this.convergenceReached[slot] = 0;

    const abilityBase = abilityStoreIndex(slot, 0);
    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      this.abilitySlotIdentity[abilityBase + index] = 0;
      this.abilitySlotTier[abilityBase + index] = 0;
      this.weaponCooldownTicksRemaining[abilityBase + index] = 0;
    }

    const passiveBase = passiveStoreIndex(slot, 0);
    for (let index = 0; index < PASSIVE_SLOT_COUNT; index += 1) {
      this.passiveSlotIdentity[passiveBase + index] = 0;
      this.passiveSlotLevel[passiveBase + index] = 0;
    }

    const offerBase = offerStoreIndex(slot, 0);
    for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
      this.offerCandidateKind[offerBase + index] = 0;
      this.offerCandidateCode[offerBase + index] = 0;
    }
    this.offerDefaultIndex[slot] = 0;
    this.rerollCharges[slot] = 0;
    this.banishCharges[slot] = 0;
    this.bannedCandidateKind[slot] = 0;
    this.bannedCandidateCode[slot] = 0;
  }
}
