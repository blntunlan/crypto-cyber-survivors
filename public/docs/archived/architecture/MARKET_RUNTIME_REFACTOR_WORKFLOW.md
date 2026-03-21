# Market Runtime Refactor Workflow

## 1. Amac
Bu workflow'un amaci, market-driven gameplay sistemini tek hesap otoriteli, audit edilebilir ve drift olculebilir bir mimariye tasimaktir.

Hedef model:
`MarketService (ingest) -> MarketRuntimeWorker (hesap) -> RuntimeSnapshot (oyun) + SyncQueue (Supabase audit) -> Reconcile (server)`

## 2. Hedef Mimari Prensipleri
1. Oyun aninda tek hesap otoritesi client runtime motorudur.
2. Supabase runtime authority degil, audit ve sync katmanidir.
3. Run sabitleri (`entryPrice`, `position`, `leverage`, `liquidationPrice`) run basinda kilitlenir.
4. Liquidation fiyatı run boyunca degismez; sadece `price` degisir.
5. Indicator ve difficulty hesaplari tek pipeline'dan uretilir.
6. Tum tick ve snapshot verisi idempotent olarak Supabase'a yazilir.
7. Server tarafi ayni tick verisinden reconcile ederek drift olcer.

## 3. Fazlar

## Faz 0 - Hazirlik ve Feature Flag
Kapsam:
1. `legacy | dual | runtime` calisma modlari eklenir.
2. Runtime yolu golge modda calistirilir, oyun davranisi degistirilmez.
3. Konfigurasyon ve telemetry loglari eklenir.

Etkilenen dosyalar:
1. `App.tsx`
2. `hooks/useMarketData.ts`
3. `config/marketRuntime.ts` (yeni)

Basari kriteri:
1. `legacy` modda mevcut davranis birebir korunur.
2. `dual` modda runtime ciktilari loglanir.

## Faz 1 - Runtime Kontratlari
Kapsam:
1. Run constants, tick, snapshot, feed health tipleri tanimlanir.
2. Event payload'lari runtime kontratiyla uyumlu hale getirilir.

Etkilenen dosyalar:
1. `types/marketRuntime.ts` (yeni)
2. `types/events.ts`
3. `types.ts`

Basari kriteri:
1. Runtime ile oyun arasinda tek tip payload kullanimi.

## Faz 2 - Worker Tabanli Hesap Motoru
Kapsam:
1. Worker icinde incremental hesap motoru yazilir.
2. Hesaplar: `rawPnl`, `effectivePnl`, `isLiquidated`, `RSI`, `MACD`, `ATR`, volume normalize, difficulty multipliers.
3. Sequencer ve checksum/hash chain eklenir.

Etkilenen dosyalar:
1. `services/market/runtime/MarketRuntimeWorker.ts` (yeni)
2. `services/market/runtime/MarketCompute.ts` (yeni)
3. `services/market/runtime/MarketRuntimeController.ts` (yeni)
4. `services/market/MarketService.ts`
5. `services/market/MarketCalculator.ts`

Basari kriteri:
1. Worker her tick icin deterministik snapshot uretebilir.
2. Main thread worker snapshot'ini alir.

## Faz 3 - useMarketData Adapter Donusumu
Kapsam:
1. `useMarketData` icindeki hesap mantigi kaldirilir.
2. Hook sadece runtime snapshot subscribe eder ve UI state'e map eder.
3. `DifficultyManager.calculate` cagrisi hook icinden cikartilir.

Etkilenen dosyalar:
1. `hooks/useMarketData.ts`
2. `App.tsx`

Basari kriteri:
1. Hook artik compute degil adapter davranisi gosterir.

## Faz 4 - Game Loop ve Spawn Zinciri Ayrisma
Kapsam:
1. `GameEngine` icindeki `marketIndicatorService.update(...)` kaldirilir.
2. Spawn ve enemy davranislari runtime snapshot girdilerinden beslenir.
3. Global indicator singleton okumalari runtime path'ten temizlenir.

Etkilenen dosyalar:
1. `components/GameEngine.tsx`
2. `services/combat/SpawnSystem.ts`
3. `services/combat/PoolManager.ts`
4. `services/interfaces/IPoolManager.ts`
5. `factories/EnemyFactory.ts` (gerekirse imza uyumu)

Basari kriteri:
1. Market davranisi tek runtime snapshot kanalindan akiyor olmalidir.

## Faz 5 - Difficulty ve AI Pipeline Uyumlama
Kapsam:
1. Difficulty pipeline market verisini runtime snapshot'tan alir.
2. `DifficultyContext` ve `DirectorAdapter` cift kaynak kullanimini birakir.
3. Cycle, warning, shock eventleri yeni pipeline ile korunur.

Etkilenen dosyalar:
1. `services/gameplay/DifficultyManager.ts`
2. `services/difficulty/DifficultyContext.ts`
3. `services/difficulty/DirectorAdapter.ts`
4. `services/difficulty/AIDirector.ts`
5. `hooks/useDifficultyV2.ts`

Basari kriteri:
1. Difficulty hesaplari tek market kaynagindan uretilir.

## Faz 6 - Supabase Sync Queue ve Audit Write Path
Kapsam:
1. IndexedDB tabanli queue yazilir.
2. Tick ve snapshot batch flush stratejisi eklenir.
3. Retry, backoff, ack, idempotency mekanizmalari eklenir.

Etkilenen dosyalar:
1. `services/market/sync/MarketSyncQueue.ts` (yeni)
2. `services/market/sync/MarketSyncClient.ts` (yeni)
3. `services/market/sync/MarketSyncStore.ts` (yeni)
4. `hooks/useMarketData.ts`
5. `services/core/ErrorRecoveryService.ts`
6. `services/auth/GameSessionService.ts`

Basari kriteri:
1. Baglanti kesintisinde veri kaybi olmadan yeniden flush yapabilmek.

## Faz 7 - Supabase Schema ve Reconcile
Kapsam:
1. `run_ticks`, `run_snapshots`, `run_reconcile` tablolari eklenir.
2. Batch ingest edge function eklenir.
3. Reconcile edge function eklenir.

Etkilenen dosyalar:
1. `supabase/migrations/<timestamp>_market_runtime_audit.sql` (yeni)
2. `supabase/functions/ingest-run-market-batch/index.ts` (yeni)
3. `supabase/functions/reconcile-run-market/index.ts` (yeni)

Basari kriteri:
1. `(run_id, seq)` bazli idempotent yazim.
2. Drift raporu uretilmesi.

## Faz 8 - Legacy Temizlik ve Sertlestirme
Kapsam:
1. Runtime path disi kalan cift otorite kodlari deprecate edilir.
2. `MarketStateService` warmup/read/reconcile destek rolune cekilir.
3. Dokumantasyon ve telemetry update edilir.

Etkilenen dosyalar:
1. `services/market/MarketStateService.ts`
2. `services/indicators/MarketIndicatorService.ts`
3. `services/market/MarketEventManager.ts`
4. `types/events.ts`
5. `docs/architecture/MARKET_RUNTIME_ARCHITECTURE.md` (yeni)

Basari kriteri:
1. Runtime path'te cift kaynak kalmamasi.

## 4. Veri Modeli (Supabase)
Zorunlu tablolar:
1. `game_runs`
2. `run_ticks` (PK: `run_id, seq`)
3. `run_snapshots` (PK: `run_id, seq`)
4. `run_reconcile`

Zorunlu alanlar:
1. Tick: `source_ts`, `recv_ts`, `price_q`, `volume_q`, `source`, `hash`.
2. Snapshot: `raw_pnl_bp`, `effective_pnl_bp`, `rsi`, `macd`, `atr_bp`, spawn/enemy multipliers, `checksum`.

## 5. Olay Akisi
1. Run baslar ve run constants kilitlenir.
2. Ingest her tick icin `seq` uretir.
3. Worker snapshot hesaplar.
4. Snapshot oyun sistemlerine event ile verilir.
5. Tick ve snapshot queue'ya yazilir.
6. Queue Supabase'a idempotent batch flush eder.
7. Reconcile drift kontrolu yapar.

## 6. Test Plani
Unit:
1. Worker hesap determinismi.
2. Liquidation sabit fiyat kontrolu.
3. Queue retry/idempotency.
4. Reconcile tolerans kurallari.

Integration:
1. Runtime snapshot -> GameEngine spawn etkisi.
2. Disconnect ve recovery akisi.
3. Offline queue birikme ve reconnect flush.

Etkilenecek test dosyalari:
1. `tests/hooks/useMarketData.test.ts`
2. `tests/hooks/useMarketTimeout.test.ts`
3. `tests/components/GameEngine.test.tsx`
4. `tests/services/MarketService.test.ts`
5. `tests/services/MarketService.integration.test.ts`
6. `tests/services/MarketStateService.test.ts`
7. `tests/services/MarketEventManager.test.ts`
8. `tests/SpawnSystem.test.ts`
9. `tests/services/SpawnSystem.test.ts`
10. `tests/difficulty/DirectorAdapter.test.ts`
11. `tests/DifficultyManager.test.ts`

## 7. Rollout ve Geri Donus
Rollout:
1. Sprint 1: Faz 0-3
2. Sprint 2: Faz 4-6
3. Sprint 3: Faz 7-8

Feature flag:
1. `VITE_MARKET_RUNTIME_MODE=legacy|dual|runtime`

Rollback:
1. Runtime hata durumunda tek adimda `legacy` moda don.
2. Queue ve migration verisi saklanir, runtime path kapatilir.

## 8. Riskler ve Kontroller
Risk:
1. Runtime ve legacy farkli cikti uretebilir.
2. Event semasi degisimi yan etkiler olusturabilir.
3. Queue backpressure performansi etkileyebilir.

Kontrol:
1. `dual` mod fark raporu.
2. Payload versiyonlama (`algoVersion`, `configVersion`).
3. Batch boyutu ve flush frekansi limitleri.

## 9. Definition of Done
1. Runtime path tek hesap otoritesi olmalidir.
2. Liquidation run basinda bir kez hesaplanip sabitlenmelidir.
3. Spawn/difficulty davranislari runtime snapshot ile degismelidir.
4. Supabase audit tablolarina idempotent yazim olmalidir.
5. Reconcile drift raporu uretebilmelidir.
6. `npm run lint && npm run test && npm run build` basarili olmalidir.
