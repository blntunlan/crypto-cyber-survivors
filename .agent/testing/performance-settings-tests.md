# Performance Settings - Test Scenarios

## 🔧 Yapılan Düzeltmeler

### Önceki Sorunlar:
1. ❌ Manuel profil seçilince benchmark skip ediliyordu
2. ❌ Sayfa yenilendiğinde manuel profil kayboluyordu
3. ❌ Auto/Manuel modları arasında karışıklık oluyordu
4. ❌ İlk açılışta davranış belirsizdi

### Yeni Davranış:
1. ✅ Benchmark HER ZAMAN çalışır (veya cache'den yüklenir)
2. ✅ Manuel profil seçimi localStorage'da kalıcı olarak saklanır
3. ✅ Manuel profil varsa aktif config için öncelik alır
4. ✅ Auto'ya dönüldüğünde benchmark sonucu kullanılır
5. ✅ İlk açılışta otomatik benchmark + optimization

---

## 📋 Test Senaryoları

### Senaryo 1: İlk Kez Açılış (Yeni Kullanıcı)

**Adımlar:**
1. localStorage'ı temizle: 
   ```js
   localStorage.clear()
   ```
2. Sayfayı yenile (F5)

**Beklenen Sonuç:**
```
[Benchmark] loadManualProfile called - stored: null
[Benchmark] No manual profile found
[Benchmark] Running benchmark...
[Benchmark] Completed - using result for config - profile: MEDIUM (example)
[QualitySection] updateState called - profile: MEDIUM, hasManualProfile: false, isAuto: true
```

**UI'da:**
- ✅ "Auto" butonu seçili (mavi highlight)
- ✅ "● Auto Optimized" yazısı görünüyor
- ✅ Profil otomatik belirleniyor (LOW/MEDIUM/HIGH/ULTRA)

---

### Senaryo 2: Manuel Profil Seçimi (Ultra)

**Adımlar:**
1. Settings > Performance > "ULTRA" butonuna bas

**Beklenen Sonuç:**
```
[Benchmark] Manual profile saved to localStorage - profile: ULTRA
[Benchmark] Manual profile set - profile: ULTRA
[QualitySection] updateState called - profile: ULTRA, hasManualProfile: true, isAuto: false
```

**localStorage kontrolü:**
```js
localStorage.getItem('ccs_manual_perf_profile')
// "ULTRA"
```

**UI'da:**
- ✅ "ULTRA" butonu seçili (mor highlight)
- ✅ "Auto" butonu seçili DEĞİL
- ✅ "● Auto Optimized" yazısı GÖRÜNMEMELİ

---

### Senaryo 3: Sayfa Yenileme (Manuel Profil Aktifken)

**Adımlar:**
1. Manuel olarak ULTRA seçtikten sonra
2. Sayfayı yenile (F5)

**Beklenen Sonuç:**
```
[Benchmark] loadManualProfile called - stored: "ULTRA"
[Benchmark] Manual profile loaded from localStorage - profile: ULTRA
[Benchmark] Cached benchmark loaded, but manual profile is active
[QualitySection] updateState called - profile: ULTRA, hasManualProfile: true, isAuto: false
```

**localStorage kontrolü:**
```js
localStorage.getItem('ccs_manual_perf_profile')
// "ULTRA" - HALA BURADA!
```

**UI'da:**
- ✅ ULTRA hala seçili
- ✅ "Auto" butonu seçili DEĞİL
- ✅ Performans ULTRA'da kalıyor

---

### Senaryo 4: Auto'ya Geri Dönüş

**Adımlar:**
1. Manuel ULTRA seçiliyken
2. "Auto" butonuna bas

**Beklenen Sonuç:**
```
[Benchmark] Manual profile removed, switching to auto
[Benchmark] Reset to auto - using cached benchmark result - profile: MEDIUM
[QualitySection] updateState called - profile: MEDIUM, hasManualProfile: false, isAuto: true
```

**localStorage kontrolü:**
```js
localStorage.getItem('ccs_manual_perf_profile')
// null - SİLİNDİ!
```

**UI'da:**
- ✅ "Auto" butonu seçili (mavi)
- ✅ "● Auto Optimized" yazısı görünüyor
- ✅ Profil benchmark sonucuna (ör: MEDIUM) geri döndü

---

### Senaryo 5: Mobil Cihazda Kalıcılık Testi

**Adımlar:**
1. Mobil cihazda Settings aç
2. ULTRA seç
3. Settings'i kapat
4. Settings'i tekrar aç
5. Tarayıcı sekmesini kapat
6. Oyunu tekrar aç

**Beklenen Sonuç:**
- ✅ Her adımda ULTRA seçili kalmalı
- ✅ Tarayıcı kapatılıp açılınca bile ULTRA olmalı

---

## 🔍 Debug Kontrolleri

### Console'da Log Kontrolü

Logger seviyesini DEBUG'a almak için:
```js
// Browser console'da
localStorage.setItem('log_level', 'debug')
// Sayfayı yenile
```

### Manuel localStorage Kontrolü

```js
// Benchmark cache kontrolü
localStorage.getItem('ccs_device_benchmark')

// Manuel profil kontrolü
localStorage.getItem('ccs_manual_perf_profile')

// Tüm CCS anahtarlarını görüntüle
Object.keys(localStorage).filter(k => k.startsWith('ccs'))
```

### DeviceBenchmarkService State Kontrolü

```js
// Browser console'da
DeviceBenchmarkService.getState()
// {
//   status: "CACHED" | "COMPLETED" | "RUNNING" | "ERROR",
//   result: { profile: "ULTRA", gpuScore: 800, ... },
//   ...
// }

DeviceBenchmarkService.getPerformanceConfig()
// {
//   profile: "ULTRA",
//   maxParticles: 3000,
//   ...
// }
```

---

## ✅ Başarı Kriterleri

1. **İlk Açılış**: Auto seçili, benchmark çalışıyor
2. **Manuel Seçim**: Seçim hemen uygulanıyor ve localStorage'a yazılıyor
3. **Sayfa Yenileme**: Manuel seçim korunuyor
4. **Auto'ya Dönüş**: Benchmark sonucuna geri dönüyor
5. **Tarayıcı Kapatma**: localStorage sayesinde kalıcı

---

## 🐛 Sorun Giderme

### Sorun: Manuel profil kaybolmuyor
```js
// Force clean
localStorage.removeItem('ccs_manual_perf_profile')
location.reload()
```

### Sorun: Benchmark çalışmıyor
```js
// Force benchmark
DeviceBenchmarkService.runBenchmark(true)
```

### Sorun: Cache bozuk
```js
// Cache'i temizle
localStorage.removeItem('ccs_device_benchmark')
localStorage.removeItem('ccs_manual_perf_profile')
location.reload()
```

---

## 📱 Mobil Özel Testler

### iOS Safari
- [ ] Settings'de profil seçimi çalışıyor
- [ ] Sayfa yenilendiğinde kalıcı
- [ ] Home screen'e eklenip açıldığında kalıcı
- [ ] Private mode'da çalışıyor

### Android Chrome
- [ ] Settings'de profil seçimi çalışıyor
- [ ] Sayfa yenilendiğinde kalıcı
- [ ] Tab kapatılıp açıldığında kalıcı
- [ ] Incognito mode'da çalışıyor

---

## 📊 Performans Profilleri

| Profile | Particles | Shadows | Effects | Target FPS | Devices |
|---------|-----------|---------|---------|------------|---------|
| LOW | 500 | ❌ | Minimal | 60 | Budget phones |
| MEDIUM | 1500 | ✅ Light | Balanced | 60 | Mid-range |
| HIGH | 2500 | ✅ Full | All | 60 | Flagship |
| ULTRA | 3000 | ✅✅ Full+ | All Max | 60+ | Desktop/High-end |

**Auto seçimi benchmark skoruna göre:**
- GPU Score < 200 → LOW
- GPU Score < 400 → MEDIUM  
- GPU Score < 600 → HIGH
- GPU Score >= 600 → ULTRA
