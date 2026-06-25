# Crypto Survivors — Tokenomics v0.3 (taslak)

> Durum: **TARTIŞMA TASLAĞI**. Sayılar `scripts/tokenomics-sim.mjs` ile üretildi; lansman öncesi gerçek veriyle kalibre edilecek.
> Token sembolü `$SURV` bir **placeholder**'dır.
> Bu doküman hukuki/finansal tavsiye değildir. TGE öncesi kripto avukatı şarttır (bkz. §10).

---

## 1. Kilitlenen Kararlar

| Konu | Karar |
|------|-------|
| Zincir | **Solana** · Token-2022 (`$SURV`) · decimals 9 |
| Ekonomi modeli | **B — utility / transaction-ekonomisi** |
| Mimari | **İki katman**: off-chain "soft coin" + on-chain `$SURV` |
| **Toplam arz** | **500.000.000 (sabit/tavanlı)** — bir kez basılır, mint **revoke** |
| Emisyon | **Dinamik haftalık bütçe + clamp** (oyuncu sayısına duyarlı, tavanlı) |
| Takım payı | **%15**, 1 yıl cliff + 3 yıl lineer kilit |
| Finansman | **Grant + öz kaynak** (yatırımcı/ön satış yok) |
| Dağıtım | Geriye dönük **airdrop** (kilitli/spendable) + **performans emisyonu** |
| Sink'ler | Kozmetik + **itibar/prestij (%100 yakım)** + **sosyal platform** |
| Airdrop kuralı | Satılamaz ama oyun içi harcanabilir; **kozmetikler airdrop'tan önce canlı** |

---

## 2. Token Temel Parametreleri
- **Toplam arz:** `500.000.000` — sabit, tavanlı.
- **Mint:** TGE'de 500M tek seferde basılır → **mint authority revoke**. Kimse yeni token basamaz.

---

## 3. Dağıtım (500M)

| Kısım | Oran | Adet | Kilit / Açıklama |
|------|------|------|------------------|
| Oynanış emisyonu | **40%** | 200.000.000 | Ana faucet, ~5+ yıla azalarak (§5) |
| Ekosistem / Hazine | **20%** | 100.000.000 | Turnuva, pazarlama, grant eşleştirme |
| Takım / Founder | **15%** | 75.000.000 | 1 yıl cliff + 3 yıl lineer, on-chain vesting |
| Likidite (DEX) | **10%** | 50.000.000 | Kilitli (LP lock) |
| Airdrop (Season 0) | **10%** | 50.000.000 | Erken oyunculara, **kilitli/spendable** |
| Rezerv | **5%** | 25.000.000 | Multisig kilitli |
| **Toplam** | **100%** | **500.000.000** | |

> Tüm kilitler ve hazine **multisig** ile yönetilir.

---

## 4. İki Katmanlı Mimari

| Katman | Nedir | Nerede | Takas? |
|--------|-------|--------|--------|
| **Soft coin** | Oyun içi yumuşak para | Off-chain — `CoinService` + Railway | Hayır |
| **`$SURV`** | Kıt, airdrop+emisyon | On-chain Solana, Phantom | Evet (§10) |

Köprü: **claim** (token OUT, §7) ve **sink** (token IN, §6). Tüm kazanç `sessions/verify` → `GameplayValidator`/`SessionValidator` yolundan; yeni "iyimser kredi" yolu açma.

---

## 5. EMİSYON MATEMATİĞİ (faucet) — sistemin kalbi

> Simülasyon: `scripts/tokenomics-sim.mjs` (`node scripts/tokenomics-sim.mjs`). Parametreleri değiştir, tekrar çalıştır.

### 5.0 Season 0 zamanlaması
Oyunun temel sistemleri + sink'ler bitmeden Season 0 **başlamaz**. Şimdi: matematiği tasarla, skor telemetrisini oyuna göm. Veri toplama sonra açılır.

### 5.1 Tasarım hedefleri
1. **Ölçek-duyarlı + tavanlı:** bütçe oyuncuyla büyür ama `B_max`'ı aşmaz.
2. **Beceri temelli:** ödül süreye/grind'e değil performansa bağlı → bot az kazanır.
3. **Azalan:** zamanla emisyon düşer.
4. **Öngörülebilir:** tavan altında kişi başı ödül ≈ `r_target`, oyuncu sayısından bağımsız.

### 5.2 Haftalık tavan (`B_max`) ve per-capita hedef (`r_target`)
Havuz `E=200M`, `N=5` yıl, yıllık azalma `d=0.65`. `B_max` ve `r_target` birlikte `d` ile azalır → **clamp eşiği sabit kalır**.

```
A_y       = E·(1−d)·d^(y−1)/(1−d^N)      // yıllık tavan
B_max(y)  = A_y / 52                       // haftalık sert tavan
r_target(y) = 300 · d^(y−1)                // oyuncu başına haftalık hedef (Yıl 1 = 300)
```

| Yıl | `B_max`/hafta | `r_target` | Clamp eşiği (B_max/r_target) |
|-----|---------------|-----------|------------------------------|
| 1 | **1.523M** | 300 | **~5.077 oyuncu** |
| 2 | 0.990M | 195 | ~5.077 |
| 3 | 0.644M | 127 | ~5.077 |
| 4 | 0.419M | 82 | ~5.077 |
| 5 | 0.272M | 54 | ~5.077 |

### 5.3 Run skoru (her oyun sonu) — mevcut telemetriden
```
runScore = waveFactor · difficultyMult · skillMult
```
- `waveFactor` = (ulaşılan dalga/cycle)^1.2  → **survival-gated**: düşük beceri derin dalgaya ulaşamaz
- `difficultyMult` = market zorluğu (1.0–3.0, `DifficultyContext`)
- `skillMult` = no-hit/verimlilik/streak (`maxStreak`) bonusları (1.0–2.0)
- Validatör başarısız → `runScore = 0`

> **Botlar için kritik:** `waveFactor` gerçekten survival'a bağlı olmalı. Bot derin dalgaya **ulaşamadığı** için yüksek runScore alamaz — "çok deneyerek şanslı run" yakalayamaz. (Sim'de bu gating zayıfken bot medyanın %27'sini alıyor; gating güçlü + anti-cheat ile ~0'a iner.)

### 5.4 Epoch skoru (oyuncu/hafta)
```
rawEpoch_i = Σ (oyuncunun EN İYİ K run'ı)      // K=10, grind'i sınırlar
effScore_i = max(0, rawEpoch_i − S_min)^α       // S_min: beceri tabanı, α=0.8: whale sıkıştırma
```

### 5.5 Dinamik haftalık bütçe + clamp — TEMEL DENKLEM
```
B_week = min( B_max(y) ,  r_target(y) × nitelikliOyuncu )

reward_i = B_week · effScore_i / Σ effScore_j
```
- `nitelikliOyuncu` = effScore > 0 olanlar. Botlar tabanı geçemezse bütçeyi **şişiremez**.
- **Tavan altında:** `B_week = r_target × oyuncu` → ort. ödül ≈ `r_target` sabit. 500 de 1500 de olsa kişi başı adil; pot büyür.
- **Tavan üstünde:** `B_week = B_max` → pot sabit, ödül dilüe (havuzu korur).
- **Clamp eşiği** = `B_max/r_target` (Yıl 1 ≈ 5.077 oyuncu).
- **Sonuç:** havuz **≥ N yıl** sürer (az kullanımda uzar). Enflasyon talep-güdümlü ama tavanlı.

### 5.6 Garanti edilen özellikler (sim ile doğrulandı)
| Özellik | Kanıt (sim) |
|---------|-------------|
| Ölçek-duyarlı + tavanlı | 500/1500/5000 oyuncuda ort. ödül sabit **300**; toplam emisyon hep ≤ B_max |
| Havuz uzar | Yıl1 2.000 oyuncu → 31.2M emisyon (plan 79M'in altında); 5y toplam 152M < 200M |
| Bot ROI düşük | Bot medyanın ~%27'si (sadece emisyon matematiği) → anti-cheat ile ~0 |
| Erken öngörülebilir | Tavan altında ödül kendi skoruna bağlı, başkalarından bağımsız |

### 5.7 Sayısal örnek (Yıl 1, `B_max`=1.523M, `r_target`=300, eşik ≈5.077) — sim çıktısı
| Senaryo | Aktif oyuncu | `B_week` | Ort/oyuncu | Medyan(L) | Top1%(L) | Medyan(bot) | Bot/legit |
|---------|-------------|----------|-----------|-----------|----------|-------------|-----------|
| Küçük | 500 | 153k | **300** | 235 | 1.240 | 63 | 27% |
| Büyüyen | 1.500 | 458k | **300** | 231 | 1.196 | 62 | 27% |
| Eşikte | 5.000 | 1.523M (clamp) | **300** | 229 | 1.334 | 61 | 27% |
| Popüler | 20.000 | 1.523M (clamp) | **74** | 58 | 319 | 15 | 25% |

### 5.8 Sink fiyatlama (faucet ↔ sink dengesi) — sim uyarısı
Medyan ~300/hafta kazanca göre: tier-1 kozmetik ~600–1.200 (2–4 hafta), efsanevi/prestij ~3.000–6.000 (10–20 hafta).

> **Sim bulgusu (Senaryo C):** Saf kozmetik sink'i (%70 yakım) **tek başına yetmez** — %120 harcamada bile sink/faucet = 0.84 (<1). Dengeyi **%100 yakan itibar/prestij sink'i** kapatır. Status sink'i **opsiyonel değil, zorunlu**.

### 5.9 Lansman öncesi kalibrasyon
`scripts/tokenomics-sim.mjs` hazır. Parametreler (`d, N, K, α, S_min, r_target, B_max`) gerçek skor dağılımıyla kalibre edilmeli (medyan/whale oranı, bot ROI, sink/faucet). Gerçek beta verisi geldikçe sim güncellenir.

---

## 6. Sink'ler

| Sink | Mekanik | Token gider | Not |
|------|---------|-------------|-----|
| **İtibar / Prestij** | Prestij tier, rozet, sıralama vurgusu | **%100 yak** | Dengeyi kapatan ana sink (sim §5.8) |
| **Kozmetikler** | `$SURV` / NFT mint | %70 yak, %30 hazine | Airdrop'tan **önce** canlı (§11) |
| **Sosyal platform** | Lonca ücreti, profil, öne çıkarma, tipping | rake yak + hazine | Büyüdükçe büyüyen sink |
| **Turnuva girişi** | Giriş ücreti | %50 ödül, %30 yak, %20 hazine | |
| **Crafting** | Eşya üretimi | yak | |

> **İdeal eğri:** faucet azalırken (emisyon taper) sosyal/prestij sink'leri büyür → sink/faucet ≥ 1'e doğru gider.

---

## 7. Claim Akışı
```
Oyna → sessions/verify → validatörler [anti-cheat] → backend "claimable $SURV" off-chain biriktirir
Claim (Phantom) → backend imzalı yetki (nonce+süre) → emisyon PDA'sından cüzdana transfer
```
Gatekeeper = backend; mint revoke → havuz dışı üretim yok; batching → düşük fee.

---

## 8. Anti-Sybil / Anti-Cheat
Para dağıtan sistem bot çeker. Katmanlar: (1) emisyon matematiği (top-K + taban + survival-gating → bot ~%27), (2) **anti-cheat sahte run'ları sıfırlar** (→ ~0), (3) cüzdan↔hesap bağlama + Sybil heuristikleri + rate-limit. Üçü birlikte bot ROI'sini ezer.

---

## 9. Token-2022 Transfer Fee (opsiyonel)
Pasif sink ama DEX/CEX'i zorlaştırır. **Öneri:** ana sink'ler oyun-içi; transfer fee yok ya da ≤%1.

---

## 10. Hukuk / Regülasyon — ONAYINI BEKLEYEN AÇIK KARAR
TR: SPK/MASAK sıkılaşması; gerçek-değerli ödül kumar/menkul kıymet sınırına yaklaşabilir. Azaltıcılar: utility+beceri temelli (şans değil), offshore vakıf, geofence, **TGE öncesi avukat**.
**Karar:** cash-out (a) baştan DEX'te mi (b) aşamalı mı? **Öneri: (b)** — airdrop kilitli/spendable başlar, tam likidite hukuki yapı hazır olunca.

---

## 11. Lansman Sıralaması — KRİTİK BAĞIMLILIK
> Airdrop "satılamaz ama oyun içi harcanabilir" olacak. Sink'ler canlıysa token satış yerine **yakıma** gider; sink yoksa kilit bitince dump patlar. **Kozmetik/sink'ler canlı olmadan airdrop AÇILMAZ.**

İki katman çözer: airdrop önce off-chain spendable bakiye iner; kilit bitince on-chain `$SURV`'a çekilir.

1. **Faz A:** oyun core bitir.
2. **Faz B:** sink altyapısı (kozmetik + itibar + sosyal) canlı.
3. **Faz C:** Season 0 telemetri açık; airdrop birikir; grant başvuruları.
4. **Faz D — TGE:** 500M mint → revoke → DEX likidite (kilitli) → airdrop (kilitli/spendable) → emisyon başlar.
5. **Faz E:** sink/faucet izle, `r_target`/`B_max` sezon başına ayarla; hacimle CEX.

---

## 12. İzlenecek Metrikler
Sink/Faucet (hedef ≥1) · dolaşımdaki arz · holder dağılımı · airdrop sell-through · aktif claim oranı.

---

## 13. Açık Kalan Kararlar
| # | Karar | Durum |
|---|-------|-------|
| 1 | Cash-out (§10): baştan açık / aşamalı | **Onayın gerekli.** Öneri: aşamalı |
| 2 | Toplam arz | ✅ 500M |
| 3 | Token sembolü/adı (`$SURV`) | Marka kararı |
| 4 | Hukuki yargı bölgesi / vakıf | Avukatla |
| 5 | Emisyon parametreleri (`d,N,K,α,S_min,r_target,B_max`) | Sim ile kalibre (§5.9) |
| 6 | Transfer fee | Öneri: ≤%1 veya yok |
| 7 | `r_target` başlangıç (300) ve `d` (0.65) | Sim ile doğrula |
