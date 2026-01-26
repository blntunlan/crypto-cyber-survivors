---
description: Yeni özellik geliştirme workflow'u - Keşfet, Planla, Kodla, Entegre Et yaklaşımı
---

Yeni bir özellik geliştirirken şu adımları takip et:

## Faz 1: Keşfet (Explore)

1. **İlgili Dosyaları İncele**
   - Özelliğin etkileyeceği bileşenleri bul
   - Mevcut implementasyonları anla
   - Bağımlılıkları haritalandır
   - `services/`, `components/`, `stores/` klasörlerini kontrol et

2. **Mevcut Testleri Kontrol Et**
   - İlgili test dosyalarını incele (`tests/` klasörü)
   - Test coverage durumunu değerlendir
   - E2E testlerini kontrol et (`e2e/` klasörü)

3. **Dokümantasyonu İncele**
   - `docs/` klasöründeki ilgili roadmap'leri oku
   - `GEMINI.md` kurallarını gözden geçir
   - Varsa ilgili TODO item'larını bul

## Faz 2: Planla (Plan)

4. **Detaylı Plan Oluştur**
   - Değiştirilecek dosyaları listele
   - Her dosya için yapılacak değişiklikleri açıkla
   - Potansiyel riskleri belirle
   - **"Think hard"** veya **"think step by step"** kullanarak derin analiz yap

5. **Mimari Kararları Belirle**
   - Yeni servis gerekiyor mu?
   - Zustand store değişikliği gerekiyor mu?
   - EventBus event'leri eklenmeli mi?
   - Type tanımları (`types/`) güncellenmeli mi?

6. **Planı Kullanıcıyla Onayla**
   - Planı özet olarak sun
   - Kullanıcının onayını al
   - Gerekirse planı revize et

## Faz 3: Kodla (Code)

7. **Type Tanımlarını Oluştur**
   - `types/` klasöründe gerekli interface/type tanımlarını yaz
   - JSDoc ile dokümante et

8. **Test Yaz (TDD)**
   - Önce unit testleri yaz (`tests/` klasörü)
   - Testlerin başarısız olduğunu doğrula
   // turbo
   - `npm run test -- --run` ile testleri çalıştır

9. **Implementasyonu Yap**
   - Testleri geçecek kodu yaz
   - Küçük adımlarla ilerle
   - GEMINI.md kurallarına uy:
     - Fonksiyonel bileşenler kullan
     - Singleton pattern uygula
     - EventBus ile servisler arası iletişim
     - `any` kullanımından kaçın

10. **Lint ve Format**
    // turbo
    - `npm run lint:fix` çalıştır
    // turbo
    - `npm run format` çalıştır

## Faz 4: Entegre Et (Integrate)

11. **Supabase Entegrasyonu (Gerekirse)**
    - Yeni tablo/view gerekiyorsa migration oluştur:
      - `supabase/migrations/` klasörüne SQL dosyası ekle
      - RLS politikalarını tanımla
    - Edge Function gerekiyorsa:
      - `supabase/functions/` klasöründe oluştur
      - CORS ayarlarını kontrol et
    // turbo
    - `npx supabase db diff` ile migration kontrol et

12. **Cloudflare Entegrasyonu (Gerekirse)**
    - Worker gerekiyorsa kod hazırla
    - KV namespace gerekiyorsa tanımla
    - MCP üzerinden test et:
      - `mcp_cloudflare_worker_list` ile mevcut worker'ları kontrol et
      - `mcp_cloudflare_worker_put` ile deploy et

13. **State Management**
    - Zustand store güncelle (`stores/`)
    - `gameReset` event'ine subscribe ol (gerekirse)
    - DevTools/Admin panel desteği ekle

## Faz 5: Doğrula (Verify)

14. **Unit Testleri Çalıştır**
    // turbo
    - `npm run test -- --run` ile unit testleri çalıştır
    - Tüm testlerin geçtiğini doğrula

15. **E2E Testleri Yaz ve Çalıştır**
    - `e2e/` klasörüne Playwright testi ekle
    - Mobil ve desktop viewport'larını test et
    // turbo
    - `npm run test:e2e` ile E2E testleri çalıştır

16. **Build Kontrolü**
    // turbo
    - `npm run build` ile production build al
    - Bundle size kontrolü yap

17. **Manuel Test**
    // turbo
    - `npm run dev` ile local server başlat
    - Özelliği manuel olarak test et
    - Mobil responsive kontrolü yap

## Faz 6: Tamamla (Finalize)

18. **Dokümantasyon Güncelle**
    - İlgili roadmap dosyalarını güncelle
    - Yeni servis/component için JSDoc ekle
    - `docs/` klasöründe gerekirse yeni doküman oluştur

19. **Değişiklikleri Özetle**
    - Yapılan değişiklikleri listele
    - Breaking change varsa belirt
    - Performans etkisini değerlendir

20. **Commit ve Push**
    - Conventional commit formatı kullan: `feat: <açıklama>`
    - İlgili issue numarasını ekle (varsa)
    - PR açıklaması hazırla

---

## 🔧 Hızlı Referans

### Sık Kullanılan Komutlar
```bash
npm run dev              # Dev server
npm run test -- --run    # Unit tests (tek seferlik)
npm run test:watch       # Unit tests (watch mode)
npm run test:e2e         # E2E tests
npm run lint:fix         # Lint + fix
npm run format           # Prettier format
npm run build            # Production build
```

### Dosya Yapısı Referansı
```
components/     → React bileşenleri
services/       → Singleton servisler
stores/         → Zustand state
types/          → TypeScript tanımları
tests/          → Vitest unit testler
e2e/            → Playwright E2E testler
supabase/       → Database migrations & functions
docs/           → Proje dokümantasyonu
```

### Cloudflare MCP Araçları
```
mcp_cloudflare_worker_list      → Mevcut worker'ları listele
mcp_cloudflare_worker_put       → Worker deploy et
mcp_cloudflare_worker_get       → Worker kodunu al
mcp_cloudflare_kv_list          → KV namespace listele
mcp_cloudflare_d1_list_databases → D1 database listele
```
