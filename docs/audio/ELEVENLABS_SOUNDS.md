# 🎙️ ElevenLabs Sound Effects Registry

Piyasa hareketlerine ve oyun içi olaylara özel **ElevenLabs Sound Effects API** ile oluşturulacak seslerin takibi ve yönetim dosyasıdır.

## 📋 Ses Listesi & Promptlar

Bu sesleri [ElevenLabs Sound Effects](https://elevenlabs.io/app/sound-effects) sayfasında oluşturup indirebilirsiniz.

| Olay | Dosya Adı (Önerilen) | ElevenLabs Prompt | Parametreler |
| :--- | :--- | :--- | :--- |
| **Volatility Shockwave** | `shockwave_heavy.mp3` | `Cinematic digital explosion, futuristic energy burst with heavy sub-bass rumble, electrical crackle, high-tech energy release, wide stereo, intense impact, deep low-end thump` | Dur: 2.5s, Influence: 0.7 |
| **Energy Shock (Up)** | `shock_pump.mp3` | `Futuristic sci-fi shockwave, rising digital glitch burst, sharp laser impact, ascending pitch, bright energy pulse` | Dur: 1.5s, Influence: 0.6 |
| **Energy Shock (Down)** | `shock_dump.mp3` | `Futuristic sci-fi shockwave, descending pitch, dark low-end rumble, synthetic distortion, heavy digital impact` | Dur: 1.5s, Influence: 0.6 |
| **Level Up (Cyber)** | `levelup_cyber.mp3` | `Retro-futuristic level up chime, digital synth reward melody, neon sparkles, tech accomplishment sound, glowing energy` | Dur: 2.0s, Influence: 0.5 |

---

## 🛠️ Yükleme Adımları

1. **Oluştur:** Yukarıdaki promptları kullanarak ElevenLabs üzerinden sesleri üretin.
2. **İndir:** Üretilen `.mp3` dosyalarını bilgisayarınıza indirin.
3. **Konum:** Dosyaları projedeki `/public/assets/sounds/` klasörüne (eğer yoksa oluşturun) yukarıdaki önerilen isimlerle kopyalayın.
4. **Entegrasyon:** `AudioService.ts` üzerinden `audio.loadSound()` ile sisteme dahil edin.

## 📝 Entegrasyon Örneği

Sesler yüklendikten sonra kodda şu şekilde tanımlanmalıdır:

```typescript
// useAppInitialization.ts veya AudioService.ts içinde
audio.loadSound('shockwave', '/assets/sounds/shockwave_heavy.mp3', { volume: 0.8 });

// Tetiklemek için
audio.playSound('shockwave');
```

---
*Son Güncelleme: 2026-01-20*
