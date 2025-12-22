# 🎮 Crypto Cyber Survivors - İyileştirme Yol Haritası

## Genel Bakış

Bu doküman oyunun geliştirilmesi için planlanan iyileştirmeleri öncelik sırasına göre listeler.
Her faz bağımsız olarak tamamlanabilir ve oyuna değer katar.

---

## Faz 1: Psikolojik Engagement Sistemleri 🧠
**Durum:** %85 Tamamlandı
**Öncelik:** ⭐⭐⭐⭐⭐ (En Yüksek)

### 1.1 Kill Streak & Combo Sistemi ✅
- [x] Kill streak sayacı (ardışık hızlı killerde artar)
- [x] Combo multiplier (5, 10, 25, 50, 100 killde bonus XP)
- [x] Streak UI göstergesi (GameHUD içinde şık animasyonlu)
- [x] Streak kaybetme uyarısı (3 saniye kill yoksa sona erer)
- [x] Streak sesleri (artan tonlarda ses efekti)
- [x] Combo timer pause (level up/pause menüsünde durur)

### 1.2 PnL Leverage Sistemi ✅
- [x] Ana menüde kaldıraç seçimi (1x - 100x)
- [x] Kaldıraç oranına göre zorluk katsayısı ölçekleme
- [x] UI üzerinde seçili kaldıracı ve etkisini gösterme

### 1.3 Milestone & Achievement Sistemi ✅
- [x] Kill milestone ödülleri (100, 500, 1000 killde)
- [x] Zaman milestone'ları (1dk, 5dk, 10dk hayatta kalma) - WAVE TIMER eklendi
- [x] Görsel milestone popup'ları (Achievement announcements)
- [ ] Permanent unlock sistemi (karakterler, skin'ler)

### 1.4 Near Miss & Clutch Moments ✅
- [x] "CLUTCH!" text HP < 10% iken kill yapınca
- [x] Near-death visual effects (ekran kenarları kırmızı parlaması)
- [ ] Last stand modu (HP 0'a düşeceği an 0.5s dokunulmazlık)

---

## Faz 2: Oynanış Dengeleme & Polish 🎯
**Durum:** %70 Tamamlandı
**Öncelik:** ⭐⭐⭐⭐⭐ (En Yüksek)

### 2.1 Spawn Sistemi & Wave Mantığı 🔶
- [x] Merkezi SpawnSystem servisi (Extract edildi)
- [x] Buff Gem Spawner sistemi (RageModeDecorator, DiamondHandsDecorator vb.)
- [ ] Vampire Survivors tarzı min/max enemy sistemi
- [ ] Wave tabanlı enemy tipi değişimi (her 60 saniyede yeni tip)
- [ ] Elite enemy spawn sistemi (her 2 dakikada mini-boss)

### 2.2 Difficulty Curve Balancing ✅
- [x] Minute-based difficulty scaling (Complexity increases over time)
- [x] Smooth difficulty transitions (Logaritmik smoothing)
- [x] Near-death mercy (Can düşükken zorluk azalır)

### 2.3 Kart Sistemi Balancing 🔶
- [x] Psychologically optimized Slot Machine Leveling
- [x] Premium Tiered Icons (Common, Rare, Epic, Legendary)
- [ ] Synergy kartları ekle (2 kart birlikte alınca bonus)
- [ ] Reroll mekanizması (1 kez yeniden çekebilme)

---

## Faz 3: Görsel & Ses Polish ✨
**Durum:** %70 Tamamlandı
**Öncelik:** ⭐⭐⭐⭐

### 3.1 Görsel Efektler ✅
- [x] Damage number renk kodlaması (Crit/Super Crit)
- [x] Dash trail shadow efekti
- [x] Trail effect (mermi arkasında iz)
- [x] Impact particles (düşman vurulunca)
- [x] Collect effect (gem alırken spiral animasyon)

### 3.2 UI/UX İyileştirmeleri 🔶
- [x] Modern HUD (Health, XP, Stats, Combo)
- [x] Performance optmized canvas rendering
- [x] Enemy Pointer (ekran dışı düşman takibi)
- [ ] Damage number stacking
- [x] Wave timer göstergesi

### 3.3 Ses Sistemi 🔶
- [x] Web Audio API synthesizer engine (SynthEngine)
- [x] Kill combo ses efektleri (artan pitch)
- [x] Slot machine sesleri (tick, win, anticipation)
- [ ] Background music (dynamic, duruma göre değişen)
- [ ] Ambient market sounds
- [ ] Wave transition sounds
- [ ] Victory/defeat jingles

---

## Faz 4: İçerik & Çeşitlilik 🎲
**Öncelik:** ⭐⭐⭐⭐

### 4.1 Yeni Enemy Tipleri
- [ ] Ranged enemy (mesafeden atar)
- [ ] Splitter enemy (öldürünce 2'ye bölünür)
- [ ] Boss enemy (her 5 dakikada, özel mekanikli)

### 4.2 Yeni Silah Sistemleri
- [ ] Secondary weapon slot
- [ ] Area damage weapons (bomb, laser)
- [ ] Passive weapons (orbit, aura)
- [ ] Weapon evolution (2 item birleşince yükseltme)

### 4.3 Yeni Kart Tipleri
- [ ] Passive aura kartları (sürekli etki)
- [ ] Triggered kartları (HP düşükken aktif)
- [ ] Stacking kartları (birden fazla alınabilir)
- [ ] Trade-off kartları (bir stat+, bir stat-)

---

## Faz 5: Meta Progression 🏆
**Öncelik:** ⭐⭐⭐

### 5.1 Stats & History
- [x] MetricsService ile 50+ metrik takibi
- [x] JSON/CSV Export yeteneği
- [ ] Run history (son 10 oyun görünümü)

### 5.2 Leaderboard & Stats
- [ ] Local high score kaydetme
- [ ] Stats tracking (toplam kill, en yüksek level, vb.)
- [ ] Run history (son 10 oyun)
- [ ] Best combo, best streak kayıtları

### 5.3 Günlük Hedefler
- [ ] Daily challenge sistemi
- [ ] Bonus XP/gold ödülleri  
- [ ] Streak bonus (ardışık günlerde oynama)

---

## Faz 6: Performans & Optimizasyon ⚡
**Durum:** %60 Tamamlandı
**Öncelik:** ⭐⭐⭐

### 6.1 Render Optimizasyonu
- [x] Spatial partitioning (SpatialGrid) çarpışma tespiti için
- [x] Object pooling sistemi (PoolManager)
- [x] Performance presets (LOW/MEDIUM/HIGH/ULTRA)
- [x] Off-screen culling (görünmeyen nesneler çizilmiyor)
- [ ] Batch rendering (aynı tipte nesneleri grupla)
- [ ] WebGL renderer seçeneği

### 6.2 Memory Optimizasyonu
- [x] Object pool boyutlarını optimize et (trimFreeLists)
- [x] Pre-warm pools (PoolManager.preWarm)
- [ ] Texture atlas kullanımı
- [ ] Lazy loading (ihtiyaç halinde yükle)

### 6.3 Mobile Optimizasyon ✅
- [x] Touch controls (VirtualJoystick, DashButton)
- [x] Responsive UI (ScreenService)
- [x] Device benchmark (DeviceBenchmarkService)
- [x] Performance profiling (auto profile detection)
- [ ] Battery optimization

---

## Faz 7: Sosyal & Multiplayer 👥
**Tahmini Süre:** 8-10 saat
**Öncelik:** ⭐⭐

### 7.1 Paylaşım
- [ ] Screenshot paylaşım butonu
- [ ] Score share to Twitter/X
- [ ] Run replay kaydetme

### 7.2 Rekabet
- [ ] Global leaderboard (backend gerekli)
- [ ] Weekly tournaments
- [ ] Friend challenge linkleri

---

## Implementasyon Öncelik Sırası

| Sıra | Faz | Süre | Etki |
|------|-----|------|------|
| 1 | Kill Streak & Combo (1.1) | 1 saat | 🔥🔥🔥🔥🔥 |
| 2 | Spawn Sistemi (2.1) | 1 saat | 🔥🔥🔥🔥🔥 |
| 3 | Near Miss (1.3) | 45 dk | 🔥🔥🔥🔥 |
| 4 | Görsel Efektler (3.1) | 2 saat | 🔥🔥🔥🔥 |
| 5 | Milestone (1.2) | 1.5 saat | 🔥🔥🔥🔥 |
| 6 | Difficulty Curve (2.2) | 1 saat | 🔥🔥🔥🔥 |
| 7 | Yeni Düşmanlar (4.1) | 3 saat | 🔥🔥🔥 |
| 8 | Ses Sistemi (3.3) | 2 saat | 🔥🔥🔥 |
| 9 | Meta Progression (5) | 4 saat | 🔥🔥🔥 |
| 10 | Performans (6) | 2 saat | 🔥🔥 |

---

## Hızlı Kazanımlar (Quick Wins) 🚀

En az eforla en çok etki yapacak değişiklikler:

1. **[x] Near-death visual effects** - Ekran kenarlarında kırmızı parlama (Tamamlandı)
2. **[ ] Level up slow-mo** - Kart seçimi öncesi anlık yavaşlama (Planlanıyor)
3. **[x] "WAVE TIMER" uyarısı** - Üst orta kısımda survival süresi (Tamamlandı)
4. **[ ] Mermi trail efekti** - Basit neon izler (Beklemede)
5. **[x] Hit Knockback** - Vuruş hissi için geri tepme (Tamamlandı)

---

## Teknik Borç (Technical Debt) 🔧

Temizlenmesi gereken konular:

- [x] ESLint warning'ları temizle (49 → 16 warning, %67 azalma)
- [x] Singleton pattern modernizasyonu (??= operatörü)
- [x] Deprecated API düzeltmeleri (navigator.platform → userAgentData)
- [x] Nullish coalescing düzeltmeleri (|| → ??)
- [ ] Test coverage artır (components için testler)
- [x] Type safety iyileştir (EventBus ve ComboSystem'de yapılandırıldı)
- [ ] Code splitting (lazy load components)
- [ ] Error boundary test coverage

---

**Son Güncelleme:** 2025-12-22
**Versiyon:** 1.2
