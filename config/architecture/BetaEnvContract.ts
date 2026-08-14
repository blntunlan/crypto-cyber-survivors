export type BetaEnvScope = 'frontend' | 'api-server' | 'market-aggregator';

export type BetaEnvProfile = 'development' | 'beta' | 'production';

export type BetaEnvSeverity = 'error' | 'warning';

export type BetaEnvIssue = {
  severity: BetaEnvSeverity;
  key: string;
  message: string;
};

export type BetaEnvValidationResult = {
  scope: BetaEnvScope;
  profile: BetaEnvProfile;
  ok: boolean;
  errors: BetaEnvIssue[];
  warnings: BetaEnvIssue[];
};

type EnvMap = Record<string, string | undefined>;

type EnvRequirement = {
  key: string;
  requiredIn: BetaEnvProfile[];
  validate: (value: string, profile: BetaEnvProfile) => string | null;
};

const URL_PROTOCOLS = new Set(['https:', 'http:']);
const BETA_PROFILES: BetaEnvProfile[] = ['beta', 'production'];

const placeholderPatterns = [
  /^your-/i,
  /^replace-/i,
  /^postgresql:\/\/user:password@host/i,
  /example/i,
  /placeholder/i,
];

const normalizeEnvValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const hasPlaceholder = (value: string): boolean =>
  placeholderPatterns.some(pattern => pattern.test(value));

const nonPlaceholder =
  (label: string) =>
  (value: string): string | null => {
    if (hasPlaceholder(value)) return `${label} placeholder value must be replaced`;
    return null;
  };

const urlValue = (label: string) => (value: string, profile: BetaEnvProfile) => {
  const placeholderIssue = nonPlaceholder(label)(value);
  if (placeholderIssue) return placeholderIssue;

  try {
    const url = new URL(value);
    if (!URL_PROTOCOLS.has(url.protocol)) {
      return `${label} must be an http(s) URL`;
    }
    if (profile !== 'development' && url.protocol !== 'https:') {
      return `${label} must use HTTPS in beta/production`;
    }
    return null;
  } catch {
    return `${label} must be a valid URL`;
  }
};

const postgresUrl = (value: string, profile: BetaEnvProfile): string | null => {
  const placeholderIssue = nonPlaceholder('DATABASE_URL')(value);
  if (placeholderIssue) return placeholderIssue;

  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      return 'DATABASE_URL must be a PostgreSQL URL';
    }
    if (profile !== 'development' && !url.hostname.includes('railway')) {
      return 'DATABASE_URL should point to the Railway PostgreSQL host in beta/production';
    }
    return null;
  } catch {
    return 'DATABASE_URL must be a valid PostgreSQL URL';
  }
};

const booleanString =
  (label: string) =>
  (value: string): string | null => {
    if (value !== 'true' && value !== 'false') return `${label} must be true or false`;
    return null;
  };

const mustBeTrue =
  (label: string) =>
  (value: string): string | null => {
    if (value !== 'true') return `${label} must be true in beta/production`;
    return null;
  };

const mustNotBeTrue =
  (label: string) =>
  (value: string): string | null => {
    if (value === 'true') return `${label} must be false or unset in beta/production`;
    if (value !== 'false') return `${label} must be false or unset in beta/production`;
    return null;
  };

const enumValue =
  (label: string, values: readonly string[]) =>
  (value: string): string | null => {
    if (!values.includes(value)) {
      return `${label} must be one of: ${values.join(', ')}`;
    }
    return null;
  };

const secretValue =
  (label: string, minLength = 32) =>
  (value: string): string | null => {
    const placeholderIssue = nonPlaceholder(label)(value);
    if (placeholderIssue) return placeholderIssue;
    if (value.length < minLength) {
      return `${label} must be at least ${minLength} characters`;
    }
    return null;
  };

const positiveInteger =
  (label: string) =>
  (value: string): string | null => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return `${label} must be a positive integer`;
    }
    return null;
  };

const frontendRequirements: EnvRequirement[] = [
  {
    key: 'VITE_API_BASE_URL',
    requiredIn: BETA_PROFILES,
    validate: urlValue('VITE_API_BASE_URL'),
  },
  {
    key: 'VITE_RAILWAY_API_URL',
    requiredIn: BETA_PROFILES,
    validate: urlValue('VITE_RAILWAY_API_URL'),
  },
  {
    key: 'VITE_MARKET_AGGREGATOR_URL',
    requiredIn: BETA_PROFILES,
    validate: urlValue('VITE_MARKET_AGGREGATOR_URL'),
  },
  {
    key: 'VITE_APP_ENV',
    requiredIn: BETA_PROFILES,
    validate: enumValue('VITE_APP_ENV', ['beta', 'production']),
  },
  {
    key: 'VITE_MARKET_RUNTIME_MODE',
    requiredIn: BETA_PROFILES,
    validate: enumValue('VITE_MARKET_RUNTIME_MODE', ['legacy', 'dual', 'runtime']),
  },
  {
    // Required rather than optional on purpose: when this is unset the mode
    // resolves to `current`, which leaves the modular shell — and therefore
    // every consumer of `difficultySnapshotCommitted` — switched off with no
    // signal anywhere. Beta/prod must state which shell has authority.
    key: 'VITE_DIFFICULTY_RUNTIME_MODE',
    requiredIn: BETA_PROFILES,
    validate: enumValue('VITE_DIFFICULTY_RUNTIME_MODE', [
      'current',
      'shadow',
      'modular',
    ]),
  },
  {
    key: 'VITE_VERIFY_COINS_ONLY',
    requiredIn: BETA_PROFILES,
    validate: mustBeTrue('VITE_VERIFY_COINS_ONLY'),
  },
  {
    key: 'VITE_ANTI_CHEAT_SPEED_HACK_ENABLED',
    requiredIn: BETA_PROFILES,
    validate: mustBeTrue('VITE_ANTI_CHEAT_SPEED_HACK_ENABLED'),
  },
];

const apiServerRequirements: EnvRequirement[] = [
  {
    key: 'DATABASE_URL',
    requiredIn: BETA_PROFILES,
    validate: postgresUrl,
  },
  {
    key: 'NODE_ENV',
    requiredIn: BETA_PROFILES,
    validate: enumValue('NODE_ENV', ['production']),
  },
  {
    key: 'API_JWT_SECRET',
    requiredIn: BETA_PROFILES,
    validate: secretValue('API_JWT_SECRET'),
  },
  {
    key: 'TOKEN_ENCRYPTION_SECRET',
    requiredIn: BETA_PROFILES,
    validate: secretValue('TOKEN_ENCRYPTION_SECRET'),
  },
  {
    key: 'ADMIN_API_SECRET',
    requiredIn: BETA_PROFILES,
    validate: secretValue('ADMIN_API_SECRET'),
  },
  {
    key: 'API_JWT_EXPIRES_SECONDS',
    requiredIn: BETA_PROFILES,
    validate: positiveInteger('API_JWT_EXPIRES_SECONDS'),
  },
  {
    key: 'TWITTER_CLIENT_ID',
    requiredIn: BETA_PROFILES,
    validate: nonPlaceholder('TWITTER_CLIENT_ID'),
  },
  {
    key: 'TWITTER_CLIENT_SECRET',
    requiredIn: BETA_PROFILES,
    validate: secretValue('TWITTER_CLIENT_SECRET', 16),
  },
];

const marketAggregatorRequirements: EnvRequirement[] = [
  {
    key: 'DATABASE_URL',
    requiredIn: BETA_PROFILES,
    validate: postgresUrl,
  },
  {
    key: 'NODE_ENV',
    requiredIn: BETA_PROFILES,
    validate: enumValue('NODE_ENV', ['production']),
  },
];

const requirementsByScope: Record<BetaEnvScope, EnvRequirement[]> = {
  frontend: frontendRequirements,
  'api-server': apiServerRequirements,
  'market-aggregator': marketAggregatorRequirements,
};

export function validateBetaEnv(
  env: EnvMap,
  scope: BetaEnvScope,
  profile: BetaEnvProfile = 'beta'
): BetaEnvValidationResult {
  const errors: BetaEnvIssue[] = [];
  const warnings: BetaEnvIssue[] = [];

  for (const requirement of requirementsByScope[scope]) {
    const value = normalizeEnvValue(env[requirement.key]);
    const required = requirement.requiredIn.includes(profile);

    if (!value) {
      if (required) {
        errors.push({
          severity: 'error',
          key: requirement.key,
          message: `${requirement.key} is required for ${scope} ${profile}`,
        });
      }
      continue;
    }

    const issue = requirement.validate(value, profile);
    if (issue) {
      errors.push({ severity: 'error', key: requirement.key, message: issue });
    }
  }

  addOptionalFrontendIssues(env, scope, profile, errors, warnings);
  addOptionalServerIssues(env, scope, errors, warnings);

  return {
    scope,
    profile,
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatBetaEnvValidation(result: BetaEnvValidationResult): string {
  const lines = [
    `Beta env validation: ${result.scope} (${result.profile})`,
    `Status: ${result.ok ? 'PASS' : 'FAIL'}`,
  ];

  for (const issue of [...result.errors, ...result.warnings]) {
    lines.push(`${issue.severity.toUpperCase()} ${issue.key}: ${issue.message}`);
  }

  return lines.join('\n');
}

function addOptionalFrontendIssues(
  env: EnvMap,
  scope: BetaEnvScope,
  profile: BetaEnvProfile,
  errors: BetaEnvIssue[],
  warnings: BetaEnvIssue[]
): void {
  if (scope !== 'frontend') return;

  const debugApi = normalizeEnvValue(env.VITE_ENABLE_DEBUG_API);
  if (debugApi) {
    const issue = mustNotBeTrue('VITE_ENABLE_DEBUG_API')(debugApi);
    if (issue) {
      errors.push({ severity: 'error', key: 'VITE_ENABLE_DEBUG_API', message: issue });
    }
  }

  addOptionalBoolean(env, 'VITE_ENABLE_ANALYTICS', errors);
  addOptionalBoolean(env, 'VITE_METRICS_ENABLED', errors);
  addOptionalBoolean(env, 'VITE_RUNTIME_DIAGNOSTICS_ENABLED', errors);
  addOptionalPositiveInteger(env, 'VITE_RUNTIME_DIAGNOSTICS_FRAME_BUFFER', errors);
  addOptionalUrl(env, 'VITE_METRICS_REMOTE_ENDPOINT', profile, errors);
  addOptionalUrl(env, 'VITE_MARKET_SYNC_ENDPOINT', profile, errors);

  const priceOracle = normalizeEnvValue(env.VITE_CF_PRICE_ORACLE_URL);
  const sessionValidator = normalizeEnvValue(env.VITE_CF_SESSION_VALIDATOR_URL);

  if (!priceOracle && !sessionValidator) {
    warnings.push({
      severity: 'warning',
      key: 'VITE_CF_PRICE_ORACLE_URL',
      message:
        'Cloudflare anti-cheat workers are not configured; keep as accepted beta risk or set both worker URLs',
    });
    return;
  }

  if (!priceOracle || !sessionValidator) {
    errors.push({
      severity: 'error',
      key: 'VITE_CF_SESSION_VALIDATOR_URL',
      message: 'Cloudflare anti-cheat worker URLs must be configured as a pair',
    });
    return;
  }

  addOptionalUrl(env, 'VITE_CF_PRICE_ORACLE_URL', profile, errors);
  addOptionalUrl(env, 'VITE_CF_SESSION_VALIDATOR_URL', profile, errors);
}

function addOptionalServerIssues(
  env: EnvMap,
  scope: BetaEnvScope,
  errors: BetaEnvIssue[],
  warnings: BetaEnvIssue[]
): void {
  if (scope !== 'api-server' && scope !== 'market-aggregator') return;

  addOptionalPositiveInteger(env, 'PORT', errors);
  addOptionalPositiveInteger(env, 'PG_POOL_MAX', errors);

  if (scope !== 'api-server') return;

  for (const legacyKey of ['RAILWAY_JWT_SECRET', 'JWT_SECRET']) {
    if (normalizeEnvValue(env[legacyKey])) {
      warnings.push({
        severity: 'warning',
        key: legacyKey,
        message: `${legacyKey} is a legacy fallback; API_JWT_SECRET is the beta authority`,
      });
    }
  }
}

function addOptionalBoolean(env: EnvMap, key: string, errors: BetaEnvIssue[]): void {
  const value = normalizeEnvValue(env[key]);
  if (!value) return;

  const issue = booleanString(key)(value);
  if (issue) errors.push({ severity: 'error', key, message: issue });
}

function addOptionalPositiveInteger(
  env: EnvMap,
  key: string,
  errors: BetaEnvIssue[]
): void {
  const value = normalizeEnvValue(env[key]);
  if (!value) return;

  const issue = positiveInteger(key)(value);
  if (issue) errors.push({ severity: 'error', key, message: issue });
}

function addOptionalUrl(
  env: EnvMap,
  key: string,
  profile: BetaEnvProfile,
  errors: BetaEnvIssue[]
): void {
  const value = normalizeEnvValue(env[key]);
  if (!value) return;

  const issue = urlValue(key)(value, profile);
  if (issue) errors.push({ severity: 'error', key, message: issue });
}
