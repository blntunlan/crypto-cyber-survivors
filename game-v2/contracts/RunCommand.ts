import { type OfferCandidateIndex } from '@/game-v2/contracts/LevelUpOffer';

/**
 * The upgrade choice a paused level-up can resolve.
 *
 * `choiceIndex` names a slot in the *current* offer (V2-ADR-051) rather than
 * a fixed identity string: the offer itself is RNG-shuffled per run
 * (V2-ADR-050), and the recorded command already captures the resolved
 * choice, so replay never needs to re-derive which candidate the index
 * pointed at — only that the same index was chosen.
 */
export type RunCommand = Readonly<{
  tick: number;
  type: 'choose-upgrade';
  choiceIndex: OfferCandidateIndex;
}>;
