# Skill: Fix Lint Errors (lintFix)
## Description
Projedeki ESLint ve Prettier hatalarını sistematik bir şekilde tespit eden ve düzelten yetenektir. Basit hataları otomatik düzeltir, karmaşık yapısal sorunları (unused variables, unnecessary conditions, explicit any) manuel müdahale rehberiyle çözer.

## Usage
Bu yeteneği, deployment öncesi veya kod kalitesini artırmak istediğinizde aktive edin.
Komut: "lint hatalarını düzelt" veya "lintFix sürecini uygula".

## Systematic Approach

### 1. Otomatik Düzeltme (Auto-Fix)
- `npm run lint:fix` komutunu çalıştırarak formatlama ve basit kural ihlallerini gider.
- Değişiklikleri doğrulamak için tekrar `npm run lint` çalıştır.

### 2. Yaygın Hataların Manuel Çözümü
- **'var' is defined but never used**: 
  - Değişken gerçekten gerekliyse adının başına `_` ekle (Örn: `_unused`).
  - Gerekli değilse tamamen sil.
- **Unnecessary optional chain / nullish coalescing**:
  - TypeScript tip tanımını kontrol et. Değişken `null` veya `undefined` olamıyorsa `?.` yerine `.` kullan veya `??` kısmını kaldır.
- **Unexpected any**:
  - Mümkünse spesifik interface veya type tanımla.
  - Geçici durumlarda `unknown` kullanmayı dene.
- **Unnecessary conditional**:
  - Kontrol edilen ifadenin tipini kontrol et. Her zaman truthy veya falsy ise kontrolü basitleştir veya kaldır.

### 3. Test Dosyaları ve E2E
- Test dosyalarındaki mock'ların `Logger.info: vi.fn()` gibi eksik metodları varsa bunları mock tanımlarına ekle.
- Kullanılmayan mock sonuçlarını (assigned but never used) ifade çağrısı olarak bırak (`await page.evaluate(...)` gibi).

## Workflow Steps
1. `npm run lint` ile hataları logla.
2. `npm run lint:fix` ile otomatik düzelebilenleri hallet.
3. Kalan hataları dosya bazlı oku ve yukarıdaki "Manuel Çözüm" rehberine göre fixle.
4. Son bir build alarak (`npm run build`) lint fixlerinin build'i kırıp kırmadığını doğrula.

## Global Fix Rules
- Test kapsama alanını bozma.
- Tip güvenliğini (type safety) "any" kullanarak bypass etme; bunun yerine `as` cast kullanıyorsan açıklama ekle.
- `console.log` yerine her zaman `Logger` servisini kullan.
