export type RunEscrowOutcome =
  | 'CASH_OUT_ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SAFE_EXIT'
  | 'DEATH'
  | 'LIQUIDATION';

export type RunEscrowDecision = {
  outcome: RunEscrowOutcome;
  idempotencyKey: string;
};

export type RunEscrowResult = {
  state: 'ACTIVE' | 'SETTLED' | 'FAILED';
  primaryRewardPoints: number;
  greedDelta: number;
};

export class RunEscrow {
  private state: RunEscrowResult['state'] = 'ACTIVE';
  private readonly decisions = new Map<string, RunEscrowResult>();

  public constructor(
    _quoteId: string,
    private readonly rewardPoints: number
  ) {}

  public decide(decision: RunEscrowDecision): RunEscrowResult {
    const existing = this.decisions.get(decision.idempotencyKey);
    if (existing) return existing;
    if (this.state !== 'ACTIVE') throw new Error('RUN_ESCROW_ALREADY_CLOSED');

    const result = this.toResult(decision.outcome);
    this.state = result.state;
    this.decisions.set(decision.idempotencyKey, result);
    return result;
  }

  private toResult(outcome: RunEscrowOutcome): RunEscrowResult {
    if (outcome === 'CASH_OUT_ACCEPTED' || outcome === 'SAFE_EXIT') {
      return { state: 'SETTLED', primaryRewardPoints: this.rewardPoints, greedDelta: 0 };
    }
    if (outcome === 'REJECTED' || outcome === 'EXPIRED') {
      return { state: 'ACTIVE', primaryRewardPoints: 0, greedDelta: 1 };
    }
    return { state: 'FAILED', primaryRewardPoints: 0, greedDelta: 0 };
  }
}
