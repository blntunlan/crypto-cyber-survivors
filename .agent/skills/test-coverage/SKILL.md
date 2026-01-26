---
name: test-coverage
description: Run tests with coverage report, identify gaps, and suggest test improvements
---

# Test Coverage Analysis Skill

Bu skill, test coverage'ı analiz eder ve improvement önerileri sunar.

## Usage

```
/test-coverage [component-name]
```

## Workflow

### 1. Coverage Raporu Al

```bash
# turbo
npm run test:coverage
```

### 2. Coverage Sonuçlarını Analiz Et

Coverage raporu `coverage/` klasöründe oluşturulur:
- `coverage/lcov-report/index.html` - HTML raporu
- `coverage/coverage-summary.json` - Summary

### 3. Kritik Dosyaları Belirle

Düşük coverage olan dosyaları tespit et:
- **< 50%**: Kritik - Mutlaka test yazılmalı
- **50-70%**: Orta - Öncelik verilmeli
- **70-80%**: İyi - Geliştirilebilir
- **> 80%**: Hedef karşılanmış

### 4. Test Önerileri Sun

Her düşük coverage'lı dosya için:
1. Hangi fonksiyonların test edilmediğini belirle
2. Edge case'leri listele
3. Mock'lanması gereken dependency'leri belirle
4. Örnek test kodu öner

## Test Dosyası Konumları

- Unit testler: `tests/` veya `*.test.ts`
- E2E testler: `e2e/`
- Test config: `vitest.config.ts`

## Output Format

```markdown
## 📊 Coverage Özeti

| Metric     | Coverage | Hedef |
|------------|----------|-------|
| Lines      | XX%      | 80%   |
| Branches   | XX%      | 75%   |
| Functions  | XX%      | 80%   |
| Statements | XX%      | 80%   |

## ⚠️ Düşük Coverage Dosyaları

### services/ExampleService.ts (45%)
- [ ] `initializeService()` - test yok
- [ ] `handleError()` - edge cases eksik

## 💡 Önerilen Testler

[Test örnekleri...]
```

## Integration

Diğer workflow'larla birlikte kullanılabilir:
- `/code-review` sonrası test eksikliklerini görmek için
- `/fix-bug` sonrası yeni testlerin coverage etkisini görmek için
