/** Severity of a validation finding */
export type ValidationSeverity = 'pass' | 'warn' | 'fail';

/** Single validation finding */
export type ValidationFinding = {
  validator: string;
  severity: ValidationSeverity;
  reason: string;
  /** Optional numeric value that triggered the finding */
  value?: number;
  /** Optional expected range */
  expected?: { min?: number; max?: number };
};

/** Aggregated result from all validators */
export type ValidationResult = {
  /** Overall severity (worst of all findings) */
  severity: ValidationSeverity;
  findings: ValidationFinding[];
  /** Milliseconds taken to validate */
  durationMs: number;
};

/** Input data shape for session validators */
export type SessionValidationInput = {
  kills: number;
  level: number;
  survivalSeconds: number;
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  leverage: number;
  position?: 'LONG' | 'SHORT';
  maxStreak: number;
  exitType: string;
  portalType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED' | null;
  totalCoins?: number;
  rawCoins?: number;
  enemyDropCoins?: number;
  breakdown?: Record<string, number>;
};

/** A validator function takes input and returns findings */
export type ValidatorFn = (input: SessionValidationInput) => ValidationFinding[];
