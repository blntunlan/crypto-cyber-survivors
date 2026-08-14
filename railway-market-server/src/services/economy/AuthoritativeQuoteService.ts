import crypto from 'crypto';
import { CashOutPolicy } from './CashOutPolicy';
import { CashOutQuoteSigner, type CashOutQuote } from './CashOutQuoteSigner';
import { RewardLedger } from './RewardLedger';
import {
  convertPointsToTokens,
  type EpochRate,
  type TokenCapReason,
} from './EpochRateService';

export type AuthoritativeQuoteInput = {
  sessionId: string;
  createdAtSeconds: number;
  nowSeconds: number;
  rewardElapsedSeconds?: number;
  entryPrice: number;
  canonicalPrice: number;
  timeWeightedCanonicalPrice?: number;
  canonicalSequence: number;
  position: 'LONG' | 'SHORT';
  leverage: number;
  greedLevel: number;
  marketStaleSeconds: number;
  combatMastery: number;
  lastDecisionAtSeconds?: number | null;
  /**
   * Active epoch rate. Absent only when no epoch is configured, in which case
   * the quote carries reward points with no token price rather than inventing
   * one (§14: token amounts are never hardcoded).
   */
  epochRate?: EpochRate | null;
};

export type AuthoritativeQuoteResult = {
  quote: CashOutQuote;
  signature: string;
  rewardPoints: number;
  shouldForceRecovery: boolean;
  safeExitOnly: boolean;
  tokenAmount: number | null;
  tokenCapReason: TokenCapReason | null;
  epochId: string | null;
};

const ALIGNMENT_SCALE = 0.05;
const MAX_PUBLIC_LEVERAGE = 20;

export class AuthoritativeQuoteService {
  private readonly policy = new CashOutPolicy();
  private readonly rewardLedger = new RewardLedger();
  private readonly signer: CashOutQuoteSigner;

  public constructor(serverSecret: string) {
    this.signer = new CashOutQuoteSigner(serverSecret);
  }

  public issue(input: AuthoritativeQuoteInput): AuthoritativeQuoteResult {
    const elapsedSeconds = Math.max(0, input.nowSeconds - input.createdAtSeconds);
    const policy = this.policy.evaluate({
      elapsedSeconds,
      lastDecisionAtSeconds: input.lastDecisionAtSeconds ?? null,
      greedLevel: input.greedLevel,
      marketStaleSeconds: input.marketStaleSeconds,
    });
    const canIssueQuote =
      policy.canIssueQuote || policy.shouldForceRecovery || policy.safeExitAvailable;
    if (!canIssueQuote) throw new Error('CASH_OUT_NOT_ELIGIBLE');
    if (input.entryPrice <= 0 || input.canonicalPrice <= 0) {
      throw new Error('CANONICAL_PRICE_REQUIRED');
    }

    const sideSign = input.position === 'LONG' ? 1 : -1;
    const toAlignment = (price: number): number => {
      const leveragedReturn =
        ((price - input.entryPrice) / input.entryPrice) *
        sideSign *
        Math.max(1, input.leverage);

      return Math.tanh(leveragedReturn / ALIGNMENT_SCALE);
    };
    const exitAlignment = toAlignment(input.canonicalPrice);
    const timeWeightedAlignment = toAlignment(
      input.timeWeightedCanonicalPrice ?? input.canonicalPrice
    );
    const rewardElapsedSeconds = Math.max(
      0,
      input.rewardElapsedSeconds ?? elapsedSeconds
    );
    const verifiedRiskQuality =
      Math.log(1 + Math.max(1, input.leverage)) / Math.log(1 + MAX_PUBLIC_LEVERAGE);
    const reward = this.rewardLedger.calculate({
      survivalSeconds: rewardElapsedSeconds,
      timeWeightedAlignment,
      exitAlignment,
      verifiedRiskQuality,
      greedLevel: input.greedLevel,
      combatMastery: input.combatMastery,
    });
    const quote: CashOutQuote = {
      quoteId: crypto.randomUUID(),
      sessionId: input.sessionId,
      canonicalSequence: input.canonicalSequence,
      rewardPoints: reward.rewardPoints,
      issuedAtSeconds: input.nowSeconds,
      expiresAtSeconds: input.nowSeconds + policy.quoteTtlSeconds,
    };

    // No configured epoch means no token price. Quoting points without a rate
    // is honest; inventing a rate would hardcode the token amount (§14).
    const epochRate = input.epochRate ?? null;
    const conversion =
      epochRate === null ? null : convertPointsToTokens(reward.rewardPoints, epochRate);

    return {
      quote,
      signature: this.signer.sign(quote),
      rewardPoints: reward.rewardPoints,
      shouldForceRecovery: policy.shouldForceRecovery,
      safeExitOnly: policy.safeExitAvailable,
      tokenAmount: conversion === null ? null : conversion.tokens,
      tokenCapReason: conversion === null ? null : conversion.cappedBy,
      epochId: epochRate === null ? null : epochRate.epochId,
    };
  }
}
