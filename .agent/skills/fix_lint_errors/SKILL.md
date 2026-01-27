# Skill: Systematic Lint Fixer (lintFixV2)

## Description
Projedeki lint hatalarını test odaklı, kayıt tabanlı ve parçalı (chunking) bir yaklaşımla temizleme yeteneğidir. Hataları toplu halde değil, dosyalanmış bir listeden sistematik olarak çözer.

## Workflow Steps

### 1. Test ve Kayıt (Test & Record)
- `npm run lint > lint_errors.log 2>&1` komutuyla tüm hataları bir dosyaya kaydet.
- Eğer dosya boşsa veya hata yoksa süreci sonlandır.

### 2. Parçalara Ayırma (Chunking)
- `lint_errors.log` dosyasındaki hataları dosya bazlı veya satır bazlı mantıksal parçalara ayır.
- Her seferinde bir "chunk" (örneğin bir dosya veya bir kural grubu) üzerine odaklan.

### 3. Uygulama ve Doğrulama (Fix & Verify)
- Belirlenen chunk içindeki hataları rehbere göre manuel veya otomatik fixle.
- Chunk bittiğinde tekrar `npm run lint` çalıştır ve güncel durumu yeni bir log dosyasına kaydet.
- Eğer ilgili chunk'taki hatalar giderildiyse bir sonraki chunk'a geç.

### 4. Finalizasyon
- Tüm hatalar bittiğinde (`lint_errors.log` temizlendiğinde) son bir genel test yap.
- Hata kalmadıysa log dosyalarını sil ve işi bitir.

## Manuel Çözüm Rehberi
- **Unused Vars**: Kullanılmıyorsa sil, gerekliyse `_` prefix ekle.
- **Unnecessary Conditionals**: Tip tanımlarını kontrol et, redundant kontrolleri kaldır.
- **Prefer Nullish Coalescing**: `||` yerine `??` kullan.
- **Optional Chaining**: Değişkenin `null/undefined` olma ihtimali yoksa `?.` yerine `.` kullan.

## Global Rules
- Test coverage'ı bozma.
- Asla "any" ekleyerek hata gizleme.
- Her fix sonrası ilgili dosyanın build olup olmadığını kontrol et.