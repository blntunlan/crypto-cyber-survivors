# Beta Env Guardrail

> **Status** live
> Owner: Engineering, Backend, Operations

Bu belge beta ve production ortamlarında environment variable kapısını secretsız doğrulamak için kullanılır. Amaç raw secret değerlerini terminale dökmeden eksik, placeholder, HTTP URL, unsafe feature flag ve legacy JWT fallback risklerini yakalamaktır.

## Kapsam

- Frontend Railway service env contract.
- Railway API server env contract.
- Railway market aggregator env contract.
- Secret değerleri loglanmaz; validator yalnızca key adı ve hata tipini basar.
- Railway CLI oturumu yoksa prod/beta env sign-off tamamlanmış sayılmaz.

## Frontend Guardrail

| Değişken | Beta Kabulü |
|---|---|
| `VITE_API_BASE_URL` | HTTPS Railway API URL |
| `VITE_RAILWAY_API_URL` | HTTPS Railway API URL, legacy fallback için hâlâ set |
| `VITE_MARKET_AGGREGATOR_URL` | HTTPS market aggregator URL |
| `VITE_APP_ENV` | `beta` veya `production` |
| `VITE_MARKET_RUNTIME_MODE` | `legacy`, `dual` veya `runtime` |
| `VITE_VERIFY_COINS_ONLY` | `true` |
| `VITE_ANTI_CHEAT_SPEED_HACK_ENABLED` | `true` |
| `VITE_ENABLE_DEBUG_API` | unset veya `false` |
| `VITE_CF_PRICE_ORACLE_URL` / `VITE_CF_SESSION_VALIDATOR_URL` | ikisi birlikte set veya ikisi birlikte unset |

## API Server Guardrail

| Değişken | Beta Kabulü |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL URL |
| `NODE_ENV` | `production` |
| `API_JWT_SECRET` | 32+ karakter, placeholder değil |
| `TOKEN_ENCRYPTION_SECRET` | 32+ karakter, placeholder değil |
| `ADMIN_API_SECRET` | 32+ karakter, placeholder değil |
| `API_JWT_EXPIRES_SECONDS` | Pozitif integer |
| `TWITTER_CLIENT_ID` | Placeholder değil |
| `TWITTER_CLIENT_SECRET` | 16+ karakter, placeholder değil |

## Market Aggregator Guardrail

| Değişken | Beta Kabulü |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL URL |
| `NODE_ENV` | `production` |
| `PORT` | Optional pozitif integer |

## Local Contract Testleri

```terminal
npx vitest run tests/config/BetaEnvContract.test.ts
cd railway-market-server && npx vitest run tests/middleware/rateLimit.test.ts
```

## Secretsız Railway Sign-off

Railway CLI raw variable list komutları secret değerlerini basar. Bu yüzden `railway variable list --json` veya `--kv` çıktısını paylaşmayın.

```terminal
railway login
railway run --service <frontend-service> --environment <beta-or-production> npm run check:beta-env -- --scope frontend --profile beta
railway run --service <api-service> --environment <beta-or-production> npm run check:beta-env -- --scope api-server --profile beta
railway run --service <aggregator-service> --environment <beta-or-production> npm run check:beta-env -- --scope market-aggregator --profile beta
```

## Sign-off Kaydı

| Tarih | Ortam | Service | Komut | Sonuç | Not |
|---|---|---|---|---|---|
| 2026-06-18 | Local dummy | frontend | `npm run check:beta-env -- --scope frontend --profile beta` | Geçti | Cloudflare workers unset uyarısı beklenen optional risk |
| 2026-06-18 | Local dummy | api-server | `npm run check:beta-env -- --scope api-server --profile beta` | Geçti | Dummy secret değerleri kullanıldı, raw secret basılmadı |
| TBD | Railway beta/prod | frontend/api/aggregator | `railway run ... check:beta-env` | Bekliyor | CLI oturumu gerekli |

## Beta Checklist Bağlantısı

- [Beta Readiness Checklist](/docs/BETA_READINESS_CHECKLIST)
- [Security Architecture](/docs/services/SECURITY_ARCHITECTURE)
- [Market Server Infrastructure](/docs/architecture/MARKET_SERVER_INFRASTRUCTURE)
