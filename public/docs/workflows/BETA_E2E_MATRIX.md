# Beta E2E Matrix

> **Status** live
> Owner: QA Engineering, Frontend

Bu belge beta adayı için çalıştırılacak Playwright matrisini ve kabul kriterlerini sabitler. Amaç her değişiklikte tüm E2E havuzunu koşmak değil; beta için kritik akış, kalite ve tarayıcı uyumluluğunu ayrı kapılarla ölçmektir.

## Komutlar

| Kapı | Komut | Kapsam |
|---|---|---|
| Critical path | `npm run test:e2e:beta:critical` | Chromium ve mobile Chrome üzerinde fresh user, guest fallback, wallet, game over, cash out ve reconnect smoke |
| Quality path | `npm run test:e2e:beta:quality` | Chromium üzerinde a11y, network error ve FPS smoke |
| Browser matrix | `npm run test:e2e:beta:matrix` | `beta-smoke.spec.ts` için Chromium, mobile Chrome, Firefox ve WebKit |
| Full E2E | `npm run test:e2e` | Tüm Playwright suite ve tüm projeler |

Windows PowerShell local Chrome fallback:

```TERMINAL
$env:PLAYWRIGHT_CHROME_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"; npm run test:e2e:beta:critical
```

## Proje Matrisi

| Proje | Cihaz Profili | Beta Rolü |
|---|---|---|
| `chromium` | Desktop Chrome | Ana desktop kabul kapısı |
| `mobile-chrome` | Pixel 5 | Mobil input, HUD ve viewport smoke |
| `firefox` | Desktop Firefox | Cross-browser DOM/event uyumluluğu |
| `webkit` | Desktop Safari | Safari/WebKit rendering ve input riski |

## Suite Eşlemesi

| Suite | Critical | Quality | Matrix | Not |
|---|---|---|---|---|
| `e2e/beta-smoke.spec.ts` | Evet | Hayır | Evet | Minimum beta release smoke |
| `e2e/mobile-touch-controls.spec.ts` | Destekleyici | Hayır | Mobile Chrome | Gerçek cihaz sign-off yerine geçmez |
| `e2e/mobile-hud.spec.ts` | Destekleyici | Hayır | Mobile Chrome | Small-screen HUD regresyonu |
| `e2e/a11y/accessibility.spec.ts` | Hayır | Evet | Chromium | Beta erişilebilirlik smoke |
| `e2e/network-error.spec.ts` | Hayır | Evet | Chromium | API/network hata toleransı |
| `e2e/performance/fps.spec.ts` | Hayır | Evet | Chromium | Hızlı FPS smoke; 5 dk cihaz profili yerine geçmez |

## Kabul Kriteri

- Critical path beta adayı her build için yeşil olmalı.
- Quality path release candidate freeze öncesi yeşil olmalı.
- Browser matrix beta açılışı öncesi en az bir kez yeşil olmalı.
- Firefox/WebKit browser binary eksikse sonuç bloklu kabul edilir; `npx playwright install firefox webkit` sonrası tekrar koşulur.
- Gerçek cihaz mobil ve 5 dakikalık FPS profili bu matrisin dışında P0 manuel sign-off olarak kalır.

## Local Runner Notları

- `PLAYWRIGHT_CHROME_EXECUTABLE_PATH` sadece `chromium` ve `mobile-chrome` projelerine uygulanır.
- Firefox ve WebKit projeleri Playwright-managed browser binary ister.
- Browser kurulumu takılırsa kalan `playwright install` süreçleri kapatılır, `C:\Users\bulen\AppData\Local\ms-playwright` altındaki eksik `firefox-1509` veya `webkit-2248` cache dizini temizlenir ve kurulum tekrar denenir.

## Browser Binary Remediation

| Adım | Komut / Kontrol | Kabul |
|---|---|---|
| Version doğrula | `npx playwright --version` | Repo Playwright sürümüyle uyumlu |
| Cache kontrolü | `Test-Path "$env:LOCALAPPDATA\ms-playwright\firefox-1509\firefox\firefox.exe"` | `True` |
| Cache kontrolü | `Test-Path "$env:LOCALAPPDATA\ms-playwright\webkit-2248\Playwright.exe"` | `True` |
| Retry install | `npx playwright install firefox webkit` | Timeout olmadan tamamlanır |
| Matrix retry | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:matrix` | Chromium, mobile Chrome, Firefox ve WebKit yeşil |

## Binary Blokaj Kuralları

- `firefox.exe` veya `Playwright.exe` yoksa Firefox/WebKit sonucu test failure değil environment blocker olarak kaydedilir.
- `npx playwright install firefox webkit` 15 dakika içinde tamamlanmazsa aynı oturumda tekrar döngüye sokulmaz.
- Eksik cache temizliği yalnızca `%LOCALAPPDATA%\ms-playwright` altında doğrulanan Playwright browser dizinlerine uygulanır.
- Blokaj kapatılmadan önce matrix tamamı yeniden koşulmalı; Chromium/mobile Chrome geçişi tek başına browser matrix maddesini kapatmaz.

## Kanıt Kaydı

| Tarih | Kapı | Komut | Sonuç |
|---|---|---|---|
| 2026-06-18 | Critical path desktop | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npx playwright test e2e/beta-smoke.spec.ts --project=chromium` | 6 test geçti |
| 2026-06-18 | Critical path desktop + mobile | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:critical` | 12 test geçti; `--workers=2` ile resource contention engellendi |
| 2026-06-18 | Quality path Chromium | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:quality` | 12 test geçti; a11y, network/error handling ve FPS smoke yeşil |
| 2026-06-18 | Browser matrix | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:matrix` | Chromium ve mobile Chrome 12 test geçti; Firefox/WebKit önce Chrome fallback global config hatasıyla, sonra eksik Playwright browser binary nedeniyle bloklandı |
| 2026-06-18 | Browser install | `npx playwright install firefox webkit`; `npx playwright install firefox` | Kurulum 10 dk ve 5 dk timeout aldı; `firefox.exe` ve `Playwright.exe` oluşmadı, eksik local browser binary blokajı sürüyor |
| 2026-06-19 | Browser matrix retry | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:matrix` | Chromium ve mobile Chrome 12 test geçti; Firefox 6 test `firefox-1509\firefox\firefox.exe` eksikliğiyle, WebKit 6 test `webkit-2248\Playwright.exe` eksikliğiyle bloklandı |
| 2026-06-19 | Browser install retry | `npx playwright install firefox webkit` | 6 dk timeout aldı; `firefox-1509` cache dizini oluştu ama `firefox.exe` yok, `webkit-2248\Playwright.exe` yok; kalan Playwright install node süreçleri kapatıldı |
| 2026-06-19 | Browser install retry | `npx playwright install firefox webkit` | Eksik `firefox-1509` cache temizlendi; kurulum 15 dk timeout aldı. `firefox.exe` ve `Playwright.exe` oluşmadı; kalan Playwright install node süreçleri kapatıldı. Browser matrix hâlâ Firefox/WebKit binary blokajında |
| 2026-06-19 | Browser binary remediation | [Browser Binary Remediation](#browser-binary-remediation) ve blokaj kuralları eklendi | Firefox/WebKit kurulumu tamamlanmadan matrix kapatılamaz; aynı oturumda tekrar install döngüsüne girilmeyecek |
| 2026-06-20 | Browser binary remediation | Playwright CDN ZIP'leri manuel indirildi ve cache'e açıldı | `firefox-1509\firefox\firefox.exe`, `webkit-2248\Playwright.exe`, `ffmpeg-1011\ffmpeg-win64.exe` ve `winldd-1007\PrintDeps.exe` doğrulandı |
| 2026-06-20 | Browser matrix | `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=... npm run test:e2e:beta:matrix` | Chromium, mobile Chrome, Firefox ve WebKit üzerinde 24 test geçti |
