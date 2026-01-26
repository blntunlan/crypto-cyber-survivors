---
description: Proje standartlarına uygun, yüksek kaliteli ve test edilebilir kod geliştirme iş akışı.
---

# Kapsamlı Kod Kalite ve Standart Geliştirme İş Akışı

Bu workflow, **Crypto Cyber Survivors** projesinin kod kalitesini sistemik olarak artırmak, teknik borcu azaltmak ve sürdürülebilirliği sağlamak için tasarlanmıştır. Workaround yerine **kalıcı çözümler** üretmeyi hedefler.

## 0. Temel İlke: Kesin Çözüm (No Workarounds)

Bu süreçte **geçiştirme (workaround) çözümler KESİNLİKLE yasaktır**.

-   ❌ **Yapma**: Test hatasını çözmek için testi silmek, yorum satırına almak (`skip`) veya `any` ile tip hatasını bastırmak.
-   ❌ **Yapma**: Karmaşık bir bug'ı çözmek yerine "şimdilik çalışsın" diye güvenilmez bir yamalı çözüm uygulamak.
-   ❌ **Yapma**: Lint/Type hatasını çözmek yerine `@ts-ignore` veya `eslint-disable` kullanmak (çok geçerli ve belgelenmiş bir sebep olmadıkça).
-   ✅ **Yap**: Kök nedeni (root cause) bul ve mimariye uygun, kalıcı bir çözüm üret.
-   ✅ **Yap**: Testi geçmek için kodun tasarımını gerekiyorsa refactor et.

## 1. Hazırlık ve Proje Durum Analizi

Kod tabanının mevcut durumunu projenin `GEMINI.md` kurallarına göre değerlendir.

1.  **Metrik Toplama**:
    ```bash
    npm run lint
    npm run test
    npx tsc --noEmit
    ```
2.  **Kapsam Belirleme**: Değişiklik yapılacak dosyaların bağımlılıklarını ve mevcut test kapsamını (`npm run test:coverage`) kontrol et.

## 2. Sistematik Dosya İnceleme Döngüsü

### A. Tip Güvenliği (TypeScript)
-   **No `any`**: Tüm `any` kullanımlarını spesifik interface veya type tanımları ile değiştir.
-   **Strict Types**: Fonksiyon parametreleri ve dönüş değerleri için tam tip tanımları kullan.
-   **Utility Types**: Gerektiğinde `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` kullan.

### B. İsimlendirme ve Standartlar
-   **Variables/Functions**: `camelCase`
-   **Classes/Components/Types**: `PascalCase`
-   **Constants**: `UPPER_SNAKE_CASE`
-   **Boolean**: `is`, `has`, `should` kullan.
-   **React**: Sadece fonksiyonel bileşenler kullan.

### C. Kod Temizliği (DRY/SOLID)
-   **Magic Numbers**: Tüm sabitleri `constants/` veya `config/` dosyalarına taşı.
-   **Dead Code**: Kullanılmayan import, değişken ve yoruma alınmış kodları sil.
-   **Refactoring**: 50-75 satırı geçen fonksiyonları anlamlı parçalara böl.

### D. Dokümantasyon (JSDoc)
-   **Public API**: Tüm public methodlar, interface'ler ve servisler JSDoc ile dokümante edilmelidir.
-   **Business Logic**: "Neden" sorusunu cevaplayan satır içi yorumlar ekle.

### E. Hata Yönetimi ve Loglama
-   **Try-Catch**: Async işlemler ve kritik parsing işlemleri mutlaka `try-catch` içinde olmalı.
-   **Logger**: `console.log` KESİNLİKLE yasaktır. Projedeki `Logger` servisini kullan.
-   **Error Context**: Loglara mutlaka anlamlı bir context objesi ekle.

### F. Test Kalitesi (Vitest)
-   **Mocking**: Bağımlılıkları (Audio, EventBus, Services) tip-güvenli şekilde mockla. `as any` mocklamadan kaçın.
-   **Edge Cases**: Sınır değerleri, null/undefined durumlarını ve hata senaryolarını mutlaka test et.
-   **Coverage**: Kritik iş mantığı için %100, genel için >%80 hedefle.

### G. Mimari ve Store (Zustand)
-   **Singletons**: Servislerin singleton pattern'e uygunluğunu kontrol et.
-   **EventBus**: Servisler arası iletişimde `EventBus.emit()` ve `EventBus.subscribe()` kullan.
-   **Zustand**: Global state yönetimi için Zustand store'larını (`stores/`) kullan.

## 3. Doğrulama ve Finalizasyon

1.  **Lint & Format**:
    // turbo
    ```bash
    npm run lint:fix
    npm run format
    ```
2.  **Type Check**:
    // turbo
    ```bash
    npx tsc --noEmit
    ```
3.  **Test & Build**:
    // turbo
    ```bash
    npm run test
    npm run build
    ```

## 4. Raporlama
Kullanıcıya yapılan iyileştirmeleri, eklenen testleri ve çözülen teknik borçları özetle.
