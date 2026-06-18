# Mobile Beta QA Checklist

> **Status** live
> Owner: Engineering, QA

Bu belge beta öncesi mobil input ve küçük ekran doğrulamasının manuel cihaz üstünde yürütülecek kabul listesidir. Playwright mobile emülasyonu destek kanıtıdır; gerçek cihaz sign-off yerine geçmez.

## Kapsam

- iOS Safari ve Android Chrome üzerinde gerçek cihaz testi yapılır.
- Minimum bir küçük telefon, bir modern telefon ve mümkünse bir tablet profili kullanılır.
- Her senaryo için cihaz, işletim sistemi, tarayıcı, ekran yönü ve sonuç kaydedilir.
- Kritik hata bulunursa `Beta Readiness Checklist` içindeki mobile input P0 maddesi kapatılmaz.

## Otomasyon Ön Koşulu

| Komut | Beklenen Sonuç |
|---|---|
| `npx vitest run tests/MobileControls.test.tsx tests/components/mobile/DashButton.test.tsx tests/hooks/useGameInput.test.ts` | Mobil kontrol unit testleri geçer |
| `npx vitest run tests/components/GameUI.test.tsx tests/integration/MobilePauseButton.test.ts tests/hooks/useCycleDecision.test.ts` | Pause ve cash-out ilişkili unit/integration testleri geçer |
| `npx playwright test e2e/mobile-touch-controls.spec.ts --project=mobile-chrome` | Touch, dash, orientation, offline, slow network ve stress suite geçer |
| `npx playwright test e2e/mobile-hud.spec.ts --project=mobile-chrome` | Küçük ekran HUD ve overlap suite geçer |

## Gerçek Cihaz Kabul Listesi

- [ ] **Joystick veya drag movement**: parmak hareketi gecikmesiz yön değiştirir; input bırakıldığında karakter durur.
- [ ] **Dash input**: dash butonu veya ikinci dokunuş çalışır; cooldown görseli ve tekrar basma davranışı net görünür.
- [ ] **Pause hitbox**: pause butonu drag overlay üstündeyken de tek dokunuşla açılır.
- [ ] **Cash out / portal exit**: cycle decision ekranında cash out dokunmatik olarak seçilir ve wallet refresh sonrası bakiye güncellenir.
- [ ] **Orientation değişimi**: portrait → landscape → portrait geçişinde HUD ve input kaybolmaz.
- [ ] **Small-screen HUD**: iPhone SE / düşük Android genişliğinde live feed, timer, pause ve health UI üst üste binmez.
- [ ] **Safe area**: notch, browser bar ve home indicator alanlarında kritik buton kalmaz.
- [ ] **Touch hitbox**: pause, dash, settings ve cycle karar butonları minimum 44px etkin alan hissi verir.
- [ ] **Offline ve reconnect**: oyun devam eder, market disconnected state UI’ı inputu kilitlemez.
- [ ] **Thermal / uzun run**: 5 dakikalık oynanışta input gecikmesi belirgin artmaz.

## Sign-off Kaydı

| Tarih | Cihaz | OS / Browser | Senaryolar | Sonuç | Not |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | Bekliyor | Gerçek cihaz QA yapılmadı |

## Beta Checklist Bağlantısı

- [Beta Readiness Checklist](/docs/BETA_READINESS_CHECKLIST)
- [Mobile Input System](/docs/systems/MOBILE_INPUT_SYSTEM)
