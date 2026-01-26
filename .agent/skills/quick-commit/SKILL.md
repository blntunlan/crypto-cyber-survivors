---
name: quick-commit
description: Lint, format, test, and commit changes with conventional commit format
---

# Quick Commit Skill

Değişiklikleri hızlıca kontrol edip commit'le.

## Usage

```
/quick-commit [commit-type] [message]
```

**Commit Types:**
- `feat:` - Yeni özellik
- `fix:` - Bug düzeltmesi  
- `docs:` - Dokümantasyon
- `test:` - Test ekleme/düzeltme
- `refactor:` - Refactoring
- `style:` - Kod formatı
- `perf:` - Performans iyileştirme
- `chore:` - Build/tool değişiklikleri

## Workflow

### 1. Değişiklikleri Kontrol Et

```bash
# turbo
git status
git diff --stat
```

### 2. Lint Kontrolü

```bash
# turbo
npm run lint
```

Hata varsa:
```bash
npm run lint:fix
```

### 3. Format Kontrolü

```bash
# turbo
npm run format
```

### 4. Testleri Çalıştır

```bash
# turbo
npm run test
```

### 5. Commit

```bash
git add .
git commit -m "[type]: [message]"
```

## Conventional Commit Format

```
<type>(<optional-scope>): <description>

[optional body]

[optional footer(s)]
```

### Örnekler:

```bash
git commit -m "feat(player): add dash animation"
git commit -m "fix(market): resolve WebSocket reconnection issue"
git commit -m "test(physics): add collision edge cases"
git commit -m "refactor(renderer): extract background to separate module"
```

## Pre-commit Hooks

Proje `.husky/` ile pre-commit hook kullanıyor:
- Lint kontrolü
- Format kontrolü

Hook'lar otomatik çalışır, manual check gerekmez ama başarısız olabilir.

## Notes

- `any` type kullanımından kaçın
- JSDoc yorumları ekle
- Test coverage'ı düşürme
