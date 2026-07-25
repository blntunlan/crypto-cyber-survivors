export type CashOutPolicyInput = {
  elapsedSeconds: number;
  lastDecisionAtSeconds: number | null;
  greedLevel: number;
  marketStaleSeconds: number;
};

export type CashOutPolicyResult = {
  canIssueQuote: boolean;
  shouldForceRecovery: boolean;
  safeExitAvailable: boolean;
  nextEligibilitySeconds: number;
  quoteTtlSeconds: number;
};

const FIRST_ELIGIBILITY_SECONDS = 300;
const MAX_GREED_INTERVAL_LEVEL = 4;
const BASE_REPEAT_ELIGIBILITY_SECONDS = 240;
const GREED_INTERVAL_SECONDS = 30;
const RECOVERY_GRACE_SECONDS = 45;
const SAFE_EXIT_STALE_SECONDS = 60;
const QUOTE_TTL_SECONDS = 15;

export class CashOutPolicy {
  public evaluate(input: CashOutPolicyInput): CashOutPolicyResult {
    const elapsedSeconds = Math.max(0, input.elapsedSeconds);
    const marketStaleSeconds = Math.max(0, input.marketStaleSeconds);
    const previousDecisionAtSeconds = input.lastDecisionAtSeconds;
    const nextEligibilitySeconds = this.getEligibilityInterval(
      previousDecisionAtSeconds,
      input.greedLevel
    );
    const elapsedSinceDecision =
      previousDecisionAtSeconds === null
        ? elapsedSeconds
        : Math.max(0, elapsedSeconds - previousDecisionAtSeconds);
    const eligibilityDue = elapsedSinceDecision >= nextEligibilitySeconds;
    const safeExitAvailable = marketStaleSeconds >= SAFE_EXIT_STALE_SECONDS;
    const marketIsFresh = marketStaleSeconds === 0;

    return {
      canIssueQuote: eligibilityDue && marketIsFresh,
      shouldForceRecovery:
        eligibilityDue &&
        elapsedSinceDecision >= nextEligibilitySeconds + RECOVERY_GRACE_SECONDS &&
        marketIsFresh,
      safeExitAvailable,
      nextEligibilitySeconds,
      quoteTtlSeconds: QUOTE_TTL_SECONDS,
    };
  }

  private getEligibilityInterval(
    lastDecisionAtSeconds: number | null,
    greedLevel: number
  ): number {
    if (lastDecisionAtSeconds === null) return FIRST_ELIGIBILITY_SECONDS;

    return (
      BASE_REPEAT_ELIGIBILITY_SECONDS +
      GREED_INTERVAL_SECONDS * Math.min(MAX_GREED_INTERVAL_LEVEL, Math.max(0, greedLevel))
    );
  }
}
