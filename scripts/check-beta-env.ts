import {
  formatBetaEnvValidation,
  validateBetaEnv,
  type BetaEnvProfile,
  type BetaEnvScope,
} from '../config/architecture/BetaEnvContract';

const scopes: BetaEnvScope[] = ['frontend', 'api-server', 'market-aggregator'];
const profiles: BetaEnvProfile[] = ['development', 'beta', 'production'];

const args = new Map<string, string>();

for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) continue;
  args.set(key.slice(2), value);
}

const scope = args.get('scope') ?? 'frontend';
const profile = args.get('profile') ?? 'beta';

if (!scopes.includes(scope as BetaEnvScope)) {
  throw new Error(`Invalid --scope. Expected one of: ${scopes.join(', ')}`);
}

if (!profiles.includes(profile as BetaEnvProfile)) {
  throw new Error(`Invalid --profile. Expected one of: ${profiles.join(', ')}`);
}

const result = validateBetaEnv(
  process.env,
  scope as BetaEnvScope,
  profile as BetaEnvProfile
);

console.log(formatBetaEnvValidation(result));

if (!result.ok) {
  process.exitCode = 1;
}
