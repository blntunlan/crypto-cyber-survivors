# 🎮 Crypto Cyber Survivors - İyileştirme Yol Haritası

## Genel Bakış

Bu doküman oyunun geliştirilmesi için planlanan iyileştirmeleri öncelik sırasına göre listeler.
Her faz bağımsız olarak tamamlanabilir ve oyuna değer katar.

---

## Faz 1: Psikolojik Engagement Sistemleri 🧠
**Tahmini Süre:** 2-3 saat
**Öncelik:** ⭐⭐⭐⭐⭐ (En Yüksek)

### 1.1 Kill Streak & Combo Sistemi
- [x] Kill streak sayacı (ardışık hızlı killerde artar)
- [x] Combo multiplier (5, 10, 25, 50, 100 killde bonus XP)
- [x] Streak UI göstergesi (ekranda görsel)
- [x] Streak kaybetme uyarısı (3 saniye kill yoksa sona erer)
- [x] Streak sesleri (artan tonlarda ses efekti)

### 1.2 Milestone & Achievement Sistemi
- [ ] Kill milestone ödülleri (100, 500, 1000 killde)
- [ ] Zaman milestone'ları (1dk, 5dk, 10dk hayatta kalma)
- [ ] Damage milestone'ları (10K, 100K toplam hasar)
- [ ] Görsel milestone popup'ları
- [ ] Permanent unlock sistemi (karakterler, skin'ler)

### 1.3 Near Miss & Clutch Moments
- [ ] "CLUTCH!" text HP < 5% iken kill yapınca
- [ ] "COMEBACK!" text HP < 10%'dan > 50%'e çıkınca
- [ ] Last stand modu (HP 0'a düşünce 3 saniye daha yaşama şansı)
- [ ] Near-death visual effects (ekran kenarları kırmızı)

---

## Faz 2: Oynanış Dengeleme & Polish 🎯
**Tahmini Süre:** 2-3 saat
**Öncelik:** ⭐⭐⭐⭐⭐ (En Yüksek)

### 2.1 Spawn Sistemi Optimizasyonu
- [ ] Vampire Survivors tarzı min/max enemy sistemi
- [ ] Wave tabanlı enemy tipi değişimi (her 60 saniyede yeni tip)
- [ ] Elite enemy spawn sistemi (her 2 dakikada mini-boss)
- [ ] Spawn alanı optimizasyonu (ekran dışı, görünmez spawn)

### 2.2 Difficulty Curve Balancing
- [ ] Başlangıç 30 saniye "tutorial mode" (çok az enemy)
- [ ] Minute-based difficulty scaling (her dakika +%10)
- [ ] Max difficulty cap (30 dakika sonra sabitlenir)
- [ ] Smooth difficulty transitions (ani zorluk sıçramalarını önle)

### 2.3 Kart Sistemi Balancing
- [ ] Kart güç seviyelerini normalize et
- [ ] Synergy kartları ekle (2 kart birlikte alınca bonus)
- [ ] Curse kartları (güçlü ama dezavantajlı)
- [ ] Reroll mekanizması (1 kez yeniden çekebilme)

---

## Faz 3: Görsel & Ses Polish ✨
**Tahmini Süre:** 3-4 saat
**Öncelik:** ⭐⭐⭐⭐

### 3.1 Görsel Efektler
- [ ] Trail effect (mermi arkasında iz)
- [ ] Impact particles (düşman vurulunca)
- [ ] Death explosions (düşman ölümünde patlama)
- [ ] Level up celebration (büyük particle burst)
- [ ] Collect effect (gem alırken spiral animasyon)

### 3.2 UI/UX İyileştirmeleri
- [ ] Health bar animasyonu (smooth değişim)
- [ ] XP bar glow effect (levele yaklaşırken)
- [ ] Damage number stacking (aynı yerde birden fazla sayı)
- [ ] Mini-map veya radar (düşman konumları)
- [ ] Wave timer göstergesi

### 3.3 Ses Sistemi
- [ ] Background music (dynamic, duruma göre değişen)
- [ ] Kill combo ses efektleri (artan pitch)
- [ ] Ambient market sounds
- [ ] Wave transition sounds
- [ ] Victory/defeat jingles

---

## Faz 4: İçerik & Çeşitlilik 🎲
**Tahmini Süre:** 4-5 saat
**Öncelik:** ⭐⭐⭐⭐

### 4.1 Yeni Enemy Tipleri
- [ ] Ranged enemy (mesafeden atar)
- [ ] Splitter enemy (öldürünce 2'ye bölünür)
- [ ] Shielded enemy (ön tarafı korumalı)
- [ ] Horde enemy (küçük ama çok sayıda)
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
**Tahmini Süre:** 4-5 saat
**Öncelik:** ⭐⭐⭐

### 5.1 Persistent Unlock Sistemi
- [ ] Gold sistem (maçlardan kazanılan para)
- [ ] Character unlock (farklı başlangıç statları)
- [ ] Permanent upgrades (küçük bonuslar)
- [ ] Skin/color unlocks

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
**Tahmini Süre:** 2-3 saat
**Öncelik:** ⭐⭐⭐

### 6.1 Render Optimizasyonu
- [ ] Spatial partitioning (quadtree) çarpışma tespiti için
- [ ] Off-screen culling (görünmeyen nesneleri çizme)
- [ ] Batch rendering (aynı tipte nesneleri grupla)
- [ ] WebGL renderer seçeneği

### 6.2 Memory Optimizasyonu
- [ ] Object pool boyutlarını optimize et
- [ ] Texture atlas kullanımı
- [ ] Lazy loading (ihtiyaç halinde yükle)

### 6.3 Mobile Optimizasyon
- [ ] Touch controls
- [ ] Responsive UI
- [ ] Performance profiling
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

1. **[x] Kill Streak UI** - Sadece sayaç ve text (30 dk)
2. **[ ] Screen shake intensity ayarı** - Daha fazla "juice" (15 dk)
3. **[x] Damage number renk kodlaması** - Normal/crit/super crit farklı renk (15 dk)
4. **[ ] Level up pause** - Level up anında 0.5 sn yavaşlama (15 dk)
5. **[ ] Wave başlangıç uyarısı** - "INTENSE WAVE INCOMING!" text (20 dk)

---

## Teknik Borç (Technical Debt) 🔧

Temizlenmesi gereken konular:

- [x] ESLint warning'ları temizle (Ana kod temizlendi)
- [ ] Test coverage artır (components için testler)
- [x] Type safety iyileştir (EventBus ve ComboSystem'de yapılandırıldı)
- [ ] Code splitting (lazy load components)
- [ ] Error boundary test coverage

---

**Son Güncelleme:** 2025-12-18
**Versiyon:** 1.0
