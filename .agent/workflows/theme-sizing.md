---
description: Theme-aware UI sizing with useThemeSize hook
---

# Theme Sizing Workflow

Bu workflow, 16-bit retro tema için UI elementlerinin boyutlandırılmasını uygular.

## Yaklaşım: Method 5 - Theme Config + Helper Hook

Merkezi bir `useThemeSize` hook'u oluşturulur ve tüm component'ler bu hook'u kullanarak tema bazlı boyutlara erişir.

---

## Phase 1: Hook & Type Definitions

### Step 1.1: ThemeSize türlerini tanımla

`types/theme.ts` dosyasına ekle:

```typescript
export interface ThemeSizeConfig {
  // Text sizes
  title: string;        // GAME OVER, PAUSED
  heading: string;      // Alt başlıklar
  subheading: string;   // Bölüm başlıkları
  body: string;         // Normal metin
  small: string;        // Küçük etiketler
  tiny: string;         // En küçük metin
  
  // Number sizes
  price: string;        // Fiyat gösterimi
  stat: string;         // HP, DPS değerleri
  combo: string;        // Combo çarpanı
  damage: string;       // Hasar sayıları
  timer: string;        // Süre gösterimi
  
  // Button sizes
  buttonLg: string;     // Ana butonlar
  buttonMd: string;     // Normal butonlar
  buttonSm: string;     // Küçük butonlar
  
  // Spacing
  gap: string;          // Genel boşluk
  padding: string;      // Panel padding
  cardPadding: string;  // Kart padding
}
```

### Step 1.2: useThemeSize hook'unu oluştur

`hooks/useThemeSize.ts` dosyası oluştur:

```typescript
import { useMemo } from 'react';
import { useTheme } from '../contexts/useTheme';
import { ThemeSizeConfig } from '../types/theme';

const CYBERPUNK_SIZES: ThemeSizeConfig = {
  // Text
  title: 'text-6xl',
  heading: 'text-3xl',
  subheading: 'text-xl',
  body: 'text-sm',
  small: 'text-xs',
  tiny: 'text-[10px]',
  
  // Numbers
  price: 'text-5xl',
  stat: 'text-lg',
  combo: 'text-4xl',
  damage: 'text-2xl',
  timer: 'text-4xl',
  
  // Buttons
  buttonLg: 'py-4 px-6 text-sm',
  buttonMd: 'py-3 px-4 text-xs',
  buttonSm: 'py-2 px-3 text-[10px]',
  
  // Spacing
  gap: 'gap-4',
  padding: 'p-4',
  cardPadding: 'p-4',
};

const RETRO_SIZES: ThemeSizeConfig = {
  // Text (scaled ~0.5-0.6x for pixel font)
  title: 'text-2xl',
  heading: 'text-lg',
  subheading: 'text-sm',
  body: 'text-[10px]',
  small: 'text-[8px]',
  tiny: 'text-[7px]',
  
  // Numbers
  price: 'text-2xl',
  stat: 'text-sm',
  combo: 'text-xl',
  damage: 'text-lg',
  timer: 'text-xl',
  
  // Buttons
  buttonLg: 'py-3 px-4 text-[10px]',
  buttonMd: 'py-2 px-3 text-[9px]',
  buttonSm: 'py-1.5 px-2 text-[8px]',
  
  // Spacing (tighter for retro)
  gap: 'gap-2',
  padding: 'p-3',
  cardPadding: 'p-2',
};

export function useThemeSize(): ThemeSizeConfig {
  const { isRetro } = useTheme();
  
  return useMemo(() => {
    return isRetro ? RETRO_SIZES : CYBERPUNK_SIZES;
  }, [isRetro]);
}

// Convenience hook for just checking if sizes should be retro-scaled
export function useIsRetroSize(): boolean {
  const { isRetro } = useTheme();
  return isRetro;
}
```

---

## Phase 2: Core UI Components

### Step 2.1: PauseMenu güncellemesi

`components/screens/PauseMenu.tsx`:

```tsx
import { useThemeSize } from '../../hooks/useThemeSize';

const sizes = useThemeSize();

// Değişiklikler:
// text-6xl -> sizes.title
// text-lg -> sizes.stat
// py-4 -> sizes.buttonLg içindeki py
```

### Step 2.2: MainMenu güncellemesi

`components/screens/MainMenu.tsx`:

```tsx
import { useThemeSize } from '../../hooks/useThemeSize';

const sizes = useThemeSize();

// Değişiklikler:
// text-5xl (fiyat) -> sizes.price
// text-4xl -> sizes.heading
```

### Step 2.3: GameOverScreen güncellemesi

`components/screens/GameOverScreen.tsx`:

```tsx
import { useThemeSize } from '../../hooks/useThemeSize';

const sizes = useThemeSize();

// GAME OVER text: sizes.title
// Stats: sizes.stat
```

### Step 2.4: LevelUpScreen güncellemesi

`components/screens/LevelUpScreen/`:

- Kart başlıkları: `sizes.subheading`
- Kart açıklamaları: `sizes.body`
- Butonlar: `sizes.buttonMd`

---

## Phase 3: HUD Components

### Step 3.1: LiveFeed güncellemesi

`components/hud/LiveFeed.tsx`:

```tsx
import { useThemeSize } from '../../hooks/useThemeSize';

const sizes = useThemeSize();

// Fiyat: sizes.price (mobilde sizes.stat)
// PnL: sizes.stat
// Labels: sizes.tiny
```

### Step 3.2: ComboUI güncellemesi

`components/hud/ComboUI.tsx`:

```tsx
// Combo multiplier: sizes.combo
// Labels: sizes.tiny
```

### Step 3.3: KernelStatus güncellemesi

`components/hud/KernelStatus.tsx`:

```tsx
// Stat labels: sizes.tiny
// Stat values: sizes.stat
```

### Step 3.4: WaveTimer güncellemesi

`components/hud/WaveTimer.tsx`:

```tsx
// Timer: sizes.timer
// Labels: sizes.tiny
```

### Step 3.5: MilestoneAnnouncer güncellemesi

`components/hud/MilestoneAnnouncer.tsx`:

```tsx
// Big text: sizes.title
// Badge: sizes.subheading
```

---

## Phase 4: Settings & Other

### Step 4.1: SettingsPanel sections

Tüm settings section'ları:

```tsx
// Section titles: sizes.small
// Values: sizes.body
// Buttons: sizes.buttonMd
```

### Step 4.2: LeaderboardPanel

```tsx
// Title: sizes.subheading
// Names: sizes.small
// Scores: sizes.body
```

### Step 4.3: NicknameEntryScreen

```tsx
// Title: sizes.heading
// Labels: sizes.small
// Button: sizes.buttonLg
```

---

## Phase 5: Canvas/Game Elements

### Step 5.1: DamageNumbers boyutu

`services/DamageNumbers.ts` veya ilgili renderer:

```typescript
// ThemeContext'ten isRetro alınır
// Font size: isRetro ? 16 : 24 (base)
// Crit font size: isRetro ? 20 : 36
```

---

## Phase 6: Testing & Polish

### Step 6.1: Lint kontrolü
```bash
// turbo
npm run lint -- --max-warnings 0
```

### Step 6.2: Manuel test

1. Settings > Visual Style > 16-Bit seç
2. Kontrol et:
   - [ ] MainMenu başlıklar uygun boyutta
   - [ ] Fiyat gösterimi okunabilir
   - [ ] Butonlar tıklanabilir boyutta
   - [ ] HUD elementleri okunabilir
   - [ ] Pause menü düzgün
   - [ ] Level up kartları okunabilir
   - [ ] Game over ekranı düzgün
   - [ ] Leaderboard okunabilir

### Step 6.3: Mobil test

1. Mobile view'da 16-bit tema
2. Kontrol et:
   - [ ] Touch target'lar yeterli (min 44px)
   - [ ] Metin okunabilir
   - [ ] Spacing uygun

---

## Phase 7: Commit & Push

### Step 7.1: Commit

```bash
git add -A
git commit -m "feat(theme): add theme-aware sizing with useThemeSize hook"
```

### Step 7.2: Push

```bash
git push
```

---

## Uygulama Sırası (Öncelik)

| Öncelik | Component | Neden |
|---------|-----------|-------|
| 1 | useThemeSize hook | Tüm diğerleri buna bağlı |
| 2 | MainMenu | İlk görülen ekran |
| 3 | LiveFeed | Oyun sırasında sürekli görünür |
| 4 | PauseMenu | Sık kullanılan |
| 5 | LevelUpScreen | Sık görülen |
| 6 | GameOverScreen | Önemli |
| 7 | HUD (Combo, Kernel, Wave) | Oyun sırasında |
| 8 | Settings | Zaten tema seçimi burada |
| 9 | Leaderboard | Bonus |
| 10 | DamageNumbers | Canvas element |

---

## Notlar

- Press Start 2P doğal olarak daha büyük görünür, bu yüzden ~0.5x scale uygun
- DotGothic16 ve VT323 daha küçük, `font-secondary` ve `font-mono` için boost gerekebilir
- Touch target'lar minimum 44px kalmalı (mobilde)
- Tailwind class'ları korunur, sadece conditional olur
