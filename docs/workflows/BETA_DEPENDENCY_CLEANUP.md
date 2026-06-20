# Beta Dependency Cleanup

> **Status** live
> Owner: Engineering, Release

Bu rapor beta audit sırasında gereksiz görünen runtime bağımlılıkların kullanım doğrulamasını ve kaldırma kararını kaydeder.

## Kaldırılan Paketler

| Paket | Kapsam | Karar Gerekçesi |
|---|---|---|
| `ami` | dependencies | Kod tabanında import, require veya script kullanımı bulunmadı |
| `bs58` | dependencies | Kod tabanında import, require veya script kullanımı bulunmadı |
| `base-x` | transitive | `bs58` kaldırılınca lockfile'dan otomatik çıktı |

## Korunan Paketler

| Paket | Gerekçe |
|---|---|
| `@commitlint/*` | `commitlint.config.js` üzerinden commit gate için kullanılıyor |
| `@testing-library/jest-dom` | `tests/setup.ts` içinde test matcher setup'ı için kullanılıyor |
| `@vitest/coverage-v8` | Vitest coverage provider olarak gerekli |
| `rimraf` | `docs:clean` script'i tarafından kullanılıyor |
| Type paketleri | TypeScript ve test derlemesi için gerekli |

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm uninstall ami bs58` | `ami`, `bs58` ve transitive `base-x` lockfile'dan kaldırıldı |
| `npm ls ami bs58 --depth=0` | Paket ağacında eşleşme kalmadı |
| `rg -n '"ami"|"bs58"|node_modules/(ami|bs58)|node_modules\\(ami|bs58)' package.json package-lock.json . -g "!node_modules" -g "!dist" -g "!coverage" -S` | Repository ve lockfile içinde kalan referans bulunmadı |
| `npm run typecheck` | TypeScript doğrulaması geçti |
| `npm run build` | Production build geçti |

## Bilinçli Riskler

- `npm uninstall` sonrası npm audit çıktısı halen 7 vulnerability raporluyor: 1 low, 3 moderate, 3 high.
- Bu çalışma unused dependency temizliğiyle sınırlıdır; vulnerability remediation ayrı güvenlik maddesi olarak ele alınmalıdır.
- `eslint-config-prettier` bu adımda kaldırılmadı; flat config politikasıyla birlikte ayrıca değerlendirilmelidir.

## Kabul Kararı

- Beta için unused runtime dependency riski kapatıldı: kullanılmayan `ami` ve `bs58` kaldırıldı, typecheck ve production build geçti.
- Geniş çaplı dependency upgrade veya audit fix bu işin kapsamı dışında tutuldu.
