---
description: Tutorial and Onboarding System Implementation Workflow
---

# 🎓 Tutorial/Onboarding System Workflow

Bu workflow, yeni oyuncular için kapsamlı bir tutorial ve onboarding sistemi oluşturmak için adım adım talimatlar içerir.

---

## 📋 Genel Bakış

**Hedef**: İlk kez oynayan kullanıcılar için interaktif tutorial ve onboarding akışı
**Tahmini Süre**: 6 saat
**Öncelik**: ⭐⭐⭐ (Sprint 1)

### Gereksinimler
- [ ] First-time user detection
- [ ] Step-by-step tutorial overlay
- [ ] Interactive highlights
- [ ] Skip/Complete tracking
- [ ] Localization support (6 dil)

---

## 🏗️ Faz 1: Altyapı (1.5 saat)

### 1.1 Tutorial State Hook Oluştur

```bash
# Dosya: hooks/useTutorial.ts
```

**İçerik:**
- `hasCompletedTutorial` - localStorage'dan kontrol
- `currentStep` - Aktif tutorial adımı
- `totalSteps` - Toplam adım sayısı
- `nextStep()` - Sonraki adıma geç
- `prevStep()` - Önceki adıma dön
- `skipTutorial()` - Tutorial'ı atla
- `completeTutorial()` - Tutorial'ı tamamla
- `resetTutorial()` - Tutorial'ı sıfırla (dev)

**localStorage Keys:**
- `tutorial-completed`: boolean
- `tutorial-completed-at`: timestamp
- `tutorial-skipped`: boolean

### 1.2 Tutorial Config Oluştur

```bash
# Dosya: config/TutorialConfig.ts
```

**Tutorial Adımları:**
1. **Welcome** - Oyuna hoşgeldin mesajı
2. **Movement** - WASD/Joystick kontrolleri
3. **Dash** - Space/Dash butonu kullanımı
4. **Market Position** - Long/Short seçimi açıklaması
5. **Leverage** - Kaldıraç sistemi açıklaması
6. **HUD Overview** - Health, XP, PnL göstergeleri
7. **Enemies** - Düşman türleri tanıtımı
8. **Level Up** - Kart seçim sistemi
9. **Complete** - Tebrikler ekranı

**Her adım için:**
```typescript
interface TutorialStep {
  id: string;
  titleKey: string;        // i18n key
  descriptionKey: string;  // i18n key
  highlightSelector?: string;  // CSS selector to highlight
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  requiresInteraction?: boolean;
  nextTrigger?: 'click' | 'keypress' | 'auto';
  delayMs?: number;
}
```

---

## 🎨 Faz 2: UI Bileşenleri (2 saat)

### 2.1 TutorialOverlay Bileşeni

```bash
# Dosya: components/screens/TutorialOverlay.tsx
```

**Özellikler:**
- Full-screen semi-transparent overlay
- Spotlight effect (highlighted element dışını karart)
- Animasyonlu tooltip/card
- Next/Skip butonları
- Progress indicator (dots veya bar)
- Keyboard navigation (Enter: next, Esc: skip)

**Tasarım:**
- Cyberpunk tema: Neon border, glass effect
- Retro tema: Pixel border, solid colors
- Mobile-friendly touch targets (min 44px)

### 2.2 TutorialTooltip Bileşeni

```bash
# Dosya: components/ui/TutorialTooltip.tsx
```

**Özellikler:**
- Dinamik positioning (target element'e göre)
- Arrow pointing to highlighted element
- Smooth enter/exit animations (Framer Motion)
- Icon support (emoji veya SVG)

### 2.3 TutorialSpotlight Bileşeni

```bash
# Dosya: components/ui/TutorialSpotlight.tsx
```

**Özellikler:**
- SVG mask ile spotlight effect
- Highlighted element etrafında padding
- Pulse animation on highlighted area
- Click-through for interactive steps

---

## 🌐 Faz 3: Localization (1 saat)

### 3.1 Tutorial Çevirileri Ekle

Tüm 6 dil dosyasına `tutorial` section ekle:

```json
{
  "tutorial": {
    "welcome": {
      "title": "Welcome, Survivor!",
      "description": "Learn the basics of crypto survival in this quick tutorial."
    },
    "movement": {
      "title": "Movement",
      "description": "Use WASD or Arrow keys to move. On mobile, use the virtual joystick."
    },
    "dash": {
      "title": "Dash",
      "description": "Press SPACE or tap the Dash button to quickly evade enemies."
    },
    "position": {
      "title": "Market Position",
      "description": "Choose LONG to profit when BTC rises, or SHORT to profit when it falls."
    },
    "leverage": {
      "title": "Leverage",
      "description": "Higher leverage = more risk & reward. Start with SAFE (2x) for beginners."
    },
    "hud": {
      "title": "Your HUD",
      "description": "Monitor your health, experience, and P&L at all times."
    },
    "enemies": {
      "title": "Know Your Enemies",
      "description": "Bears attack in bear markets, Bulls in bull markets. Whales are always dangerous!"
    },
    "levelup": {
      "title": "Level Up!",
      "description": "Choose upgrade cards wisely. Higher luck = better card chances."
    },
    "complete": {
      "title": "You're Ready!",
      "description": "Good luck surviving the market volatility!"
    },
    "skip": "Skip Tutorial",
    "next": "Next",
    "prev": "Back",
    "step": "Step {{current}} of {{total}}",
    "gotIt": "Got it!"
  }
}
```

**Diller:**
- `en/common.json` ✅
- `tr/common.json` - Türkçe çeviriler
- `es/common.json` - İspanyolca çeviriler
- `pt/common.json` - Portekizce çeviriler
- `hi/common.json` - Hintçe çeviriler
- `vi/common.json` - Vietnamca çeviriler

---

## 🔌 Faz 4: Entegrasyon (1 saat)

### 4.1 App.tsx Entegrasyonu

```typescript
// App.tsx içinde
import { useTutorial } from './hooks/useTutorial';
import { TutorialOverlay } from './components/screens/TutorialOverlay';

// Hook kullanımı
const { 
  showTutorial, 
  currentStep, 
  nextStep, 
  skipTutorial,
  completeTutorial 
} = useTutorial();

// Render
{showTutorial && (
  <TutorialOverlay
    step={currentStep}
    onNext={nextStep}
    onSkip={skipTutorial}
    onComplete={completeTutorial}
  />
)}
```

### 4.2 Tutorial Trigger Noktaları

| Trigger | Koşul |
|---------|-------|
| İlk açılış | `!hasCompletedTutorial && !tutorialSkipped` |
| Hub'dan Play | `firstTimePlay && !hasCompletedTutorial` |
| Settings'ten | "Replay Tutorial" butonu |

### 4.3 Analytics Tracking

```typescript
// MetricsService ile tracking
MetricsService.trackTutorialStart();
MetricsService.trackTutorialStep(stepId);
MetricsService.trackTutorialSkip(atStep);
MetricsService.trackTutorialComplete(durationMs);
```

---

## 🧪 Faz 5: Test & Polish (0.5 saat)

### 5.1 Unit Tests

```bash
# Dosya: tests/useTutorial.test.ts
```

**Test Cases:**
- [ ] Initial state (first-time user)
- [ ] Step navigation (next/prev)
- [ ] Skip functionality
- [ ] Complete functionality
- [ ] localStorage persistence
- [ ] Reset functionality

### 5.2 E2E Tests

```bash
# Dosya: e2e/tutorial.spec.ts
```

**Test Scenarios:**
- [ ] Full tutorial flow (new user)
- [ ] Skip tutorial
- [ ] Keyboard navigation
- [ ] Mobile touch navigation
- [ ] Replay from settings

### 5.3 Polish

- [ ] Timing adjustments (auto-advance delays)
- [ ] Animation smoothness
- [ ] Mobile responsiveness
- [ ] Accessibility (focus management, screen reader)
- [ ] Theme consistency (Cyber + Retro)

---

## 📁 Oluşturulacak Dosyalar

| Dosya | Tip | Öncelik |
|-------|-----|---------|
| `hooks/useTutorial.ts` | Hook | 🔴 Kritik |
| `config/TutorialConfig.ts` | Config | 🔴 Kritik |
| `components/screens/TutorialOverlay.tsx` | Component | 🔴 Kritik |
| `components/ui/TutorialTooltip.tsx` | Component | 🟠 Yüksek |
| `components/ui/TutorialSpotlight.tsx` | Component | 🟠 Yüksek |
| `public/locales/*/common.json` | i18n | 🟠 Yüksek |
| `tests/useTutorial.test.ts` | Test | 🟡 Orta |
| `e2e/tutorial.spec.ts` | E2E | 🟡 Orta |

---

## ✅ Tamamlama Kriterleri

- [ ] Yeni kullanıcılara tutorial otomatik gösteriliyor
- [ ] Tüm adımlar doğru çalışıyor
- [ ] Skip ve Complete işlevleri çalışıyor
- [ ] LocalStorage'da durum persist ediliyor
- [ ] 6 dilde çeviriler mevcut
- [ ] Mobile ve desktop'ta düzgün görünüyor
- [ ] Retro ve Cyber temalarında uyumlu
- [ ] Unit ve E2E testleri geçiyor
- [ ] Lighthouse accessibility skoru 90+

---

## 🚀 Başlangıç Komutu

```bash
# Workflow'u başlat
# 1. useTutorial hook oluştur
# 2. TutorialConfig tanımla
# 3. TutorialOverlay bileşeni yaz
# 4. Çevirileri ekle
# 5. App.tsx'e entegre et
# 6. Test yaz
```

---

> 💡 **İpucu**: Tutorial adımlarını önce İngilizce olarak tamamla, sonra çevirileri ekle.
> 
> 📅 **Son Güncelleme**: 2026-01-21
