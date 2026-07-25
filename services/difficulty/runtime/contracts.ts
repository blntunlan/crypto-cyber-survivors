import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import {
  type DecisionQuality,
  type DifficultyClampCode,
  type DifficultyReasonCode,
  type EncounterDecisionSummary,
  type MarketDecisionSummary,
  type PacingDecisionSummary,
  type PlayerDecisionSummary,
  type PositionRiskSummary,
  type ReadonlyDeep,
  type RecoveryDecisionSummary,
} from '../../../types/runtimeDifficulty';

export type DomainDecision<TValue, TReason extends string = DifficultyReasonCode> = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: DecisionQuality;
  value: TValue;
  reasonCodes: readonly TReason[];
  clampCodes: readonly DifficultyClampCode[];
};

export type DifficultyRevisionVector = {
  market: number;
  player: number;
  run: number;
  world: number;
};

export type DifficultyRunConstants = {
  runId: string;
  seed: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
};

export type DifficultyWorldPressure = {
  activeEnemies: number;
  maximumEnemies: number;
  activeEncounters: number;
};

export type DifficultyPlayerTelemetry = {
  damageTaken: number;
  remainingHp: number;
  killsInWindow: number;
  dashesInWindow: number;
  shotsInWindow: number;
  level: number;
  windowSeconds: number;
};

export type DifficultyRuntimeInputView = ReadonlyDeep<{
  revisions: DifficultyRevisionVector;
  market: {
    frame: CanonicalMarketFrame | null;
  };
  player: DifficultyPlayerTelemetry;
  run: {
    constants: DifficultyRunConstants | null;
    greedLevel: number;
  };
  world: DifficultyWorldPressure;
}>;

export type MarketRegimeManagerInput = {
  frame: Readonly<CanonicalMarketFrame> | null;
  elapsedSeconds: number;
  validFromTick: number;
  inputRevision: number;
};

export type PositionRiskManagerInput = {
  constants: Readonly<DifficultyRunConstants> | null;
  currentPrice: number;
  sourceSequence: number;
  deltaSeconds: number;
  validFromTick: number;
  inputRevision: number;
};

export type PacingManagerInput = {
  elapsedSeconds: number;
  validFromTick?: number;
  inputRevision?: number;
};

export type PlayerAdaptationInput = {
  telemetry: Readonly<DifficultyPlayerTelemetry> | null;
  world: Readonly<DifficultyWorldPressure>;
  deltaSeconds: number;
  validFromTick: number;
  inputRevision: number;
};

export type RecoveryBudgetInput = {
  recoveryNeed: number;
  advantage: number;
  regime: MarketDecisionSummary['regime'];
  regimeConfidence: number;
  deltaSeconds: number;
  elapsedSeconds: number;
  seed: number;
  validFromTick: number;
  inputRevision: number;
};

export type ThreatReservationInput = {
  requestedPressure: number;
  minimumPressure: number;
  maximumPressure: number;
  mercy: number;
  deltaSeconds: number;
  requestedCredits: number;
  validFromTick: number;
  inputRevision: number;
};

export type ThreatReservation = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  requestedPressure: number;
  finalPressure: number;
  creditRate: number;
  availableCredits: number;
  maximumCredits: number;
  requestedCredits: number;
  reservedCredits: number;
  remainingCredits: number;
  clampCodes: DifficultyClampCode[];
};

export type EncounterManagerInput = {
  elapsedSeconds: number;
  validFromTick: number;
  inputRevision: number;
  seed: number;
  market: Readonly<MarketDecisionSummary>;
  pacing: Readonly<PacingDecisionSummary>;
  reservation: Readonly<ThreatReservation>;
  headwind: number;
  liquidationProximity: number;
  world: Readonly<DifficultyWorldPressure>;
};

export type MarketRegimeDecision = DomainDecision<MarketDecisionSummary>;
export type PositionRiskDecision = DomainDecision<PositionRiskSummary>;
export type PacingDecision = DomainDecision<PacingDecisionSummary>;
export type PlayerAdaptationDecision = DomainDecision<PlayerDecisionSummary>;
export type RecoveryBudgetDecision = DomainDecision<RecoveryDecisionSummary>;
export type EncounterDecision = DomainDecision<EncounterDecisionSummary>;
