---
description: Proje Geliştirme, Test ve Deployment Yaşam Döngüsü (QA Lifecycle)
---

Bu workflow, projenin 0'dan yayına (Production) kadar olan test tabanlı geliştirme sürecini tanımlar.

## 0️⃣ Hazırlık (Setup)
Yeni bir geliştirici veya yeni bir ortam için:
- `npm install` - Bağımlılıkları yükle.
- `npm run dev` - Geliştirme sunucusunu başlat (Vite).
- Vitest arka planda hazır bekler.

## 1️⃣ Geliştirme (Implementation)
- Yeni özellik (Feature) veya hata düzeltme (Fix) için ilgili katmanda kod yazılır:
  - Component, Hook, Service, Utils.
- **Kural:** Her katmanın kendi testi (`*.test.ts` veya `*.test.tsx`) olmalıdır.

## 2️⃣ Birim & Entegrasyon Testleri (Vitest)
🎯 **Amaç:** İş mantığı doğru mu? Katmanlar arası iletişim sağlıklı mı?
// turbo
- `npm run test`
- Vitest devreye girer.
- Mock'lar (`vi.mock`) kullanılır.
- DOM simülasyonu ve state güncellemeleri kontrol edilir.
- **Fail olursa:** Kod düzeltilmeden bir sonraki aşamaya geçilmez.

## 3️⃣ UI & Etkileşim Testleri (RTL)
🎯 **Amaç:** Kullanıcı ne görüyor ve ne yapıyor?
- Testing Library ile bileşenler render edilir.
- Kullanıcı etkileşimleri (`fireEvent`, `userEvent`) simüle edilir.
- **Network:** MSW (veya manuel mock'lar) üzerinden yakalanır.

## 4️⃣ Pre-Commit Güvenlik Ağı (Husky)
🎯 **Amaç:** Hatalı kodun repoya girmesini engellemek.
- `git commit` komutuyla tetiklenir:
  - `lint` kontrolü.
  - `format` kontrolü.
  - Hızlı birim testleri (Opsiyonel ama önerilir).

## 5️⃣ Pull Request & CI Pipeline
🎯 **Amaç:** Farklı ortamda doğrulama ve kod kalitesini koruma.
- GitHub Actions / Railway CI devreye girer:
  - `npm install`
  - `npm run lint`
  - `npm run test:coverage` (Threshold: %80)
- **Başarısız Pipeline:** PR merge edilemez.

## 6️⃣ E2E Testleri (Playwright)
🎯 **Amaç:** Gerçek kullanıcı senaryolarını canlıya yakın simüle etmek.
// turbo
- `npm run test:e2e`
- Playwright gerçek tarayıcıda tüm akışı (Login -> Game -> Shop -> Logout) test eder.

## 7️⃣ Deployment (Production)
🎯 **Amaç:** Doğrulanmış kodu kullanıcıya ulaştırmak.
// turbo
- `npm run deploy`
- Railway build & deploy süreci başlar.
- Dashboard üzerinden deployment statüsü takip edilir.

---

### 🔑 Kritik Prensipler
1. **Test = Güvenlik Ağı:** Testi olmayan kod "kırık" kabul edilir.
2. **Hızlı Geri Bildirim:** Unit testler saniyeler içinde bitmelidir.
3. **Davranış Odaklılık:** Testler implementasyonu değil, davranışı test etmelidir.
4. **CI/CD Birebirliği:** Lokal testler CI ile aynı kurallara tabi olmalıdır.
