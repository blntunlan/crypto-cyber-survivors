# 📱 Capacitor iOS Refactor & Entegrasyon Rehberi

Bu workflow, "Crypto Cyber Survivors" web projesini native iOS uygulamasına dönüştürmek için gereken kurulum, yapılandırma ve kod düzenlemelerini (refactoring) içerir.

## 1. Hazırlık ve Kurulum

Öncelikle Capacitor kütüphanelerini projeye ekleyin.

```bash
# Temel paketler
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Build klasörünü oluştur (Vite varsayılanı 'dist' kullanır)
npm run build

# Capacitor'ı başlat (App ID ve İsim belirleyin)
# Örn: npx cap init "Crypto Cyber Survivors" "com.takro.cryptosurvivors"
npx cap init
```

## 2. Yapılandırma (capacitor.config.ts)

`capacitor.config.ts` dosyasını oluşturun veya güncelleyin:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.takro.cryptosurvivors',
  appName: 'Crypto Cyber Survivors',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Geliştirme sırasında bilgisayar IP'si kullanılabilir, prod için bu satırı silin:
    // url: 'http://192.168.1.X:3000', 
    // cleartext: true 
  },
  plugins: {
    Keyboard: {
      resize: 'none', // Klavye açılınca oyun ekranı sıkışmasın
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000"
    }
  }
};

export default config;
```

## 3. Kod Refactor Adımları (Kritik)

Web oyununun iOS'ta "Web Sitesi" gibi değil "Oyun" gibi hissettirmesi için aşağıdaki değişiklikleri uygulayın.

### A. Viewport Ayarı (`index.html`)
Zoom yapmayı engellemek ve çentikli ekranlara (Notch) tam oturmak için:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### B. CSS Düzenlemeleri (`index.css`)
Kullanıcının metin seçmesini, resimleri sürüklemesini ve iOS varsayılan dokunma efektlerini kapatın.

```css
:root {
  /* Güvenli alan değişkenleri (Notch ve Home Bar için) */
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

body {
  /* Lastik bant (Rubber-banding) efektini kapat */
  overscroll-behavior: none;
  /* Metin seçimini kapat */
  user-select: none;
  -webkit-user-select: none;
  /* Dokunma gecikmesini kaldır */
  touch-action: none;
  /* Uzun basınca çıkan menüyü kapat */
  -webkit-touch-callout: none;
  background-color: black;
}

/* UI elementlerinin çentik altında kalmaması için */
.safe-area-padding {
  padding-top: var(--sat);
  padding-bottom: var(--sab);
  padding-left: var(--sal);
  padding-right: var(--sar);
}
```

### C. GameUI Refactor (`components/GameUI.tsx`)
UI bileşenlerini güvenli alanlara (Safe Area) göre hizalayın.

```tsx
// Örnek: Üst HUD çentiğin altında başlamalı
<div className="absolute top-0 w-full pt-[env(safe-area-inset-top)] ...">
  {/* HUD Content */}
</div>
```

### D. WebSocket ve API Bağlantıları (`.env`)
iOS simülatörü veya cihazı `localhost`'a bağlanamaz.
1.  API URL'nizi yerel IP adresiniz (örn: `http://192.168.1.35:8080`) veya production URL (Railway) olarak güncelleyin.
2.  WebSocket bağlantısının koptuğunda otomatik tekrar bağlanma (reconnect) mantığının sağlam olduğundan emin olun (`hooks/useMarketData.ts`).

### E. Arka Plan Yönetimi (`hooks/useGameStatus.ts`)
Oyun alta alındığında (Background) çalışmayı durdurmalı, geri gelince devam etmelidir.

```typescript
import { App } from '@capacitor/app';

// Hook içine ekle:
useEffect(() => {
  const listener = App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      // Oyunu duraklat
      pauseGame();
    }
  });
  return () => { listener.remove(); };
}, []);
```

## 4. Build ve Çalıştırma

1.  **React Build:** `npm run build`
2.  **iOS Projesini Oluştur:** `npx cap add ios`
3.  **Senkronize Et:** `npx cap sync`
4.  **Xcode'da Aç:** `npx cap open ios`

## 5. Xcode Ayarları (Manuel)

Xcode açıldığında yapılması gerekenler:
-   **Signing:** Team kısmından Apple ID'nizi seçin.
-   **Orientation:** Sadece "Landscape Left" ve "Landscape Right" seçin (Oyun yatay ise).
-   **Status Bar:** "Hide status bar" seçeneğini işaretleyin.

## 6. App Icon ve Splash Screen

`cordova-res` veya `capacitor-assets` kullanarak ikonları otomatik oluşturun:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --ios
```

---
*Bu rehber, projenin Web tabanından Hybrid Mobil uygulamaya geçişi için temel adımları içerir.*
