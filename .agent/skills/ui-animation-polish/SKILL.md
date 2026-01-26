---
name: ui-animation-polish
description: Refine UI transitions, animations, and game feel using Framer Motion and CSS
---

# UI & Animation Polish Skill

Bu skill, oyun içi UI ve animasyonların "vuruş hissini" (game feel) ve görselliğini iyileştirmek için kullanılır.

## Usage

```
/ui-animation-polish [target-element] [effect-type]
```

**Effect Types:**
- `impact` - Hit feedback, shake, scale pulse
- `smooth` - Entrance/Exit transitions, fade-in
- `snappy` - Menus, buttons, hover states
- `organic` - Idle animations, floating, squash & stretch

## Animation Principles

### 1. Squash & Stretch
Nesneler hareket ederken veya bir yere çarptığında şekil değiştirmeli.
```typescript
// Example scale pulse
animate={{
  scale: [1, 1.2, 0.9, 1],
  transition: { duration: 0.3 }
}}
```

### 2. Anticipation & Overshoot
Bir hareket başlamadan önce ters yöne küçük bir hamle (anticipation) ve biterken hedefi biraz geçip geri gelme (overshoot).
```typescript
// spring transition for snappy feel
transition={{
  type: "spring",
  stiffness: 400,
  damping: 10
}}
```

### 3. Feedback Loop
Her kullanıcı etkileşimi (click, hover, hit) görsel bir tepki üretmeli.
- **Hover**: Subtle scale + brightness change.
- **Active**: Sudden shrink.

## Implementation Details

### Framer Motion Best Practices
- `layout` prop'unu kullanarak pozisyon değişimlerini otomatik animate et.
- `AnimatePresence` ile unmounting animasyonlarını yönet.
- `variants` kullanarak karmaşık animasyonları temiz tut.

### CSS Micro-animations
- `filter: drop-shadow` ile glow efektleri.
- `backdrop-filter: blur` ile modern glassmorphism.
- `transform-origin` ayarlarını kontrol et (merkez vs alt).

## Checklist

- [ ] Animasyon FPS'i 60 mı?
- [ ] Çok fazla `filter: blur` kullanıp performansı düşürüyor mu?
- [ ] `whileHover` ve `whileTap` eklenmiş mi?
- [ ] Renk geçişleri (gradient) akıcı mı?

## Common Assets
- `public/assets/icons/` içindeki ikonları kullan.
- Gradient token'ları için `index.css` kontrol et.
