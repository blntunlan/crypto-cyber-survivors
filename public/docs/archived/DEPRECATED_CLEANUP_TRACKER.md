# Deprecated Cleanup Tracker

Bu dosya, kod izlerinden tespit edilen ve tek tek kaldırılabilecek deprecated/legacy adaylarını takip eder.

Durum etiketleri:
- `[HIGH]`: Kaldırma adayı çok güçlü (aktif kullanım yok veya yalnızca tip seviyesinde kalmış).
- `[MEDIUM]`: Muhtemel aday, kaldırmadan önce kısa doğrulama gerekir.
- `[LOW]`: Opsiyonel temizlik; ürün kararına bağlı.

## Adaylar

- [x] `[HIGH]` `useAppInitialization` içindeki legacy nickname API
  - Konum: `hooks/useAppInitialization.ts` (`needsNickname`, `setNeedsNickname`)
  - Kanıt: Uygulama tarafında sadece `isInitialized` kullanılıyor (`App.tsx`).
  - Not: Şu anda hook içinde “always false” olarak tutuluyor.

- [x] `[HIGH]` Emit edilmeyen deprecated event tipleri
  - Konum: `types/events.ts` (`wavePhaseChange`, `bossWaveStart`, `bossWaveEnd`)
  - Kanıt: Repo taramasında bu event adları sadece `types/events.ts` içinde geçiyor; emit/listener yok.
  - Not: AI Director V2 notları eventlerin artık üretilmediğini söylüyor.

- [x] `[HIGH]` Kullanılmayan legacy cycle metodları
  - Konum: `services/gameplay/DifficultyManager.ts` (`getCycleNumber`, `getCycleProgress`, `getTimeRemainingInCycle`)
  - Kanıt: Aramada sadece tanım satırları bulundu, çağrım yok.
  - Not: Metodların üzerinde `@deprecated` var.

- [x] `[HIGH]` Kullanımsız legacy phase map
  - Konum: `types/metrics.ts` (`LEGACY_PHASE_MAP`)
  - Kanıt: Repo genelinde sadece tanım satırı var, kullanım yok.

- [x] `[HIGH]` `DifficultyOutput` deprecated alias alanları
  - Konum: `services/gameplay/DifficultyTypes.ts`, `services/gameplay/DifficultyManager.ts`
  - Kanıt: `enemyHealth`, `gemValueMultiplier`, `factors` aliasları üretim kodunda tüketilmiyordu.
  - Not: `DifficultyOutput` artık doğrudan `DifficultyOutputV2` aliası.

- [x] `[HIGH]` `WAVE_PHASES` legacy export kaldırımı
  - Konum: `services/difficulty/constants.ts`, `services/difficulty/index.ts`
  - Kanıt: `WAVE_PHASES` üretim kodunda kullanılmıyordu; sadece legacy test beklentisinde yer alıyordu.

- [x] `[MEDIUM]` `navigator.platform` deprecated kullanımı kaldırımı
  - Konum: `services/analytics/PerformanceTracker.ts`
  - Kanıt: Supabase sync payload’ında deprecated `navigator.platform` kullanılıyordu.
  - Not: `userAgentData.platform` + `userAgent` fallback platform çıkarımı ile değiştirildi.

- [x] `[LOW]` `beforeunload.returnValue` legacy desteğinin kaldırılması
  - Konum: `hooks/useBeforeUnload.ts`
  - Kanıt: Hook içinde deprecated `returnValue` set edilerek legacy tarayıcı davranışı hedefleniyordu.
  - Risk: Çok eski tarayıcılarda “sayfadan ayrılma uyarısı” davranışı zayıflayabilir.

- [x] `[LOW]` Testlerde deprecated API suppressions temizliği
  - Konum: `tests/DebugService.test.ts`, `tests/ScreenService.test.ts`
  - Kanıt: `@typescript-eslint/no-deprecated` suppressions kaldırıldı; testler modern erişimle güncellendi.

- [x] `[LOW]` Deprecated ibareli eski yorum metinlerinin temizliği
  - Konum: `components/hud/AccountHealthPremium.tsx`, `tests/components/hud/AccountHealthPremium.test.tsx`, `tests/YoyoAnalysis.test.ts`, `tests/SpatialGrid.test.ts`, `railway-market-server/src/services/supabaseService.ts`
  - Kanıt: Davranış değiştirmeden güncel terminolojiye çevrildi (`removed`, `retired`, `legacy`).

- [x] `[HIGH]` Üretimde kullanılmayan gameplay servislerinin kaldırılması
  - Konum: `services/gameplay/GameplayValidator.ts`, `services/gameplay/ShopService.ts`, `services/gameplay/orchestrator/*`
  - Kanıt: Uygulama kodunda (App/components/hooks/services) import/referans yoktu; sadece testlerde kullanılıyordu.
  - Not: İlgili testler (`tests/services/GameplayValidator.test.ts`, `tests/services/ShopSupabase.test.ts`, `tests/services/gameplay/ShopService.test.ts`, `tests/services/gameplay/GameplaySessionOrchestrator.test.ts`, `tests/freshness/services/gameplay/ShopService.test.ts`) kaldırıldı.

- [x] `[LOW]` Kullanılmayan gameplay export temizliği
  - Konum: `services/gameplay/CoinService.ts`, `services/gameplay/DifficultyManager.ts`
  - Kanıt: `CoinEarnedEvent` ve `DifficultyManagerClass` dışarıda referanslanmıyordu.

- [x] `[MEDIUM]` `WavePhase` legacy değerlerinin daraltılması
  - Konum: `services/difficulty/types.ts`, `types/metrics.ts`
  - Kanıt: Oyun akışı V2’de fiilen `active` fazını kullanıyor; eski fazlar compatibility için tutulmuş.
  - Risk: Metrics/test tarafında (`climax` vb.) beklentiler kırılabilir.

- [x] `[MEDIUM]` `SpatialGrid.getNearby` legacy API
  - Konum: `services/combat/SpatialGrid.ts`, `services/combat/physics/PhysicsTypes.ts`
  - Kanıt: `getNearby` deprecated; pratikte test ve interface uyumluluğunda kalmış görünüyor.
  - Risk: Physics interface beklentileri etkilenebilir.

- [x] `[MEDIUM]` Commented-out legacy method
  - Konum: `services/combat/physics/CombatResolutionService.ts` (`spawnRSIBuffForEnemy` yorum bloğu)
  - Kanıt: Metot çağrısı aktif değil, blok komple yorumda.
  - Not: Temizlik amaçlı kaldırılabilir.

- [x] `[LOW]` Dev-only `AITrainerOverlay`
  - Konum: `components/admin/AITrainerOverlay.tsx`, `App.tsx`
  - Kanıt: Sadece `import.meta.env.DEV` altında render ediliyor.
  - Risk: İç geliştirme/deneysel eğitim akışını kullanan ekip üyeleri etkilenebilir.

## Önerilen Sıra (En Güvenli -> Daha Riskli)

1. `useAppInitialization` legacy nickname API temizliği
2. `types/events.ts` deprecated ve emit edilmeyen event isimleri
3. `DifficultyManager` legacy cycle metodları
4. `LEGACY_PHASE_MAP` kaldırımı
5. `DifficultyOutput` deprecated alias alanları
6. `WAVE_PHASES` legacy export kaldırımı
7. `navigator.platform` deprecated kullanımı kaldırımı
8. `beforeunload.returnValue` legacy desteğinin kaldırılması
9. Testlerde deprecated API suppressions temizliği
10. Deprecated ibareli eski yorum metinlerinin temizliği
11. Üretimde kullanılmayan gameplay servislerinin kaldırılması
12. Kullanılmayan gameplay export temizliği
13. Commented-out legacy method temizliği
14. `SpatialGrid.getNearby` ve interface daraltması
15. `WavePhase` legacy literal daraltması
16. `AITrainerOverlay` (ürün kararı sonrası)
