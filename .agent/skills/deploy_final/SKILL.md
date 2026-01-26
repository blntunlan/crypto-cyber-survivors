# Skill: Deploy Final (deploySon)
## Description
Uçtan uca deployment sürecini yöneten en kapsamlı yetenektir. Proje durum analizinden başlayarak testlerin çalıştırılması, hataların otomatik düzeltilmesi, lint/build doğrulaması, git operasyonları ve Railway/Supabase deployment süreçlerini kapsar.

## Usage
Bu yeteneği, bir özelliği tamamladığınızda veya projeyi canlıya (production) almaya hazır olduğunuzda aktive edin. 
Komut: "deploy_final yeteneğini başlat" veya "deploySon sürecini uygula".

## Expertise & Phases

### 1. Durum Analizi (Analysis)
- Bağımlılıkları ve CLI araçlarını (npm, railway, supabase) kontrol et.
- Git durumunu (branch, uncommitted changes) analiz et.
- `package.json` scriptlerini ve test framework'ünü belirle.

### 2. Test ve Hata Düzeltme (Testing & Fix)
- Tüm testleri çalıştır (`npm run test` veya `test:coverage`).
- Başarısız testleri `fix_react_test` stratejileriyle otomatik düzelt.
- Tüm testler geçene kadar iteratif düzeltme döngüsünü işlet (max 3 deneme).

### 3. Kod Kalitesi ve Build (Quality & Build)
- Lint hatalarını kontrol et ve düzelt (`npm run lint -- --fix`).
- Production build al (`npm run build`).
- Paket boyutlarını ve build çıktılarını doğrula.

### 4. Git Operasyonları (Git Ops)
- Değişiklikleri kategorize et (fix, feat, build).
- Semantic commit kurallarına göre commit oluştur.
- Uzak sunucu (remote) kontrolü yap ve `push` işlemini gerçekleştir.

### 5. Deployment (GitHub & Supabase)
- **Supabase:** Yeni migration'ları kontrol et ve uygula (`supabase db push`). Edge function'ları deploy et.
- **Railway:** Manuel `railway up` tetikleme! Railway, GitHub push sonrası otomatik deploy yapar. 
- **Doğrulama:** Deploy durumunu `railway status` ile kontrol et. Deployment tamamlandığında URL'i doğrula, Health Check ve Smoke Testleri uygula.

### 6. İzleme ve Rollback (Monitoring)
- İlk 5 dakika logları (`railway logs`) izle.
- Kritik hata durumunda rollback prosedürünü başlat (`railway rollback`).

## Global Hata Stratejisi
- Bağlantı/Network hatalarında 3 kez exponential backoff ile tekrar dene.
- Mantıksal veya syntax hatalarında otomatik düzeltme yapılamıyorsa kullanıcıya rapor sun.

## Deployment Raporu Şablonu
Süreç sonunda şu özeti sun:
- Sabitlenen Testler: [Sayı]
- Çözülen Lint Sorunları: [Sayı]
- Build Durumu: [Başarılı/Başarısız]
- Push/Deploy Durumu: [Başarılı]
- Production URL: [URL]
