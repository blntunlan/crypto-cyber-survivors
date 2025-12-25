---
description: Deployment workflow - Railway ve Supabase deployment
---

Uygulamayı deploy etmek için şu adımları takip et:

## Pre-deployment Kontroller

1. **Testleri Çalıştır**
   // turbo
   - `npm run test` ile tüm testlerin geçtiğini doğrula
   
2. **Lint Kontrolü**
   // turbo
   - `npm run lint` çalıştır
   - Hata olmamalı

3. **Build Kontrolü**
   // turbo
   - `npm run build` ile production build al
   - Build başarılı olmalı

## Railway Deployment

4. **Railway Status Kontrol**
   - Railway CLI durumunu kontrol et
   - Doğru projeye bağlı olduğundan emin ol

5. **Deploy**
   - Railway'e deploy et
   - Build loglarını izle
   - Deployment tamamlanana kadar bekle

6. **Domain Kontrol**
   - Deployment URL'ini al
   - Uygulamanın çalıştığını doğrula

## Supabase Migrations (Gerekirse)

7. **Migration Kontrolü**
   - Yeni migration varsa Supabase'e push et
   - `supabase db push` komutu kullan

8. **Edge Functions (Gerekirse)**
   - Değişen edge function'ları deploy et
   - `supabase functions deploy <function-name>`

## Post-deployment

9. **Smoke Test**
   - Production URL'de temel fonksiyonları test et
   - Market bağlantısını kontrol et
   - Leaderboard'un çalıştığını doğrula

10. **Monitoring**
    - İlk birkaç dakika logları izle
    - Hata varsa rollback planı hazırla
