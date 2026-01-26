---
description: Proje kod kalitesini sistemik olarak artırmak, teknik borcu azaltmak ve sürdürülebilirliği sağlamak için tasarlanmış kapsamlı iş akışı.
---

# Kapsamlı Kod Kalite ve Standart Geliştirme İş Akışı

Bu workflow, **Crypto Cyber Survivors** projesinde kod kalitesini sistemik olarak artırmak, teknik borcu azaltmak ve sürdürülebilirliği sağlamak için tasarlanmıştır. Workaround yerine **kalıcı çözümler** üretmeyi hedefler.

## 0. Temel İlke: Kesin Çözüm (No Workarounds)

Bu süreçte **geçiştirme (workaround) çözümler KESİNLİKLE yasaktır**.

-   ❌ **Yapma**: Test hatasını çözmek için testi silmek, yorum satırına almak (`skip`) veya `any` ile tip hatasını bastırmak.
-   ❌ **Yapma**: Karmaşık bir bug'ı çözmek yerine "şimdilik çalışsın" diye güvenilmez bir yamalı çözüm uygulamak.
-   ❌ **Yapma**: Lint/Type hatasını çözmek yerine `@ts-ignore` veya `eslint-disable` kullanmak (çok geçerli ve belgelenmiş bir sebep olmadıkça).
-   ✅ **Yap**: Kök nedeni (root cause) bul ve mimariye uygun, kalıcı bir çözüm üret.
-   ✅ **Yap**: Testi geçmek için kodun tasarımını gerekiyorsa refactor et.

## 1. Hazırlık ve Proje Durum Analizi

Kod tabanının mevcut durumunu objektif olarak değerlendir ve baseline oluştur.

1.  **Proje Yapısı Haritalaması**:
    ```bash
    dir
    ```
2.  **Kalite Metrikleri Toplama**:
    // turbo
    ```bash
    npm run lint
    npm run test
    npx tsc --noEmit
    ```
3.  **Bağımlılık Sağlığı**:
    ```bash
    npm outdated
    ```

## 2. Sistematik Dosya İnceleme Döngüsü

Her dosya için aşağıdaki katmanları sırayla uygula. Workaround yerine **kalıcı çözümler** üret.

### A. Tip Güvenliği ve TypeScript Standartları
1.  **`any` Kullanımlarını Elimine Et**: Her `any` yerine uygun interface veya type tanımla.
2.  **Mock Stratejisi**: Testlerde `as any` yerine tip-güvenli mock factory'ler veya `Partial<T>` kullan.
3.  **Eksik Tip Tanımları**: Tüm fonksiyon parametre ve dönüş tiplerini açıkça belirt.
4.  **Strict Mode**: `tsconfig.json` dosyasındaki `strict: true` kurallarına tam uyum sağla.

### B. İsimlendirme ve Standartlar
1.  **Konvansiyon**: Değişken/Fonksiyon için `camelCase`, Sınıf/Bileşen/Tip için `PascalCase`, Sabitler için `UPPER_SNAKE_CASE`.
2.  **React**: Sadece fonksiyonel bileşenler ve custom hook'lar kullan.
3.  **Prefixes**: Boolean için `is/has/should`, event handler için `handle`.

### C. Kod Temizliği ve Refactoring
1.  **Dead Code**: Kullanılmayan import, değişken ve yoruma alınmış kodları sil.
2.  **Magic Numbers**: Tüm hardcoded değerleri `constants/` veya `config/` dosyalarına taşı.
3.  **DRY**: Tekrarlanan logic'leri utility fonksiyonlara veya custom hook'lara çıkar.
4.  **Basitlik**: Uzun fonksiyonları (<50 satır) ve nested condition'ları refactor et.

### D. Dokümantasyon Standartları (JSDoc)
1.  **Dosya Başlığı**: `@fileoverview` ve `@module` tagları ile dosya amacını açıkla.
2.  **JSDoc**: Public API'leri `@param`, `@returns` tagları ile dokümante et.
3.  **Why, not What**: Kodun ne yaptığını değil, neden yapıldığını ve iş mantığı kararlarını belge.

### E. Hata Yönetimi ve Observability
1.  **Try-Catch**: Async işlemler ve JSON parse gibi riskli işlemleri mutlaka `try-catch` içine al ve hatayı `Logger` ile kaydet.
2.  **Logger**: `console.log` yasaktır. `services/Logger.ts` servisini kullan.
3.  **Defensive Programming**: Null/undefined kontrollerini (`?.`, `??`) ve input validation işlemlerini yap.

### F. Test Kalitesi ve Kapsama (Vitest)
1.  **Coverage**: Kritik iş mantığı için %100 coverage hedefle.
2.  **Scenarios**: Happy path, edge cases ve error senaryolarını test et.
3.  **Clean Mocks**: Bağımlılıkları tip-güvenli şekilde `vi.mock` ve `vi.stubGlobal` ile yönet.

### G. Mimari ve Tasarım
1.  **Zustand**: Global state için `stores/` altındaki store'ları kullan.
2.  **EventBus**: Servisler arası iletişimde `services/EventBus.ts` kullan.
3.  **SOLID**: SRP (Tek Sorumluluk) ve Dependency Injection prensiplerine uyun.

## 3. Otomatik Kontroller ve Tooling

1.  **Lint & Format**: `npm run lint:fix` ve `npm run format`.
2.  **Husky & Lint-Staged**: Commmit öncesi otomatik kontrollerin devrede olduğunu doğrula.

## 4. Doğrulama ve Finalizasyon

1.  **Final Checks**: Tüm testlerin (`npm run test`) ve build'in (`npm run build`) başarılı olduğundan emin ol.
2.  **Runtime Check**: `npm run dev` ile kritik kullanıcı akışlarını manuel doğrula.

## 5. Detaylı Raporlama
Kullanıcıya aşağıdaki başlıkları içeren şeffaf bir rapor sun:
-   **Özet İstatistikler**: İncelenen dosya sayısı, giderilen lint/type hataları.
-   **Kategori Bazlı Değişiklikler**: Tip güvenliği, kod temizliği, test artışı.
-   **Kritik Bulgular**: Çözülen performans sızıntıları veya güvenlik riskleri.
-   **Teknik Borç (Next Steps)**: Çözülmesi gereken uzun vadeli TODO listesi.
