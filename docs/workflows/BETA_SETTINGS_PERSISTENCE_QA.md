# Beta Settings Persistence QA

> **Status** live
> Owner: Engineering, QA

Bu doküman beta öncesi ayarların refresh sonrası korunması için doğrulanan storage sözleşmesini ve test kanıtlarını toplar.

## Kapsam

| Tercih | Storage Sahibi | Kabul Kriteri |
|---|---|---|
| Mute | `stores/gameStore.ts` / `crypto-survivors-store` | `audio.isMuted` refresh sonrası aynı kalır |
| Master, SFX, music volume | `stores/gameStore.ts` / `crypto-survivors-store` | Volume değerleri ve sound mixer kategori değerleri aynı kalır |
| Quality profile | `services/system/DeviceBenchmarkService.ts` / `ccs_manual_perf_profile` | Manual profile refresh sonrası auto benchmark sonucuyla ezilmez |
| Mobile control settings | `stores/gameStore.ts` / `crypto-survivors-store` | Control type, joystick side/size, dash method, haptic ve drag feedback korunur |
| Reduced effects | `stores/gameStore.ts` / `graphics.reducedMotion` | Reduced motion tercihi render/effects path için korunur |

## Doğrulanan Akış

- Zustand persistence contract `crypto-survivors-store` altında `audio`, `graphics`, `gameplay`, `mobile`, `progress`, `hasSeenTutorial` ve `lastPlayedVersion` alanlarını saklar.
- `useGameStore.persist.rehydrate()` ile simüle edilen refresh, mute/volume, controls ve reduced effects değerlerini geri yükler.
- Eski audio payload içinde eksik kategori olursa merge stratejisi `DEFAULT_CATEGORY_VOLUMES` ile tamamlar.
- Quality profile store dışında tutulur; `DeviceBenchmarkService.resetStateForTesting()` ile simüle edilen yeni servis başlangıcı `ccs_manual_perf_profile` değerini okur.
- Settings panel auto-save mesajı kullanıcıya ayrı kayıt butonu gerekmediğini gösterir.

## Kanıt

| Komut | Kapsam | Sonuç |
|---|---|---|
| `npx vitest run tests/stores/gameStore.test.ts tests/services/DeviceBenchmarkService.test.ts` | Store rehydrate, audio/mute, control settings, reduced effects ve quality profile manual reload | Geçti |

## Beta Notları

- Reduced motion şu anda store ve runtime render path içinde korunuyor; settings UI içinde ayrı toggle görünürlüğü ayrı UX kararıdır.
- Quality profile auto moda alınırsa `ccs_manual_perf_profile` silinir ve benchmark/cache sonucu tekrar kaynak olur.
- Bu madde gerçek tarayıcı refresh manuel smoke ile de desteklenmeli, ancak beta checklist kabulü için store ve servis seviyesindeki refresh kontratı otomasyonla sabitlendi.
