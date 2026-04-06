# Gameplay Screen Modularization Workflow

## 1. Amac
Bu workflow'un amaci, gameplay ekranindaki buyuk orkestrasyon yukunu kademeli olarak parcalamak ve davranis degisimi yaratmadan moduler bir yapiya gecmektir.

Hedef model:
`App (session/screen state) -> GameplaySessionOrchestrator -> GameLoopCoordinator (phase pipeline) -> Systems -> Renderer/HUD`

## 2. Hedef Mimari Prensipleri
1. Tek frame authority `GameLoopCoordinator` olmalidir.
2. `GameEngine` React shell olmali, oyun mantigi phase modullerinde calismalidir.
3. Market verisi tek authority kaynagindan okunmalidir.
4. `EventBus` veri tasima degil, yan etki ve bildirim katmani olmalidir.
5. Zaman kaynagi tek olmalidir (`TimeService`), `Date.now()` hot path'te kullanilmamalidir.
6. Her extraction adimi davranis esdegerligi testleriyle korunmalidir.
7. Rollout feature flag ile yapilmali, tek adim rollback mumkun olmalidir.

## 3. Fazlar

## Faz 0 - Baseline ve Guvenlik Cemberi
Kapsam:
1. Gameplay loop davranisini baseline almak icin mevcut testleri stabilize et.
2. FPS, frame time, spawn rate, enemy count, event throughput metriklerini baseline olarak kaydet.
3. Refactor boyunca degismeyecek acceptance kontrol listesini olustur.

Etkilenen dosyalar:
1. `tests/components/GameEngine.test.tsx`
2. `tests/services/gameplay/CoreGameplayLoop.test.ts`
3. `tests/services/gameplay/PortalSystemV2.test.ts`
4. `tests/services/physics/CollisionSystem.test.ts`
5. `docs/reports/` (yeni baseline raporu)

Basari kriteri:
1. Baseline davranis raporu olusmus olmalidir.
2. Refactor sonrasi karsilastirma icin net KPI seti olmalidir.

## Faz 1 - Gameplay Kontratlari ve TickContext
Kapsam:
1. `TickContext`, `WorldState`, `PhaseResult` tiplerini tanimla.
2. Phase API sozlesmelerini belirle (`InputPhase`, `CombatPhase`, `PhysicsPhase`, `RenderPhase`).
3. Event payload tutarsizliklarini tip seviyesinde normalize etmeye basla.

Etkilenen dosyalar:
1. `types/` altinda yeni gameplay kontrat dosyalari
2. `types/events.ts`
3. `components/GameEngine.tsx` (kontrat adaptasyonu)

Basari kriteri:
1. Frame update'e giren/verilen veri tek kontrat uzerinden gecmelidir.
2. Yeni kontratlar mevcut sistemi kirilmadan sarmalamalidir.

## Faz 2 - GameEngine Phase Split (Davranis Esdeger)
Kapsam:
1. `components/GameEngine.tsx` icindeki buyuk update blogunu faz fonksiyonlarina ayir.
2. Cagri sirasi korunarak `updateFrameClock -> updatePlayerMotion -> updateCombat -> updateSpawn -> updatePhysics -> syncUi` akisini olustur.
3. `GameEngine` icinde kalan sorumlulugu sadece orchestration + canvas lifecycle ile sinirla.

Etkilenen dosyalar:
1. `components/GameEngine.tsx`
2. `services/gameplay/phases/` (yeni)
3. `services/combat/` (adaptasyonlar)

Basari kriteri:
1. Behavior degismeden testler gecmelidir.
2. `GameEngine` satir sayisi ve sorumluluk kapsami anlamli sekilde dusmelidir.

## Faz 3 - Market Authority Birlesimi
Kapsam:
1. `useMarketData` compute/orchestrator rolunden adapter rolune cekilir.
2. `GameEngine` market snapshot'u tek kanaldan okur.
3. `legacy|dual|runtime` modunda fark olcumleri korunur.

Etkilenen dosyalar:
1. `hooks/useMarketData.ts`
2. `components/GameEngine.tsx`
3. `services/market/pipeline/MarketSignalPipeline.ts`
4. `config/marketRuntime.ts`

Basari kriteri:
1. Market kaynakli gameplay etkileri tek snapshot kanalindan akar.
2. Dual mod fark raporu kabul edilen tolerans altinda kalir.

## Faz 4 - Event Contract Harden ve Typed Emitters
Kapsam:
1. Kritik eventler icin typed emitter helper ekle (`emitEnemyKilled`, `emitPlayerHit`, vb.).
2. Legacy event field uyumlulugu adapter ile korunur.
3. Event ordering'e bagli sistemler icin deterministic siralama kontrolleri eklenir.

Etkilenen dosyalar:
1. `services/core/EventBus.ts`
2. `types/events.ts`
3. `services/combat/physics/CombatResolutionService.ts`
4. `services/gameplay/PortalSystem.ts`
5. `services/gameplay/DifficultyManager.ts`

Basari kriteri:
1. Stringly-typed event kullanimi azalir.
2. Event semasi degisimi run-time regressions yaratmaz.

## Faz 5 - Sistem Extraction (Spawn, Collision, Portal)
Kapsam:
1. `SpawnSystem.update` icin `SpawnFrameInput` DTO gecisi yap.
2. `CollisionSystem` icini domain bazli modullere ayir (player-contact, projectile-hit, interactable-hit).
3. Portal V1/V2 icin `IPortalSystem` adapter ekle ve tek runtime sec.

Etkilenen dosyalar:
1. `services/combat/SpawnSystem.ts`
2. `services/combat/physics/CollisionSystem.ts`
3. `services/gameplay/PortalSystem.ts`
4. `services/gameplay/PortalSystemV2.ts`
5. `services/gameplay/interfaces/` (yeni)

Basari kriteri:
1. API imzalari sade ve okunabilir olmalidir.
2. Portal davranisi tek implementasyonla deterministik olmalidir.

## Faz 6 - Session ve Screen Orchestration Ayrisma
Kapsam:
1. `App.tsx` icindeki run start/reset/screen transition logic'i `GameplaySessionOrchestrator` katmanina tasi.
2. `useGameFlowController` ve `useGameEvents` sorumluluklarini sinirla.
3. Menu, pause, level-up, gameover gecislerini tek transition authority'ye bagla.

Etkilenen dosyalar:
1. `App.tsx`
2. `hooks/useGameFlowController.ts`
3. `hooks/useGameEvents.ts`
4. `services/core/GameStateMachine.ts`
5. `services/session/` (yeni)

Basari kriteri:
1. Screen transitions tek kaynaktan yonetilir.
2. `App.tsx` orchestration karmasasi belirgin sekilde azalir.

## Faz 7 - Test Genisletme ve Performans Guardrail
Kapsam:
1. Phase-level unit testler yaz.
2. Frame order ve event order icin regression test ekle.
3. Gameplay E2E smoke ve performans testlerini refactor sonrasi tekrarla.

Etkilenen dosyalar:
1. `tests/services/gameplay/` (yeni phase testleri)
2. `tests/components/GameEngine.test.tsx`
3. `e2e/game-flow.spec.ts`
4. `e2e/performance/fps.spec.ts`
5. `e2e/performance/memory-leak.spec.ts`

Basari kriteri:
1. `npm run lint && npm run test && npm run build` basarili olmalidir.
2. FPS/frame-time sapmasi baseline toleransi icinde kalmalidir.

## Faz 8 - Legacy Temizlik ve Dokumantasyon
Kapsam:
1. Artik kullanilmayan yolaklar ve write-only registry kullanimlari temizlenir.
2. Mimari dokumanlar gercek implementasyonla hizalanir.
3. Operasyonel runbook ve rollback notlari guncellenir.

Etkilenen dosyalar:
1. `services/core/EngineRegistry.ts`
2. `docs/architecture/` altindaki ilgili dokumanlar
3. `docs/reports/` refactor sonuc raporu

Basari kriteri:
1. Cift authority ve dead-path kodlari minimuma iner.
2. Dokuman drift'i kapanir.

## 4. Onerilen Hedef Klasor Yapisi
1. `services/gameplay/orchestrator/GameplaySessionOrchestrator.ts`
2. `services/gameplay/loop/GameLoopCoordinator.ts`
3. `services/gameplay/phases/InputPhase.ts`
4. `services/gameplay/phases/CombatPhase.ts`
5. `services/gameplay/phases/SpawnPhase.ts`
6. `services/gameplay/phases/PhysicsPhase.ts`
7. `services/gameplay/phases/EffectsPhase.ts`
8. `services/gameplay/contracts/TickContext.ts`

## 5. Test Plani
Unit:
1. Phase davranis testleri (sirali update, state mutasyonlari).
2. Typed event helper compatibility testleri.
3. Portal adapter davranis testleri.

Integration:
1. Market tick -> snapshot -> spawn etkisi.
2. Pause/resume -> time continuity.
3. Level-up/freeze -> physics ve render senkronu.

E2E:
1. Start -> play -> pause -> resume -> gameover -> reset akisi.
2. Performance smoke (fps/memory).

## 6. Rollout ve Geri Donus
Rollout:
1. Sprint 1: Faz 0-2
2. Sprint 2: Faz 3-5
3. Sprint 3: Faz 6-8

Feature flag:
1. `VITE_GAMEPLAY_LOOP_MODE=legacy|phased`
2. `VITE_MARKET_RUNTIME_MODE=legacy|dual|runtime`

Rollback:
1. `legacy` moda donerek phased pipeline devre disi birakilir.
2. Event adapter ve typed emitter katmani korunur.
3. Temizlik fazina gecmeden once 1 sprint gozlem yapilir.

## 7. Riskler ve Kontroller
Risk:
1. Event ordering farki gameplay dengesini bozabilir.
2. Clock source farki pause/resume drift uretebilir.
3. Fazlara bolme sirasinda performans overhead olusabilir.

Kontrol:
1. Frame-order snapshot testleri.
2. Tek saat kaynagi zorunlulugu (`TimeService`).
3. Perf budget KPI takibi (frame time p95, entity count, GC spikes).

## 8. Definition of Done
1. Gameplay loop phase tabanli mimariye gecmis olmalidir.
2. `GameEngine` sadece shell + orchestration rolunde kalmalidir.
3. Market etkileri tek authority kanalindan alinmalidir.
4. Session/screen transitions tek authority tarafindan yonetilmelidir.
5. Regression testleri ve performans kriterleri baseline ile uyumlu olmalidir.
6. `npm run lint && npm run test && npm run build` basarili olmalidir.
