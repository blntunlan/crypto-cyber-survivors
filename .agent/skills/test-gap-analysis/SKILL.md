---
name: test-gap-analysis
description: Identify critical code paths missing tests, focusing on negative scenarios and edge cases.
---

# Test Gap Analysis Skill

Bu skill, sadece test kapsama oranına (coverage %) bakmak yerine, *ne tür* testlerin eksik olduğunu (Gap Analysis) analiz eder. Özellikle "Happy Path" dışındaki hata durumlarının ve sınır değerlerin test edilip edilmediğine odaklanır.

## Usage

```
/test-gap-analysis [service_or_component]
```

## Workflow

### 1. Negative Testing Check

Hata senaryolarının test edilip edilmediğini kontrol et. Test dosyalarında `throw`, `reject`, `error`, `fail` gibi anahtar kelimeleri ara.

```bash
# Negatif test sayısını ve dosyalarını listele
grep -rE "toThrow|rejects|toBeNull|toBeUndefined" tests/
```

**Kural:** Her kritik fonksiyon için en az 1 adet "Error Case" (Hata Durumu) testi olmalıdır.

### 2. Mocking & Isolation

Testlerin gerçekten izole olup olmadığını kontrol et. `vi.mock` veya `msw` kullanımlarını doğrula.

```bash
# Mock kullanımlarını kontrol et
grep -r "vi.mock" tests/
grep -r "http.get" tests/ # MSW handlers
```

**Kural:** Unit testler veritabanına veya gerçek API'ye gitmemeli, mock kullanmalıdır. Integration testler MSW kullanmalıdır.

### 3. Critical Path Verification

Kritik iş mantığı içeren dosyaların (Servisler, Hook'lar) test dosyasının varlığını kontrol et.

```bash
# Servisler için test dosyası var mı?
ls services/*.ts
ls tests/services/*.test.ts
```

**Eylem:** Eğer `services/X.ts` var ama `tests/X.test.ts` yoksa, bu bir **CRITICAL GAP**'tir.

### 4. Edge Case Scanning

Sınır değerlerin (0, -1, MaxInt, Empty Array) testlerde kullanılıp kullanılmadığına bak.

```bash
# Test verilerinde sınır değerleri ara
grep -rE "Expected.*(0|-1|\[\])" tests/
```

## Reporting

### 🎯 Missing Test Coverage
- **Untested Services**: [Service Name] (Dosya var, test yok)
- **Untested Components**: [Component Name]

### 🧪 Quality Gaps
- **Happy Path Only**: [Test File] (Hata senaryosu testi yok)
- **Integration Leaks**: [Test File] (Network çağrısı yapıyor olabilir)

### 📝 Recommendation
- [ ] Create `tests/CombatSystem.test.ts` covering negative damage.
- [ ] Add `empty array` test case to `PoolManager.test.ts`.
