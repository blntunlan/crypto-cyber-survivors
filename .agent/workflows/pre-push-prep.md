---
description: Git Push hazırlık ve gönderim workflowu - Test, Lint ve Commit yönetimi
---

Değişiklikleri GitHub'a pushlamadan önce bu adımları takip et:

## 1. Test ve Kalite Kontrol

1. **Birim Testleri Çalıştır**
   // turbo
   - `npm run test`
   - Tüm testlerin (unit & integration) YEŞİL olduğundan emin ol.
   - Eğer yeni bir özellik eklendiyse, ilgili test dosyasını oluştur veya güncelle.

2. **Lint Hatalarını ve Uyarılarını Temizle**
   // turbo
   - `npm run lint`
   - Sadece hataları (Error) değil, uyarıları (Warning) da minimize et.
   - Özellikle `unused-vars`, `missing-dependencies` ve `no-explicit-any` kurallarına dikkat et.

3. **Build Doğrulaması**
   // turbo
   - `npm run build`
   - Production build'in hatasız tamamlandığını onayla.

## 2. Git Hazırlığı

4. **Staging**
   - Yapılan tüm mantıklı değişiklikleri `git add` ile hazırla.
   - Gereksiz dosyaların (temp, log vb.) eklenmediğinden emin ol.

5. **Detaylı Commit Mesajı**
   - Yapılan değişiklikleri teknik detaylarıyla açıklayan bir mesaj yaz.
   - Format: `[Modül/Sistem]: Kısa özet \n\n - Detay 1 \n - Detay 2`

## 3. Push İşlemi

6. **Remote Sync**
   - Önce `git pull` ile son değişiklikleri al (conflict varsa çöz).
   
7. **Push**
   - `git push origin <branch-name>`

## 4. Post-Push Kontrol

8. **GitHub Actions (Varsa)**
   - Repo üzerindeki CI/CD pipeline'larını kontrol et.
   - Herhangi bir hata durumunda hemen müdahale et.
