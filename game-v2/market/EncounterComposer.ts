import { type EncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { type IndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

/** One family's output on the tick it activated, paired with its profile for selection. */
export type EncounterCandidate = Readonly<{
  profile: IndicatorEventProfile;
  output: EncounterOutput;
}>;

/**
 * This tick's composed result. Mutable and caller-owned — `compose`
 * writes into it rather than allocating, mirroring `EnemyComposer`'s own
 * precedent.
 */
export type ComposedEncounter = {
  primary: EncounterOutput | null;
  support: EncounterOutput | null;
};

const isMorePreferred = (
  candidate: EncounterCandidate,
  current: EncounterCandidate
): boolean => {
  if (candidate.profile.priority !== current.profile.priority) {
    return candidate.profile.priority > current.profile.priority;
  }

  // Deterministic tie-break (V2-ADR-124), mirroring this project's
  // established ascending-order tie-break pattern (V2-ADR-021).
  return candidate.profile.id < current.profile.id;
};

/**
 * The primary/support selection mechanism (design §6.2/§7.5, `V2-207`).
 * Stateless per call — no cross-tick memory, no queue (V2-ADR-122): a
 * candidate that is neither chosen primary nor chosen support is simply
 * absent from the result, never banked for a later tick.
 *
 * A merged event's cooldown/rearm consumption requires no bookkeeping
 * here (V2-ADR-123): each candidate's own `IndicatorEventStateMachine`
 * already transitioned to `COOLDOWN` when it produced this output,
 * entirely independent of whatever this function selects.
 */
export class EncounterComposer {
  /**
   * `candidates` must be every encounter that produced an output on this
   * exact tick — not a broader "still active" window. Higher `priority`
   * wins; compatibility is checked directionally against the *primary's*
   * own `compatibleWith` list only (V2-ADR-125).
   */
  public compose(
    candidates: readonly EncounterCandidate[],
    out: ComposedEncounter
  ): void {
    out.primary = null;
    out.support = null;

    if (candidates.length === 0) {
      return;
    }

    let primaryCandidate = candidates[0];
    if (primaryCandidate === undefined) {
      return;
    }

    for (const candidate of candidates) {
      if (isMorePreferred(candidate, primaryCandidate)) {
        primaryCandidate = candidate;
      }
    }

    out.primary = primaryCandidate.output;

    let supportCandidate: EncounterCandidate | null = null;

    for (const candidate of candidates) {
      if (candidate === primaryCandidate) {
        continue;
      }

      if (!primaryCandidate.profile.compatibleWith.includes(candidate.profile.id)) {
        continue;
      }

      if (supportCandidate === null || isMorePreferred(candidate, supportCandidate)) {
        supportCandidate = candidate;
      }
    }

    if (supportCandidate !== null) {
      out.support = supportCandidate.output;
    }
  }
}
