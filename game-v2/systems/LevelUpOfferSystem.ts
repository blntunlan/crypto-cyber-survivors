import {
  MVP1_ABILITY_REGISTRY,
  type AbilityRegistry,
} from '@/game-v2/config/AbilityRegistry';
import {
  MVP1_PASSIVE_REGISTRY,
  type PassiveRegistry,
} from '@/game-v2/config/PassiveRegistry';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  OFFER_CANDIDATE_COUNT,
  OFFER_KIND_ABILITY,
  OFFER_KIND_PASSIVE,
  isOfferCandidateIndex,
  type OfferCandidate,
  type OfferCandidateIndex,
} from '@/game-v2/contracts/LevelUpOffer';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { type AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { type PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const OFFER_MASK = ComponentMask.LevelUpOffer;

type PoolEntry =
  | Readonly<{ kind: typeof OFFER_KIND_ABILITY; code: number }>
  | Readonly<{ kind: typeof OFFER_KIND_PASSIVE; code: number }>;

/**
 * The single writer of the current level-up offer (V2-ADR-049).
 *
 * The system holds no per-run state: the offer lives in `World`, which
 * `RuntimeCheckpoint` already carries, so a checkpoint restore reproduces an
 * open offer exactly and `World.reset`/slot recycling clears it. Both
 * registries are injected values (V2-ADR-039) so tests can exercise a full
 * three-candidate offer before `V2-106`/`V2-107`/`V2-401` add real identities.
 */
export class LevelUpOfferSystem {
  private readonly abilityLoadout: AbilityLoadoutSystem;
  private readonly passiveLoadout: PassiveLoadoutSystem;
  private readonly abilityRegistry: AbilityRegistry;
  private readonly passiveRegistry: PassiveRegistry;

  public constructor(
    abilityLoadout: AbilityLoadoutSystem,
    passiveLoadout: PassiveLoadoutSystem,
    abilityRegistry: AbilityRegistry = MVP1_ABILITY_REGISTRY,
    passiveRegistry: PassiveRegistry = MVP1_PASSIVE_REGISTRY
  ) {
    this.abilityLoadout = abilityLoadout;
    this.passiveLoadout = passiveLoadout;
    this.abilityRegistry = abilityRegistry;
    this.passiveRegistry = passiveRegistry;
  }

  /**
   * Generates a new offer of up to `OFFER_CANDIDATE_COUNT` candidates and
   * picks the RNG-seeded default, all from one RNG draw sequence
   * (V2-ADR-050). Overwrites any offer already open.
   *
   * Throws if nothing is currently offerable — every registered identity is
   * either at its ceiling or has no free slot. Unreachable at MVP-1 balance
   * (one level-up, two fresh identities), kept as a loud failure rather than
   * a silently empty card for whenever real content makes it possible.
   */
  public generateOffer(world: World, rng: DeterministicRng, owner: EntityId): void {
    const base = this.baseIndex(world, owner);
    const pool = this.offerablePool(world, owner);

    if (pool.length === 0) {
      throw new RangeError('no offerable candidates exist');
    }

    // Fisher-Yates over the pool, then take the first OFFER_CANDIDATE_COUNT.
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = rng.nextInt(i + 1);
      const a = pool[i];
      const b = pool[j];
      if (a === undefined || b === undefined) {
        throw new Error('offer candidate pool is corrupt');
      }
      pool[i] = b;
      pool[j] = a;
    }

    const chosenCount = Math.min(pool.length, OFFER_CANDIDATE_COUNT);

    for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
      const entry = index < chosenCount ? pool[index] : undefined;
      world.offerCandidateKind[base + index] = entry?.kind ?? 0;
      world.offerCandidateCode[base + index] = entry?.code ?? 0;
    }

    world.offerDefaultIndex[world.slotOf(owner)] = rng.nextInt(chosenCount);
  }

  /** Length `OFFER_CANDIDATE_COUNT`; `null` at an empty candidate index. */
  public candidatesAt(
    world: World,
    owner: EntityId
  ): readonly (OfferCandidate | null)[] {
    const base = this.baseIndex(world, owner);
    const candidates: (OfferCandidate | null)[] = new Array(OFFER_CANDIDATE_COUNT);

    for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
      candidates[index] = this.readCandidate(world, base + index);
    }

    return candidates;
  }

  /** `null` only when the offer is entirely empty (no offer currently open). */
  public defaultIndexOf(world: World, owner: EntityId): OfferCandidateIndex | null {
    const candidates = this.candidatesAt(world, owner);
    const hasAny = candidates.some(candidate => candidate !== null);
    if (!hasAny) {
      return null;
    }

    const slot = world.slotOf(owner);
    const stored = world.offerDefaultIndex[slot] ?? 0;

    if (!isOfferCandidateIndex(stored) || candidates[stored] === null) {
      throw new RangeError('offer default index is outside the offer');
    }

    return stored;
  }

  /** Resolves and returns the candidate at `index`; throws if it is empty. */
  public resolveIndex(world: World, owner: EntityId, index: number): OfferCandidate {
    if (!isOfferCandidateIndex(index)) {
      throw new RangeError('offer candidate index must be an integer inside the offer');
    }

    const base = this.baseIndex(world, owner);
    const candidate = this.readCandidate(world, base + index);

    if (candidate === null) {
      throw new RangeError('offer candidate slot is empty');
    }

    return candidate;
  }

  public clearOwner(world: World, owner: EntityId): void {
    const base = this.baseIndex(world, owner);

    for (let index = 0; index < OFFER_CANDIDATE_COUNT; index += 1) {
      world.offerCandidateKind[base + index] = 0;
      world.offerCandidateCode[base + index] = 0;
    }
    world.offerDefaultIndex[world.slotOf(owner)] = 0;
  }

  /** `1` if `owner`'s single per-run reroll charge is unspent, else `0`. */
  public rerollChargesOf(world: World, owner: EntityId): 0 | 1 {
    const slot = world.slotOf(owner);
    return (world.rerollCharges[slot] ?? 0) === 0 ? 0 : 1;
  }

  /** `1` if `owner`'s single per-run banish charge is unspent, else `0`. */
  public banishChargesOf(world: World, owner: EntityId): 0 | 1 {
    const slot = world.slotOf(owner);
    return (world.banishCharges[slot] ?? 0) === 0 ? 0 : 1;
  }

  /**
   * Spends the reroll charge and regenerates the complete offer — all three
   * candidate slots and the default index — from a fresh RNG draw
   * (V2-ADR-057). The currently-shown candidates are not excluded from the
   * redraw; a candidate reappearing by chance is accepted, not deduplicated.
   *
   * Throws before any mutation if no offer is open or the charge is already
   * spent.
   */
  public reroll(world: World, rng: DeterministicRng, owner: EntityId): void {
    if (this.defaultIndexOf(world, owner) === null) {
      throw new RangeError('no level-up offer is open');
    }

    const slot = world.slotOf(owner);
    if ((world.rerollCharges[slot] ?? 0) === 0) {
      throw new RangeError('no reroll charge remains');
    }

    world.rerollCharges[slot] = 0;
    this.generateOffer(world, rng, owner);
  }

  /**
   * Spends the banish charge, permanently excludes `index`'s identity from
   * ever being offered again this run (V2-ADR-058), and replaces only that
   * slot with a fresh draw from the remaining offerable pool. The other two
   * candidates are untouched; the default index is redrawn from the
   * surviving occupied slots only if it pointed at the banished slot.
   *
   * A banish that empties its slot — nothing left to redraw — is legal, not
   * an error (V2-ADR-061).
   *
   * Throws before any mutation if no offer is open, the charge is already
   * spent, or `index` is out of range or already empty.
   */
  public banish(
    world: World,
    rng: DeterministicRng,
    owner: EntityId,
    index: number
  ): void {
    if (this.defaultIndexOf(world, owner) === null) {
      throw new RangeError('no level-up offer is open');
    }

    const slot = world.slotOf(owner);
    if ((world.banishCharges[slot] ?? 0) === 0) {
      throw new RangeError('no banish charge remains');
    }

    // Validates range and non-emptiness without mutating anything.
    const banished = this.resolveIndex(world, owner, index);
    const targetIndex = index as OfferCandidateIndex;
    const bannedKind =
      banished.kind === 'ability' ? OFFER_KIND_ABILITY : OFFER_KIND_PASSIVE;
    const bannedCode =
      banished.kind === 'ability'
        ? this.abilityRegistry.byId(banished.identity).code
        : this.passiveRegistry.byId(banished.identity).code;

    world.banishCharges[slot] = 0;
    world.bannedCandidateKind[slot] = bannedKind;
    world.bannedCandidateCode[slot] = bannedCode;

    const base = this.baseIndex(world, owner);
    const wasDefault = (world.offerDefaultIndex[slot] ?? 0) === targetIndex;
    const pool = this.offerablePool(world, owner);

    if (pool.length === 0) {
      world.offerCandidateKind[base + targetIndex] = 0;
      world.offerCandidateCode[base + targetIndex] = 0;
    } else {
      const drawn = pool[rng.nextInt(pool.length)];
      if (drawn === undefined) {
        throw new Error('offer candidate pool is corrupt');
      }
      world.offerCandidateKind[base + targetIndex] = drawn.kind;
      world.offerCandidateCode[base + targetIndex] = drawn.code;
    }

    if (wasDefault) {
      const occupied: OfferCandidateIndex[] = [];
      for (let i = 0; i < OFFER_CANDIDATE_COUNT; i += 1) {
        if ((world.offerCandidateKind[base + i] ?? 0) !== 0) {
          occupied.push(i as OfferCandidateIndex);
        }
      }

      world.offerDefaultIndex[slot] =
        occupied.length === 0 ? 0 : (occupied[rng.nextInt(occupied.length)] ?? 0);
    }
  }

  /** The offerable pool honoring `owner`'s single per-run ban (V2-ADR-058). */
  private offerablePool(world: World, owner: EntityId): PoolEntry[] {
    const slot = world.slotOf(owner);
    const bannedKind = world.bannedCandidateKind[slot] ?? 0;
    const bannedCode = world.bannedCandidateCode[slot] ?? 0;
    const pool: PoolEntry[] = [];

    for (const identity of this.abilityRegistry.ids) {
      if (this.abilityLoadout.isOfferable(world, owner, identity)) {
        const code = this.abilityRegistry.byId(identity).code;
        if (bannedKind === OFFER_KIND_ABILITY && bannedCode === code) {
          continue;
        }
        pool.push({ kind: OFFER_KIND_ABILITY, code });
      }
    }

    for (const identity of this.passiveRegistry.ids) {
      if (this.passiveLoadout.isOfferable(world, owner, identity)) {
        const code = this.passiveRegistry.byId(identity).code;
        if (bannedKind === OFFER_KIND_PASSIVE && bannedCode === code) {
          continue;
        }
        pool.push({ kind: OFFER_KIND_PASSIVE, code });
      }
    }

    return pool;
  }

  private readCandidate(world: World, storeIndex: number): OfferCandidate | null {
    const kind = world.offerCandidateKind[storeIndex] ?? 0;
    const code = world.offerCandidateCode[storeIndex] ?? 0;

    if (kind === OFFER_KIND_ABILITY) {
      const definition = this.abilityRegistry.byCode(code);
      if (definition === null) {
        throw new RangeError('offer candidate holds the reserved empty ability code');
      }
      return { kind: 'ability', identity: definition.id };
    }

    if (kind === OFFER_KIND_PASSIVE) {
      const definition = this.passiveRegistry.byCode(code);
      if (definition === null) {
        throw new RangeError('offer candidate holds the reserved empty passive code');
      }
      return { kind: 'passive', identity: definition.id };
    }

    return null;
  }

  private baseIndex(world: World, owner: EntityId): number {
    const slot = world.slotOf(owner);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & OFFER_MASK) !== OFFER_MASK) {
      throw new RangeError('entity does not own a level-up offer');
    }

    return world.offerSlotIndexOf(slot, 0);
  }
}
