---
description: Yeni özellik geliştirme workflow'u - Keşfet, Planla, Kodla yaklaşımı
---

Yeni bir özellik geliştirirken şu adımları takip et:

## Faz 1: Keşfet (Explore)

1. **İlgili Dosyaları İncele**
   - Özelliğin etkileyeceği bileşenleri bul
   - Mevcut implementasyonları anla
   - Bağımlılıkları haritalandır

2. **Mevcut Testleri Kontrol Et**
   - İlgili test dosyalarını incele
   - Test coverage durumunu değerlendir

## Faz 2: Planla (Plan)

3. **Detaylı Plan Oluştur**
   - Değiştirilecek dosyaları listele
   - Her dosya için yapılacak değişiklikleri açıkla
   - Potansiyel riskleri belirle
   - **"Think hard"** veya **"think step by step"** kullanarak derin analiz yap

4. **Planı Kullanıcıyla Onayla**
   - Planı özet olarak sun
   - Kullanıcının onayını al
   - Gerekirse planı revize et

## Faz 3: Kodla (Code)

5. **Test Yaz (TDD)**
   - Önce testleri yaz
   - Testlerin başarısız olduğunu doğrula
   // turbo
   - `npm run test` ile testleri çalıştır

6. **Implementasyonu Yap**
   - Testleri geçecek kodu yaz
   - Küçük adımlarla ilerle
   - Her değişiklikten sonra testleri çalıştır

7. **Lint ve Format**
   // turbo
   - `npm run lint:fix` çalıştır
   // turbo
   - `npm run format` çalıştır

## Faz 4: Doğrula (Verify)

8. **Tüm Testleri Çalıştır**
   // turbo
   - `npm run test` ile unit testleri çalıştır
   - Tüm testlerin geçtiğini doğrula

9. **Değişiklikleri Özetle**
   - Yapılan değişiklikleri listele
   - Breaking change varsa belirt

10. **Commit ve Push**
    - Conventional commit formatı kullan: `feat: <açıklama>`
    - İlgili issue numarasını ekle (varsa)
