# Difficulty System — Mimari & Roadmap (yaşayan doküman)

> Durum: **TASARIM + UYGULAMA YOL HARİTASI** · Başlangıç: 2026-06-25 · Sürekli güncellenecek.
> İlgili: `TOKENOMICS.md` (skill-gated emisyon), hafıza `game-design-pillars.md` (North Star).
> İşaretler: ✅ karar verildi · 🔲 yapılacak · ❓ açık karar (Faz 0) · ⏳ devam ediyor

---

## 0. Design Pillars (North Star — her kural bu dörde hizmet etmeli)

1. **Tetikte kalma** — sürekli gerilim; oyuncu asla güvenli otopilota düşmesin.
2. **Keyif** — bunaltıcı değil; flow band'inde (ne sıkılma ne ezilme). Build/release "nefes" ritmi gerilimi sürdürülebilir kılar.
3. **Abuse-proof** — AFK farm yok, overpowered güvenli-farm yok, bot/exploit ile skor/coin/token farm yok.
4. **Canlı Binance poz hissi** — kaldıraç = poz büyüklüğü, canlı PnL gerçek BTC'den, volatilite (ATR) = canlı zorluk, **liquidation = ölüm**, **cash-out = take-profit**, "devam mı kapatsam mı?" açgözlülük-korku gerilimi.

**Merkez ilke (4'ünü + temayı birleştiren):** *Başarı güvenlik değil, daha çok gerilim getirmeli; ödül kill adedine/süreye değil **karşılaşılan riske** bağlanmalı.* Bu aynı anda: anti-abuse + tetikte tutan ölümcüllük + temaya sadık (kazanan poz daha gergindir).

---

## 1. Mevcut Durum (Teşhis — koddan)

**Difficulty 3 çakışan kontrolcüye dağılmış; enemy statları ÜÇ kaynaktan çarpılarak stack'leniyor:**

| Kaynak | Ne üretiyor | Dosya |
|--------|-------------|-------|
| UnifiedDirector (12 kural) → marketData | spawnRate, enemySpeed/HP/damage, rewards, whale, chaos, mercy | `services/difficulty/UnifiedDirector.ts`, `DifficultyManager.ts:264-281` |
| CoreGameplayLoop (FlowState+Momentum+yoyo) | spawn/speed/damage çarpanları + juice | `services/gameplay/CoreGameplayLoop.ts`, `GameEngine.tsx:1161-1210` |
| SpawnSystem.resolveEnemyResponse (playerPower) | hp/speed/damage çarpanı | `services/combat/SpawnSystem.ts:492-532` (hp formülü `:514-518`) |

Entity'ye uygulanan: `marketData.enemySpeed × coreLoopOutput.enemySpeedMultiplier × response.speedMultiplier` (damage de aynı). **HP yalnız SpawnSystem'den.** → "birini değiştir, değişmedi" kaosu.

**Kök sorun: pozitif (yanlış yön) feedback döngüsü**
- `PnLSpeedRule.ts:13-16`: kârda düşman **yavaşlar** (`1 − pnl·0.15`) → iyi gidince kolaylaşıyor.
- `RewardRule.ts:13-23`: ödül **kills + leverage**'a göre artıyor (riske göre DEĞİL) → güvenli farm 5×'e kadar ödül.

**Diğer kopukluklar**
- `DifficultyManager.ts:~224-225`: UnifiedDirector'a `engagementScore:0.5, frustrationScore:0.5` **sabit kodlu** → director gerçek flow verisini görmüyor; gerçek skorlar yalnız CoreGameplayLoop'a gidiyor.
- **Mercy iki yerde**: `MercyRule` + `FlowStateManager.calculateCorrections`.
- **AFK statik**: `FlowStateManager.isPlayerAFK` = 5sn input yok (9sn-bekle-1sn-oyna ile aşılır).
- **Liquidation SOFT**: `DifficultyManager.ts:369-417` görsel FOV + `-15%`'te STOP_LOSS portal; **direkt ölüm yok** (ölüm HP=0 / kaçırılan FORCED portal).

---

## 2. Hedef Mimari

```
SİNYAL ÜRETİCİLER (ölçer, karar vermez)
  • MarketContext        → RSI/ATR/volume/trend (mevcut)
  • PlayerState          → FlowStateManager (engagement/frustration/state) + PlayerPowerAnalyzer (power)
  • EngagementMonitor    → afkSuspicion + dominanceScore (YENİ accumulator)
  • PriceMomentum        → kısa vadeli momentum (mevcut)
        ↓ (hepsi GERÇEK veriyle — 0.5 stub'lar kalkar)
DIRECTOR (tek karar = UnifiedDirector)
  → base DifficultyState: spawn, speed, HP, damage, rewards, whale, variety, chaos, mercy,
    + yeni: powerScale (R1), antiAfkDirective (R2), dominancePressure+riskMultiplier (R3)
        ↓
FEEL MODÜLATÖRÜ (CoreGameplayLoop — DARALTILMIŞ)
  → base'i yoyo build/release ile MODÜLE eder + juice (pulse/shake/scale) ÜRETİR
  → asla base difficulty/flow/mercy ÜRETMEZ
        ↓
TEK SNAPSHOT: DifficultyState  →  SpawnSystem / Combat / Reward TEK kaynaktan okur
```

**Sorumluluk tablosu:** spawn/speed/damage/HP/rewards/whale/variety/chaos/mercy → **Director (tek sahip)**; yoyo + juice → **FeelModulator**; flow/power/afk/dominance → **sinyal üreticiler**.

---

## 3. Davranışsal Gereksinimler

| # | Gereksinim | Durum | Yaklaşım |
|---|-----------|-------|----------|
| **R1** | Player gücüne göre enemy HP/damage | ✅ ZATEN VAR (`SpawnSystem.resolveEnemyResponse`) | Director'a `PlayerPowerScalingRule` olarak taşı; SpawnSystem tek snapshot uygulasın |
| **R2** | Dinamik AFK tespiti (statik süre aşılamaz) | 🔲 | `afkSuspicion += (passive−active)·dt` leaky-bucket; bağlam-ölçekli accrual; statik `isPlayerAFK`'ı değiştir |
| **R3** | Anti-safe-farming / anti-dominance | 🔲 | `dominanceScore` sinyali → tırmanan ölümcül baskı + **riske bağlı ödül** + feedback inversion |
| **R4** | Liquidation/cash-out = canlı poz | ⏳ (kısmen var) | ❓D2'ye göre liquidation = death; portal=take-profit mevcut |

**R2 — Dinamik AFK (özet):** passive↑ (düşük alan kapsama, tehdide-göreli hareketsizlik, baskısız kamp); active↑ (gerçek yer değiştirme, kiting/dodge, uzaktan gem toplama). 1sn hareket sadece küçük decay → 9sn birikim net pozitif → aşılamaz. Yanlış-pozitif koruması: usta kiter "tehdide-göreli hareket" ile ayrışır.

**R3 — Anti-dominance (özet):** `dominanceScore` = HP sabit/yüksek + düşük alınan hasar + yüksek kill + power≫tehdit. Yükseldikçe: enemy damage **EHP'ye ölçeklenir** (defans ölümsüz yapamaz), elit avcı/piranha sürüsü (kaçış kesen), alan reddi. **Ödül = risk'e bağlı** (dominance'ın tersi) → güvenli farm tabana iner. Aynı sinyal hem piranha hem ödül kapısı (= TOKENOMICS §5.3/§8 anti-bot).

---

## 4. Entegrasyon Haritası (keşiften — file:line)

**Ödül risk-gating chokepoint'leri**
- In-run gem değeri: `services/combat/physics/CombatResolutionService.ts:250` (`getXpMultiplier()` × **riskMult** eklenecek)
- In-run XP toplama: `services/combat/physics/CollectionSystem.ts:140-150`
- Run-sonu coin/skor: `services/gameplay/RewardCalculator.ts:57-152` (`exitType` zaten `'afk_death'`→0 içeriyor); çağrı `hooks/useGameFlowController.ts:360`
- Verify payload: `services/auth/GameSessionService.ts:245-266`

**Enemy sistemi (piranha + power-scale)**
- Şema `config/EnemyRegistry.ts:6-23` (whale `:65-76`, gatekeeper `:126-138`, `spawnWeight:0` = director-only)
- Factory `factories/EnemyFactory.ts:78-90`, stat scale `:145-152` (`hpMultiplier` parametresi mevcut)
- Spawn `services/combat/SpawnSystem.ts:111-215`; **directive deseni** = gatekeeper (`'portalOpened'` event → orbit spawn, `:104-105, :217-234`) → piranha swarm için kopyala (player-relative pozisyon YENİ)
- Uygulama yolu `components/GameEngine.tsx:1161-1210`

**Liquidation / portal (tema)**
- Liquidation hesap `DifficultyManager.ts:369-417` (effectivePnl = pnl×leverage; CRITICAL≤-0.95)
- Portal tetik `services/gameplay/portal/PortalTrigger.ts:35-88` (TAKE_PROFIT +10%, STOP_LOSS -15%, FORCED); lifecycle `PortalSystemV2.ts`

**Yeni servis/rule konvansiyonları**
- Singleton `getInstance()` + reset: `ResetOrchestrator.registerResettable()` (öncelik 200-300) + `EventBus.on('gameReset'/'gameOver')` + `debugIsClean()`
- `config/architecture/singleton-whitelist.json`'a ekle (review gerekir); guard: `scripts/check-reset-coverage.mjs`, `check-singleton-regressions.mjs`
- Rule arayüzü `services/difficulty/rules/DifficultyRule.ts:27-32` (`{id, apply(ctx)}`, `ctx={inputs,outputs,shared}`); sıra `rules/index.ts:39-52` (üretici→tüketici); input/output `services/difficulty/types.ts`
- Test deseni `tests/services/difficulty/UnifiedDirector.test.ts`, `DifficultyContextReset.test.ts` (pollute→reset→expectDefault)

---

## 5. Uygulama Yol Haritası (fazlar)

### Faz 0 — Açık kararları çöz (❓ §6) ve onayla
- [ ] D1 refactor kapsamı · [ ] D2 liquidation ölümü · [ ] D3 risk-gating kapsamı

### Faz 1 — Temel: tek snapshot + gerçek sinyaller (düşük risk)
- [ ] `DifficultyState` tek snapshot kontratı (types) — tüm sistemlerin okuyacağı
- [ ] `DifficultyManager.ts:~224-225` sabit `0.5`'leri kaldır → FlowStateManager + PlayerPowerAnalyzer gerçek skorlarını `UnifiedInputs`'a bağla
- [ ] Mercy'yi tek yere indir (Director `MercyRule`); FlowStateManager `calculateCorrections` emekliye
- Test: `UnifiedDirector.test.ts` + reset testleri yeşil

### Faz 2 — Enemy-stat üçlü stack'i birleştir (D1'e bağlı) 🔴 ana refactor
- [ ] `PlayerPowerScalingRule` ekle (R1) — `resolveEnemyResponse` HP/damage mantığını director'a taşı
- [ ] CoreGameplayLoop'u daralt: base spawn/speed/damage üretmeyi bırak; snapshot'ı alıp yalnız yoyo + juice uygula
- [ ] `GameEngine.tsx:1161-1210` + `SpawnSystem.update` → tek `DifficultyState` snapshot'tan uygula (çarpan karışımını bitir)
- Test: enemy stat çıktısı tek kaynaktan; snapshot birim testi

### Faz 3 — Feedback inversion (D3'e bağlı)
- [ ] `PnLSpeedRule` yönünü çevir: kâr/yüksek kaldıraç = risk-on = **daha çok baskı**
- [ ] `RiskGatingEngine` (yeni servis) — `riskMultiplier ∈ [floor,1]` = f(dominance/threat/pnl/hp/liq mesafesi)
- [ ] Enjekte: `CombatResolutionService.ts:250` (in-run) + `RewardCalculator` wrapper / `useGameFlowController.ts:360` (run-sonu) — D3 kapsamına göre
- Test: güvenli senaryoda ödül düşer, riskli senaryoda tam

### Faz 4 — Dinamik AFK detektörü
- [ ] `EngagementMonitor` sinyal servisi — `afkSuspicion` accumulator (leaky-bucket, bağlam-ölçekli)
- [ ] `FlowStateManager.isPlayerAFK` statik mantığını bununla değiştir
- [ ] reset coverage + whitelist
- Test: 9sn-bekle-1sn-oyna senaryosu yine de tetikler

### Faz 5 — Anti-dominance + piranha
- [ ] `dominanceScore` (EngagementMonitor'a ekle) + `AntiDominanceRule`/`AntiAfkRule` (director directive)
- [ ] `piranha` enemy tipi (`EnemyRegistry`) + `'hunter'` intent + player-relative swarm spawn (`SpawnSystem`, gatekeeper desenini kopyala)
- [ ] escalating tepki: şüphe>0.5 uyarı sürüsü, >0.8 tam sürü + ödül kapısı
- Test: dominance yükselince directive + reward taper

### Faz 6 — Liquidation = death (D2'ye bağlı)
- [ ] Seçilen modele göre liquidation ölüm akışı (kademeli/sert/soft)
- [ ] `exitType` ve RewardCalculator entegrasyonu (liquidation cezası)

### Faz 7 — Kalibrasyon
- [ ] Parametre simülasyonu (TOKENOMICS sim deseni gibi) + playtest
- [ ] `npm run check:baseline` (typecheck + architecture + reset-coverage + lint + test + build)

---

## 6. Açık Kararlar (Faz 0 — çözülecek)

| # | Karar | Seçenekler | Öneri |
|---|-------|-----------|-------|
| **D1** | Refactor kapsamı | (a) Tam birleştirme — director tek otorite, üçlü stack çöker · (b) Aşamalı — sahiplik+stub temizliği, resolveEnemyResponse kalır | **(a)** ("kesin/tam uyum" hedefi) |
| **D2** | Liquidation = ölüm | (a) Kademeli (uyarı→STOP_LOSS portal→yoksay→liquidation ölümü) · (b) Sert anında wipeout · (c) Soft (mevcut) | **(a)** tema + adil şans |
| **D3** | Risk-gating kapsamı | (a) Sadece ekonomi (coin/skor/token), taban ~%15, in-run XP/gem'e dokunma · (b) Ekonomi + in-run · (c) Ekonomi sıfır (sert) | **(a)** keyfi+ekonomiyi korur |

---

## 7. Doğrulama
- Birim: yeni rule'lar + sinyaller (`tests/services/difficulty/`), reset pollute→expectDefault
- Entegrasyon: tek snapshot'tan enemy stat; risk senaryolarında ödül; AFK exploit senaryosu
- Gate: `npm run check:baseline`
- Playtest: pillar testi — her senaryo "4 amaca hizmet ediyor mu?"

## 8. Devam Notları (changelog)
- 2026-06-25 — Roadmap oluşturuldu (pillarlar + teşhis + hedef mimari + 3 gereksinim + keşif + fazlar). Sıradaki: Faz 0 kararları (D1/D2/D3).
