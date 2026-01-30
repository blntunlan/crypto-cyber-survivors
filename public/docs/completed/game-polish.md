---
description: Game Feel & Polish özellikleri ekleme workflow'u - Oyuna juice/polish ekler
status: COMPLETED
completion_date: 2026-01-03
---

# Game Feel & Polish Implementation Workflow

Bu workflow, oyuna "game feel" ve "polish" özellikleri eklemek için kullanılır.
Her özellik sistematik bir şekilde araştırılır, implement edilir ve test edilir.

---

## Özellik Listesi (Öncelik Sırasına Göre)

1. **Hit Stop / Freeze Frame** - Vuruş anında kısa duraklama
2. **Enemy Death Pop** - Düşman ölüm animasyonu (scale + flash)
3. **Squash & Stretch** - Player hareket animasyonu
4. **Near Miss Tension** - Yakın kaçış efekti
5. **Lucky 7 Combo** - Casino temalı combo bonusu
6. **Gem Magnet Arc** - Gem toplama eğrisi
7. **Enemy Spawn Animation** - Düşman giriş efekti
8. **Damage Direction Indicator** - Hasar yönü göstergesi
9. **Dynamic Speed Lines** - Dash sırasında hız çizgileri
10. **Low HP Heartbeat** - Düşük can görsel/işitsel uyarı

---

## Genel Workflow Yapısı

Her özellik için aşağıdaki adımları takip et:

### Faz 1: Keşif ve Analiz
// ultrathink

1. **Etki Analizi Yap**
   - Bu özellik hangi dosyaları etkileyebilir?
   - Hangi sistemlerle entegre olması gerekiyor?
   - Mevcut kodda benzer bir mekanizma var mı?

2. **Dosyaları Tara**
   - `grep_search` ile ilgili keyword'leri ara
   - `view_file_outline` ile ilgili dosyaların yapısını incele
   - Mevcut render pipeline'ı anla

3. **Bağımlılıkları Belirle**
   - Bu özellik hangi servislere bağlı?
   - Yeni state değişkeni gerekiyor mu?
   - Yeni ses efekti gerekiyor mu?

4. **Uygulama Planı Oluştur**
   - Hangi dosyalar değişecek? (liste)
   - Değişiklik sırası ne olmalı?
   - Olası riskler neler?

### Faz 2: Implementasyon
// task

5. **Types/Constants Güncellemesi**
   - Gerekli type tanımlamalarını ekle
   - Yeni constant değerlerini tanımla
   - GameState'e yeni property ekle (gerekirse)

6. **Core Logic Implementasyonu**
   - Ana mantığı ilgili service/component'a ekle
   - Mevcut kodu minimal düzeyde modifiye et
   - Clean code prensiplerini uygula

7. **Renderer Güncellemesi**
   - Görsel efektleri EntityRenderer veya EffectsRenderer'a ekle
   - Performans friendly olmasına dikkat et
   - Mobil uyumluluk kontrolü

8. **Ses Entegrasyonu (varsa)**
   - Yeni ses fonksiyonunu SlotMachineSounds.ts veya SynthEngine.ts'e ekle
   - AudioService.ts'e expose et
   - Cooldown ekle (ses spam'ini önle)

### Faz 3: Doğrulama
// task

9. **TypeScript Kontrolü**
   - `npx tsc --noEmit --skipLibCheck` çalıştır
   - Type hatalarını düzelt

10. **Lint Kontrolü**
    - `npm run lint` çalıştır
    - Lint hatalarını düzelt

11. **Dev Server Kontrolü**
    - Dev server'ın hala çalıştığından emin ol
    - Console'da hata olup olmadığını kontrol et

### Faz 4: Sonlandırma

12. **Kullanıcıya Rapor**
    - Yapılan değişikliklerin özeti
    - Test talimatları (manuel test için)
    - Bilinen limitasyonlar (varsa)

13. **Sıradaki Özelliğe Geç**
    - Kullanıcıdan onay al
    - Listedeki sıradaki özelliğe başla

---

## Özellik Detayları

### 1. Hit Stop / Freeze Frame

**Amaç:** Düşmana vuruş anında kısa bir duraklama (16-50ms) ekleyerek impact hissi vermek.

**Etkilenen Dosyalar:**
- `types.ts` → GameState'e `hitStopTimer` ekle
- `GameEngine.tsx` → Hit stop timer mantığı
- `CombatSystem.ts` → Hasar verildiğinde trigger
- `constants.ts` → HIT_STOP_DURATION değeri

**Algoritma:**
1. Düşmana hasar verildiğinde `hitStopTimer = HIT_STOP_DURATION` set et
2. GameEngine update loop'unda: `if (hitStopTimer > 0)` ise fizik güncellemelerini atla
3. Timer'ı her frame azalt
4. Kritik vuruşlarda daha uzun süre (2x)

---

### 2. Enemy Death Pop

**Amaç:** Düşman öldüğünde scale up + flash + fade out efekti.

**Etkilenen Dosyalar:**
- `types.ts` → Enemy'ye `deathProgress`, `isDying` ekle
- `EntityRenderer.ts` → Death animasyonu çizimi
- `PhysicsSystem.ts` → onDeath trigger
- `PoolManager.ts` → Dying enemy'leri ayrı tut

**Algoritma:**
1. Düşman HP <= 0 olduğunda: `isDying = true`, `deathProgress = 0`
2. Render sırasında: scale = 1 + (deathProgress * 0.3), alpha = 1 - deathProgress
3. deathProgress 1'e ulaşınca pool'a geri at
4. Ölüm anında beyaz flash overlay

---

### 3. Squash & Stretch

**Amaç:** Player dash/hareket sırasında squash & stretch animasyonu.

**Etkilenen Dosyalar:**
- `types.ts` → Player'a `scaleX`, `scaleY` ekle (veya GameState'e)
- `GameEngine.tsx` → Dash başlangıç/bitiş scale değerleri
- `EntityRenderer.ts` → Scale ile çizim

**Algoritma:**
1. Dash başladığında: scaleX = 1.3, scaleY = 0.7
2. Dash bittiğinde: scaleX = 0.8, scaleY = 1.2
3. Lerp ile normal scale'e (1, 1) dön
4. Hareket yönüne göre scale yönü

---

### 4. Near Miss Tension

**Amaç:** Düşman çok yakına gelip hasar vermeden geçtiğinde efekt.

**Etkilenen Dosyalar:**
- `PhysicsSystem.ts` → Near miss detection
- `GameState` → `nearMissTimer`, `nearMissDirection`
- `EffectsRenderer.ts` → Ekran kenarı flash
- `SlotMachineSounds.ts` → Whoosh sesi

**Algoritma:**
1. Düşman-player mesafesi < nearMissThreshold && düşman hasar vermedi
2. nearMissTimer = NEAR_MISS_DURATION
3. Kısa slow motion (timeScale = 0.5)
4. Ekranın ilgili tarafında kırmızı vignette

---

### 5. Lucky 7 Combo

**Amaç:** Her 7 kill'de bonus, 777'de jackpot.

**Etkilenen Dosyalar:**
- `ComboSystem.ts` → 7 katları kontrolü
- `SlotMachineSounds.ts` → Jackpot sesi
- `EffectsRenderer.ts` → 777 jackpot animasyonu
- `GameHUD.tsx` → Combo göstergesi animasyonu

**Algoritma:**
1. Kill count % 7 === 0 ise bonus trigger
2. Kill count === 777 ise JACKPOT (büyük bonus + özel efekt)
3. Bonus: +%50 XP bir sonraki kill için
4. UI'da "7!" veya "777 JACKPOT!" göster

---

### 6. Gem Magnet Arc

**Amaç:** Gem'ler düz çizgi yerine eğri yolda gelsin.

**Etkilenen Dosyalar:**
- `PhysicsSystem.ts` → Gem magnet hareketi
- `types.ts` → Gem'e `arcOffset` ekle

**Algoritma:**
1. Gem manyetik alanda: arcOffset hesapla (perpendicular vector)
2. Bezier curve interpolation ile hedefe hareket
3. Mesafe azaldıkça arcOffset azalt
4. Toplama anında küçük spark

---

### 7. Enemy Spawn Animation

**Amaç:** Düşmanlar spawn olurken scale 0→1 animasyonu.

**Etkilenen Dosyalar:**
- `types.ts` → Enemy'ye `spawnProgress` ekle
- `EnemyFactory.ts` → spawnProgress = 0 ile başlat
- `EntityRenderer.ts` → spawnProgress ile scale
- `PhysicsSystem.ts` → spawnProgress < 1 ise hasar/collision yok

**Algoritma:**
1. Enemy spawn: spawnProgress = 0
2. Her frame: spawnProgress += 0.1 (10 frame = 166ms)
3. Scale = easeOutBack(spawnProgress)
4. spawnProgress < 1 ise hasar/collision yok

---

### 8. Damage Direction Indicator

**Amaç:** Hasar alındığında yönü gösteren ekran efekti.

**Etkilenen Dosyalar:**
- `GameState` → `damageDirection`, `damageFlashTimer`
- `PhysicsSystem.ts` → Hasar kaynak yönü hesapla
- `EffectsRenderer.ts` → Yönlü vignette

**Algoritma:**
1. Hasar alındığında: damageDirection = atan2(enemy.y - player.y, enemy.x - player.x)
2. damageFlashTimer = 300ms
3. Ekranın ilgili kenarında kırmızı gradient
4. Timer azaldıkça fade out

---

### 9. Dynamic Speed Lines

**Amaç:** Dash sırasında arka planda hız çizgileri.

**Etkilenen Dosyalar:**
- `GameState` → `speedLines[]` array
- `GameEngine.tsx` → Dash sırasında line oluştur
- `BackgroundRenderer.ts` → Speed line çizimi

**Algoritma:**
1. Dash aktifken: her 2 frame yeni çizgi spawn
2. Çizgi: start position, hareket tersi yönde velocity
3. Opacity 1→0 fade out
4. Pool sistemi ile yönet

---

### 10. Low HP Heartbeat

**Amaç:** Düşük HP'de görsel + ses uyarısı.

**Etkilenen Dosyalar:**
- `GameEngine.tsx` → HP kontrolü
- `EffectsRenderer.ts` → Ekran kenarı kırmızı pulse
- `SynthEngine.ts` → Heartbeat sesi

**Algoritma:**
1. HP < %30 ise: lowHPMode = true
2. Heartbeat sesi loop (60bpm → 120bpm HP azaldıkça)
3. Ekran kenarları kırmızı pulse (heartbeat sync)
4. HP > %30 olunca fade out

---

## Kullanım
Workflow'u başlatmak için:
```
/game-polish
```
Belirli bir özellik için:
```
/game-polish [özellik-numarası]
```
Örnek:
```
/game-polish 1  → Hit Stop implementasyonu
/game-polish 4  → Near Miss Tension implementasyonu
```

---

## Notlar
- Her özellik bağımsız olarak eklenebilir
- Performans etkisini her zaman gözle
- Mobil uyumluluk kontrolü önemli
- Ayarlar menüsüne toggle eklenebilir (gelecekte)
