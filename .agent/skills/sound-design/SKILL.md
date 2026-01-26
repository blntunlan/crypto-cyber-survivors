---
name: sound-design
description: Manage game audio, SFX triggers, and dynamic music scaling
---

# Sound Design Skill

Oyun içi ses efektlerini (SFX), müzikleri ve dinamik ses değişimlerini yönet.

## Usage

```
/sound-design [action] [target]
```

**Actions**: `add-sfx`, `adjust-volume`, `dynamic-music`.

## Audio Architecture

Oyun `SoundManager.ts` servisini kullanır (Singleton).

- **SFX**: Kısa, anlık sesler (ateş etme, hasar alma).
- **Music**: Arka plan döngüsü.
- **Dynamic Scaling**: Market volatilitesine göre müziğin temposunu veya pitch'ini değiştirme logic'i.

## Implementation

### 1. New SFX Trigger

```typescript
// EventBus üzerinden tetikleme (Preferred)
EventBus.emit('playSound', { name: 'collect_gem', volume: 0.5 });
```

### 2. Dynamic Music Scaling

`MarketService` verisine göre müziği güncelle:
```typescript
// SoundManager'da
const currentAtr = MarketService.getAtr();
const playSpeed = 1 + (currentAtr * 0.1); 
this.bgMusic.playbackRate = clamp(playSpeed, 1, 1.5);
```

## Guidelines

- **Format**: `.mp3` veya `.ogg` (web uyumluluğu).
- **Optimization**: Tüm sesleri oyun başında preload et.
- **Mixing**:
  - UI sesleri her zaman net olmalı.
  - Arka plan müziği aksiyonu bastırmamalı.
  - Crit hit sesleri "snappy" ve tatmin edici olmalı.

## Directory Structure

```
public/assets/audio/
├── sfx/            # Patlama, ateş, level up
├── music/          # Theme tracks
└── ui/             # Click, hover, transition
```

## Checklist

- [ ] Ses dosyası optimize edildi mi (Low bitrate, small size)?
- [ ] User interaction olmadan (autostart) ses çalmaya çalışıyor mu? (Browser hatası)
- [ ] Ses ayarları (Settings) SoundManager'a bağlı mı?
- [ ] gameReset olduğunda müzik başa dönüyor mu?

## Code References

- `services/SoundManager.ts`: Main audio controller.
- `components/admin/SoundSettings.tsx`: UI for adjustments.
