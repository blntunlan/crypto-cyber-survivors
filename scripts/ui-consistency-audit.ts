#!/usr/bin/env npx tsx
/**
 * Compatibility entry point for the former score-based UI audit.
 * Production UI validation is now rule-based and blocking.
 */

import { runUiContract } from './check-ui-contract';

const violations = runUiContract();

if (violations.length === 0) {
  console.log('UI contract: passed');
} else {
  console.error(`UI contract: ${violations.length} violation(s)`);
  for (const violation of violations) {
    console.error(
      `${violation.path}:${violation.line}:${violation.column} [${violation.rule}] ${violation.message}`
    );
  }
  process.exitCode = 1;
}
