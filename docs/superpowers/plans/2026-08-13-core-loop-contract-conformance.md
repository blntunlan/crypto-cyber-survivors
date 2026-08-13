# Core Loop & Dynamic Difficulty — Contract Conformance Program Plan

> **Kaynak sözleşme:** Notion · [Core Loop & Dynamic Difficulty — Final Design Contract v1.0](https://app.notion.com/p/39baa0be337b81ca87cbdd29d4c8d627)
> **Üst plan:** Notion · [CS-DIR-V1 — Radar Kontrollü Uygulama Planı](https://app.notion.com/p/3bbaa0be337b81a6bbd0ccb025955c52) (Faz 0–2 kısmen doğrulanmış)
> **Tarih:** 2026-08-13 · **Baseline commit:** `73602bda`
> **Kapsam:** Bu doküman program seviyesidir. Her dilim (S0–S8) uygulanırken kendi task seviyesinde TDD planına bölünür.
>
> **Uygulama durumu (2026-08-14):** S0 ✅ · S1 ✅ · S2 ✅ · S3 ✅ · S4a ✅ · S4b ✅ ·
> S5 çoğu (snapshot + cue + HUD ✅, run-sonu özeti ⏳) · S7 ikinci oturumda ✅ ·
> S6 ve S8 ⏳ açık.
>
> `check:baseline` tam yeşil: typecheck · architecture (65 singleton) ·
> reset-coverage · ui-contract · director-manifest · lint 0 hata/1 uyarı ·
> 3099 test / 327 dosya · build. `test:director-release` 217/217.
>
> **Not:** S7 legacy temizliğini (`DifficultyManager`, `UnifiedDirector`, 12 rule,
> bağlı testler ve `measure-director-baseline`) paralel bir oturum yürüttü ve
> tamamladı; `check:baseline` artık `check:director-reference` adımını içermiyor.
> `check:baseline` tam yeşil (typecheck · architecture · reset-coverage · ui-contract ·
> director-manifest · lint 0 hata · 3167 test · build).

---

## 0. Yönetici özeti

Sözleşmenin **mimari iskeleti büyük ölçüde kurulmuş**: sahiplik sınırları (§18), saf karar modelleri, versiyonlu config, server-authoritative cash-out/escrow/reward hattı hepsi mevcut. Fakat sistemsel incelemede üç yapısal sorun çıktı:

1. **Ölü config.** `DIRECTOR_CONFIG_V1` sözleşmedeki sayıların neredeyse tamamını doğru taşıyor, ancak bir kısmı **hiçbir runtime kodu tarafından okunmuyor** — MarketSurge çarpanı, greed recovery reduction, support efficiency tabanı, enemy stat cap'leri. Config doğru olduğu için testler yeşil, oyun ise sözleşmeyi uygulamıyor.
2. **Ölü çıktı.** Advantage mekanikleri ve headwind kanalları hesaplanıyor, snapshot'a yazılıyor, **ama hiçbir gameplay sistemi tüketmiyor**. §10 ve §11 pratikte devre dışı.
3. **Çift sahiplik.** `current` (ExperienceDirector) ve `modular` (DifficultyRuntimeOrchestrator) iki paralel runtime kabuğu; ayrıca legacy `UnifiedDirector` + 12 rule hâlâ tick alıyor. §19 "aynı gameplay ekseninin iki sahibi olamaz" ihlal ediliyor.

Kaba tamamlanma: **mimari ~%70, davranış ~%40.**

---

## 1. Sistemsel değerlendirme — sözleşme maddesi bazında

Durum kodları: ✅ uygun · 🟡 kısmi/bağlanmamış · ❌ eksik veya ihlal

| § | Konu | Durum | Kanıt | Boşluk |
|---|------|-------|-------|--------|
| §2 | Run kilidi, ölüm=likidasyon | ✅ | `services/difficulty/runtime/contracts.ts:32` `DifficultyRunConstants`; `hooks/useGameFlowController.ts:450` `handleGameOver(LIQUIDATION)` | Liquidation tetiği `PositionRiskModel.isLiquidated` yerine ayrı yoldan geliyor → §18 tek sahiplik doğrulanmalı |
| §3 | Run ritmi / survival curve | ✅ | `config` `survival.pressurePoints` = sözleşme tablosu birebir; `SurvivalCurve.ts:10-28` lineer interpolation | — |
| §4 | Sürekli + olay kanalı | 🟡 | `services/market/regime/MarketRegimeEngine.ts` hysteresis, confirmation frame, min duration, stale decay hepsi var | Olay kanalı encounter'a bağlanıyor ama mekanik kanallar inert (bkz. §11) |
| §5 | Alignment (tanh + 8sn EMA) | ✅ | `services/director/position/PositionRiskModel.ts:43-63`, delta-time EMA `alpha = 1-exp(-dt/8)` | — |
| §6 | Leverage v1 (1/2/5/10/20) | ❌ | `types.ts:47` `LEVERAGE_OPTIONS = [1,2,5,10,25,50,100]` | Sözleşme 20× tavan, 50× kapalı diyor. `maximumPublicLeverage` `Math.max(...)` ile 100 oluyor → `leverageRisk` paydası yanlış (`PositionRiskModel.ts:64-66`) |
| §7 | Pacing state machine | ❌ | `PacingStateMachine.ts:15-20` yalnız 4 taban state; `requestMarketSurge` sadece kuyruğa yazıyor (`:79-89`) | **MARKET_SURGE state'ine hiç girilmiyor** → `marketSurge {maxSeconds:20, threatMultiplier:1.4}` ölü config |
| §8 | Doom Stack | 🟡 | `SurvivalCurve.getDoomStacks/getRecoveryDuration:30-44` | Yalnız recovery kısaltma var. Area-hazard uptime, 2 stack'te bir encounter-complexity slotu, support verimi tabanı (`minimumSupportEfficiency: 0.4` okunmuyor) yok. Doom **görünür değil** (HUD/ses/environment yok) |
| §9 | Threat budget & stat cap | ❌ | `ThreatBudgetAllocator` formülü doğru; ama `SpawnPlanBuilder.buildCurrent:149-151` health/damage/speed'i **sabit 1** yazıyor | Canlı yolda enemy statı hiç ölçeklenmiyor → cap'ler boşluğu koruyor. Cost unit de sabit 1 (`MINIMUM_ENEMY_COST:39`), `EnemyCostCatalog` kullanılmıyor. Threat yalnız **adet** satın alıyor |
| §10 | Advantage budget | 🟡 | `AdvantageAllocator` + `AdvantageCatalog` 4 kartı da tanımlı | `advantage.activeMechanic` director dışında **hiçbir yerde tüketilmiyor** — movement/dash/drop/lane etkisi yok |
| §11 | Headwind kanalları | 🟡 | `HeadwindCatalog.ts` 10 kanal, max 2 clamp doğru | Yalnız `MULTI_DIRECTIONAL_ENTRIES` okunuyor, o da sadece composition listesi değiştiriyor (`SpawnPlanBuilder.ts:129-134`). Diğer 9 kanal inert |
| §12 | Cash-out policy | ✅ | `railway-market-server/src/services/economy/CashOutPolicy.ts` (300s / 240+30·min(greed,4) / 45s grace / 15s TTL / 60s Safe Exit); client 15s timeout = reject (`useGameFlowController.ts:567-580`) | Server-signed quote + escrow mevcut |
| §13 | Greed v1 | 🟡 | `GreedStateMachine.ts` formülleri doğru; greed **server otoritesi** ile inbox'a giriyor (`DifficultyInputInbox.ts:231-259`, monotonluk + idempotency guard'lı) | `greed.recoveryReductionPerLevel` / `maximumRecoveryReduction` **hiç okunmuyor** → greed yalnız pressure üretiyor, recovery'yi kısaltmıyor |
| §14 | Reward score | 🟡 | `RewardLedger.ts:34-54` sözleşme formülünün birebir kopyası, server-side | **rewardPoints → token dönüşümü yok**: epoch rate, per-run cap, epoch budget cap implement edilmemiş. `CoinService` optimistic credit yolu hâlâ açık (`VITE_VERIFY_COINS_ONLY` bayrağına bağlı) |
| §15 | Shard policy | ✅ | `ShardLedger.ts:61-74` tablo + 220 hard cap birebir | `hasCombatParticipation` server-side türetilmeli (client iddiası olmamalı) — doğrulanacak |
| §16 | Mod bazlı zorluk | 🟡 | `PlayerAdaptationManager` TOKEN/MIRROR_PVP'de `PLAYER_MODE_NEUTRAL` (Notion 2026-08-13 kaydı) | MIRROR_PVP'nin implementasyonu yok (yalnız tip). Practice Assist'in görünür UI sözleşmesi açık karar |
| §17 | Tutma & zevk ilkeleri | 🟡 | Telegraph/stale/reconnect/safe-exit cue'ları `PresentationDirector.ts:8-14` | Doom cue yok, Greed değişim cue'su yok, run sonu özeti (ölüm nedeni + trade doğruluğu + build performansı) yok |
| §18 | Sistem sahipliği | 🟡 | 13 sahibin 11'i mevcut ve doğru yerde | İki paralel Director kabuğu + legacy `UnifiedDirector` tick'i |
| §19 | Guardrail'ler | ❌ | Snapshot revision, seeded RNG, delta-time smoothing, side-effect'siz director hepsi ✅ | `services/combat/SpawnSystem.ts:153-155,361-383` hâlâ ham RSI/PnL okuyor (loop'ta ölü ama ağaçta canlı, CI guard'ı yok). Enemy stat cap'leri uygulanmıyor (S2). Aynı eksende çift sahip (S7) |
| §21 | İndikatör mapping | ✅ | `marketPressure` ağırlıkları (0.35/0.25/0.20/0.10/0.10) ve rejim eşikleri birebir; `positionHeadwind = max(pnlHeadwind, liquidationProximity)` doğru | — |

### Ek bulgu — doküman çakışması

`DIFFICULTY_ROADMAP.md` (2026-06-25) R2 "dinamik AFK tespiti" ve R3 "anti-dominance tırmanan baskı" maddeleri, sözleşme §16/§19'un **TOKEN/PvP'de gizli player-adaptive correction yasağı** ile doğrudan çelişiyor. Bu iki gereksinim yalnızca (a) reward gating ve (b) herkes için aynı world-safety cap'i olarak yeniden yazılabilir; gizli zorluk düzeltmesi olarak hayata geçemez. Doküman ya bu şekilde revize edilmeli ya da arşive alınmalı.

---

## 2. Uygulama planı — dikey dilimler

Her dilim: **kırmızı test → değişiklik → hedefli test → `npm run check:baseline`**. Hiçbir dilim mevcut gameplay'i sessizce değiştirmez; davranış değişimleri açık ve testli olur.

### S0 — Sözleşme kilidi ✅ uygulandı

Amaç: sonraki refactor'ların sayıları sessizce kaydırmasını imkânsız kılmak.

- `tests/services/director/ContractConformanceV1.test.ts`: `DIRECTOR_CONFIG_V1`'in her sayısal alanını sözleşme literal'ine karşı assert et (pacing çarpanları, survival noktaları, threat ağırlıkları, stat cap'leri, cashOut, greed, rejim eşikleri, leverage kademeleri).
- `config/architecture/` altına guard: `services/combat/**` ve `factories/**` ham indikatör modüllerini (`MarketIndicatorService`, `ClientIndicatorService`, RSI/ATR yardımcıları) import edemez → `npm run check:architecture` genişletmesi.
- **Çıkış kapısı:** guard yeni ihlalde CI'ı kırıyor; mevcut `SpawnSystem` ihlali allowlist'e yazılıp S7'de silinmek üzere işaretleniyor.

### S1 — Leverage kademesi düzeltmesi (§6) ✅ uygulandı

- `types.ts`: `LeverageOption = 1 | 2 | 5 | 10 | 20`, `LEVERAGE_OPTIONS = [1,2,5,10,20]`.
- `LEGACY_LEVERAGE_OPTIONS` + `normalizePublicLeverage()`: kalıcılaştırılmış 25/50/100 değerleri yüklemede 20'ye map'lenir. Aksi hâlde `PositionRiskModel.ts:36-38` **oyun döngüsünde throw eder** — bu, mevcut profillerde canlı crash riski.
- `DirectorConfigV1.position.maximumPublicLeverage`: `Math.max(...)` yerine literal `20` (leverageRisk paydası sözleşmeye döner).
- Server: session/quote doğrulamasında kademe dışı leverage reddi.
- **Testler:** `leverageRisk(20) === 1`; `leverageRisk(1) === log(2)/log(21)`; MainMenu 5 kademe render'lar; legacy 50× profili migrasyon testi.
- **Risk:** ekonomi ve tempo dengesi kayar; `BetaEnvContract` notu ve tek seferlik telemetry karşılaştırması gerekir.

### S2 — Enemy stat & composition otoritesi (§9, §11-kısmi) ✅ uygulandı

- `GameplaySnapshot`'a `enemy: { healthMultiplier, damageMultiplier, speedMultiplier, behaviorTier }` ekle; kaynak = threat target × encounter `statModifiers` × doom tier, `clampEncounterStatMultipliers` ile cap'lenmiş.
- `SpawnPlanBuilder.buildCurrent`: sabit `1` yerine snapshot'tan oku.
- Cost unit: `EnemyCostCatalog` başına maliyet; threat credit gerçekten harcanır (`MINIMUM_ENEMY_COST` kaldırılır).
- Composition: `EncounterPlanner` primary/support kartlarından türetilir; sabit dizi fallback'e iner.
- `SPAWN_DENSITY` kanalı spawn adedini `maximumSpawnDensityMultiplier` tavanıyla çarpar; `MULTI_DIRECTIONAL_ENTRIES` spawn kenar dağılımını değiştirir.
- **Testler:** cap aşımı imkânsız; **stat spawn anında sabitlenir** (spawn sonrası market tick'i aktif enemy'yi değiştirmez — §9); aynı seed+frame → aynı plan; cost-unit toplamı `spendableThreat`'i aşmaz.

### S3 — Pacing bütünlüğü: MarketSurge + Greed recovery + Doom (§7/§8/§13) ✅ uygulandı

- `PacingStateMachine`'e gerçek `MARKET_SURGE` state'i: ≥2sn telegraph sonrası, `elapsed ≥ 90sn`, süre ≤20sn, çarpan 1.40×, çıkışta PEAK_FADE. Tek kuyruk slotu mevcut mantığı korunur.
- `update(elapsedSeconds, seed, greedLevel)`: recovery süresi = `base − doomStacks·2 − greedReduction`, taban 8sn.
- Doom etkileri: snapshot'a `doomStacks`, `supportEfficiency` (taban 0.40), `encounterComplexitySlots = floor(doomStacks/2)`; support efficiency pickup/heal değerlerini ölçekler, complexity slotu `EncounterPlanner` kart limitini açar.
- **Testler:** 90sn öncesi surge yok; surge ≤20sn; yüksek doom+greed'de recovery tam 8sn'de durur; support verimi 0.40 altına inmez; greed monoton.

### S4a — Oyuncu-stat ve spawn kanalları (§10/§11) ✅ uygulandı

Bölge primitifi gerektirmeyen kanalların tamamı mekanik hâle geldi:

- `GameplaySnapshot.advantage` artık aktif pencereyi de yayımlıyor (`movementMultiplier`,
  `dashCooldownMultiplier`, `endsAtElapsedSeconds`, `activationSequence`) — tüketiciler
  allocator'a geri uzanmıyor (§19).
- `services/director/effects/DirectorEffectApplier.ts`: advantage'ın veri olmaktan
  çıkıp gameplay olduğu **tek sınır**. Director yan etkisiz kalıyor. `activationSequence`
  sayesinde tek-atımlık etkiler aktivasyon başına tam bir kez tetikleniyor.
- `MOMENTUM_WINDOW` → `MomentumWindowDecorator` (8sn, +%10 hız) + `player.dashCooldownMultiplier = 0.9`.
- `LIQUIDITY_DROP` → oyuncunun konumunda sabit değerli utility drop (`BuffGemSpawner.spawnGem('diamond')`), token üretmez.
- `TELEGRAPHED_SPEED_BURST` → yalnız encounter `ACTIVE` iken (telegraph'tan sonra) hız spike'ı, §9 cap'iyle sınırlı.
- `ELITE_SYNERGY` → behaviour tier +1; stat cap'lerine dokunmuyor.
- `MULTI_DIRECTIONAL_ENTRIES` → artık gerçekten dört kenara yayılıyor (önce yalnız kompozisyon listesi değişiyordu).

### S4b — Bölge primitifi (§10/§11 kalanı) ✅ uygulandı

`GREEN_LANE`, `ALPHA_ENCOUNTER`, `TEMPORARY_HAZARD`, `SHRINKING_SAFE_ZONE`,
`SAFE_ROUTE_PRESSURE`, `VISION_AREA_STRESS` — altısı da **alan/bölge** semantiği
istiyor ve kod tabanında böyle bir sistem hiç yok (hazard/zone/safe-area araması
boş döndü). Doğru çözüm altı ayrı özellik değil, **tek bir primitif**:

- `DirectorZone` (daire veya şerit) + telegraph → active → fade yaşam döngüsü.
- `ZoneField` servisi sahibi; `SpatialGrid` ile çarpışma, `GameRenderer` ile okunabilir çizim.
- Tüketiciler: collision (hazard hasarı / green lane güvenliği), `SpawnPlanBuilder`
  (lane içinde spawn baskılama, safe-route baskısı), presentation (telegraph).

Tek primitif olarak uygulandı — altı ayrı özellik değil:

| Parça | Dosya | Rolü |
|---|---|---|
| `ZoneField` | `services/director/zones/ZoneField.ts` | Sabit havuzlu (8) bölge deposu; TELEGRAPH → ACTIVE → FADE yaşam döngüsü; daire ve şerit içerme sorguları. Saf: hasar uygulamaz, çizim yapmaz |
| `ZoneDirector` | `.../ZoneDirector.ts` | Snapshot'ın uzamsal kanallarını bölgeye çevirir; yerleşim seed'li, kanal başına tek canlı bölge + cooldown |
| `ZoneEffectResolver` | `.../ZoneEffectResolver.ts` | İçerme sonucunu sayıya çevirir: hasar/sn, hareket çarpanı, görüş baskısı, sığınma |
| `ZoneRenderer` | `services/renderers/ZoneRenderer.ts` | Telegraph'ta nabız atan kesikli çizgi, ACTIVE'de dolgu. Entity'lerin **altında** çizilir ki telegraph gelen tehdidi gizlemesin |
| `DirectorEffectApplier` | `.../effects/DirectorEffectApplier.ts` | Tek mutasyon sınırı: bölgeleri günceller, hasarı uygular, `playerHit` üzerinden raporlar |

Kanal eşlemesi: `GREEN_LANE`→SAFE_LANE (6sn şerit, içine spawn yasak) ·
`ALPHA_ENCOUNTER`→ALPHA_TARGET · `TEMPORARY_HAZARD`→HAZARD (DoT) ·
`SHRINKING_SAFE_ZONE`→SHRINKING_SAFE (dışarısı hasar, yarıçap liquidation
yakınlığıyla daralır) · `SAFE_ROUTE_PRESSURE`→ROUTE_PRESSURE (hareket cezası) ·
`VISION_AREA_STRESS`→VISION_STRESS.

Sözleşme garantileri testli: bölge telegraph bitmeden **mekanik değil** (§19);
güvenli rota üstüne binen hazard'ı ezer (§10 "okunabilir güvenli rota");
havuz taşmaz; şerit ve daire içerme geometrisi doğru.

### S4 — Advantage & Headwind mekanik kanalları (§10/§11) — özet

- `services/director/effects/AdvantageEffectApplier`: MOMENTUM_WINDOW (%10 hız + %10 dash cooldown, `BaseDecorator` üzerinden), LIQUIDITY_DROP (sabit değerli drop), GREEN_LANE (6sn okunabilir güvenli rota), ALPHA_ENCOUNTER (opsiyonel yüksek-reward hedef). Aynı anda **tek** mekanik (`maximumActiveMechanics: 1`).
- `HeadwindEffectApplier`: kalan 8 kanal (hazard, telegraph'lı hız patlaması, pursuer/ranged composition, safe-route baskısı, daralan güvenli alan, elite synergy, görüş/alan stresi, recovery azaltma).
- §11 invariantı: **aynı event'te spawn + speed + HP + damage dördü birden sert yükselemez** → açık invariant testi (`maximumConcurrentStatSpikes: 3` zaten config'te).
- **Testler:** advantage token mint etmez; kanal sayısı ≤2; dört eksen aynı anda spike etmez; telegraph'sız mekanik etki başlamaz.

### S5 — Presentation & okunabilirlik (§8/§17) ✅ HUD dahil · run-sonu özeti ⏳

- `GameplaySnapshot` artık `pacing.doomStacks`, `pacing.supportEfficiency` ve
  yeni `greed { level, pressure, recoveryReduction }` bloğunu taşıyor.
- `PresentationDirector` iki yeni cue üretiyor: `DOOM_STACK_GAINED`,
  `GREED_LEVEL_GAINED` — yalnız **geçişte**, düşüşte asla (ikisi de monoton).
  Cue metinleri nedeni de söylüyor (§17 "açıklanmış greed değişimi").
- `CurrentDifficultyRuntimeAdapter` tırmanışta `directorProgressionChanged`
  yayınlıyor; HUD 60 FPS'te snapshot yoklamıyor.
- `components/hud/RunPressureIndicator.tsx`: Greed kademesi + seviye, Doom
  stack sayacı, düşen support verimi. Doom/Greed sıfırken hiç render etmiyor.
- Kalan: run sonu özeti (ölüm nedeni + time-weighted alignment + build performansı).

### S5 — özgün plan notu

- Yeni cue tipleri: `DOOM_STACK_CHANGED`, `GREED_LEVEL_CHANGED`, `ADVANTAGE_WINDOW`.
- HUD: Doom stack sayacı, Greed kademesi rozet/ton, advantage penceresi göstergesi; ses/BPM kayması.
- Run sonu özeti: ölüm nedeni, time-weighted alignment (trade doğruluğu), build performansı.
- **Testler:** rejection sonrası greed cue'su aynı karede; Doom state HUD'da görünür; cue cooldown'ı aşılmaz.

### S6 — Ekonomi kapanışı (§14/§15) · ~3 gün · **P2**

- Epoch rate servisi: `rewardPoints → token quote`, per-run cap + epoch budget cap; migration `013_epoch_budget.sql` (schema sahibi `railway-market-server`).
- Optimistic coin credit yolunun kaldırılması; `VITE_VERIFY_COINS_ONLY` sert açık.
- `hasCombatParticipation` server tarafında doğrulanmış telemetriden türetilir.
- **Testler:** aynı quoteId iki kez settle edemez (idempotency); epoch bütçesi aşılmaz; AFK run shard üretmez.

### S7 — Tek otoriteye yakınsama + legacy silme (§18/§19) · ~4 gün · **P3**

**Açık karar gerekiyor** (bkz. §3). Önerilen yol:

1. Saf modeller (`SurvivalCurve`, `PositionRiskModel`, `MarketRegimeEngine`, `PacingStateMachine`, `EncounterPlanner`, `ThreatBudgetAllocator`, `AdvantageAllocator`) **tek gerçek** kabul edilir; S2–S5 işi yalnız buraya yazılır.
2. `modular` kabuğunun manager'ları kendi kopya mantıklarını bırakıp bu modellere delege eder (`PacingManager.ts:99-100` gibi basitleştirilmiş kopyalar silinir).
3. Shadow karşılaştırması yeşile döndükten sonra `VITE_DIFFICULTY_RUNTIME_MODE=modular` cutover; `current` kabuğu silinir.
4. Legacy temizliği: `UnifiedDirector` + 12 rule, `DifficultyManager` difficulty çıktıları, `CoreGameplayLoop` difficulty alanları (juice kalır), `SpawnSystem`'in ham market okumaları.
- **Çıkış kapısı:** S0 guard'ının allowlist'i boşalır; `check:architecture` + `check:reset-coverage` temiz.

### S8 — Modlar (§16) · ayrı goal · **P3**

- Practice Assist: görünür UI + versiyonlu `difficultyRunInitialized` (mod taşıyan event contract'ı) — Notion'daki açık karar.
- MIRROR_PVP: aynı frame dizisi + seed + config/content sürümü parity harness'ı. v1 cutover kapsamı dışında, ayrı goal olarak planlanmalı.

---

## 2.1 Teşhis katmanı (S0 ile birlikte uygulandı)

Sözleşmenin çiğnendiğini **oyunu oynayarak değil, isimli bir kodla** anlamak için üç
katman eklendi:

| Katman | Dosya | Ne yakalar |
|---|---|---|
| Runtime invariant guard | `services/director/DirectorContractGuard.ts` | 15 sözleşme kuralı; her Director commit'inde, sıfır allocation ile. Saf — Director yan etki üretmez, ihlaller `output.violations`'a yazılır |
| Runtime raporlama | `services/difficulty/runtime/CurrentDifficultyRuntimeAdapter.ts` | İhlali run başına **bir kez** `Logger.error` ile yükseltir; 5 Hz'de konsolu boğmaz. `DifficultyPhaseDecision.violations` üzerinden HUD/debug da okuyabilir |
| CI drift kilidi | `tests/services/director/ContractConformanceV1.test.ts` | `DIRECTOR_CONFIG_V1`'in her sayısını sözleşme literal'ine karşı doğrular; sessiz retune imkânsız |
| CI ölü-config kilidi | `tests/services/director/DirectorConfigUsage.test.ts` | Okuyucusu olmayan her config yaprağında build'i kırar — bu denetimin bulduğu asıl hata sınıfı |

Guard kodları: `ENEMY_HEALTH_CAP`, `ENEMY_DAMAGE_CAP`, `ENEMY_SPEED_CAP`,
`THREAT_TARGET_RANGE`, `HEADWIND_CHANNEL_LIMIT`, `ADVANTAGE_MECHANIC_LIMIT`,
`SURGE_BEFORE_LOCKOUT`, `SURGE_OVERRUN`, `SUPPORT_EFFICIENCY_FLOOR`,
`GREED_NOT_MONOTONIC`, `SPAWN_BUDGET_MISMATCH`, `SPAWN_UNAFFORDABLE`,
`UNTELEGRAPHED_ENCOUNTER`, `STALE_MARKET_EVENT`, `LEVERAGE_OFF_LADDER`.

Ölü-config guard'ı ilk çalıştırmada dört gerçek bulgu üretti ve hepsi kapatıldı:
`marketEvents.queueCapacity` (kuyruk sınırı hardcode'du), `regimeThresholds.volatility.extremeEnter`
(EXTREME volatilite kademesi hiç ayrışmıyordu → artık PANIC rejimine çözülüyor),
`versions.*` (§19 config/content kimliği telemetriye basılmıyordu), `cashOut.*`
(server-authoritative; allowlist'e gerekçesiyle yazıldı).

## 3. Karar bekleyen konular

1. ~~**Leverage geçişi.**~~ ✅ Karar verildi: sözleşmeye çekildi. `LEVERAGE_OPTIONS = [1,2,5,10,20]`, `normalizePublicLeverage()` legacy 25/50/100 değerlerini 20'ye map'ler, `LeverageEngine.NORM_BASE` ve `GEM_PER_LEVERAGE` yeni tavana yeniden çapalandı.
2. **Hangi runtime kabuğu yaşayacak?** Öneri: `modular` kabuk + paylaşılan saf modeller. Alternatif (daha ucuz, daha az disiplin): `current`'i tutup `modular`'ı silmek.
3. **Epoch token oranı** kim tarafından, hangi kadansla belirlenecek? (§14 "economy version ve dönem bütçesi" — kod içine gömülmeyecek.)
4. **Practice Assist UI sözleşmesi** — hangi assist'ler görünür, oyuncu nasıl kapatır.
5. **`DIFFICULTY_ROADMAP.md` R2/R3** revize mi edilecek, arşive mi alınacak?

---

## 4. Sıra ve maliyet

| Sıra | Dilim | Süre | Neden bu sırada |
|---|---|---|---|
| 1 | S0 | 0.5 g | Sonraki her dilimin regresyon ağı |
| 2 | S1 | 1 g | Tek satırlık kök hata, tüm risk/reward matematiğini etkiliyor |
| 3 | S2 | 3 g | "Zorluk hissedilmiyor" şikâyetinin doğrudan kaynağı |
| 4 | S3 | 3 g | Ritim sözleşmesi; S2'nin üzerine oturur |
| 5 | S4 | 5 g | Trade kararının hissedilir karşılığı (§10/§11) |
| 6 | S5 | 2 g | S3/S4'ün oyuncuya görünmesi |
| 7 | S6 | 3 g | Ekonomi kapanışı, gameplay'den bağımsız paralelleştirilebilir |
| 8 | S7 | 4 g | Cutover, S2–S5 stabilize olduktan sonra |
| 9 | S8 | ayrı | Ayrı goal |

**Kritik yol S0 → S1 → S2 → S3 → S5 ≈ 9.5 gün.** S6 paralel yürüyebilir.

---

## 5. Global kısıtlar

- RAF döngüsünde allocation yok; snapshot'lar pre-allocated ve revision'lı kalır.
- Director side-effect üretmez; yalnız snapshot yazar (§19).
- Tick başına tek snapshot revision.
- RNG seed'li; smoothing delta-time tabanlı.
- TOKEN/MIRROR_PVP'de player-adaptive correction kapalı kalır.
- Her dilim `npm run check:baseline` ile kapanır (typecheck → architecture → reset-coverage → lint → test → build).
- Kullanıcı açıkça istemedikçe commit atılmaz.
