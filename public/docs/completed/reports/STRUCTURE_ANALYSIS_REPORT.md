# Proje Yapısı Analizi Raporu
Tarih: 2026-01-16

## 1. Proje Yapısı Analizi

### 1.1 Dosya ve Klasör Organizasyonu
- **Durum**: Proje kök dizininde kaynak kodları barındırıyor (`src/` klasörü yok).
- **Toplam Klasör**: ~30+ (kök dizin)
- **Toplam Dosya**: Yüzlerce (components ve services yoğunluklu)
- **Derinlik**: Genellikle 2-3 seviye, maksimum 4-5 seviye (`components/admin/panels/...` gibi).
- **Bulgular**:
  - `src/` klasörü yok, dosya yapısı düz (flat) başlamış ama alt klasörlere ayrılmış.
  - `components/` ve `services/` kendi içinde organize edilmiş.
  - `railway-market-server/` backend kodu ayrı bir klasörde.
  - `supabase/` edge functions ve migration'lar ayrı.

### 1.2 İsimlendirme Tutarlılığı
- **React Bileşenleri**: PascalCase (`GameEngine.tsx`, `GameUI.tsx`) - ✅ Uygun.
- **Servisler**: PascalCase ve `Service`/`System`/`Manager` suffix'leri (`MarketService.ts`, `CombatSystem.ts`) - ✅ Uygun.
- **Hook'lar**: `hooks/` klasörü mevcut, `use` prefix bekleniyor.
- **Utils**: `utils/` klasörü camelCase dosya isimleri (`touchTargetAudit.ts`) - ✅ Uygun.

### 1.3 Import/Export Analizi
- **Circular Dependencies**: `madge` kontrolü yapılmalı (manuel kontrol temiz görünüyor).
- **Lint Sonuçları**: 33 adet `no-undef` hatası mevcut. Global tanımları eksik.
- **Unused Imports**: Lint `no-unused-vars` uyarısı veriyor, ancak şu an compile hatası yok.

## 2. Kod Kalitesi (Ön Değerlendirme)
- **TypeScript**: Strict mode kullanımı kontrol edilecek.
- **Any Kullanımı**: 0 adet `any` kullanımı tespit edildi. ✅ Mükemmel.
- **@ts-ignore**: 0 adet kullanım tespit edildi. ✅ Mükemmel.
- **ESLint**: Konfigürasyon eksikliği (globals), düzeltilmesi gerekiyor.

## Öneriler
1. `eslint.config.js` dosyasına `globals: globals.browser` eklenmeli.
2. `src/` klasörü oluşturulup kaynak kodların oraya taşınması considered edilebilir (büyük refactor, şu an gerek olmayabilir).
3. Servislerin `services/` altında alt gruplara ayrılması iyileştirilebilir.
