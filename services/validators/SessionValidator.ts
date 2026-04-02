import { Logger } from '../system/Logger';
import {
  type SessionValidationInput,
  type ValidationResult,
  type ValidationSeverity,
  type ValidatorFn,
} from './types';
import { validateFieldRanges } from './fieldRangeValidators';
import { validateReward } from './rewardValidator';

/** Severity ordering for aggregation */
const SEVERITY_ORDER: Record<ValidationSeverity, number> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

/**
 * SessionValidator — composable middleware orchestrator.
 *
 * Runs all registered validators against session data and aggregates results.
 * Advisory only on client side — never blocks submission.
 */
export class SessionValidator {
  private static validators: ValidatorFn[] = [validateFieldRanges, validateReward];

  /**
   * Run all validators and return aggregated result.
   */
  static validate(input: SessionValidationInput): ValidationResult {
    const start = performance.now();
    const findings = this.validators.flatMap(v => v(input));
    const durationMs = performance.now() - start;

    let worstSeverity: ValidationSeverity = 'pass';
    for (const f of findings) {
      if (SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[worstSeverity]) {
        worstSeverity = f.severity;
      }
    }

    const result: ValidationResult = {
      severity: worstSeverity,
      findings,
      durationMs,
    };

    if (worstSeverity !== 'pass') {
      Logger.warn('[SessionValidator] Validation issues detected', {
        severity: worstSeverity,
        findingCount: findings.filter(f => f.severity !== 'pass').length,
        findings: findings.filter(f => f.severity !== 'pass'),
      });
    }

    return result;
  }

  /** Register an additional validator (for extensibility) */
  static addValidator(fn: ValidatorFn): void {
    this.validators.push(fn);
  }

  /** Reset to default validators (for testing) */
  static reset(): void {
    this.validators = [validateFieldRanges, validateReward];
  }
}
