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

## Railway Kabul Kriteri

| Kontrol | Kabul |
|---|---|
| CLI oturumu | `railway whoami --json` başarılı olmalı |
| Project link | `railway status --json` doğru project ve environment göstermeli |
| Frontend service | `--scope frontend --profile beta` `0` exit code ile bitmeli |
| API service | `--scope api-server --profile beta` `0` exit code ile bitmeli |
| Aggregator service | `--scope market-aggregator --profile beta` `0` exit code ile bitmeli |
| Secret hygiene | Çıktıda raw secret, token, DB URL veya private key değeri bulunmamalı |
| Cloudflare optional config | Oracle ve validator URL'leri birlikte set veya birlikte unset olmalı |

## Railway Evidence Formatı

```text
Date: YYYY-MM-DD
Operator: <name>
Railway project: <project-name>
Environment: beta | production
Frontend service: <service-name> => pass | fail
API service: <service-name> => pass | fail
Aggregator service: <service-name> => pass | fail
Notes: <redacted, no raw secrets>
```

## Bloklayıcı Durumlar

- Railway CLI oturumu yoksa bu madde kapatılamaz.
- Herhangi bir service için validator fail olursa beta çıkışı bloklanır.
- `VITE_VERIFY_COINS_ONLY=false`, debug API açık, HTTP URL veya placeholder secret beta/prod ortamında bloklayıcıdır.
- Evidence içine raw secret değeri girildiyse kayıt silinip redacted formatla yeniden alınmalı.

## Sign-off Kaydı

| Tarih | Ortam | Service | Komut | Sonuç | Not |
|---|---|---|---|---|---|
| 2026-06-18 | Local dummy | frontend | `npm run check:beta-env -- --scope frontend --profile beta` | Geçti | Cloudflare workers unset uyarısı beklenen optional risk |
| 2026-06-18 | Local dummy | api-server | `npm run check:beta-env -- --scope api-server --profile beta` | Geçti | Dummy secret değerleri kullanıldı, raw secret basılmadı |
| 2026-06-20 | Railway CLI | auth preflight | `railway whoami --json`; `railway status --json` | Bloklu | CLI 4.66.0 kurulu, OAuth `invalid_grant` / unauthorized; `railway login` gerekli |
| 2026-06-20 | Railway production | frontend | `railway run --service crypto-survivors --environment production -- npm run check:beta-env -- --scope frontend --profile beta` | Geçti | Optional Cloudflare worker URL warning kabul edildi; raw secret basılmadı |
| 2026-06-20 | Railway production | api-server | `railway run --service market-server --environment production -- npm run check:beta-env -- --scope api-server --profile beta` | Geçti | Raw secret basılmadı |
| 2026-06-20 | Railway production | market-aggregator | `railway run --service market-aggregator --environment production -- npm run check:beta-env -- --scope market-aggregator --profile beta` | Geçti | Raw secret basılmadı |

## Beta Checklist Bağlantısı

- [Beta Readiness Checklist](/docs/BETA_READINESS_CHECKLIST)
- [Security Architecture](/docs/services/SECURITY_ARCHITECTURE)
- [Market Server Infrastructure](/docs/architecture/MARKET_SERVER_INFRASTRUCTURE)
