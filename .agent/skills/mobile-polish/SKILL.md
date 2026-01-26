---
name: mobile-polish
description: Optimize touch controls, mobile HUD layout, and responsive performance
---

# Mobile Optimization Skill

Oyunun mobil cihazlarda (Android/iOS) akıcı çalışmasını ve iyi görünmesini sağla.

## Usage

```
/mobile-polish [area]
```

**Areas**: `controls`, `hud`, `performance`, `responsive`.

## Touch Controls

### Virtual Joystick
- **Placement**: Sol alt köşe (default).
- **Feel**: Ölü bölge (deadzone) ve maksimum mesafe (sensitivity) ayarlarını `useTouchControls` hook'unda kontrol et.

### Touch Feedback
- Her dokunuşta küçük bir görsel feedback (circle pulse).
- Butonların mobil için yeterince büyük (%10-15 ekran genişliği) olduğunu doğrula.

## Responsive HUD

### Layout Shifts
- Mobilde `landscape` ve `portrait` modları için farklı düzenler.
- CSS media queries: `@media (max-width: 768px)`.

### Component Scaling
- Mobilde metin boyutlarını artır. Metinler okunabilir olmalı.
- Gem count ve health bar mobilde daha belirgin olmalı.

## Performance (Mobile)

### Draw Calls
- Mobilde draw call sayısını azaltmak için `offscreen canvas` kullanımı kritik.
- Partikül sayısını mobilde dinamik olarak düşür:
  ```typescript
  const maxParticles = isMobile ? 50 : 200;
  ```

### Low Power Mode
- FPS'i kısıtlamak yerine, görsel efektleri (blur, glow) kısarak pil ömrünü ve performansı koru.

## Checklist

- [ ] "Fat finger" testi: Butonlar arası boşluk yeterli mi?
- [ ] Multitouch: Aynı anda hem hareket edip hem pause'a basılabiliyor mu?
- [ ] Portrait mode uyarısı: Oyun landscape odaklıysa kullanıcıyı uyar.
- [ ] Safe area (Notch): Notch olan telefonlarda UI elemanları kesiliyor mu?

## Code References

- `components/mobile/TouchControls.tsx`: Joystick & buttons.
- `hooks/useDeviceDetect.ts`: Mobile/Tablet detection logic.
- `components/GameUI.tsx`: Responsive layout logic.
