---
description: How to implement and extend the theme switching system (Cyberpunk vs 16-bit Retro)
---

# Theme Switching System Implementation

This workflow guides the implementation of a dual-theme system allowing users to switch between "Cyberpunk" (modern) and "16-bit Retro" themes.

## Phase 1: Theme Context & Infrastructure

### Step 1.1: Create Theme Types
Create `types/theme.ts` with theme type definitions:
```typescript
export type ThemeName = 'cyberpunk' | 'retro-16bit';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  effects: ThemeEffects;
  audio: ThemeAudio;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  success: string;
  danger: string;
  warning: string;
  // Add more as needed
}

export interface ThemeFonts {
  primary: string;
  secondary: string;
  mono: string;
}

export interface ThemeEffects {
  blur: boolean;
  glow: boolean;
  shadows: boolean;
  scanlines: boolean;
  crtCurvature: boolean;
  pixelated: boolean;
}

export interface ThemeAudio {
  preset: 'modern' | 'chiptune';
}
```

### Step 1.2: Create Theme Configurations
Create `config/themes/cyberpunk.ts`:
```typescript
import { ThemeConfig } from '../../types/theme';

export const cyberpunkTheme: ThemeConfig = {
  name: 'cyberpunk',
  displayName: 'Cyberpunk',
  colors: {
    primary: '#00ffff',      // Cyan
    secondary: '#ff00ff',    // Magenta
    accent: '#ffff00',       // Yellow
    background: '#0a0a0f',   // Dark
    surface: 'rgba(20, 20, 40, 0.8)',
    text: '#ffffff',
    textMuted: '#8888aa',
    success: '#00ff88',
    danger: '#ff4444',
    warning: '#ffaa00',
  },
  fonts: {
    primary: '"Orbitron", "Inter", sans-serif',
    secondary: '"Inter", sans-serif',
    mono: '"Fira Code", monospace',
  },
  effects: {
    blur: true,
    glow: true,
    shadows: true,
    scanlines: false,
    crtCurvature: false,
    pixelated: false,
  },
  audio: {
    preset: 'modern',
  },
};
```

Create `config/themes/retro16bit.ts`:
```typescript
import { ThemeConfig } from '../../types/theme';

export const retro16bitTheme: ThemeConfig = {
  name: 'retro-16bit',
  displayName: '16-Bit Retro',
  colors: {
    primary: '#5dade2',      // SNES-style blue
    secondary: '#f39c12',    // Orange
    accent: '#27ae60',       // Green
    background: '#1a1a2e',   // Dark purple
    surface: '#16213e',      // Darker blue
    text: '#eaecee',
    textMuted: '#aab7b8',
    success: '#2ecc71',
    danger: '#e74c3c',
    warning: '#f1c40f',
  },
  fonts: {
    primary: '"Press Start 2P", monospace',
    secondary: '"Press Start 2P", monospace',
    mono: '"Press Start 2P", monospace',
  },
  effects: {
    blur: false,
    glow: false,
    shadows: false,
    scanlines: true,
    crtCurvature: true,
    pixelated: true,
  },
  audio: {
    preset: 'chiptune',
  },
};
```

Create `config/themes/index.ts`:
```typescript
export { cyberpunkTheme } from './cyberpunk';
export { retro16bitTheme } from './retro16bit';
```

### Step 1.3: Create Theme Context
Create `contexts/ThemeContext.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeName, ThemeConfig } from '../types/theme';
import { cyberpunkTheme, retro16bitTheme } from '../config/themes';

interface ThemeContextType {
  theme: ThemeConfig;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'game-theme';

const themes: Record<ThemeName, ThemeConfig> = {
  'cyberpunk': cyberpunkTheme,
  'retro-16bit': retro16bitTheme,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ThemeName) || 'cyberpunk';
  });

  const theme = themes[themeName];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeName);
    applyThemeToDOM(theme);
  }, [themeName, theme]);

  const setTheme = (name: ThemeName) => setThemeName(name);
  const toggleTheme = () => setThemeName(prev => 
    prev === 'cyberpunk' ? 'retro-16bit' : 'cyberpunk'
  );

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  
  // Apply colors as CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Apply fonts
  root.style.setProperty('--font-primary', theme.fonts.primary);
  root.style.setProperty('--font-secondary', theme.fonts.secondary);
  root.style.setProperty('--font-mono', theme.fonts.mono);
  
  // Apply effect classes
  root.classList.toggle('theme-blur', theme.effects.blur);
  root.classList.toggle('theme-glow', theme.effects.glow);
  root.classList.toggle('theme-scanlines', theme.effects.scanlines);
  root.classList.toggle('theme-pixelated', theme.effects.pixelated);
  
  // Set theme name as data attribute
  root.setAttribute('data-theme', theme.name);
}
```

### Step 1.4: Wrap App with ThemeProvider
Update `App.tsx` or `main.tsx`:
```typescript
import { ThemeProvider } from './contexts/ThemeContext';

// Wrap the app
<ThemeProvider>
  <App />
</ThemeProvider>
```

// turbo
### Step 1.5: Add Google Font for Pixel Font
Add to `index.html` in `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

---

## Phase 2: CSS Theme Variables

### Step 2.1: Update Base CSS Variables
Update `index.css` to use CSS variables for colors:
```css
:root {
  /* Default theme (cyberpunk) - will be overridden by JS */
  --color-primary: #00ffff;
  --color-secondary: #ff00ff;
  --color-accent: #ffff00;
  --color-background: #0a0a0f;
  --color-surface: rgba(20, 20, 40, 0.8);
  --color-text: #ffffff;
  --color-textMuted: #8888aa;
  --color-success: #00ff88;
  --color-danger: #ff4444;
  --color-warning: #ffaa00;
  
  --font-primary: "Orbitron", "Inter", sans-serif;
  --font-secondary: "Inter", sans-serif;
  --font-mono: "Fira Code", monospace;
}
```

### Step 2.2: Add Theme Effect Classes
Add to `index.css`:
```css
/* Scanlines effect (retro) */
.theme-scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  z-index: 9999;
}

/* Pixelated rendering */
.theme-pixelated * {
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
}

/* Remove blur effects in retro mode */
[data-theme="retro-16bit"] .blur-bg,
[data-theme="retro-16bit"] .backdrop-blur {
  backdrop-filter: none !important;
  background: var(--color-surface) !important;
}

/* Remove glow in retro mode */
[data-theme="retro-16bit"] .glow,
[data-theme="retro-16bit"] [class*="shadow"] {
  box-shadow: none !important;
  text-shadow: none !important;
}

/* Chunky borders in retro mode */
[data-theme="retro-16bit"] button,
[data-theme="retro-16bit"] .card,
[data-theme="retro-16bit"] .panel {
  border: 3px solid var(--color-primary) !important;
  border-radius: 0 !important;
}
```

### Step 2.3: Update Components to Use CSS Variables
Replace hardcoded colors with CSS variables in components:
```css
/* Before */
color: #00ffff;
background: rgba(0, 255, 255, 0.1);

/* After */
color: var(--color-primary);
background: color-mix(in srgb, var(--color-primary) 10%, transparent);
```

---

## Phase 3: Audio Theme System

### Step 3.1: Create Chiptune Audio Presets
Add to `config/AudioRegistry.ts`:
```typescript
// 8-BIT CHIPTUNE PRESETS
// All use square wave with short, punchy envelopes

export const CHIPTUNE_PRESETS: Record<string, AudioPreset> = {
  slotTick: {
    components: [
      {
        type: 'square',
        frequency: 880,
        frequencyEnd: 440,
        envelope: { initial: 0.08, peak: 0.08, duration: 0.02, ramp: 'linear' },
      },
    ],
    cooldown: 40,
  },
  
  reelStopClick: {
    components: [
      {
        type: 'square',
        frequency: 523.25,
        frequencyEnd: 261.63,
        envelope: { initial: 0.1, peak: 0.1, duration: 0.03, ramp: 'linear' },
      },
    ],
  },
  
  slotWinNote: {
    components: [
      {
        type: 'square',
        frequency: 523.25,
        envelope: { initial: 0.1, peak: 0.12, duration: 0.2, ramp: 'linear' },
      },
    ],
  },
  
  coinDing: {
    components: [
      {
        type: 'square',
        frequency: 1760,
        frequencyEnd: 880,
        envelope: { initial: 0.08, peak: 0.1, duration: 0.05, ramp: 'linear' },
      },
    ],
  },
  
  // Add more chiptune versions...
};
```

### Step 3.2: Update Audio System for Theme Awareness
Modify `services/audio/SynthEngine.ts` or create audio theme switcher:
```typescript
import { useTheme } from '../../contexts/ThemeContext';
import { AUDIO_PRESETS as MODERN_PRESETS } from '../../config/AudioRegistry';
import { CHIPTUNE_PRESETS } from '../../config/AudioRegistry';

export function getAudioPresets() {
  const { theme } = useTheme();
  return theme.audio.preset === 'chiptune' ? CHIPTUNE_PRESETS : MODERN_PRESETS;
}
```

---

## Phase 4: Theme Toggle UI

### Step 4.1: Create Theme Toggle Button
Create `components/ui/ThemeToggle.tsx`:
```typescript
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { themeName, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {themeName === 'cyberpunk' ? '🎮 16-Bit' : '🌃 Cyber'}
    </button>
  );
}
```

### Step 4.2: Add to Settings Menu
Add ThemeToggle to the settings/pause menu.

---

## Phase 5: Testing & Polish

// turbo
### Step 5.1: Verify Lint
```bash
npm run lint
```

// turbo
### Step 5.2: Test Theme Switching
1. Start dev server: `npm run dev`
2. Open game in browser
3. Toggle theme and verify:
   - Colors change correctly
   - Fonts change correctly
   - Effects (scanlines, glow) toggle
   - Audio sounds different (if implemented)

### Step 5.3: Commit Changes
```bash
git add -A
git commit -m "feat(theme): add theme switching system (cyberpunk/16-bit)"
git push
```

---

## Optional Enhancements

### Add CRT Curvature Effect
```css
[data-theme="retro-16bit"] .game-container {
  border-radius: 20px;
  box-shadow: 
    inset 0 0 60px rgba(0, 0, 0, 0.5),
    inset 0 0 10px rgba(0, 0, 0, 0.3);
}
```

### Add Pixel Art Sprites
- Create or source 16-bit style sprites
- Use theme context to conditionally load sprite sets
- Store in `public/sprites/retro/` vs `public/sprites/modern/`

### Add Theme-Specific Animations
```css
/* Cyberpunk: smooth transitions */
[data-theme="cyberpunk"] * {
  transition: all 0.3s ease;
}

/* Retro: instant/stepped animations */
[data-theme="retro-16bit"] * {
  transition: none !important;
  animation-timing-function: steps(4) !important;
}
```
