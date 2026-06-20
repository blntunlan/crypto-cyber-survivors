# Beta Bundle Splitting

> **Status** live
> Owner: Engineering, Performance

Bu doküman beta sonrası P2 bundle splitting maddesi için uygulanan route-level lazy loading ve Vite chunk stratejisini kaydeder.

## Uygulanan Değişiklikler

| Alan | Dosya | Değişiklik |
|---|---|---|
| Root shell | `App.tsx` | `LazyMotionProvider` root bundle'dan çıkarılıp `React.lazy` ile on-demand yüklendi |
| Landing | `App.tsx` | `LandingPage` static import yerine `React.lazy` ile ayrı chunk'a taşındı |
| Route chunks | `vite.config.ts` | landing, docs, admin, VFX lab ve overlay ekranları için `manualChunks` fonksiyonu eklendi |
| HTML preload | `vite.config.ts` | Lazy route chunk'larının HTML'de baştan preload edilmemesi için `modulePreload` kapatıldı |

## Ayrılan Yüzeyler

| Chunk Grubu | Kapsam |
|---|---|
| `feature-landing` | Landing page ve landing alt bileşenleri |
| `feature-docs` | `DocScreen` dokümantasyon terminali |
| `feature-admin` | Darwin admin/evolution viewer yüzeyi |
| `feature-vfx-lab` | Dev-only VFX preview lab |
| `feature-overlays` | Meta upgrade, challenge ve replay overlay ekranları |
| `vendor-react` | React ve React DOM |
| `vendor-ui` | Framer Motion ve Lucide React |
| `vendor-utils` | Zod, Zustand, Howler ve Nanoid |

## Build Ölçümü

| Metrik | Önceki Rapor | Son Ölçüm |
|---|---:|---:|
| Initial raw payload | 1443.62 kB | 359.07 kB |
| Initial gzip payload | 388.38 kB | 83.66 kB |
| Toplam JS raw | 1965.48 kB | 1964.08 kB |
| Toplam JS gzip | 559.41 kB | 556.74 kB |
| JS dosya sayısı | 25 | 21 |

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | TypeScript doğrulaması geçti |
| `npx vitest run tests/App.test.tsx tests/integration/GameStartFlow.test.tsx` | 2 dosya, 5 test geçti |
| `npm run build` | Production build geçti, 2575 module transform edildi, chunk warning yok |
| Initial payload ölçümü | `dist/index.html` entry + CSS: 359.07 kB raw / 83.66 kB gzip |

## Bilinçli Riskler

- `modulePreload` kapalı olduğu için lazy route chunk'ları gerçekten ihtiyaç anında yüklenir; bu initial payload'ı düşürür ancak ilk tıklamada ilgili route için ek network isteği yaratır.
- CSS halen global build çıktısında 152.40 kB raw / 23.65 kB gzip olarak initial yükleniyor; CSS route splitting ayrı optimizasyon olabilir.
- PNG asset payload riski bu işle çözülmedi; görsel optimizasyon ayrı P2 performans işi olarak kalır.

## Kabul Kararı

- Beta için bundle splitting maddesi kapatıldı: landing, docs, admin, debug-only VFX lab ve overlay yüzeyleri root entry'den ayrıldı.
- Initial payload 388.38 kB gzip seviyesinden 83.66 kB gzip seviyesine indirildi.
