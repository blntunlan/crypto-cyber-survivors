/**
 * Contract §14: token amounts are never hardcoded. A run produces deterministic
 * reward points; an epoch rate turns those points into a token quote, and the
 * quote is subject to a per-run cap and the epoch's remaining budget.
 *
 * Keeping the conversion pure means the same inputs always price the same, and
 * the caps can be proven in tests rather than trusted in a route handler.
 */

export type EpochRate = {
  epochId: string;
  epochNumber: number;
  economyVersion: string;
  tokensPerPoint: number;
  perRunTokenCap: number;
  tokenBudget: number;
  tokensIssued: number;
};

export type TokenCapReason = 'none' | 'per_run_cap' | 'epoch_budget' | 'epoch_exhausted';

export type TokenConversion = {
  tokens: number;
  uncappedTokens: number;
  cappedBy: TokenCapReason;
  remainingBudget: number;
};

const toFinite = (value: number): number => (Number.isFinite(value) ? value : 0);

export const getRemainingBudget = (rate: EpochRate): number =>
  Math.max(0, toFinite(rate.tokenBudget) - toFinite(rate.tokensIssued));

/**
 * Applies the epoch rate, then the two ceilings in order: a single run can
 * never exceed the per-run cap, and no run can mint past what the epoch has
 * left. The reason is reported so settlement can explain a trimmed payout
 * instead of silently paying less than the quote implied.
 */
export const convertPointsToTokens = (
  rewardPoints: number,
  rate: EpochRate
): TokenConversion => {
  const points = Math.max(0, toFinite(rewardPoints));
  const tokensPerPoint = Math.max(0, toFinite(rate.tokensPerPoint));
  const uncappedTokens = points * tokensPerPoint;
  const remainingBudget = getRemainingBudget(rate);
  const perRunCap = Math.max(0, toFinite(rate.perRunTokenCap));

  if (remainingBudget <= 0) {
    return { tokens: 0, uncappedTokens, cappedBy: 'epoch_exhausted', remainingBudget: 0 };
  }

  let tokens = uncappedTokens;
  let cappedBy: TokenCapReason = 'none';

  if (tokens > perRunCap) {
    tokens = perRunCap;
    cappedBy = 'per_run_cap';
  }
  if (tokens > remainingBudget) {
    tokens = remainingBudget;
    cappedBy = 'epoch_budget';
  }

  return { tokens, uncappedTokens, cappedBy, remainingBudget };
};

/**
 * A quote is an offer, not a mint. Between issuing and accepting, other runs
 * may have drained the epoch, so settlement grants whatever is genuinely left
 * rather than paying the quoted figure on trust.
 */
export const clampGrantToRemaining = (
  quotedTokens: number,
  remainingBudget: number
): number =>
  Math.min(Math.max(0, toFinite(quotedTokens)), Math.max(0, toFinite(remainingBudget)));
