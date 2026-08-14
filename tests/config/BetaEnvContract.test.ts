import { describe, expect, it } from 'vitest';
import {
  formatBetaEnvValidation,
  validateBetaEnv,
} from '../../config/architecture/BetaEnvContract';

const secret = 'x'.repeat(40);

describe('BetaEnvContract', () => {
  it('accepts a complete frontend beta environment', () => {
    const result = validateBetaEnv(
      {
        VITE_API_BASE_URL: 'https://api.up.railway.app',
        VITE_RAILWAY_API_URL: 'https://api.up.railway.app',
        VITE_MARKET_AGGREGATOR_URL: 'https://market.up.railway.app',
        VITE_APP_ENV: 'beta',
        VITE_MARKET_RUNTIME_MODE: 'legacy',
        VITE_DIFFICULTY_RUNTIME_MODE: 'current',
        VITE_VERIFY_COINS_ONLY: 'true',
        VITE_ANTI_CHEAT_SPEED_HACK_ENABLED: 'true',
        VITE_ENABLE_DEBUG_API: 'false',
        VITE_CF_PRICE_ORACLE_URL: 'https://price-worker.crypto-survivors.workers.dev',
        VITE_CF_SESSION_VALIDATOR_URL:
          'https://session-worker.crypto-survivors.workers.dev',
      },
      'frontend',
      'beta'
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails frontend beta env when reward and anti-cheat flags are unsafe', () => {
    const result = validateBetaEnv(
      {
        VITE_API_BASE_URL: 'https://api.up.railway.app',
        VITE_RAILWAY_API_URL: 'https://api.up.railway.app',
        VITE_MARKET_AGGREGATOR_URL: 'https://market.up.railway.app',
        VITE_APP_ENV: 'beta',
        VITE_MARKET_RUNTIME_MODE: 'legacy',
        VITE_DIFFICULTY_RUNTIME_MODE: 'current',
        VITE_VERIFY_COINS_ONLY: 'false',
        VITE_ANTI_CHEAT_SPEED_HACK_ENABLED: 'false',
        VITE_ENABLE_DEBUG_API: 'true',
      },
      'frontend',
      'beta'
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map(issue => issue.key)).toEqual(
      expect.arrayContaining([
        'VITE_VERIFY_COINS_ONLY',
        'VITE_ANTI_CHEAT_SPEED_HACK_ENABLED',
        'VITE_ENABLE_DEBUG_API',
      ])
    );
  });

  it('requires an explicit difficulty runtime mode', () => {
    // Leaving this unset resolves to `current`, which silently switches off the
    // modular shell and every consumer of `difficultySnapshotCommitted`. Beta
    // has to state which shell holds authority rather than inherit it.
    const result = validateBetaEnv(
      {
        VITE_API_BASE_URL: 'https://api.up.railway.app',
        VITE_RAILWAY_API_URL: 'https://api.up.railway.app',
        VITE_MARKET_AGGREGATOR_URL: 'https://market.up.railway.app',
        VITE_APP_ENV: 'beta',
        VITE_MARKET_RUNTIME_MODE: 'legacy',
        VITE_VERIFY_COINS_ONLY: 'true',
        VITE_ANTI_CHEAT_SPEED_HACK_ENABLED: 'true',
      },
      'frontend',
      'beta'
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ key: 'VITE_DIFFICULTY_RUNTIME_MODE' })
    );
  });

  it('rejects a difficulty runtime mode outside the known shells', () => {
    const result = validateBetaEnv(
      {
        VITE_API_BASE_URL: 'https://api.up.railway.app',
        VITE_RAILWAY_API_URL: 'https://api.up.railway.app',
        VITE_MARKET_AGGREGATOR_URL: 'https://market.up.railway.app',
        VITE_APP_ENV: 'beta',
        VITE_MARKET_RUNTIME_MODE: 'legacy',
        VITE_DIFFICULTY_RUNTIME_MODE: 'hybrid',
        VITE_VERIFY_COINS_ONLY: 'true',
        VITE_ANTI_CHEAT_SPEED_HACK_ENABLED: 'true',
      },
      'frontend',
      'beta'
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ key: 'VITE_DIFFICULTY_RUNTIME_MODE' })
    );
  });

  it('fails frontend beta env when Cloudflare worker URLs are only partially set', () => {
    const result = validateBetaEnv(
      {
        VITE_API_BASE_URL: 'https://api.up.railway.app',
        VITE_RAILWAY_API_URL: 'https://api.up.railway.app',
        VITE_MARKET_AGGREGATOR_URL: 'https://market.up.railway.app',
        VITE_APP_ENV: 'beta',
        VITE_MARKET_RUNTIME_MODE: 'legacy',
        VITE_DIFFICULTY_RUNTIME_MODE: 'current',
        VITE_VERIFY_COINS_ONLY: 'true',
        VITE_ANTI_CHEAT_SPEED_HACK_ENABLED: 'true',
        VITE_CF_PRICE_ORACLE_URL: 'https://price-worker.crypto-survivors.workers.dev',
      },
      'frontend',
      'beta'
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ key: 'VITE_CF_SESSION_VALIDATOR_URL' })
    );
  });

  it('accepts a complete api server beta environment', () => {
    const result = validateBetaEnv(
      {
        DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/railway',
        NODE_ENV: 'production',
        API_JWT_SECRET: secret,
        TOKEN_ENCRYPTION_SECRET: secret,
        ADMIN_API_SECRET: secret,
        API_JWT_EXPIRES_SECONDS: '2592000',
        TWITTER_CLIENT_ID: 'twitter-client-id',
        TWITTER_CLIENT_SECRET: 'twitter-client-secret-value',
      },
      'api-server',
      'beta'
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails api server beta env when required secrets are missing or placeholders', () => {
    const result = validateBetaEnv(
      {
        DATABASE_URL: 'postgresql://user:password@host:5432/dbname',
        NODE_ENV: 'development',
        API_JWT_SECRET: 'short',
        TOKEN_ENCRYPTION_SECRET: 'replace-with-a-long-random-secret',
        API_JWT_EXPIRES_SECONDS: '0',
        TWITTER_CLIENT_ID: 'your-twitter-client-id',
        TWITTER_CLIENT_SECRET: '',
      },
      'api-server',
      'beta'
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map(issue => issue.key)).toEqual(
      expect.arrayContaining([
        'DATABASE_URL',
        'NODE_ENV',
        'API_JWT_SECRET',
        'TOKEN_ENCRYPTION_SECRET',
        'ADMIN_API_SECRET',
        'API_JWT_EXPIRES_SECONDS',
        'TWITTER_CLIENT_ID',
        'TWITTER_CLIENT_SECRET',
      ])
    );
  });

  it('keeps formatted output redacted by design', () => {
    const result = validateBetaEnv(
      {
        DATABASE_URL: 'postgresql://user:password@host:5432/dbname',
        NODE_ENV: 'production',
        API_JWT_SECRET: 'short-secret-value',
      },
      'api-server',
      'beta'
    );

    const formatted = formatBetaEnvValidation(result);

    expect(formatted).toContain('API_JWT_SECRET');
    expect(formatted).not.toContain('short-secret-value');
    expect(formatted).not.toContain('user:password');
  });
});
