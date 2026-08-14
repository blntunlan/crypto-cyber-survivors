# Difficulty runtime authority — ölçüm ve karar

> **Kapsam:** Core Loop programının **açık karar #2**'si — "hangi runtime shell hayatta kalır".
> **Tarih:** 2026-08-14 · **Üst plan:** [2026-08-13-core-loop-contract-conformance.md](./2026-08-13-core-loop-contract-conformance.md)
> **Durum:** Ölçüm tamamlandı · cutover **reddedildi** · `current` fiilî otorite olarak doğrulandı

---

## 1. Neden bu doküman

`VITE_DIFFICULTY_RUNTIME_MODE` hiçbir env dosyasında tanımlı değildi
(`.env`, `.env.local`, `.env.example` — üçünde de yok). `config/directorRuntime.ts:8` bu
değişkeni okuyor, `parseDifficultyRuntimeMode(undefined)` ise `'current'` döndürüyor. `'current'`
planında `runsModularShadow: false`, dolayısıyla `DifficultyRuntime.commitAtBoundary` modüler
orchestrator'ı hiç çağırmıyor (`:216-217`) ve `difficultySnapshotCommitted` **üretimde hiç emit
edilmiyor** (`:166`).

Bu event'i bekleyen tüketiciler sessizce ölüydü:

| Tüketici | Etki |
|---|---|
| `services/combat/physics/CollectionSystem.ts:191-197` | XP / gem çarpanları hep `?? 1` — ödüller zorlukla ölçeklenmiyordu |
| `hooks/useDifficultyV2.ts` | GameUI `fovReduction`, `LiquidationWarningOverlay` hiç güncellenmiyordu |
| `hooks/useMarketRegime.ts` | LiveFeed regime telegraph'ı (`53e3281d`) hiç güncellenmiyordu |
| `services/lootbox/LootboxService.ts:42` | `difficultyUpdated` hiç ateşlenmiyordu |

**Neden hiçbir test yakalamadı:** ilgili testlerin tamamı modu açıkça veriyor —
`createGameRuntime({ difficultyMode: 'modular' })`, `createDifficultyRuntime('shadow')`. Gönderilen
varsayılan yolu koşan tek bir test yoktu.

---

## 2. Alınan önlemler (uygulandı)

- `.env.example`'a `VITE_DIFFICULTY_RUNTIME_MODE` eklendi, üç shell'in anlamı yazıldı.
- `config/architecture/BetaEnvContract.ts`: beta/prod için **zorunlu** hâle getirildi. Bir env
  değişkeninin *yokluğunun* koca bir shell'i sessizce kapatabilmesi asıl kusurdu; kontrat artık
  hangi shell'in otorite olduğunun açıkça beyan edilmesini şart koşuyor.
- `tests/services/gameplay/DifficultyPhase.test.ts`: varsayılan yolu koşan iki test — modun
  `current`'a çözüldüğü, ve 20 tick boyunca **sıfır** `difficultySnapshotCommitted` emit edildiği.
- `tests/services/director/DirectorRuntimeConfig.test.ts`: mod tablosuna `undefined` satırı.

---

## 3. Ölçüm

`tests/golden/ShadowDivergence.golden.test.ts` her iki shell'i **aynı** deterministik girdilerle
sürüyor: 6 market senaryosu (`calm`, `trend-up`, `trend-down`, `volume-surge`, `volatility-spike`,
`stale-reconnect`) × 48 frame. Sonuçlar `tests/golden/fixtures/shadow-divergence.v1.json`'a
kilitlendi; drift, `ShadowComparisonRecorder`'ın tanımıyla **mutlak fark** (`|current − modular|`).

> **Harness notu:** senaryolar ham işlem hacmi taşıyor (800 taban, surge'de 3200), oysa canonical
> frame'deki `normalizedVolume` 0.1–3 aralığında bir *orandır*. İlk koşuda ham değeri doğrudan
> geçirmiştim; bu, iki shell'i değil harness'ı ölçüyordu. Düzeltildi — aşağıdaki rakamlar
> aralık-içi girdiyle alınmıştır.

**288 karşılaştırmanın 288'i başarısız.** Senaryolar genelinde en kötü mutlak drift:

| Boyut | En kötü drift | Not |
|---|---|---|
| `creditRate` | 0.640 | en yükseği `trend-down`'da |
| `recoveryNeed` | 0.580 | tüm senaryolarda **sabit** |
| `threatTarget` | 0.528 | çekirdek zorluk çıktısı |
| `mercy` | 0.348 | tüm senaryolarda **sabit** |
| `spawnWindowSeconds` | 1.651 | saniye cinsinden |
| `enemyHealthMultiplier` | 0.133 | |
| `enemyDamageMultiplier` | 0.083 | |
| `enemySpeedMultiplier` | 0.074 | |
| `presentationIntensity` | 2.000 | yalnız `volume-surge`'de — bkz. §5 |

`mercy` ve `recoveryNeed`'in senaryodan bağımsız **sabit** farkı, gürültü değil farklı taban/formül
işareti: modüler shell bu iki ekseni yapısal olarak başka hesaplıyor.

---

## 4. Karar

**Modular'a cutover reddedildi. `current` shell otorite olarak kalır.**

Gerekçe:

1. **Parity yok, yakın bile değil.** Her tick, her boyut, her senaryo ayrışıyor. `threatTarget`
   0.53'lük mutlak farkla oyunun çekirdek zorluk çıktısı; bu farkla mod değiştirmek dengeyi
   ölçülemez biçimde kaydırır.
2. **Sözleşme cutover'ı zaten shadow sonrasına koymuştu** (S7, §18/§19). Shadow verisi geldi ve
   "hazır değil" diyor.
3. **Kod tabanı da fiilen `current`'ı seçmiş.** S5'in run-sonu özeti için yeni yazılan
   `services/director/RunPerformanceTracker.ts`, `CurrentDifficultyRuntimeAdapter` üzerine kuruldu.

**Bu kararın kapsamadığı şey:** modüler shell'in silinmesi. Ölçüm "cutover şimdi güvenli değil"
diyor, "modüler yol değersiz" demiyor. Shell şimdilik `shadow` altında ölçülebilir kalsın;
silme/yakınsama kararı S7'nin kendi hedefinde, bu fixture bir parity ölçeri olarak elde tutularak
verilir.

**Ölü tüketiciler için sonuç:** `difficultySnapshotCommitted`'a bağlı dört tüketici (§1 tablosu)
bu kararla otomatik canlanmıyor. `current` otorite kaldığı sürece onların
`CurrentDifficultyRuntimeAdapter`'ın canlı çıktısına bağlanması gerekir — bu ayrı bir iş kalemi ve
program planının Dilim B/E'sine aittir. **Bu doküman onları canlandırmıyor; yalnızca neden ölü
olduklarını ve hangi yoldan canlanacaklarını sabitliyor.**

---

## 5. Ölçüm sırasında çıkan yan bulgu

`environment.presentationIntensity` iki shell'de farklı korunuyor:

- **modular** — `DifficultySnapshotComposer.ts:140` `clamp(Math.max(pressure, confidence), 0, 1)`
- **current** — `ExperienceDirector.ts:364` `Math.max(frame.market.confidence, |alignment|)`,
  **clamp yok**

Aralık-içi girdiyle bile `volume-surge` sırasında current shell 3 üretirken modular 1'e kırpıyor
(drift 2). Tüketicisi `PresentationDirector.ts:132-137`. Otorite shell'in sınırsız bir presentation
çıktısı yayması bir sağlamlık boşluğu — Dilim E'nin çıktı-tüketim guard'ıyla birlikte ele alınmalı.

---

## 6. Üst plandaki düzeltmeler

`2026-08-13-core-loop-contract-conformance.md` kendisiyle çelişiyor ve düzeltilmeli:

- Durum başlığı S7'yi ✅ işaretliyor; §2'deki S7 bölümü hâlâ "**Açık karar gerekiyor**" diyor.
  Doğrusu: S7'nin legacy temizliği tamamlandı, **yakınsama/cutover kısmı açık** — bu doküman onu
  ölçtü ve erteledi.
- Baseline test sayıları iki paragrafta farklı: 3099 ve 3167.
