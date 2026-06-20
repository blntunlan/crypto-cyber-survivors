# Beta Coverage Risk Reduction

> **Status** live
> Owner: Engineering, QA

Bu doküman beta öncesi coverage risk maddesi için eklenen hedefli testleri ve kalan bilinçli riskleri kaydeder.

## Hedeflenen Alanlar

| Alan | Test Dosyası | Eklenen Kapsam |
|---|---|---|
| Inventory | `tests/services/InventoryService.test.ts` | Revive consumable tek kullanımlık davranış, `kill_all` / `full_heal` instant EventBus etkileri, player seçilmeden debug state |
| Spawner | `tests/components/hud/BuffGemSpawner.test.ts` | Negative buff force-spawn kategorisi ve expired gem recycle sonrası yeni property reset davranışı |
| GameEngine edge | `tests/components/GameEngine.test.tsx` | `runtimeDpr=99` clamp davranışı ve canvas memory guard |
| Renderer | `tests/renderers/EffectRenderer.test.ts` | `reducedMotion` açıkken speed lines ve momentum overlay skip, market ambiance düşük-motion path |

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npx vitest run tests/services/InventoryService.test.ts tests/components/hud/BuffGemSpawner.test.ts tests/components/GameEngine.test.tsx` | 3 dosya, 34 test geçti |
| `npx vitest run tests/services/InventoryService.test.ts tests/components/hud/BuffGemSpawner.test.ts tests/components/GameEngine.test.tsx tests/renderers/EffectRenderer.test.ts` | 4 dosya, 49 test geçti |

## Kabul Kararı

- Beta için coverage risk maddesi kapatıldı: renderer, inventory, spawner ve GameEngine edge path için hedefli regresyon testleri eklendi.
- Full coverage yüzdesi bu adımda gate olarak kullanılmadı; amaç yüksek riskli beta path'lerde davranış regression guardrail eklemekti.
- Daha geniş coverage artırımı beta sonrası P2 bakım veya ayrı test-hardening sprintine taşınabilir.
