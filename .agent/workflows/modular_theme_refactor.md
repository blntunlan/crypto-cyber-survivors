---
description: Modüler Tema UI Sistemi Refactoring Workflow'u
---

Bu workflow, uygulamanın UI sistemini modüler ve temaya duyarlı (Themed Primitives) bir yapıya dönüştürmek için kullanılır.

## Faz 1: Altyapı Hazırlığı (Foundation)

1. **Konfigürasyon Dosyalarını Oluştur**
   - `config/themeVariants.ts` dosyasını oluştur.
   - Bu dosyanın içine `PANEL_VARIANTS`, `BUTTON_VARIANTS`, `INPUT_VARIANTS`, `TEXT_VARIANTS` gibi stil haritalarını tanımla.
   - **Think:** Retro ve Modern temaları için hangi Tailwind sınıflarının gerekli olduğunu `docs/modular_theme_ui_plan.md` dosyasından ve mevcut `index.css`/`config` dosyalarından analiz et.

2. **Dizin Yapısını Kur**
   // turbo
   - `components/themed/` klasörünü oluştur.

## Faz 2: Primitive Bileşenlerin Oluşturulması (Components)

3. **Temel Bileşenleri Kodla**
   - Aşağıdaki bileşenleri `components/themed/` içine oluştur:
     - `ThemedPanel.tsx`: Kapsayıcı paneller için.
     - `ThemedButton.tsx`: Butonlar için (variant desteği ile).
     - `ThemedText.tsx`: Doğru font ailesini seçen metin bileşeni.
     - `ThemedInput.tsx`: Input alanları için.
   - Her bileşenin `useTheme` hook'unu kullanarak `isRetro` durumuna eriştiğinden emin ol.
   - **Think:** Her bileşen için varsayılan prop'ları ve TypeScript interface'lerini düzgün tanımla.

4. **Lint Kontrolü**
   // turbo
   - `npm run lint:fix` çalıştırarak yeni dosyalardaki stil hatalarını düzelt.

## Faz 3: Refactoring (Implementation)

5. **Hedef Bileşenleri Belirle ve Dönüştür**
   - Mevcut ekranları sırayla güncelle. Her adımda tek bir dosyaya odaklan.
   
   **A. LeaderboardPanel.tsx**
   - Manuel `isRetro ? ... : ...` kontrollerini kaldır.
   - Yerine `<ThemedPanel>` ve `<ThemedText>` bileşenlerini kullan.
   
   **B. NicknameEntryScreen.tsx**
   - Karmaşık div yapılarını sadeleştir.
   - `<ThemedPanel>`, `<ThemedInput>` ve `<ThemedButton>` bileşenlerini entegre et.

   **C. MainMenu.tsx** (Opsiyonel / İkinci Tur)
   - Ana menü butonlarını `<ThemedButton>` ile değiştir.

6. **Görsel Doğrulama (Visual Check)**
   - Değişiklik yapılan her ekran için browser kontrolü yap.
   - Retro ve Cyberpunk modları arasında geçiş yaparak her iki temanın da doğru yüklendiğini teyit et.

## Faz 4: Doğrulama ve Temizlik (Verify)

7. **Testleri ve Build'i Kontrol Et**
   - Yapılan değişikliklerin mevcut testleri bozmadığından emin ol.
   // turbo
   - `npm run type-check` (veya `tsc --noEmit`) ile tip güvenliğini kontrol et.
   // turbo
   - `npm run lint` ile son kontrolleri yap.

8. **Dokümantasyon Güncellemesi**
   - Eğer yeni primitive'ler eklendi ise `docs/modular_theme_ui_plan.md` dosyasını güncelle.
