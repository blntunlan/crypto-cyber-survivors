# Difficulty System — Mimari & Roadmap (yaşayan doküman)

> Durum: **TASARIM + UYGULAMA YOL HARİTASI** · Başlangıç: 2026-06-25 · Güncellendi: 2026-08-15.
> İlgili: `TOKENOMICS.md` (skill-gated emisyon), hafıza `game-design-pillars.md` (North Star).
> İşaretler: ✅ karar verildi / tamamlandı · 🔲 yapılacak · ❓ açık karar (Faz 0) · ⏳ devam ediyor

---

## 0. Design Pillars (North Star — her kural bu dörde hizmet etmeli)

1. **Tetikte kalma** — sürekli gerilim; oyuncu asla güvenli otopilota düşmesin.
2. **Keyif** — bunaltıcı değil; flow band'inde (ne sıkılma ne ezilme). Build/release "nefes" ritmi gerilimi sürdürülebilir kılar.
3. **Abuse-proof** — AFK farm yok, overpowered güvenli-farm yok, bot/exploit ile skor/coin/token farm yok.
4. **Canlı Binance poz hissi** — kaldıraç = poz büyüklüğü, canlı PnL gerçek BTC'den, volatilite (ATR) = canlı zorluk, **liquidation = ölüm**, **cash-out = take-profit**, "devam mı kapatsam mı?" açgözlülük-korku gerilimi.

**Merkez ilke (4'ünü + temayı birleştiren):** *Başarı güvenlik değil, daha çok gerilim getirmeli; ödül kill adedine/süreye değil **karşılaşılan riske** bağlanmalı.* Bu aynı anda: anti-abuse + tetikte tutan ölümcüllük + temaya sadık (kazanan poz daha gergindir).

---

## 1. Mevcut Durum (Teşhis — koddan)

Legacy `UnifiedDirector`, `DifficultyManager` ve doğrudan `rules/` altındaki kurallar tamamen kaldırılmıştır. Eski üçlü stack kısmen çözülmüştür:

| Katman | Ne üretiyor | Dosya |
|--------|-------------|-------|
| ExperienceDirector & DirectorSpawnOrchestrator (services/director/) | Pacing, greed, encounter, threat budget, spawn planları, enemy stat curve, advantage | `services/director/ExperienceDirector.ts`, `DirectorSpawnOrchestrator.ts` |
| DifficultyRuntime & 7 Manager (services/difficulty/runtime/) | Modüler zorluk snapshot'ları (MarketRegime, Pacing, PlayerAdaptation, PositionRisk, ThreatBudget, Encounter, RecoveryBudget) | `services/difficulty/runtime/DifficultyRuntime.ts`, `runtime/managers/*` |
| CurrentDifficultyRuntimeAdapter (services/difficulty/runtime/) | Aktif çalışma modunda (`current`) ExperienceDirector'ı wrap eden runtime otoritesi | `services/difficulty/runtime/CurrentDifficultyRuntimeAdapter.ts` |
| CoreGameplayLoop (services/gameplay/) | Yalnızca sunum juice'u (`pulse`, `playerScaleTargetX/Y`, `shakeBoost`, `marketIntensity`, `suggestedBPM`); zorluk çarpanı ÜRETMEZ | `services/gameplay/CoreGameplayLoop.ts` |
| SpawnSystem.resolveEnemyResponse (services/combat/) | `hpMultiplier`, `speedMultiplier`, `damageMultiplier`, `intent` (ancak `PlayerPowerAnalyzer → PlayerMetricsAggregator → DifficultyContext` hattından gelen `playerPower` sinyalini uygular) | `services/combat/SpawnSystem.ts:525-560` |

**3-Modlu Migrasyon:**
`services/director/DirectorRuntimeMode.ts` ve `config/directorRuntime.ts` üzerinden `VITE_DIFFICULTY_RUNTIME_MODE` ile yönetilir:
- `current` (varsayılan): `CurrentDifficultyRuntimeAdapter` aktif otoritedir, modüler runtime shadow olarak çalışmaz.
- `shadow`: `CurrentDifficultyRuntimeAdapter` aktiftir; modüler runtime gölgede çalışır ve `ShadowComparisonRecorder` ile karşılaştırılır.
- `modular`: Modüler runtime aktiftir ve snapshot'ı uygulanır.

**Kalan Boşluklar ve Durum:**
- `CoreGameplayLoop` artık taban zorluk üretmez (o bacak kapatılmıştır); yalnızca juice üretir.
- `DifficultyContext` mutable durumu tutmaya devam eder ve her run-sonu yolunda (`game-over`, `cash-out`, `continue`) `reset()` edilmelidir (`DifficultyContextReset.test.ts` ile korunur).
- **AFK durumu**: `FlowStateManager.isPlayerAFK` 5 sn sabit timestamp karşılaştırması kullanıyordu (Faz 4 ile leaky-bucket `EngagementMonitor`'a geçirildi).
- **Liquidation**: `PositionRiskModel` ve `MarketCalculator` üzerinden proximity/warning hesaplanır; ancak `exitType` içinde bağımsız bir `liquidation` üyesi henüz yoktur.

---

## 2. Hedef Mimari

```
SİNYAL ÜRETİCİLER (ölçer, karar vermez)
  • MarketContext / Aggregator → RSI/ATR/volume/trend
  • PlayerState               → FlowStateManager (state) + PlayerPowerAnalyzer (power)
  • EngagementMonitor         → afkSuspicion (Faz 4 leaky-bucket accumulator) + dominanceScore
  • PriceMomentumEngine       → kısa vadeli presentation momentum
        ↓
DIRECTOR & RUNTIME (aktif: ExperienceDirector / CurrentDifficultyRuntimeAdapter; hedef: modüler DifficultyRuntime)
  → Base DifficultyState & SpawnPlan: spawn pacing, composition, stat curves, encounters, threat budget
        ↓
FEEL MODÜLATÖRÜ (CoreGameplayLoop — DARALTILDI)
  → Yalnızca sunum juice'u (pulse/shake/scale) ve yoyo ritmi üretir; zorluk çarpanı üretmez
        ↓
TEK SNAPSHOT: DifficultyState / SpawnPlan  →  SpawnSystem / Combat / Reward sistemleri tüketir
```

---

## 3. Davranışsal Gereksinimler

| # | Gereksinim | Durum | Yaklaşım |
|---|-----------|-------|----------|
| **R1** | Player gücüne göre enemy HP/damage | ✅ MEVCUT (`SpawnSystem.resolveEnemyResponse`) | `PlayerPowerAnalyzer → DifficultyContext` üzerinden SpawnSystem'de uygulanır |
| **R2** | Dinamik AFK tespiti (statik süre aşılamaz) | ⏳ (Faz 4) | `afkSuspicion` leaky-bucket accumulator (`EngagementMonitor`); threatPressure ölçekli |
| **R3** | Anti-safe-farming / anti-dominance | 🔲 | `dominanceScore` sinyali → tırmanan ölümcül baskı + **riske bağlı ödül** + feedback inversion |
| **R4** | Liquidation/cash-out = canlı poz | ⏳ (kısmen var) | ❓D2'ye göre liquidation = death; portal=take-profit mevcut |

**R2 — Dinamik AFK (özet):** passive↑ (düşük aktivite, tehdit baskısı varken hareketsiz kalma); active↑ (hareket, dash, saldırı). 1sn hareket yalnızca küçük decay sağlar → 9sn birikim net pozitif kalır → farm exploit'i kapanır.

**R3 — Anti-dominance (özet):** `dominanceScore` = HP sabit/yüksek + düşük alınan hasar + yüksek kill + power≫tehdit. Yükseldikçe: enemy damage **EHP'ye ölçeklenir**, elit avcı sürüsü, alan reddi. **Ödül = risk'e bağlı** → güvenli farm tabana iner.

---

## 4. Entegrasyon Haritası (keşiften — file:line)

**Ödül risk-gating chokepoint'leri**
- In-run XP & Gem toplama: `services/combat/physics/CollectionSystem.ts:190-209` (`getXpMultiplier()` × `levMult.xpGain * expMultiplier`)
- Run-sonu coin/skor: `services/gameplay/RewardCalculator.ts:57-152` (`exitType`: `'portal' | 'death' | 'afk_death' | 'cycle_complete'`)
- Session submit & verify: `hooks/useGameFlowController.ts:340-362` ve `services/auth/GameSessionService.ts:245-275`

**Enemy sistemi (piranha + power-scale)**
- Şema `config/EnemyRegistry.ts:65-76` (whale), `:126-138` (gatekeeper, `spawnWeight:0` = trigger-only)
- Factory `factories/EnemyFactory.ts:78-90`, stat scale `:145-152` (`hpMultiplier` parametresi mevcut)
- Spawn `services/combat/SpawnSystem.ts:113-117` (`'portalOpened'`), `:137-240` (`updateLegacy`), `:525-560` (`resolveEnemyResponse`)

**Liquidation / Position Risk & Portallar**
- Position Risk & Liquidation mesafesi: `services/director/position/PositionRiskModel.ts:55-81`, `services/market/MarketCalculator.ts:92-115`, `services/market/MarketEventAnnouncer.ts:42-45`
- Portal tetikleyici: `services/gameplay/portal/PortalTrigger.ts:35-88` (TAKE_PROFIT, STOP_LOSS, FLOW_EXIT, FORCED); lifecycle `PortalSystemV2.ts`

**Servis ve Reset Konvansiyonları**
- Singleton reset: `ResetOrchestrator.registerResettable()` + `EventBus.on('gameReset')`
- Reset ve mimari denetimleri: `scripts/check-reset-coverage.mjs`, `scripts/check-singleton-regressions.mjs`
- Test deseni: `tests/services/director/`, `tests/services/difficulty/DifficultyContextReset.test.ts` (pollute→reset→expectDefault)

---

## 5. Uygulama Yol Haritası (fazlar)

### Faz 0 — Açık kararları çöz (❓ §6) ve onayla
- [ ] D1 refactor kapsamı · [ ] D2 liquidation ölümü · [ ] D3 risk-gating kapsamı

### Faz 1 — Temel: tek snapshot + gerçek sinyaller (düşük risk)
- [x] Director ve modüler difficulty runtime mimarisinin kurulması (`services/director/`, `services/difficulty/runtime/`)
- [x] 3-modlu migrasyon planının (`current`/`shadow`/`modular`) uygulanması

### Faz 2 — Enemy-stat ve CoreGameplayLoop sadeleştirmesi ✅
- [x] CoreGameplayLoop'u daralt: base spawn/speed/damage üretmeyi bıraktı; yalnızca juice (`pulse`, `playerScaleTarget`, `shakeBoost`) ve pacing ritmi üretiyor.
- [ ] `SpawnSystem.resolveEnemyResponse` mantığının tam Director snapshot kontratına entegrasyonu

### Faz 3 — Feedback inversion (D3'e bağlı) 🔲
- [ ] `RiskGatingEngine` (yeni servis) — `riskMultiplier ∈ [floor,1]` = f(dominance/threat/pnl/hp/liq mesafesi)
- [ ] In-run ve run-sonu ödül çarpanı entegrasyonu

### Faz 4 — Dinamik AFK detektörü ✅
- [x] `EngagementMonitor` sinyal sınıfı — `afkSuspicion` accumulator (leaky-bucket, threat-scaled accrual, zero-allocation update). Singleton **değil**: `FlowStateManager` instance olarak sahipleniyor, whitelist/reset-coverage yükü yok.
- [x] `FlowStateManager.isPlayerAFK` statik zaman damgası karşılaştırmasını bıraktı; `EngagementMonitor`'dan okuyor.
- [x] AFK sinyali **oyuncu niyetinden** besleniyor (hareket + dash). `didAttack` kasten dışarıda: `CombatSystem.processAutoFire` girdi olmadan da ateş ediyor, sayılsaydı park etmiş oyuncunun kendi silahı onu "aktif" gösterirdi.
- [x] `threatPressure` = `enemyCount / AFK_THREAT_SATURATION_ENEMIES` — boş sahada durmak ile kalabalıkta kıpırdamamak aynı şey değil.
- [x] Reset + birim + gerçek-yol testleri (`tests/services/difficulty/EngagementMonitor.test.ts`): 9sn-bekle/1sn-oyna exploit'i, auto-fire maskeleme senaryosu, threshold dead-zone, iki eşiğin senkron kalması.
- **Kapsam dışı bırakıldı:** `afkSuspicion` ödüle bağlanmadı. Tespit var, ceza yok — risk-gating Faz 3/5 ve D3 kararına bağlı.

### Faz 5 — Anti-dominance + piranha 🔲
- [ ] `dominanceScore` (EngagementMonitor'a ekle) + `AntiDominanceRule`/`AntiAfkRule`
- [ ] `piranha` enemy tipi (`EnemyRegistry`) + swarm spawn mantığı

### Faz 6 — Liquidation = death (D2'ye bağlı) 🔲
- [ ] Seçilen modele göre liquidation ölüm akışı
- [ ] `exitType` (`liquidation`) ve RewardCalculator entegrasyonu

### Faz 7 — Kalibrasyon
- [ ] Parametre simülasyonu + playtest
- [ ] `npm run check:baseline` (typecheck + architecture + reset-coverage + event-contract + ui-contract + director-manifest + lint + test + build)

---

## 6. Açık Kararlar (Faz 0 — çözülecek)

| # | Karar | Seçenekler | Öneri |
|---|-------|-----------|-------|
| **D1** | Refactor kapsamı | (a) Tam birleştirme — director tek otorite · (b) Aşamalı — resolveEnemyResponse kalır | **(a)** |
| **D2** | Liquidation = ölüm | (a) Kademeli (uyarı→STOP_LOSS portal→yoksay→liquidation ölümü) · (b) Sert anında wipeout · (c) Soft (mevcut) | **(a)** |
| **D3** | Risk-gating kapsamı | (a) Sadece ekonomi (coin/skor/token), in-run XP/gem'e dokunma · (b) Ekonomi + in-run · (c) Ekonomi sıfır (sert) | **(a)** |

---

## 7. Doğrulama
- Birim: `tests/services/difficulty/`, `tests/services/director/`, reset pollute→expectDefault
- Entegrasyon: tek snapshot'tan enemy stat; AFK exploit senaryoları
- Gate: `npm run check:baseline`
- Playtest: pillar testi — her senaryo "4 amaca hizmet ediyor mu?"

## 8. Devam Notları (changelog)
- 2026-06-25 — Roadmap oluşturuldu (pillarlar + teşhis + hedef mimari + 3 gereksinim + keşif + fazlar). Sıradaki: Faz 0 kararları (D1/D2/D3).
- 2026-08-15 — Dokümantasyon gerçeklemesi ve mimari güncelleme: Silinen `UnifiedDirector`, `DifficultyManager` ve `rules/` referansları temizlendi. `services/director/` ve `services/difficulty/runtime/` katmanları ile 3-modlu migrasyon (`current`/`shadow`/`modular`, varsayılan `current`) belgelendi. CoreGameplayLoop'un daraltılarak yalnızca sunum juice'u ürettiği teyit edildi. Faz 4 (dinamik AFK tespiti — `EngagementMonitor` leaky-bucket accumulator) **uygulandı**; `isPlayerAFK`'ın 5sn'lik statik eşiği kaldırıldı, 9sn-bekle/1sn-oyna exploit'i testle kapatıldı. Sıradaki: Faz 0 kararları (D1/D2/D3) — Faz 3, 5 ve 6 bunlara bağlı olduğu için hâlâ blokede.
