---
description: 
---

# 🔄 Claude Code Refactor Workflow
## Crypto Cyber Survivors Projesi İçin Kapsamlı Refactor Rehberi

> **Proje Teknoloji Stack:**  
> React 19 | TypeScript 5.8 | Vite 6 | Zustand 5 | Tailwind CSS 3 | Framer Motion 12  
> Vitest 4 | Playwright 1.57 | Supabase | Railway | WebSocket (Binance/Coinbase)

---

## 📋 İçindekiler
1. [Ön Hazırlık Aşaması](#1-ön-hazırlık-aşaması)
2. [Analiz ve Etki Alanı Belirleme](#2-analiz-ve-etki-alanı-belirleme)
3. [Risk Değerlendirmesi](#3-risk-değerlendirmesi)
4. [Refactor Stratejisi Planlama](#4-refactor-stratejisi-planlama)
5. [Test Altyapısı Hazırlama](#5-test-altyapısı-hazırlama)
6. [Kademeli Refactor Uygulama](#6-kademeli-refactor-uygulama)
7. [Doğrulama ve Test Etme](#7-doğrulama-ve-test-etme)
8. [Rollback Planı](#8-rollback-planı)
9. [Dokümantasyon](#9-dokümantasyon)

---

## 1. Ön Hazırlık Aşaması

### 1.1 Mevcut Durumu Snapshot Alma
```bash
# Git dalı oluştur
git checkout -b refactor/[feature-name]

# Tüm testlerin çalıştığını doğrula
npm run test
npm run test:e2e
npm run lint

# Test coverage raporunu kaydet
npm run test:coverage > coverage-before.txt

# Dependency tree'yi kaydet
npm list --all > dependencies-before.txt
```

### 1.2 Kritik Metrikleri Kaydet
- [ ] Current bundle size (Vite build output)
- [ ] Test pass rate (805 unit + 72 E2E)
- [ ] ESLint warnings/errors count (currently: 0/0)
- [ ] TypeScript compilation time
- [ ] Development server hot reload time
- [ ] Production build time

### 1.3 Proje Yapısını Haritalandır
```bash
# Proje yapısını görselleştir
tree -L 3 -I 'node_modules|dist|coverage' > project-structure.txt

# TypeScript dependency graph oluştur
npx madge --ts-config tsconfig.json --circular --extensions ts,tsx src/
```

---

## 2. Analiz ve Etki Alanı Belirleme

### 2.1 Refactor Hedefini Tanımla
**Soruları Yanıtla:**
- Hangi dosya/modül refactor edilecek?
- Refactor nedeni nedir? (performance, maintainability, bug fix, architecture)
- Hangi design pattern'lar uygulanacak?
- Beklenen sonuçlar neler?

### 2.2 Bağımlılık Analizi Yap
```bash
# Refactor edilecek dosyayı kim kullanıyor?
# Örnek: services/PhysicsSystem.ts refactor'u için

# 1. Import eden dosyaları bul
grep -r "from.*PhysicsSystem" src/ --include="*.ts" --include="*.tsx"

# 2. Type referanslarını bul
grep -r "PhysicsSystem" src/ --include="*.ts" --include="*.tsx"

# 3. Singleton instance çağrılarını bul
grep -r "PhysicsSystem.getInstance" src/ --include="*.ts" --include="*.tsx"
```

### 2.3 Kritik Sistem Bağımlılıklarını Belirle

**A. EventBus Bağımlılıkları**
- [ ] Hangi event'ler tetikleniyor?
- [ ] Hangi event'lere subscribe oluyor?
- [ ] Event payload type'ları değişecek mi?

**B. Zustand Store Entegrasyonları**
- [ ] gameStore'dan hangi state'ler okunuyor?
- [ ] Hangi action'lar dispatch ediliyor?
- [ ] State shape değişecek mi?

**C. React Hook Bağımlılıkları**
- [ ] Custom hook'lar etkilenecek mi?
- [ ] useEffect dependency array'leri güncellenecek mi?
- [ ] Context provider'lar değişecek mi?

**D. Canvas Rendering Pipeline**
- [ ] Renderer interface'leri etkilenecek mi?
- [ ] GameEngine render loop'u değişecek mi?
- [ ] FPS optimization'lar korunuyor mu?

**E. WebSocket Service Bağlantıları**
- [ ] MarketService integration korunuyor mu?
- [ ] Real-time data flow etkilenecek mi?
- [ ] Fallback mekanizması sağlam mı?

---

## 3. Risk Değerlendirmesi

### 3.1 Etki Matrisi Oluştur

| Risk Kategorisi | Etkilenen Sistemler | Kritiklik | Mitigasyon |
|-----------------|---------------------|-----------|------------|
| **Singleton Değişimi** | Tüm getInstance çağrıları | 🔴 Yüksek | Factory pattern + dependency injection |
| **Type Değişimi** | Import eden tüm dosyalar | 🟡 Orta | Generic type constraints + type guards |
| **Event Payload** | EventBus subscribers | 🔴 Yüksek | Versioned events + migration |
| **API Değişimi** | Public method kullanıcıları | 🟠 Orta-Yüksek | Deprecation warnings + adapter |
| **Performance** | Render loop, collision detection | 🔴 Yüksek | Before/after benchmarks |
| **State Shape** | Zustand selectors | 🟠 Orta-Yüksek | State migration utility |

### 3.2 Kritik Sistemleri Tanımla

**🚨 Dokunulmaması Gereken Hassas Alanlar:**
1. **Object Pooling Logic** (`PoolManager.ts`)
   - O(1) retrieval garantisini korumak zorunlu
   - Memory leak riski yüksek

2. **Spatial Grid Collision** (`SpatialGrid.ts`)
   - O(1) neighbor lookup kritik
   - 60 FPS garantisi gerekli

3. **WebSocket Failover** (`MarketService.ts`)
   - Binance → Coinbase fallback mantığı
   - Reconnection logic hassas

4. **Device Fingerprinting** (`DeviceProfiler.ts`)
   - Anti-cheat sistemi için kritik
   - Hash algorithm değişmemeli

5. **Supabase RLS Policies** (Backend)
   - Security breach riski
   - Dikkatli test gerekli

### 3.3 Rollback Stratejisi Hazırla
- [ ] Git tag oluştur: `git tag -a pre-refactor-v1.0 -m "Before [feature] refactor"`
- [ ] Branch backup: `git branch backup/pre-refactor-$(date +%Y%m%d)`
- [ ] Database migration rollback script hazırla (eğer backend değişiyorsa)

---

## 4. Refactor Stratejisi Planlama

### 4.1 Refactor Metodolojisi Seç

#### **A. Strangler Fig Pattern** (Büyük Değişimler İçin)
```
Adım 1: Yeni implementasyon paralelde oluştur
Adım 2: Adapter layer ekle (eski + yeni birlikte çalışsın)
Adım 3: Kademeli olarak eski kodu yeni koda yönlendir
Adım 4: Eski kodu sil
```

**Uygun Olduğu Durumlar:**
- Singleton service'lerin mimari değişimi
- Rendering pipeline refactor'u
- State management değişimi

#### **B. Branch by Abstraction** (Paralel Geliştirme)
```
Adım 1: Ortak interface/abstract class tanımla
Adım 2: Eski implementasyonu interface'e uyarla
Adım 3: Yeni implementasyon oluştur (aynı interface)
Adım 4: Feature flag ile yeni implementasyonu aç
Adım 5: Testlerden geçince eski kodu sil
```

**Uygun Olduğu Durumlar:**
- Collision detection algorithm değişimi
- Audio system refactor'u
- Enemy AI behavior değişimi

#### **C. Preparatory Refactoring** (Küçük İyileştirmeler)
```
Adım 1: Kodu anlaşılır hale getir (extract method, rename)
Adım 2: Test coverage artır
Adım 3: Asıl değişikliği yap
```

**Uygun Olduğu Durumlar:**
- Hook optimizasyonları
- Component prop drilling
- Utility function improvements

### 4.2 Kademeli Değişim Planı Oluştur

**Örnek: PhysicsSystem.ts Refactor'u**
```
Phase 1: Interface Extraction (1 gün)
├─ ICollisionSystem interface tanımla
├─ PhysicsSystem bu interface'i implement etsin
└─ Type export'ları güncelle

Phase 2: Dependency Injection (2 gün)
├─ Factory method ekle: createPhysicsSystem()
├─ getInstance() deprecated olarak işaretle
└─ Tüm çağrıları yavaşça migrate et

Phase 3: Internal Refactor (3 gün)
├─ Spatial grid logic'i ayır (SpatialGridService)
├─ Collision detection logic'i ayır (CollisionDetector)
└─ PhysicsSystem sadece orchestrator olsun

Phase 4: Testing & Cleanup (1 gün)
├─ Unit test'leri güncelle
├─ E2E test'leri çalıştır
└─ Deprecated code'u sil
```

---

## 5. Test Altyapısı Hazırlama

### 5.1 Mevcut Test Coverage'ı Analiz Et
```bash
# Refactor edilecek dosya için coverage kontrol
npm run test:coverage -- src/services/PhysicsSystem.test.ts

# Eksik test case'leri belirle
# - Edge cases
# - Error scenarios
# - Integration points
```

### 5.2 Ek Test Senaryoları Ekle

**Test Kategorileri:**

#### A. Unit Tests (Vitest)
- [ ] Tüm public method'ların test edildiğini doğrula
- [ ] Edge case'ler (null, undefined, empty array, vb.)
- [ ] Error handling scenarios
- [ ] Type safety tests (TypeScript compile-time checks)

#### B. Integration Tests
- [ ] EventBus ile entegrasyon
- [ ] Zustand store ile entegrasyon
- [ ] Singleton lifecycle tests
- [ ] Performance benchmarks

#### C. E2E Tests (Playwright)
- [ ] Kullanıcı senaryolarını kapsayan akışlar
- [ ] Mobile touch control tests
- [ ] Network error scenarios
- [ ] Visual regression tests

### 5.3 Performance Benchmark Hazırla
```typescript
// Örnek: Collision detection benchmark

describe('PhysicsSystem Performance', () => {
  it('should handle 1000 entities in <16ms (60 FPS)', () => {
    const start = performance.now();
    
    // Collision detection çalıştır
    physicsSystem.update(deltaTime);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(16); // 60 FPS = 16.67ms per frame
  });
});
```

### 5.4 Snapshot Testing Ekle (Gerekirse)
```typescript
// Component output'unun değişmediğini garanti et
it('should match snapshot', () => {
  const { container } = render(<GameHUD />);
  expect(container).toMatchSnapshot();
});
```

---

## 6. Kademeli Refactor Uygulama

### 6.1 Atomic Commit Stratejisi

**Her commit şunları içermeli:**
1. Tek bir mantıksal değişiklik
2. Geçen tüm testler
3. Açıklayıcı commit message

**Commit Message Formatı:**
```
refactor(scope): short description

- Detailed change #1
- Detailed change #2
- Breaking changes (if any)

Refs: #issue-number
```

### 6.2 Adım Adım Refactor Süreci

#### **Adım 1: Type Definitions'ı Güncelle**
```bash
# types/ klasöründeki ilgili type'ları güncelle
# Example: events.ts, BuffGem.ts, DeviceProfile.ts

# TypeScript compiler'dan hata alınmadığını doğrula
npm run type-check
```

**Checklist:**
- [ ] Yeni type'lar ekle
- [ ] Deprecated type'ları işaretle
- [ ] Generic type constraints ekle (gerekirse)
- [ ] JSDoc comments güncelle

#### **Adım 2: Interface/Abstract Class Oluştur**
```bash
# Abstraction layer ekle
# Mevcut kod ve yeni kod arasında köprü

# Örnek: IPhysicsSystem interface
```

**Checklist:**
- [ ] Public API'yi tanımla
- [ ] Method signatures
- [ ] Event contracts
- [ ] Type parameters

#### **Adım 3: Eski Kodu Adapter'a Sar**
```bash
# Eski implementasyonu yeni interface'e uyarla
# Breaking change olmadan geçiş sağla
```

**Checklist:**
- [ ] Legacy adapter class oluştur
- [ ] Eski davranışı koru
- [ ] Deprecation warnings ekle
- [ ] Migration guide yaz

#### **Adım 4: Yeni Implementasyonu Yaz**
```bash
# Yeni kod, yeni interface'i implement etsin
# Test-driven development (TDD) yaklaşımı kullan
```

**TDD Cycle:**
1. Kırmızı: Test yaz (başarısız olmalı)
2. Yeşil: Minimum kod yaz (test geçsin)
3. Refactor: Kodu temizle (test geçmeye devam etsin)

**Checklist:**
- [ ] Unit test'leri yaz
- [ ] Implementation yaz
- [ ] Edge case'leri handle et
- [ ] Error handling ekle
- [ ] Performance optimize et

#### **Adım 5: Feature Flag ile Yeni Kodu Aç**
```typescript
// config/features.ts
export const FEATURES = {
  USE_NEW_PHYSICS_SYSTEM: import.meta.env.DEV, // Önce sadece dev'de
} as const;

// services/PhysicsSystemFactory.ts
export function createPhysicsSystem(): IPhysicsSystem {
  if (FEATURES.USE_NEW_PHYSICS_SYSTEM) {
    return new NewPhysicsSystem();
  }
  return new LegacyPhysicsSystemAdapter();
}
```

**Checklist:**
- [ ] Feature flag ekle
- [ ] Environment variable ile kontrol et
- [ ] Metrics/logging ekle (hangi implementation kullanılıyor)
- [ ] A/B test mekanizması (opsiyonel)

#### **Adım 6: Kademeli Migration**
```bash
# Dosya dosya, yeni implementasyona geçir
# Her dosya için:
# 1. Import'ları güncelle
# 2. Test'leri çalıştır
# 3. Commit yap
```

**Migration Önceliği:**
1. Leaf nodes (bağımlılığı olmayan dosyalar)
2. Service layer
3. Hook layer
4. Component layer
5. Entry points (main.tsx, GameEngine.tsx)

**Checklist:**
- [ ] Migration script yaz (find & replace)
- [ ] Dosya gruplarına ayır (batch migration)
- [ ] Her batch sonrası test çalıştır
- [ ] Rollback test et

#### **Adım 7: Old Code Cleanup**
```bash
# Eski kod artık kullanılmıyorsa sil
# Dikkatli ol: dependency graph kontrol et!

# Kullanılmayan import'ları bul
npx depcheck

# Dead code detection
npx ts-prune
```

**Checklist:**
- [ ] Deprecated warnings'i gerçek error'a dönüştür
- [ ] Legacy adapter'ı sil
- [ ] Eski test'leri sil/güncelle
- [ ] Dokümantasyonu güncelle

---

## 7. Doğrulama ve Test Etme

### 7.1 Test Suite'i Çalıştır

**Sıralı Test Adımları:**
```bash
# 1. Type check
npm run type-check

# 2. Lint check
npm run lint

# 3. Unit tests (805 passing)
npm run test

# 4. Coverage check (80%+ hedef)
npm run test:coverage

# 5. E2E tests (72 p