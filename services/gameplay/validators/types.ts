export type GameplayValidationSeverity = 'warn' | 'fail';

export type GameplayValidationIssue = {
  validator: string;
  severity: GameplayValidationSeverity;
  reason: string;
  value?: number | string;
  expected?: number | string;
};

export type GameplayValidationResult = {
  valid: boolean;
  issues: GameplayValidationIssue[];
};
