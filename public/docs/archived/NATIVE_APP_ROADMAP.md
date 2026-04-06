# 📲 Native App Store Release Roadmap

> Comprehensive preparation and publishing plan for the release of **Crypto Cyber Survivors** on the iOS App Store and Google Play Store.
> Last Updated: 2024-12-19

---

## 📊 Executive Summary

### Strategy: Web-First → Native Wrapper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NATIVE APP STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Approach: Native Wrapper with Capacitor.js                                 │
│                                                                             │
│  Advantages:                                                                │
│  • Existing React codebase 100% preserved                                   │
│  • Single codebase → Web + iOS + Android                                    │
│  • Access to Native APIs (haptics, push, in-app purchase)                  │
│  • App Store distribution possible                                          │
│  • Hot reload development                                                   │
│                                                                             │
│  Alternatives:                                                              │
│  • React Native: Better performance but requires REWRITE                    │
│  • Flutter: Entirely different language/framework                            │
│  • Unity WebGL export: Requires game engine change                          │
│                                                                             │
│  ✅ Capacitor is the optimal choice - minimum effort, maximum compatibility  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current State vs Target

| Component | Current State | Native-Ready | Action Required |
|---------|--------------|--------------|-----------------|
| **React/Vite** | ✅ | ✅ Compatible | - |
| **Canvas Rendering** | ✅ | ✅ Works | - |
| **Audio (Howler.js)** | ✅ | ✅ Compatible | Add native fallback |
| **WebSocket** | ✅ | ⚠️ Partial | Strengthen reconnect logic |
| **Storage** | localStorage | ⚠️ | Migrate to Capacitor Preferences |
| **Input System** | Keyboard + Touch | ⚠️ | Add back button handler |
| **Push Notifications** | ❌ None | ❌ | Setup native push system |
| **In-App Purchase** | ❌ None | ❌ | Integrate IAP plugin |
| **Deep Linking** | ❌ None | ❌ | Configure app links |

---

## 🗺️ Roadmap Overview

```
Phase 0: Pre-Native Preparation (NOW)    ████████████████████  Active
Phase 1: Capacitor Integration           ░░░░░░░░░░░░░░░░░░░░  Waiting
Phase 2: Platform-Specific Features        ░░░░░░░░░░░░░░░░░░░░  Waiting
Phase 3: App Store Preparation           ░░░░░░░░░░░░░░░░░░░░  Waiting
Phase 4: Beta Test & Launch                ░░░░░░░░░░░░░░░░░░░░  Waiting

Total Estimated Time: 3-4 Weeks (excluding Phase 0)
```

---

## 🏗️ PHASE 0: Pre-Native Preparation (DO NOW)

> **Status:** ACTIVE - Completing this phase now to accelerate the native transition
> **Duration:** Parallel with mobile integration

### 0.1 📁 Code Organization

#### Make Current Structure Native-Ready

```typescript
// NEW: services/platform/index.ts
// Platform abstraction layer

export interface PlatformService {
  // Storage
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  
  // Haptics
  vibrate(pattern: number | number[]): void;
  impactLight(): void;
  impactMedium(): void;
  impactHeavy(): void;
  
  // App lifecycle
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
  onBackButton(callback: () => boolean): void;
  
  // Platform info
  getPlatform(): 'web' | 'ios' | 'android';
  isNative(): boolean;
}

// Web implementation
export class WebPlatformService implements PlatformService {
  getItem(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(key));
  }
  
  setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  
  vibrate(pattern: number | number[]): void {
    navigator.vibrate?.(pattern);
  }
  
  getPlatform(): 'web' | 'ios' | 'android' {
    return 'web';
  }
  
  isNative(): boolean {
    return false;
  }
}
```

#### Folder Structure Suggestion

```
crypto-cyber-survivors/
├── src/                          # Main source code (no change)
│   ├── services/
│   │   ├── platform/             # ← NEW: Platform abstraction
│   │   │   ├── index.ts          # Interface + factory
│   │   │   ├── WebPlatformService.ts
│   │   │   └── NativePlatformService.ts  # Capacitor (later)
│   │   ├── audioService.ts
│   │   └── ...
│   └── ...
├── public/                       # Static assets
│   ├── assets/
│   │   ├── icons/               # App icons (later)
│   │   │   ├── icon-512x512.png
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── ios/                          # Capacitor iOS (created later)
├── android/                      # Capacitor Android (created later)
└── capacitor.config.ts           # Capacitor config (later)
```

### 0.2 🗄️ Storage Abstraction

#### Wrapping LocalStorage Usage

**Why?** Capacitor uses the `Preferences` plugin, not localStorage.

```typescript
// services/StorageService.ts (NEW)

interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Key naming convention
const STORAGE_PREFIX = 'ccs_'; 

export const STORAGE_KEYS = {
  SETTINGS: `${STORAGE_PREFIX}settings`,
  HIGH_SCORE: `${STORAGE_PREFIX}high_score`,
  ACHIEVEMENTS: `${STORAGE_PREFIX}achievements`,
  PLAYER_DATA: `${STORAGE_PREFIX}player_data`,
  LEVERAGE_PREF: `${STORAGE_PREFIX}leverage_pref`,
  AUDIO_ENABLED: `${STORAGE_PREFIX}audio_enabled`,
  HAPTIC_ENABLED: `${STORAGE_PREFIX}haptic_enabled`,
} as const;

// Web implementation
class WebStorageService implements StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
  
  async clear(): Promise<void> {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

export const storage: StorageService = new WebStorageService();
```

### 0.3 📲 Input Abstraction

#### Back Button Handler Preparation

```typescript
// hooks/useBackButton.ts (NEW)

import { useEffect } from 'react';
import { GameStatus } from '../types';

interface UseBackButtonOptions {
  status: GameStatus;
  onPause: () => void;
  onResume: () => void;
  onExit?: () => boolean; 
}

export const useBackButton = ({ status, onPause, onResume, onExit }: UseBackButtonOptions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === GameStatus.PLAYING) {
          onPause();
        } else if (status === GameStatus.PAUSED) {
          onResume();
        } else if (status === GameStatus.MENU) {
          onExit?.();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onPause, onResume, onExit]);
};
```

### 0.4 🔊 Audio Service Preparation

#### Adding Native Audio Fallback

```typescript
// audioService.ts 

export class AudioService {
  private isNative: boolean = false;
  
  constructor() {
    this.isNative = !!(window as any).Capacitor;
  }
}
```

### 0.5 🌐 Network & WebSocket Strengthening

#### Reconnection Logic Improvement

```typescript
// marketService.ts 

interface ReconnectConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onMaxRetriesReached?: () => void;
}

const RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 10,        
  baseDelay: 1000,       
  maxDelay: 30000,       
  onMaxRetriesReached: () => {
    console.warn('[MarketService] Max retries reached, switching to offline mode');
  },
};
```

### 0.6 📜 Legal Documents Preparation

#### Required Pages (as URLs)

```markdown
Documents to be Prepared:

1. Privacy Policy
   - What data is collected
   - How it is used
   - 3rd party sharing (Binance/Coinbase API)
   - Cookie/storage usage
   
2. Terms of Service
   - Game rules
   - Disclaimer
   - Age limit (17+)
   
3. Disclaimer - CRITICAL!
   - "This game is NOT financial advice"
   - "Uses simulated market data"
   - "No real money/crypto gain"
   - "For entertainment purposes only"
```

### 0.7 🎨 App Store Asset Preparation

#### Required Visuals

```
iOS App Store Assets:
📱 App Icon (1024x1024)
📷 Screenshots (6.5" and 5.5")
🎬 App Preview Video (Optional)

Google Play Store Assets:
📱 App Icon (512x512)
🖼️ Feature Graphic (1024x500)
📷 Screenshots (min 2, max 8)
```

---

## 📋 Phase 0 Checklist
- [ ] Platform Abstraction Layer
- [ ] Input & Lifecycle handlers
- [ ] Native audio fallback
- [ ] Strengthened Reconnection logic
- [ ] Legal drafts (Privacy/Terms)
- [ ] App Store assets (Icons/Screenshots)

---

## 🔧 PHASE 1: Capacitor Integration
- [ ] Install @capacitor/core, @capacitor/cli
- [ ] Initialize Capacitor project
- [ ] Add iOS and Android platforms
- [ ] Configure `capacitor.config.ts`

---

## 📱 PHASE 2: Platform-Specific Features
- [ ] iOS App Tracking Transparency
- [ ] Android Hardware Back Button
- [ ] Status bar & Immersive mode
- [ ] Haptic feedback implementation

---

## 🏪 PHASE 3: App Store Preparation
- [ ] Apple Developer Program setup ($99/year)
- [ ] Google Play Developer account setup ($25 once)
- [ ] Privacy Policy URL active
- [ ] Age ratings (17+ due to simulated gambling)

---

// END OF PROTOCOL
