# 📲 Native App Store Çıkış Roadmap

> **Crypto Cyber Survivors** oyununun iOS App Store ve Google Play Store'a çıkışı için kapsamlı hazırlık ve yayınlama planı.
> Son Güncelleme: 2024-12-19

---

## 📊 Executive Summary

### Strateji: Web-First → Native Wrapper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NATİVE APP STRATEJİSİ                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Yaklaşım: Capacitor.js ile Native Wrapper                                  │
│                                                                             │
│  Avantajlar:                                                                │
│  • Mevcut React codebase 100% korunur                                       │
│  • Tek codebase → Web + iOS + Android                                       │
│  • Native API'lere erişim (haptics, push, in-app purchase)                  │
│  • App Store dağıtımı mümkün                                                │
│  • Hot reload development                                                   │
│                                                                             │
│  Alternatifler:                                                             │
│  • React Native: Daha iyi performans ama REWRITE gerektirir                 │
│  • Flutter: Tamamen farklı dil/framework                                    │
│  • Unity WebGL export: Oyun engine değişikliği gerektirir                   │
│                                                                             │
│  ✅ Capacitor en uygun seçim - minimum effort, maximum compatibility        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mevcut Durum vs Hedef

| Bileşen | Mevcut Durum | Native-Ready | Aksiyon Gerekli |
|---------|--------------|--------------|-----------------|
| **React/Vite** | ✅ | ✅ Uyumlu | - |
| **Canvas Rendering** | ✅ | ✅ Çalışır | - |
| **Audio (Howler.js)** | ✅ | ✅ Uyumlu | Native fallback ekle |
| **WebSocket** | ✅ | ⚠️ Kısmen | Reconnect logic güçlendir |
| **Storage** | localStorage | ⚠️ | Capacitor Preferences'a migrate |
| **Input System** | Keyboard + Touch | ⚠️ | Back button handler ekle |
| **Push Notifications** | ❌ Yok | ❌ | Native push sistemi kur |
| **In-App Purchase** | ❌ Yok | ❌ | IAP plugin entegre et |
| **Deep Linking** | ❌ Yok | ❌ | App links konfigüre et |

---

## 🗺️ Roadmap Overview

```
Faz 0: Pre-Native Hazırlık (ŞİMDİ)      ████████████████████  Aktif
Faz 1: Capacitor Integration             ░░░░░░░░░░░░░░░░░░░░  Bekliyor
Faz 2: Platform-Specific Features        ░░░░░░░░░░░░░░░░░░░░  Bekliyor
Faz 3: App Store Hazırlık                ░░░░░░░░░░░░░░░░░░░░  Bekliyor
Faz 4: Beta Test & Launch                ░░░░░░░░░░░░░░░░░░░░  Bekliyor

Toplam Tahmini Süre: 3-4 Hafta (Faz 0 hariç)
```

---

## 🏗️ FAZ 0: Pre-Native Hazırlık (ŞİMDİDEN YAPILACAKLAR)

> **Durum:** AKTİF - Bu fazı şimdiden tamamlayarak native geçişi hızlandırıyoruz
> **Süre:** Mobil entegrasyon ile paralel

### 0.1 📁 Kod Organizasyonu

#### Mevcut Yapıyı Native-Ready Hale Getir

```typescript
// YENİ: services/platform/index.ts
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
  
  // ... diğer metodlar
}
```

#### Klasör Yapısı Önerisi

```
crypto-cyber-survivors/
├── src/                          # Ana kaynak kod (değişiklik yok)
│   ├── services/
│   │   ├── platform/             # ← YENİ: Platform abstraction
│   │   │   ├── index.ts          # Interface + factory
│   │   │   ├── WebPlatformService.ts
│   │   │   └── NativePlatformService.ts  # Capacitor (sonra)
│   │   ├── audioService.ts
│   │   └── ...
│   └── ...
├── public/                       # Static assets
│   ├── assets/
│   │   ├── icons/               # App icons (sonra eklenir)
│   │   │   ├── icon-512x512.png
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── ios/                          # Capacitor iOS (sonra oluşur)
├── android/                      # Capacitor Android (sonra oluşur)
└── capacitor.config.ts           # Capacitor config (sonra eklenir)
```

### 0.2 🗄️ Storage Abstraction

#### LocalStorage Kullanımını Sarmalama

**Neden?** Capacitor'da `Preferences` plugin kullanılır, localStorage değil.

```typescript
// services/StorageService.ts (YENİ)

interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Key naming convention
const STORAGE_PREFIX = 'ccs_'; // crypto-cyber-survivors

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
    // Sadece prefixed key'leri temizle
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

// Singleton export
export const storage: StorageService = new WebStorageService();
```

### 0.3 📲 Input Abstraction

#### Back Button Handler Hazırlığı

```typescript
// hooks/useBackButton.ts (YENİ)

import { useEffect } from 'react';
import { GameStatus } from '../types';

interface UseBackButtonOptions {
  status: GameStatus;
  onPause: () => void;
  onResume: () => void;
  onExit?: () => boolean; // Return true to prevent default
}

export const useBackButton = ({ status, onPause, onResume, onExit }: UseBackButtonOptions) => {
  useEffect(() => {
    // Web: Escape key acts as back button
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === GameStatus.PLAYING) {
          onPause();
        } else if (status === GameStatus.PAUSED) {
          onResume();
        } else if (status === GameStatus.MENU) {
          // On menu, maybe show exit confirmation
          onExit?.();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onPause, onResume, onExit]);
  
  // Native back button will be handled in NativePlatformService
  // through Capacitor App.addListener('backButton', ...)
};
```

### 0.4 🔊 Audio Service Hazırlığı

#### Native Audio Fallback Ekleme

```typescript
// audioService.ts - Küçük ekleme

export class AudioService {
  private isNative: boolean = false;
  
  constructor() {
    // Detect if running in Capacitor
    this.isNative = !!(window as any).Capacitor;
    
    // Sync Howler global volume
    void Howler.volume(this.volume);
  }
  
  // Mevcut kodlar...
  
  /**
   * Native-specific audio initialization
   * Called after Capacitor is ready
   */
  async initNative(): Promise<void> {
    if (!this.isNative) return;
    
    // Capacitor-specific audio setup if needed
    // For now, Howler handles most cases
  }
}
```

### 0.5 🌐 Network & WebSocket Güçlendirme

#### Reconnection Logic İyileştirmesi

```typescript
// marketService.ts - Güçlendirme önerileri

// Mevcut reconnect logic'e eklemeler:

interface ReconnectConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onMaxRetriesReached?: () => void;
}

const RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 10,        // Mobilde daha fazla deneme
  baseDelay: 1000,       // 1 saniye başlangıç
  maxDelay: 30000,       // Max 30 saniye
  onMaxRetriesReached: () => {
    // Offline mode'a geç veya kullanıcıyı bilgilendir
    console.warn('[MarketService] Max retries reached, switching to offline mode');
  },
};

// Network status monitoring (native için önemli)
const monitorNetworkStatus = () => {
  window.addEventListener('online', () => {
    console.log('[Network] Back online, reconnecting...');
    // Reconnect logic
  });
  
  window.addEventListener('offline', () => {
    console.log('[Network] Offline, pausing connections');
    // Handle gracefully
  });
};
```

### 0.6 📜 Legal Dokümanlar Hazırlığı

#### Gerekli Sayfalar (URL olarak)

```markdown
Hazırlanması Gereken Dokümanlar:

1. Privacy Policy (Gizlilik Politikası)
   - Hangi veriler toplanıyor
   - Nasıl kullanılıyor
   - 3rd party paylaşımı (Binance/Coinbase API)
   - Cookie/storage kullanımı
   
2. Terms of Service (Kullanım Şartları)
   - Oyun kuralları
   - Sorumluluk reddi
   - Yaş sınırlaması (17+)
   
3. Disclaimer (Feragatname) - KRİTİK!
   - "Bu oyun yatırım tavsiyesi DEĞİLDİR"
   - "Simüle edilmiş piyasa verileri kullanır"
   - "Gerçek para/crypto kazanımı yoktur"
   - "Sadece eğlence amaçlıdır"
```

#### Disclaimer Metni (Oyun İçi)

```typescript
// constants/legal.ts (YENİ)

export const DISCLAIMER = {
  short: "For entertainment only. Not financial advice.",
  
  full: `DISCLAIMER: Crypto Cyber Survivors is a game for entertainment 
purposes only. The Bitcoin price data displayed is for simulation and 
does not constitute financial advice. This game does not involve real 
money or cryptocurrency trading. No actual profits or losses occur. 
By playing, you acknowledge that this is a fictional game experience.`,
  
  ageRating: "This game contains simulated gambling themes. Rated 17+.",
};
```

### 0.7 🎨 App Store Asset Hazırlığı

#### Gerekli Görseller

```
iOS App Store Görselleri:

📱 App Icon
├── icon-1024x1024.png (App Store)
├── icon-180x180.png (iPhone @3x)
├── icon-167x167.png (iPad Pro)
├── icon-152x152.png (iPad)
├── icon-120x120.png (iPhone @2x)
└── icon-76x76.png (iPad @1x)

📷 Screenshots (Zorunlu)
├── 6.5" Display (iPhone 14 Pro Max) - 1284x2778 veya 1290x2796
│   ├── screenshot-gameplay-1.png
│   ├── screenshot-gameplay-2.png
│   ├── screenshot-levelup.png
│   └── screenshot-menu.png
├── 5.5" Display (iPhone 8 Plus) - 1242x2208
│   └── (Aynı içerik, resize)
└── 12.9" Display (iPad Pro) - 2048x2732 (Opsiyonel)

🎬 App Preview Video (Opsiyonel ama önerilen)
└── preview-30sec.mp4 (15-30 saniye gameplay)


Google Play Store Görselleri:

📱 App Icon
└── icon-512x512.png

🖼️ Feature Graphic (Zorunlu)
└── feature-graphic-1024x500.png

📷 Screenshots (En az 2, max 8)
├── screenshot-1.png (min 320px, max 3840px)
├── screenshot-2.png
└── ...

🎬 Promo Video (Opsiyonel)
└── YouTube link
```

### 0.8 ⚙️ Environment Variables

#### Platform-Aware Config

```typescript
// config/env.ts (YENİ veya GÜNCELLEME)

interface EnvConfig {
  PLATFORM: 'web' | 'ios' | 'android';
  IS_PRODUCTION: boolean;
  API_BASE_URL: string;
  WS_BINANCE_URL: string;
  WS_COINBASE_URL: string;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
}

const detectPlatform = (): 'web' | 'ios' | 'android' => {
  const capacitor = (window as any).Capacitor;
  if (capacitor?.isNativePlatform()) {
    return capacitor.getPlatform() as 'ios' | 'android';
  }
  return 'web';
};

export const ENV: EnvConfig = {
  PLATFORM: detectPlatform(),
  IS_PRODUCTION: import.meta.env.PROD,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  WS_BINANCE_URL: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
  WS_COINBASE_URL: 'wss://ws-feed.exchange.coinbase.com',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
};

// Platform-specific behavior
export const PLATFORM_CONFIG = {
  web: {
    showInstallPrompt: true,
    useServiceWorker: true,
  },
  ios: {
    showInstallPrompt: false,
    useServiceWorker: false, // Native'de gereksiz
    handleStatusBar: true,
  },
  android: {
    showInstallPrompt: false,
    useServiceWorker: false,
    handleBackButton: true,
  },
};
```

---

## 📋 Faz 0 Checklist

```
PRE-NATIVE HAZIRLIK:

[ ] Platform Abstraction Layer
    [ ] PlatformService interface tanımla
    [ ] WebPlatformService implement et
    [ ] Storage abstraction oluştur
    [ ] STORAGE_KEYS constant'ları tanımla

[ ] Input & Lifecycle
    [ ] useBackButton hook oluştur
    [ ] App lifecycle handlers hazırla
    [ ] Haptic feedback abstract et

[ ] Audio
    [ ] Native detection ekle
    [ ] Visibility change handler güçlendir

[ ] Network
    [ ] Reconnect config güçlendir
    [ ] Network status monitoring ekle
    [ ] Offline mode stratejisi belirle

[ ] Legal
    [ ] Privacy Policy taslağı yaz
    [ ] Terms of Service taslağı yaz
    [ ] In-game disclaimer metni hazırla

[ ] Assets
    [ ] App icon tasarla (1024x1024)
    [ ] Screenshot çerçeveleri hazırla
    [ ] Feature graphic tasarla

[ ] Config
    [ ] Environment variables ayarla
    [ ] Platform-specific config oluştur
```

---

## 🔧 FAZ 1: Capacitor Integration

> **Süre:** 2-3 Gün
> **Başlangıç:** Mobil entegrasyon tamamlandıktan sonra

### 1.1 Capacitor Kurulumu

```bash
# Capacitor core ve CLI kurulumu
npm install @capacitor/core @capacitor/cli

# Capacitor projesi başlat
npx cap init "Crypto Cyber Survivors" "com.cryptosurvivors.game" --web-dir dist

# Platform ekleme
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 1.2 Capacitor Config

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cryptosurvivors.game',
  appName: 'Crypto Cyber Survivors',
  webDir: 'dist',
  
  // Server config for development
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Development: Use live reload
    // url: 'http://192.168.1.100:3000',
  },
  
  // iOS specific
  ios: {
    contentInset: 'automatic',
    scrollEnabled: false,
    backgroundColor: '#020617',
    preferredContentMode: 'mobile',
  },
  
  // Android specific  
  android: {
    backgroundColor: '#020617',
    allowMixedContent: true, // WebSocket için
    captureInput: true,
    webContentsDebuggingEnabled: true, // Development only
  },
  
  // Plugins
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#020617',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#020617',
    },
  },
};

export default config;
```

### 1.3 Gerekli Capacitor Pluginleri

```bash
# Temel pluginler
npm install @capacitor/app           # App lifecycle, back button
npm install @capacitor/haptics       # Native haptic feedback
npm install @capacitor/preferences   # Persistent storage
npm install @capacitor/status-bar    # Status bar control
npm install @capacitor/splash-screen # Splash screen

# Opsiyonel ama önerilen
npm install @capacitor/screen-reader # Accessibility
npm install @capacitor/network       # Network status
npm install @capacitor/device        # Device info

# İleride (monetization)
npm install @capacitor/in-app-purchase  # IAP (sonra)
npm install @capacitor/push-notifications # Push (sonra)
```

### 1.4 Native Platform Service

```typescript
// services/platform/NativePlatformService.ts

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PlatformService } from './index';

export class NativePlatformService implements PlatformService {
  
  async init(): Promise<void> {
    // Status bar setup
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#020617' });
    
    // Hide status bar for fullscreen gaming
    // await StatusBar.hide();
  }
  
  // Storage
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
  
  // Haptics
  vibrate(pattern: number | number[]): void {
    // Simple vibration
    Haptics.vibrate();
  }
  
  impactLight(): void {
    Haptics.impact({ style: ImpactStyle.Light });
  }
  
  impactMedium(): void {
    Haptics.impact({ style: ImpactStyle.Medium });
  }
  
  impactHeavy(): void {
    Haptics.impact({ style: ImpactStyle.Heavy });
  }
  
  // App lifecycle
  onPause(callback: () => void): void {
    App.addListener('pause', callback);
  }
  
  onResume(callback: () => void): void {
    App.addListener('resume', callback);
  }
  
  onBackButton(callback: () => boolean): void {
    App.addListener('backButton', ({ canGoBack }) => {
      const handled = callback();
      if (!handled && canGoBack) {
        // Let system handle it
      }
    });
  }
  
  // Platform info
  getPlatform(): 'web' | 'ios' | 'android' {
    return Capacitor.getPlatform() as 'ios' | 'android';
  }
  
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }
}
```

---

## 📱 FAZ 2: Platform-Specific Features

> **Süre:** 1 Hafta
> **Başlangıç:** Capacitor entegrasyonu sonrası

### 2.1 iOS Specific

| Feature | Plugin | Açıklama |
|---------|--------|----------|
| App Tracking Transparency | Native | iOS 14.5+ zorunlu |
| Sign in with Apple | @capacitor/sign-in-with-apple | Opsiyonel ama önerilen |
| Game Center | Native | Leaderboard için opsiyonel |
| Haptic Engine | @capacitor/haptics | ✅ Temel pakette |
| 3D Touch / Haptic Touch | Custom | Opsiyonel |

### 2.2 Android Specific

| Feature | Plugin | Açıklama |
|---------|--------|----------|
| Hardware Back Button | @capacitor/app | ✅ Temel pakette |
| Immersive Mode | @capacitor/status-bar | Fullscreen |
| Google Play Games | Native | Leaderboard için opsiyonel |
| Adaptive Icons | Android res | Manifest config |

### 2.3 Ortak Features

| Feature | Plugin | Priority |
|---------|--------|----------|
| Push Notifications | @capacitor/push-notifications | Orta |
| In-App Purchase | @capacitor/in-app-purchase | Düşük (v2+) |
| Share | @capacitor/share | Düşük |
| Rate App | @capacitor/rate-app | Orta |

---

## 🏪 FAZ 3: App Store Hazırlık

> **Süre:** 3-5 Gün
> **Başlangıç:** Beta testler başarılı olduğunda

### 3.1 Apple App Store Gereksinimleri

#### Developer Account
```
Gerekli:
• Apple Developer Program üyeliği ($99/yıl)
• App Store Connect erişimi
• Xcode (macOS gerekli!)
• Certificates & Provisioning Profiles
```

#### App Store Connect Bilgileri
```
App Information:
├── Name: Crypto Cyber Survivors
├── Subtitle: Survive the Market Chaos
├── Category: Games > Action
├── Secondary Category: Games > Arcade
├── Age Rating: 17+ (Simulated Gambling)
└── Price: Free

Privacy:
├── Privacy Policy URL: [website]/privacy
├── Data Collection: Gameplay analytics only
├── No personal data collection
└── Third-party SDK disclosure (Binance WS)

App Review Notes:
├── Demo account: Gerekli değil
├── Test notes: "Tap Play, choose Long/Short..."
└── Contact info: [email]
```

#### Yaş Derecelendirme Soruları
```
Gambling & Contests:
Q: Does your app contain gambling or simulated gambling?
A: Yes - Simulated Gambling (slot machine card selection)

Q: Does your app allow users to purchase or earn real money?
A: No

Medical/Treatment:
A: None

Violence/Horror:
A: Infrequent/Mild (cartoon enemies)

Result: 17+ Rating
```

### 3.2 Google Play Store Gereksinimleri

#### Developer Account
```
Gerekli:
• Google Play Developer account ($25 tek sefer)
• Google Play Console erişimi
• Keystore file (signing için)
• Service account (opsiyonel, CI/CD için)
```

#### Play Console Bilgileri
```
Store Listing:
├── Title: Crypto Cyber Survivors
├── Short description: "Survive the BTC market chaos!" (80 char max)
├── Full description: [500-4000 chars]
├── Category: Games > Action
└── Tags: crypto, survival, bullet hell, arcade

Content Rating:
├── ESRB: Teen (Simulated Gambling)
├── PEGI: 12
└── USK: 12

Data Safety:
├── Data collection: Anonymous analytics
├── Data sharing: None
├── Security practices: HTTPS
└── Data deletion: In-app option
```

### 3.3 Build & Release Workflow

```bash
# Development build
npm run build

# Sync to native projects
npx cap sync

# iOS (macOS gerekli)
npx cap open ios
# Xcode'da Archive → Distribute

# Android
npx cap open android
# Android Studio'da Build → Generate Signed Bundle
# veya CLI:
cd android && ./gradlew bundleRelease
```

---

## 🧪 FAZ 4: Beta Test & Launch

> **Süre:** 1-2 Hafta
> **Başlangıç:** App Store onayları beklenirken

### 4.1 iOS TestFlight

```
TestFlight Workflow:
1. Xcode'da Archive oluştur
2. App Store Connect'e upload et
3. Internal testers ekle (max 100)
4. External testing için App Review bekle
5. Beta feedback topla
6. Fix & iterate
```

### 4.2 Android Internal Testing

```
Google Play Workflow:
1. Signed AAB oluştur
2. Play Console → Internal testing track'e upload
3. Internal testers ekle (max 100)
4. Test linki paylaş
5. Crash raporlarını incele
6. Production'a terfi
```

### 4.3 Launch Checklist

```
GO-LIVE ÖNCESİ:

App Store:
[ ] App icon tüm boyutlarda hazır
[ ] Screenshots 6.5" ve 5.5" hazır
[ ] App Preview video (opsiyonel)
[ ] Privacy Policy live
[ ] Terms of Service live
[ ] Age rating completed (17+)
[ ] Build uploaded & reviewed
[ ] Pricing set (Free)
[ ] Release date seçildi

Technical:
[ ] Production build test edildi
[ ] Analytics çalışıyor
[ ] Crash reporting aktif (Sentry)
[ ] Deep links çalışıyor (opsiyonel)
[ ] Push notifications test edildi (opsiyonel)

Marketing:
[ ] Landing page hazır
[ ] Social media assets hazır
[ ] Press kit hazır
[ ] Launch announcement yazıldı
```

---

## 💰 Monetization (Opsiyonel - v2+)

### Uygun Modeller

| Model | App Store Uygun? | Açıklama |
|-------|------------------|----------|
| **Free to Play** | ✅ | Ana model |
| **Remove Ads** | ✅ | Tek seferlik IAP |
| **Cosmetic IAP** | ✅ | Kart skinleri, tema |
| **Season Pass** | ✅ | Premium içerik |
| **Tip Jar** | ✅ | Donation |

### YASAK Modeller

| Model | Neden Yasak |
|-------|-------------|
| Crypto earning | App Store RED |
| Real money gambling | Yasal sorunlar |
| NFT minting | Apple %30 komisyon sorunu |
| External payment links | App Store RED |

---

## 🚧 Risk Analizi

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| App Store rejection (crypto içerik) | Orta | Yüksek | Disclaimer, "simulated" vurgusu |
| WebSocket App Store sorunu | Düşük | Orta | API kullan, ws yerine http polling |
| iOS 17+ uyumluluk | Düşük | Orta | Minimum iOS 14 target |
| Android fragmentation | Orta | Orta | Minimum API 24 (Android 7) |
| Review süresi (Apple) | Yüksek | Orta | 1-7 gün bekle, expedite request |

---

## 📊 Success Metrics

| Metric | Target | Ölçüm |
|--------|--------|-------|
| App Store Rating | 4.5+ | App Store Connect |
| Crash-free users | >99% | Sentry / Firebase |
| D1 Retention | >40% | Analytics |
| D7 Retention | >15% | Analytics |
| Avg Session | >3 min | Analytics |
| Install → Play rate | >70% | Funnel analysis |

---

## 📅 Zaman Çizelgesi (Tahmini)

```
HAFTA 1-2: Mobil PWA (paralel devam)
└── Faz 0 başlar (pre-native hazırlık)

HAFTA 3: Capacitor Integration
├── Pazartesi: Capacitor kurulum
├── Salı: Plugin entegrasyonları
├── Çarşamba: Native service implementation
├── Perşembe: iOS build test
└── Cuma: Android build test

HAFTA 4: Platform Features & Polish
├── Platform-specific fixes
├── Performance optimization
├── App Store assets hazırlığı
└── Legal dokümanlar finalize

HAFTA 5: Beta Testing
├── TestFlight internal release
├── Google Play internal release
├── Beta feedback collection
└── Critical bug fixes

HAFTA 6: App Store Submission
├── Final builds
├── App Store Connect submission
├── Google Play Console submission
├── Review bekle (1-7 gün)
└── 🚀 LAUNCH!
```

---

## 📚 Kaynaklar

### Dokümantasyon
- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

### Proje Dökümanları
- [MOBILE_INTEGRATION_ROADMAP.md](./MOBILE_INTEGRATION_ROADMAP.md) - PWA entegrasyonu
- [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) - Genel proje roadmap

---

## ✅ Sonraki Adımlar

### Şimdi (Faz 0)
1. Platform abstraction layer oluştur
2. Storage service'i sarmalama
3. Legal doküman taslakları yaz
4. App icon tasarımına başla

### Mobil PWA Tamamlandıktan Sonra
1. Capacitor kurulumu
2. Native build testleri
3. App Store hesap açılışları
4. Beta test süreci

---

> 💡 **Not:** Bu roadmap, PWA yaklaşımından sonra native app geçişini kapsar. PWA'yı önce tamamlamak, native hazırlığı için değerli test ortamı sağlar.

> ⚠️ **Önemli:** Apple App Store submission için **macOS** gereklidir. Windows'ta iOS build yapılamaz. CI/CD servisleri (Codemagic, Bitrise) veya Mac cloud rental alternatif olabilir.
