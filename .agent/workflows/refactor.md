---
description: Refactoring workflow - Güvenli kod yeniden yapılandırma
---

Kod refactoring yaparken şu adımları takip et:

## Faz 1: Hazırlık

1. **Mevcut Testleri Çalıştır**
   // turbo
   - `npm run test` ile tüm testlerin geçtiğini doğrula
   - Bu baseline olacak

2. **Refactor Kapsamını Belirle**
   - Hangi dosyalar/fonksiyonlar etkilenecek?
   - Breaking change olacak mı?
   - Bağımlı bileşenleri listele

3. **Test Coverage Kontrol**
   // turbo
   - `npm run test:coverage` çalıştır
   - Refactor edilecek kodun test coverage'ını kontrol et
   - Düşükse önce test yaz

## Faz 2: Güvenli Refactoring

4. **Küçük Adımlarla İlerle**
   - Her adımda sadece bir değişiklik yap
   - Her değişiklikten sonra testleri çalıştır
   - Testler geçene kadar bir sonraki adıma geçme

5. **SOLID Prensiplerini Uygula**
   - Single Responsibility: Her sınıf/fonksiyon tek iş yapsın
   - Open/Closed: Extension'a açık, modification'a kapalı
   - Liskov Substitution: Alt sınıflar üst sınıfın yerine geçebilmeli
   - Interface Segregation: Küçük, özel interface'ler
   - Dependency Inversion: Abstraction'lara bağımlı ol

6. **DRY - Don't Repeat Yourself**
   - Tekrarlayan kodu tespit et
   - Ortak fonksiyon/hook/utility'ye çıkar
   - Tekrarı ortadan kaldır

## Faz 3: Doğrulama

7. **Tüm Testleri Çalıştır**
   // turbo
   - `npm run test` ile testlerin hala geçtiğini doğrula

8. **Lint ve Format**
   // turbo
   - `npm run lint:fix` çalıştır
   // turbo
   - `npm run format` çalıştır

9. **Performans Kontrolü**
   - Refactoring performansı olumsuz etkilemedi mi?
   - Bundle size değişti mi?

## Faz 4: Dokümantasyon

10. **JSDoc Güncelle**
    - Değişen fonksiyonların JSDoc'larını güncelle
    - Yeni fonksiyonlara JSDoc ekle

11. **Commit**
    - Conventional commit: `refactor: <açıklama>`
    - Neyin değiştiğini ve neden refactor edildiğini açıkla
