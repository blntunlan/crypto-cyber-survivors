import { ThreatBudgetAllocator } from '../../../director/ThreatBudgetAllocator';
import { type ThreatReservation, type ThreatReservationInput } from '../contracts';

const createReservation = (): ThreatReservation => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  requestedPressure: 0,
  finalPressure: 0,
  creditRate: 0,
  availableCredits: 0,
  maximumCredits: 0,
  requestedCredits: 0,
  reservedCredits: 0,
  remainingCredits: 0,
  clampCodes: [],
});

const clampUnit = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export class ThreatBudgetManager {
  private readonly allocator = new ThreatBudgetAllocator();
  private readonly reservation = createReservation();
  private lastValidFromTick = -1;
  private lastInputRevision = -1;

  public reserve(input: ThreatReservationInput): ThreatReservation {
    if (
      input.validFromTick === this.lastValidFromTick &&
      input.inputRevision === this.lastInputRevision
    ) {
      return this.reservation;
    }

    const minimumPressure = clampUnit(input.minimumPressure);
    const maximumPressure = Math.max(minimumPressure, clampUnit(input.maximumPressure));
    const requestedPressure = clampUnit(input.requestedPressure);
    const boundedPressure = Math.min(
      maximumPressure,
      Math.max(minimumPressure, requestedPressure)
    );
    const mercy = clampUnit(input.mercy);
    const finalPressure = boundedPressure * (1 - mercy);
    const clampCodes = this.reservation.clampCodes;
    clampCodes.length = 0;
    if (requestedPressure < minimumPressure) clampCodes.push('PACING_MINIMUM');
    if (requestedPressure > maximumPressure) clampCodes.push('PACING_MAXIMUM');
    if (finalPressure < boundedPressure) clampCodes.push('PLAYER_SAFETY_MAXIMUM');

    const budget = this.allocator.update({
      deltaSeconds: Math.max(0, input.deltaSeconds),
      survivalPressure: finalPressure,
      marketPressure: 0,
      headwind: 0,
      greedPressure: 0,
      encounterPressure: 0,
      pacingThreatMultiplier: 1,
    });
    const availableCredits = budget.availableCredits;
    const requestedCredits = Math.max(
      0,
      Number.isFinite(input.requestedCredits) ? input.requestedCredits : 0
    );
    const reservedCredits = this.allocator.spend(requestedCredits);

    this.reservation.revision += 1;
    this.reservation.validFromTick = input.validFromTick;
    this.reservation.inputRevision = input.inputRevision;
    this.reservation.requestedPressure = requestedPressure;
    this.reservation.finalPressure = finalPressure;
    this.reservation.creditRate = budget.creditRate;
    this.reservation.availableCredits = availableCredits;
    this.reservation.maximumCredits = budget.maximumCredits;
    this.reservation.requestedCredits = requestedCredits;
    this.reservation.reservedCredits = reservedCredits;
    this.reservation.remainingCredits = this.allocator.getSnapshot().availableCredits;
    this.lastValidFromTick = input.validFromTick;
    this.lastInputRevision = input.inputRevision;
    return this.reservation;
  }

  public getSnapshot(): ThreatReservation {
    return this.reservation;
  }

  public reset(): void {
    this.allocator.reset();
    this.reservation.revision = 0;
    this.reservation.validFromTick = 0;
    this.reservation.inputRevision = 0;
    this.reservation.requestedPressure = 0;
    this.reservation.finalPressure = 0;
    this.reservation.creditRate = 0;
    this.reservation.availableCredits = 0;
    this.reservation.maximumCredits = 0;
    this.reservation.requestedCredits = 0;
    this.reservation.reservedCredits = 0;
    this.reservation.remainingCredits = 0;
    this.reservation.clampCodes.length = 0;
    this.lastValidFromTick = -1;
    this.lastInputRevision = -1;
  }
}
