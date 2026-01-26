---
name: code-quality-audit
description: Run comprehensive linting, complexity analysis, and strict mode checks.
---

# Code Quality Audit Skill

Bu skill, projenin kod kalitesini, stil standartlarını ve TypeScript strict mode uyumluluğunu denetler. `GENELKONTROL.md` Bölüm 2'ye dayanır.

## Usage

```
/code-quality-audit [scope]
```

**Scope:**
- `strict`: TypeScript strict mode ve `any` kullanımını kontrol et.
- `lint`: ESLint ve Prettier hatalarını kontrol et.
- `complexity`: Kod karmaşıklığını ve uzun fonksiyonları analiz et.
- `all`: Tüm kontrolleri çalıştır.

## Workflow

### 1. TypeScript Strict Mode & Any Check

`tsconfig.json` ayarlarının ve tip güvenliğinin kontrolü.

```bash
# Any kullanımını say (Hedef: <%5)
grep -r "any" services/ hooks/ specific_folder/ --include="*.ts" --include="*.tsx" | wc -l

# @ts-ignore kullanımını bul
grep -r "@ts-ignore\|@ts-expect-error" services/ hooks/
```

### 2. Lint & Format Check

Stil ve potansiyel hataların kontrolü.

```bash
# Lint hatalarını gör
npm run lint

# Prettier format kontrolü
npx prettier --check "src/**/*.{ts,tsx}"
```

**Auto-fix:**
```bash
npm run lint:fix
npm run format
```

### 3. Complexity Analysis

Bakımı zor olan kod parçalarını tespit et.

```bash
# (Eğer araç yüklü değilse manuel kontrol veya eslint complexity rule'u kullanılabilir)
# Eslint ile complexity raporu (eslint config'de complexity kuralı varsa)
npx eslint services/ --ext .ts,.tsx --rule '{"complexity": ["warn", 10]}'
```

**Manuel Kontrol Noktaları:**
- [ ] Fonksiyon satır sayısı > 50 mi?
- [ ] İçiçe `if/for` derinliği > 4 mü?
- [ ] Bir dosya > 300 satır mı? (İstisnalar olabilir ama bölünmesi iyidir).

### 4. Code Smell Detection

- **Duplikasyon**: Aynı kod bloğu birden fazla yerde var mı? `utils/` altına taşınmalı mı?
- **Magic Numbers**: Kod içinde anlamsız sayılar var mı? `constants.ts`'e taşınmalı.
- **Large Components**: Bir React bileşeni çok fazla prop alıyor veya çok fazla logic içeriyor mu?

## Reporting

Bulguları aşağıdaki formatta raporla:

```markdown
## 🛡️ Code Quality Report

### TypeScript Stats
- **Any Usages**: [Sayı]
- **Ignore Directives**: [Sayı]

### Linting
- **Errors**: [Sayı]
- **Warnings**: [Sayı]

### Complexity Issues
- `services/Examples.ts`: `complexFunction` (Depth: 5)
- `components/Game.tsx`: Large file (400 lines)

### Action Items
- [ ] Remove `any` from `types.ts`
- [ ] Split `Game.tsx` into sub-components
```
