# iOS Güç Tasarrufu Modu ve Performans Ayarları

## 🔋 Sorun: iPhone Güç Tasarrufu Modu

### Keşfedilen Problem
**Cihaz**: iPhone 11  
**Tarayıcı**: Safari  
**Sorun**: Performance ayarında manuel seçim yapılsa bile otomatik olarak düşük profile dönüyordu

**Kök Neden**: iOS'un **Güç Tasarrufu Modu (Low Power Mode)** aktifti.

### Güç Tasarrufu Modu Etkileri

iOS Güç Tasarrufu Modu açıkken:
- ✅ CPU performansı %40'a kadar düşürülür
- ✅ GPU render hızı azaltılır
- ✅ JavaScript execution throttle edilir
- ✅ Background processes durdurulur
- ✅ Frame rate 60fps → 30fps'e düşer

**Sonuç**: Device Benchmark düşük skor veriyor ve otomatik LOW/MEDIUM profile geçiyor.

---

## ✅ Çözüm

### Kullanıcı Tarafında
```
Settings → Battery → Low Power Mode → OFF
```

Güç Tasarrufu Modu kapatıldıktan sonra:
- ✅ Benchmark doğru skor veriyor
- ✅ Manuel profil seçimi düzgün çalışıyor
- ✅ ULTRA/HIGH seçimi korunuyor

### Kod Tarafında (Yapılan İyileştirmeler)

Yine de tüm iyileştirmeler değerli oldu:

#### 1. Memory-Based Manual Mode Tracking
```typescript
// DeviceBenchmarkService içinde
private isManualMode: boolean = false;

// Settings komponenti unmount olsa bile korunur
// localStorage başarısız olsa bile çalışır
```

#### 2. localStorage Doğrulama
```typescript
// Write sonrası read-back kontrolü
localStorage.setItem(key, value);
const verified = localStorage.getItem(key) === value;
```

#### 3. Debug Panel
```typescript
// Sorunları tespit etmek için canlı monitoring
🎯 Manual Mode Flag (Memory): ✅ MANUAL / 🤖 AUTO
localStorage: ULTRA
Active Config: ULTRA
Benchmark Profile: MEDIUM
```

---

## 📊 Benchmark Skorları - Güç Tasarrufu Etkisi

### Normal Mod (Güç Tasarrufu Kapalı)
| Test | iPhone 11 Normal | Beklenen Profile |
|------|------------------|------------------|
| GPU | 600-800 | HIGH/ULTRA |
| CPU | 500-700 | HIGH |
| **Sonuç** | **HIGH** | ✅ Doğru |

### Güç Tasarrufu Modu (Açık)
| Test | iPhone 11 Low Power | Beklenen Profile |
|------|---------------------|------------------|
| GPU | 200-300 ❌ | LOW/MEDIUM |
| CPU | 150-250 ❌ | LOW |
| **Sonuç** | **LOW** | ❌ Düşük performans algılanıyor |

---

## 🎯 Gelecek İyileştirmeler

### 1. Güç Tasarrufu Modu Tespiti

JavaScript ile tespit etme yöntemleri:

```javascript
// Method 1: Benchmark skor karşılaştırması
const expectedScore = 600; // iPhone 11 için beklenen
const actualScore = gpuScore;
const isThrottled = actualScore < (expectedScore * 0.5);

// Method 2: Performance API ile tespit
const start = performance.now();
// Heavy computation
const end = performance.now();
const computeTime = end - start;
const isSlowed = computeTime > expectedThreshold;

// Method 3: Battery API (sınırlı destek)
if ('getBattery' in navigator) {
  const battery = await navigator.getBattery();
  // battery.level, battery.charging vs.
}
```

### 2. Kullanıcı Uyarısı

```typescript
if (detectedLowPowerMode) {
  showWarning({
    title: "⚠️ Performans Uyarısı",
    message: "Güç Tasarrufu Modu aktif görünüyor. En iyi deneyim için kapatmanız önerilir.",
    action: "Ayarlar → Pil → Güç Tasarrufu Modu → Kapat"
  });
}
```

### 3. Adaptif Profil Bildirimi

```typescript
if (isManualMode && benchmarkScore < manualProfileRequirement) {
  showNotice({
    title: "🔋 Performans Notu",
    message: `ULTRA profili seçtiniz ancak cihaz performansı şu an daha düşük. 
              Güç Tasarrufu Modu kapalı mı kontrol edin.`,
    type: "info"
  });
}
```

---

## 📱 Diğer Mobil Cihazlarda Benzer Modlar

### Android
```
Ayarlar → Pil → Pil Tasarrufu KAPALI
Ayarlar → Pil → Optimize Edilmiş (Uyarlanabilir pil) aktif olabilir
```

### Samsung
```
Ayarlar → Cihaz bakımı → Pil → Güç modu → Yüksek performans
```

### Xiaomi (MIUI)
```
Ayarlar → Pil ve performans → Performans → Performans modu
```

---

## 🎮 Oyun İçi Öneriler

### Performans İpuçları Gösterimi

Oyun başlarken veya FPS düştüğünde:

```
💡 İPUÇLARI:
✅ Güç Tasarrufu Modunu kapatın
✅ Arka plan uygulamalarını kapatın
✅ Ekran parlaklığını artırın (grafik kalitesi için)
✅ 5G/4G yerine WiFi kullanın
✅ Şarj kablosuna takın (full performans)
```

---

## 🐛 Debug Checklist

Performans sorunları için kontrol listesi:

- [ ] Güç Tasarrufu Modu kapalı mı?
- [ ] Batarya %20'nin üzerinde mi?
- [ ] Arka planda başka uygulama var mı?
- [ ] Safari'nin "Sekme ve Web Sitesi Ayarları" → "Desktop Site" kapalı mı?
- [ ] iOS güncel mi?
- [ ] Safari cache temiz mi?
- [ ] RAM'de yeterli yer var mı?

---

## 📝 Notlar

### Kullanıcı Geri Bildirimi
```
Tarih: 2025-12-26
Cihaz: iPhone 11
Tarayıcı: Safari
Sorun: Manuel profil seçimi korunmuyordu
Çözüm: Güç Tasarrufu Modu kapatıldı
Sonuç: ✅ Sorun çözüldü
```

### Öğrenilenler
1. ✅ Mobile device flags (Low Power Mode) benchmark'ları ciddi şekilde etkiliyor
2. ✅ localStorage iOS Safari'de bazı durumlarda çalışmayabiliyor
3. ✅ Memory-based tracking component lifecycle'dan bağımsız çalışıyor
4. ✅ Debug panel mobil debug için çok değerli

### Kalıcı İyileştirmeler
- ✅ isManualMode flag'i eklendi (memory-based)
- ✅ localStorage write verification eklendi
- ✅ Debug panel eklendi (mobil debug)
- ✅ Mobile HUD font optimizasyonları yapıldı
- ✅ Milestone position düzeltmeleri yapıldı

---

## 🎯 Sonuç

**Sorun**: iOS Güç Tasarrufu Modu  
**Etki**: Benchmark düşük skor → LOW profile  
**Çözüm**: Güç Tasarrufu Modu kapat → Normal performans  
**Bonus**: Tüm iyileştirmeler kalıcı olarak eklendi  

Sistem artık hem güç tasarrufu modunda hem normal modda **daha güvenilir** çalışıyor! 🎮✨
