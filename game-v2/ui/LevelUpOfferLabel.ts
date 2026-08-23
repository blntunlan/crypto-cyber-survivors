import { type OfferCandidate } from '@/game-v2/contracts/LevelUpOffer';

/**
 * A generic "kind + identity" card label (V2-ADR-055).
 *
 * Reproducing exact before/after numeric copy generically across future
 * ability shapes would need this to know about `AbilityTierEffect`'s
 * per-identity fields, which V2-ADR-044 deliberately keeps out of any shared
 * pipeline, and an identity-keyed "current rank" lookup neither readout
 * exposes today. A generic label stays correct without either.
 */
export const formatOfferCandidateLabel = (candidate: OfferCandidate): string =>
  candidate.kind === 'ability'
    ? `Ability: ${candidate.identity}`
    : `Passive: ${candidate.identity}`;
