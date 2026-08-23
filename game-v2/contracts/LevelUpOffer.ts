import { type AbilityIdentityId } from '@/game-v2/contracts/AbilitySlot';
import { type PassiveIdentityId } from '@/game-v2/contracts/PassiveSlot';

/**
 * Up to three visible cards per level-up offer (design §5.4, V2-ADR-049).
 */
export const OFFER_CANDIDATE_COUNT = 3;

export type OfferCandidateIndex = 0 | 1 | 2;

/** Reserved code for an empty candidate slot. */
export const EMPTY_OFFER_KIND = 0;
export const OFFER_KIND_ABILITY = 1;
export const OFFER_KIND_PASSIVE = 2;

/**
 * One offered candidate, resolved to its real identity.
 *
 * A discriminated union rather than a shared shape: an ability candidate and
 * a passive candidate reference different identity spaces, and every reader
 * that switches on `kind` must handle both.
 */
export type OfferCandidate =
  | Readonly<{ kind: 'ability'; identity: AbilityIdentityId }>
  | Readonly<{ kind: 'passive'; identity: PassiveIdentityId }>;

/**
 * The single owner of the `slot * OFFER_CANDIDATE_COUNT + index` stride
 * (V2-ADR-049), mirroring `abilityStoreIndex`/`passiveStoreIndex`.
 */
export const offerStoreIndex = (slot: number, index: number): number =>
  slot * OFFER_CANDIDATE_COUNT + index;

export const isOfferCandidateIndex = (value: number): value is OfferCandidateIndex =>
  Number.isInteger(value) && value >= 0 && value < OFFER_CANDIDATE_COUNT;
