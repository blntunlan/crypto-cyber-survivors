import { type OfferCandidateIndex } from '@/game-v2/contracts/LevelUpOffer';

/**
 * The commands a paused level-up can record and replay.
 *
 * `choiceIndex` names a slot in the *current* offer (V2-ADR-051) rather than
 * a fixed identity string: the offer itself is RNG-shuffled per run
 * (V2-ADR-050), and the recorded command already captures the resolved
 * choice, so replay never needs to re-derive which candidate the index
 * pointed at — only that the same index was chosen.
 *
 * `reroll-offer` and `banish-offer` (V2-105) are recorded at the same paused
 * tick as the eventual `choose-upgrade`, since no simulation tick advances
 * while the lifecycle is paused (V2-ADR-059). `reroll-offer` carries no
 * `choiceIndex`: it replaces the entire offer rather than one slot.
 */
export type RunCommand =
  | Readonly<{ tick: number; type: 'choose-upgrade'; choiceIndex: OfferCandidateIndex }>
  | Readonly<{ tick: number; type: 'reroll-offer' }>
  | Readonly<{ tick: number; type: 'banish-offer'; choiceIndex: OfferCandidateIndex }>;
