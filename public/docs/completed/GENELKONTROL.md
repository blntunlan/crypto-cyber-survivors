# 🎮 Crypto Cyber Survivors - Kapsamlı Proje İnceleme ve İyileştirme Workflow'u

> Claude Code için adım adım proje elden geçirme rehberi

---

## 📋 İçindekiler

1. [Proje Yapısı Analizi](#1-proje-yapısı-analizi)
2. [Kod Kalitesi ve Standartlar](#2-kod-kalitesi-ve-standartlar)
3. [Performans Optimizasyonu](#3-performans-optimizasyonu)
4. [Test Kapsamı ve Kalitesi](#4-test-kapsamı-ve-kalitesi)
5. [Güvenlik Denetimi](#5-güvenlik-denetimi)
6. [Mimari İyileştirme](#6-mimari-iyileştirme)
7. [Mobil Optimizasyon](#7-mobil-optimizasyon)
8. [WebSocket ve API Entegrasyonları](#8-websocket-ve-api-entegrasyonları)
9. [State Management İncelemesi](#9-state-management-i̇ncelemesi)
10. [Dokümantasyon ve Bakım](#10-dokümantasyon-ve-bakım)

---

## 1. Proje Yapısı Analizi

### 1.1 Dosya ve Klasör Organizasyonu
**Hedef:** Projedeki tüm dosyaların doğru konumda olduğunu ve tutarlı bir yapı izlendiğini doğrulamak

**Adımlar:**
1. Kök dizindeki tüm klasörleri listele ve amaçlarını doğrula
2. `src/` klasörü altındaki organizasyonu incele
3. Her klasörün tek bir sorumluluk alanına sahip olduğunu kontrol et (Single Responsibility)
4. Duplikasyon veya yanlış yerleştirilmiş dosyaları tespit et
5. Klasör derinliğinin aşırı olmadığını kontrol et (max 4-5 seviye)

**Kontrol Listesi:**
- [ ] `components/` klasörü alt klasörlere ayrılmış mı? (UI, Game, Screens vs.)
- [ ] `services/` klasöründeki her servis bağımsız mı?
- [ ] `utils/` klasöründe iş mantığı var mı? (olmamalı)
- [ ] `types/` dosyaları ilgili modüllerle birlikte mi?
- [ ] Test dosyaları kaynak dosyalarla aynı yapıda organize edilmiş mi?

**Çıktı Formatı:**
```markdown
## Proje Yapısı Analizi Raporu
- Toplam Klasör: X
- Toplam Dosya: Y
- Ortalama Klasör Derinliği: Z
- Tespit Edilen Sorunlar: [liste]
- Öneriler: [liste]
```

---

### 1.2 İsimlendirme Tutarlılığı
**Hedef:** Tüm dosya, klasör ve bileşen isimlerinin tutarlı olduğunu doğrulamak

**Adımlar:**
1. React bileşenlerinin PascalCase kullandığını kontrol et
2. Utility fonksiyonlarının camelCase kullandığını kontrol et
3. Constants ve config dosyalarının uygun isimlendirmeye sahip olduğunu kontrol et
4. Hook dosyalarının `use` prefix'i ile başladığını doğrula
5. Service dosyalarının `Service` veya `Manager` suffix'i kullandığını kontrol et

**Kontrol Listesi:**
- [ ] Bileşen dosya isimleri bileşen isimleriyle eşleşiyor mu?
- [ ] Index dosyaları doğru kullanılıyor mu?
- [ ] Test dosyaları `.test.tsx` veya `.spec.ts` uzantısına sahip mi?
- [ ] Tip tanımları `types/` klasöründe merkezi mi?

---

### 1.3 Import/Export Yapısı
**Hedef:** Barrel exports, circular dependencies ve gereksiz import'ları tespit etmek

**Adımlar:**
1. Circular dependency analizi yap
2. Unused imports tespit et
3. Barrel export kullanımını incele
4. Relative vs absolute import tercihlerini kontrol et
5. Tree-shaking'e uygunluğu doğrula

**Kontrol Komutları:**
```bash
# Circular dependency kontrolü
npx madge --circular --extensions ts,tsx src/

# Unused dependencies
npx depcheck

# Import analizi
npx eslint src/ --ext .ts,.tsx
```

**Çıktı Formatı:**
```markdown
## Import/Export Analizi
- Circular Dependencies: [liste veya "Yok"]
- Unused Imports: [sayı]
- Barrel Export Kullanımı: [Uygun/Optimize Edilmeli]
- Tree-shaking Uyumluluğu: [Evet/Hayır]
```

---

## 2. Kod Kalitesi ve Standartlar

### 2.1 TypeScript Strict Mode Kontrolü
**Hedef:** TypeScript'in strict mode özelliklerinin tam olarak kullanıldığını doğrulamak

**Adımlar:**
1. `tsconfig.json` dosyasını incele ve strict mode ayarlarını kontrol et
2. `any` kullanımlarını tespit et ve gerekçelerini değerlendir
3. `@ts-ignore` ve `@ts-expect-error` yorumlarını incele
4. Tip güvenliği olmayan kod bloklarını tespit et
5. Generic kullanımlarını optimize et

**Kontrol Listesi:**
- [ ] `strict: true` aktif mi?
- [ ] `noImplicitAny: true` aktif mi?
- [ ] `strictNullChecks: true` aktif mi?
- [ ] `strictFunctionTypes: true` aktif mi?
- [ ] `any` kullanımı %5'in altında mı?

**Analiz Komutu:**
```bash
# Any kullanımını say
grep -r "any" src/ --include="*.ts" --include="*.tsx" | wc -l

# ts-ignore kullanımını tespit et
grep -r "@ts-ignore\|@ts-expect-error" src/
```

---

### 2.2 ESLint ve Prettier Uyumluluğu
**Hedef:** Kod stilinin tutarlı olduğunu ve best practice'lere uyulduğunu doğrulamak

**Adımlar:**
1. ESLint konfigürasyonunu incele
2. Prettier konfigürasyonunu kontrol et
3. Tüm dosyaları lint et
4. Auto-fix edilebilir sorunları düzelt
5. Manuel müdahale gerektiren sorunları listele

**Kontrol Komutları:**
```bash
# ESLint çalıştır
npm run lint

# Prettier kontrolü
npx prettier --check "src/**/*.{ts,tsx}"

# Auto-fix
npm run lint:fix
npm run format
```

**Hedef Metrikler:**
- ESLint errors: 0
- ESLint warnings: 0
- Prettier uyumsuzluklar: 0

---

### 2.3 Kod Karmaşıklığı Analizi
**Hedef:** Aşırı karmaşık fonksiyonları ve refactoring ihtiyaçlarını tespit etmek

**Adımlar:**
1. Cyclomatic complexity hesapla (max 10 olmalı)
2. Cognitive complexity analizi yap
3. Uzun fonksiyonları tespit et (>50 satır)
4. Nested depth analizi (max 4 seviye)
5. Parametre sayısını kontrol et (max 4-5)

**Analiz Araçları:**
```bash
# Complexity raporu
npx ts-complexity src/

# SonarQube benzeri analiz
npx eslint src/ --ext .ts,.tsx --report-unused-disable-directives
```

**Çıktı Formatı:**
```markdown
## Kod Karmaşıklığı Raporu
### Yüksek Karmaşıklık (>10)
- [dosya:fonksiyon] - Complexity: X
  - Öneri: [refactoring önerisi]

### Uzun Fonksiyonlar (>50 satır)
- [dosya:fonksiyon] - Satır: Y
  - Öneri: [bölme önerisi]
```

---

### 2.4 Code Smell Tespiti
**Hedef:** Kötü kod kokularını tespit etmek ve temizlik önerileri sunmak

**Adımlar:**
1. Duplikasyon tespiti (DRY prensibi ihlali)
2. Dead code tespiti
3. Magic numbers/strings kontrolü
4. God objects tespit et
5. Long parameter list kontrolü

**Kontrol Noktaları:**
- [ ] Aynı kod bloğu 3'ten fazla yerde tekrarlanıyor mu?
- [ ] Kullanılmayan fonksiyonlar var mı?
- [ ] Hard-coded değerler config'e taşınmalı mı?
- [ ] Tek bir class/component çok fazla sorumluluk mu taşıyor?

---

## 3. Performans Optimizasyonu

### 3.1 React Performans İncelemesi
**Hedef:** Gereksiz re-render'ları ve performans sorunlarını tespit etmek

**Adımlar:**
1. `React.memo()` kullanımını incele
2. `useMemo()` ve `useCallback()` optimizasyonlarını kontrol et
3. Prop drilling sorunlarını tespit et
4. Context optimizasyonunu değerlendir
5. Virtual scrolling kullanımını kontrol et (uzun listeler için)

**Kontrol Listesi:**
- [ ] Pahalı hesaplamalar `useMemo` ile sarılmış mı?
- [ ] Callback fonksiyonlar `useCallback` ile optimize edilmiş mi?
- [ ] Liste render'ları optimize edilmiş mi? (key props, virtualization)
- [ ] Context split edilmiş mi? (value/dispatch ayrımı)
- [ ] Heavy components lazy load ediliyor mu?

**Profiling Komutu:**
```bash
# React DevTools Profiler kullanımı için
# Development build'de component render sürelerini ölç
npm run dev
```

---

### 3.2 Bundle Analizi ve Code Splitting
**Hedef:** Bundle boyutunu optimize etmek ve gereksiz bağımlılıkları tespit etmek

**Adımlar:**
1. Production build oluştur ve boyutunu analiz et
2. Bundle composition incelemesi yap
3. Code splitting stratejisini gözden geçir
4. Lazy loading kullanımını kontrol et
5. Tree-shaking etkinliğini değerlendir

**Analiz Komutları:**
```bash
# Bundle analizi
npm run build
npx vite-bundle-visualizer

# Dependency analizi
npm run analyze

# Bundle size raporu
npx bundlephobia
```

**Hedef Metrikler:**
- Initial bundle size: <500KB (gzipped)
- Total bundle size: <2MB
- Lazy-loaded chunks: Her route için ayrı
- Vendor chunk: <300KB

---

### 3.3 WebSocket ve Network Optimizasyonu
**Hedef:** WebSocket bağlantılarının ve network isteklerinin optimize olduğunu doğrulamak

**Adımlar:**
1. WebSocket reconnection stratejisini incele
2. Binance/Coinbase fallback mekanizmasını test et
3. Throttling ve debouncing kullanımını kontrol et
4. Connection pooling stratejisini değerlendir
5. Message batching implementasyonunu incele

**Kontrol Listesi:**
- [ ] WebSocket bağlantısı koptuğunda exponential backoff var mı?
- [ ] Primary source timeout'unda fallback çalışıyor mu?
- [ ] Price update'leri throttle ediliyor mu? (örn: 100ms)
- [ ] Memory leak riski var mı? (event listener cleanup)
- [ ] Heartbeat/ping-pong mekanizması var mı?

---

### 3.4 Canvas Rendering Optimizasyonu
**Hedef:** Game engine'in 60 FPS'i koruyabildiğini doğrulamak

**Adımlar:**
1. `requestAnimationFrame` kullanımını incele
2. Dirty rectangle rendering uygulanmış mı kontrol et
3. Object pooling stratejisini değerlendir
4. Sprite batching kullanımını incele
5. Mobile vs Desktop rendering farklarını test et

**Profiling Noktaları:**
- [ ] Frame time: <16.67ms (60 FPS)
- [ ] GC pauses: Minimize edilmiş mi?
- [ ] Canvas context switch: Optimize edilmiş mi?
- [ ] Offscreen canvas kullanımı: Uygun mu?

**Test Senaryosu:**
```markdown
1. 100+ enemy spawn et
2. Tüm buff/debuff'ları aktif et
3. FPS counter'ı izle (target: 60 FPS stabil)
4. Memory profiler'da leak kontrolü yap
```

---

## 4. Test Kapsamı ve Kalitesi

### 4.1 Unit Test Analizi
**Hedef:** %80+ coverage'ı koruyarak test kalitesini artırmak

**Adımlar:**
1. Mevcut coverage raporunu incele
2. Coverage gap'leri tespit et
3. Edge case testlerini değerlendir
4. Test kodunun maintainability'sini kontrol et
5. Flaky test'leri tespit et

**Analiz Komutları:**
```bash
# Coverage raporu
npm run test:coverage

# Coverage detayları
npx vitest --coverage --reporter=html

# Flaky test tespiti
npm run test -- --repeat=10
```

**Coverage Hedefleri:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

---

### 4.2 E2E Test İyileştirme
**Hedef:** 72 E2E testinin stability ve coverage'ını artırmak

**Adımlar:**
1. Playwright testlerini gözden geçir
2. Test timeout sorunlarını tespit et
3. Flaky E2E testleri stabilize et
4. Visual regression test'leri kontrol et
5. Mobile E2E coverage'ı artır

**Kontrol Listesi:**
- [ ] Tüm critical path'ler E2E ile kapsanmış mı?
- [ ] Test retry stratejisi var mı?
- [ ] Network mock'ları doğru kullanılıyor mu?
- [ ] Paralel test execution optimize edilmiş mi?
- [ ] Test data cleanup yapılıyor mu?

**Önemli Test Senaryoları:**
- Game başlangıcından game over'a tam flow
- Leverage değişikliği ve PnL impact
- Mobile touch controls (joystick + drag)
- Network error handling (WebSocket disconnect)
- Leaderboard real-time updates

---

### 4.3 Integration Test Gap'leri
**Hedef:** Servisler arası entegrasyonların test edildiğini doğrulamak

**Adımlar:**
1. Service integration test'lerini incele
2. EventBus publish/subscribe akışlarını test et
3. State machine transitions'ları kontrol et
4. Supabase edge functions integration test et
5. WebSocket message handling test et

**Test Edilmesi Gerekenler:**
```markdown
- MarketService → DifficultyManager → SpawnSystem akışı
- BuffManager → Player stats → Combat calculations
- GameStateMachine state transitions
- Supabase session → verify-game edge function
- Leaderboard real-time subscription
```

---

## 5. Güvenlik Denetimi

### 5.1 Supabase Security Policies
**Hedef:** Row Level Security (RLS) politikalarının doğru yapılandırıldığını doğrulamak

**Adımlar:**
1. Tüm tabloların RLS enable olduğunu kontrol et
2. Policy'lerin minimum privilege prensibine uyduğunu doğrula
3. SECURITY INVOKER vs DEFINER kullanımını incele
4. Edge function auth kontrollerini test et
5. Public access risk'lerini değerlendir

**Kontrol Listesi:**
- [ ] `players` tablosu: Sadece owner kendi verisini değiştirebilir mi?
- [ ] `game_sessions` tablosu: Session doğrulaması var mı?
- [ ] `leaderboard` view: Public read, admin-only write mı?
- [ ] Edge functions: JWT verification yapıyor mu?
- [ ] API keys: Environment variable'larda saklanıyor mu?

---

### 5.2 XSS ve Injection Koruması
**Hedef:** Frontend güvenlik açıklarını tespit etmek

**Adımlar:**
1. User input sanitization kontrol et
2. DangerouslySetInnerHTML kullanımını incele
3. SQL injection riski olan yerleri tespit et (edge functions)
4. CORS policy'lerini değerlendir
5. Rate limiting implementasyonunu kontrol et

**Kontrol Noktaları:**
- [ ] Kullanıcı adı/skorlarda HTML injection riski var mı?
- [ ] External API'lerden gelen data sanitize ediliyor mu?
- [ ] Edge functions'da parameterized queries kullanılıyor mu?
- [ ] CORS whitelist doğru yapılandırılmış mı?

---

### 5.3 Environment Variables ve Secrets
**Hedef:** Hassas bilgilerin güvenli saklandığını doğrulamak

**Adımlar:**
1. `.env.example` dosyasının güncel olduğunu kontrol et
2. Hard-coded API key'leri tespit et
3. Git history'de leak olup olmadığını kontrol et
4. Production secrets rotation stratejisini değerlendir
5. Frontend'de expose edilen secrets'ı tespit et

**Güvenlik Komutları:**
```bash
# Hard-coded secrets tespiti
npx git-secrets --scan

# Environment variable kontrolü
grep -r "process.env" src/ | grep -v "VITE_"

# .env dosyası leak kontrolü
git log -p | grep -i "password\|api_key\|secret"
```

---

## 6. Mimari İyileştirme

### 6.1 EventBus Kullanımı
**Hedef:** Observer pattern'ın doğru uygulandığını ve memory leak olmadığını doğrulamak

**Adımlar:**
1. EventBus subscriber cleanup'larını kontrol et
2. Event type safety'yi değerlendir
3. Event flooding sorunlarını tespit et
4. Unsubscribe mekanizmasını test et
5. Event debugging tools kullanımını incele

**Kontrol Listesi:**
- [ ] useEffect cleanup'larında unsubscribe var mı?
- [ ] Event payload'ları type-safe mi?
- [ ] Critical events throttle/debounce ediliyor mu?
- [ ] EventBus.enableTracing() debug için kullanılabilir mi?

---

### 6.2 State Management Mimarisi
**Hedef:** Zustand store'larının optimal kullanıldığını doğrulamak

**Adımlar:**
1. Store slice'larının mantıksal ayrımını kontrol et
2. Selector kullanımını optimize et
3. Immer kullanımını değerlendir
4. Persistence stratejisini incele
5. DevTools entegrasyonunu test et

**Optimizasyon Noktaları:**
- [ ] Store slice'ları çok büyük değil mi? (<500 satır)
- [ ] Shallow equality check'ler doğru kullanılıyor mu?
- [ ] Computed values memoize ediliyor mu?
- [ ] LocalStorage sync performans sorunu yaratmıyor mu?

---

### 6.3 Dependency Injection ve Service Locator
**Hedef:** Servis bağımlılıklarının yönetilebilir olduğunu doğrulamak

**Adımlar:**
1. Service singleton pattern kullanımını incele
2. Constructor injection vs getter injection değerlendir
3. Service initialization order'ını kontrol et
4. Circular dependency risk'lerini tespit et
5. Mock/stub desteğini test et (unit testing için)

**İncelenecek Servisler:**
```markdown
- MarketService
- DifficultyManager
- SpawnSystem
- CardSystem
- BuffManager
- CombatSystem
- PoolManager
- TimeService
```

---

## 7. Mobil Optimizasyon

### 7.1 Touch Control Kalitesi
**Hedef:** Joystick ve drag-to-move kontrollerinin sorunsuz çalıştığını doğrulamak

**Adımlar:**
1. Touch event handling'i incele
2. Joystick dead zone konfigürasyonunu test et
3. Drag-to-move accuracy'sini değerlendir
4. Multi-touch support kontrol et (dash + move)
5. Input lag'i ölç

**Test Cihazları:**
- iOS (iPhone 12+)
- Android (Samsung S21+)
- Tablet (iPad Air)

**Metrikler:**
- Touch response time: <50ms
- Joystick precision: ±5 derece
- Drag smoothness: 60 FPS

---

### 7.2 Responsive HUD Layout
**Hedef:** HUD'ın tüm ekran boyutlarında okunabilir olduğunu doğrulamak

**Adımlar:**
1. Safe area inset kullanımını kontrol et
2. Font scaling'i test et (0.5x - 1.5x)
3. Landscape vs portrait adaptasyonunu incele
4. Notch/cutout handling'i test et
5. Minimum tap target size'ı doğrula (44x44px)

**Test Viewport'ları:**
```markdown
- 375x667 (iPhone SE)
- 390x844 (iPhone 13)
- 393x873 (Pixel 7)
- 820x1180 (iPad)
- 1024x768 (Desktop)
```

---

### 7.3 Performance Profile Switching
**Hedef:** Cihaz performansına göre otomatik ayarlamanın çalıştığını doğrulamak

**Adımlar:**
1. DeviceProfile detection'ını incele
2. Shadow/filter toggle mekanizmasını test et
3. Particle effect reduction'ını değerlendir
4. FPS stabilization stratejisini kontrol et
5. Battery impact'i ölç

**Profile Ayarları:**
```markdown
Low Performance:
- Shadow: Disabled
- Particle Count: %50
- Max Enemies: 50
- Filter Effects: Minimal

High Performance:
- Shadow: Enabled
- Particle Count: %100
- Max Enemies: 100+
- Filter Effects: Full
```

---

## 8. WebSocket ve API Entegrasyonları

### 8.1 Binance WebSocket Resilience
**Hedef:** Primary data source'un dayanıklı olduğunu doğrulamak

**Adımlar:**
1. Connection retry logic'i incele
2. Exponential backoff implementasyonunu test et
3. Message parsing error handling'i kontrol et
4. Heartbeat mekanizmasını değerlendir
5. Stale data detection'ını test et

**Test Senaryoları:**
- Network interrupt simulation
- Binance API downtime handling
- Malformed message handling
- Connection flooding prevention

---

### 8.2 Coinbase Fallback Mekanizması
**Hedef:** Secondary source'a geçişin seamless olduğunu doğrulamak

**Adımlar:**
1. Fallback trigger condition'larını incele
2. Switchover latency'yi ölç
3. Data format normalization'ını kontrol et
4. Dual connection scenario'sunu test et
5. Fallback revert strategy'sini değerlendir

**Failover Test:**
```markdown
1. Binance connection'ı manuel olarak kes
2. Coinbase'e geçişi gözlemle (max 5 saniye)
3. Data continuity'yi doğrula
4. Binance'i restore et
5. Primary'ye dönüşü test et
```

---

### 8.3 Price Data Processing Pipeline
**Hedef:** Market verilerinin doğru işlendiğini ve kullanıldığını doğrulamak

**Adımlar:**
1. Price update throttling'i kontrol et
2. Technical indicator hesaplamalarını doğrula (RSI, ATR)
3. Volume aggregation logic'i incele
4. Data validation'ı test et
5. Error recovery mekanizmasını değerlendir

**Validation Checks:**
- [ ] Price değerleri reasonable range'de mi? (örn: BTC $10K-$150K)
- [ ] Timestamp'ler chronological mi?
- [ ] Volume spike'ları filtreleniyor mu?
- [ ] Stale data auto-reject ediliyor mu?

---

## 9. State Management İncelemesi

### 9.1 GameStore Optimization
**Hedef:** Oyun state'inin performanslı yönetildiğini doğrulamak

**Adımlar:**
1. State slice boyutlarını analiz et
2. Unnecessary re-render'ları tespit et
3. Selector optimization'ını kontrol et
4. Persistence overhead'i ölç
5. DevTools profiling yap

**Zustand Best Practices:**
- [ ] Slice'lar modüler mi? (player, enemies, buffs ayrı)
- [ ] Shallow equality checks kullanılıyor mu?
- [ ] Derived state hesaplanıyor mu? (memoization)
- [ ] setState batch update'leri yapıyor mu?

---

### 9.2 LocalStorage vs Supabase Sync
**Hedef:** Offline/online data sync'in çakışmadığını doğrulamak

**Adımlar:**
1. Conflict resolution stratejisini incele
2. Offline-first approach'u test et
3. Sync frequency'yi optimize et
4. Data migration handling'i kontrol et
5. Storage quota yönetimini değerlendir

**Test Senaryoları:**
- Offline mode: Oyun oyna, sonra online ol
- Concurrent update: İki cihazdan aynı anda değişiklik
- Storage full: Quota aşımı handling

---

## 10. Dokümantasyon ve Bakım

### 10.1 Code Documentation Quality
**Hedef:** Kodun maintainability'sinin yüksek olduğunu doğrulamak

**Adımlar:**
1. JSDoc/TSDoc coverage'ı kontrol et
2. Complex algorithm'ların açıklamasını incele
3. Public API documentation'ını değerlendir
4. Inline comment quality'sini kontrol et
5. TypeDoc output'u gözden geçir

**Dokümantasyon Standartları:**
- [ ] Public functions: JSDoc ile açıklanmış
- [ ] Complex logic: Inline comments var
- [ ] Type definitions: TSDoc annotations mevcut
- [ ] Examples: Kullanım örnekleri var

---

### 10.2 README ve Dokümantasyon Güncelliği
**Hedef:** Tüm dokümantasyonun güncel ve doğru olduğunu doğrulamak

**Adımlar:**
1. README.md'deki feature list'i doğrula
2. API documentation'ı test et
3. Architecture diagram'ları güncelle
4. Contributing guide'ı gözden geçir
5. Changelog'u kontrol et

**Kontrol Listesi:**
- [ ] README'deki komutlar çalışıyor mu?
- [ ] Badge'ler güncel mi? (test count, coverage)
- [ ] Screenshot'lar latest UI'ı gösteriyor mu?
- [ ] Installation guide complete mi?

---

### 10.3 Technical Debt Inventory
**Hedef:** Birikmiş teknik borcu dokümante etmek ve önceliklendirmek

**Adımlar:**
1. `TODO`, `FIXME`, `HACK` yorumlarını topla
2. Deprecated code'ları tespit et
3. Refactoring candidates'ları listele
4. Dependency update'leri kontrol et
5. Breaking changes planla

**Debt Kategorileri:**
```markdown
Critical (P0):
- Security vulnerabilities
- Production bugs
- Performance blockers

High (P1):
- Maintainability issues
- Test coverage gaps
- Major refactoring needs

Medium (P2):
- Code smell cleanup
- Documentation updates
- Minor optimizations

Low (P3):
- Nice-to-have improvements
- Cosmetic changes
```

---

## 📊 Workflow Çıktı Şablonu

Her workflow adımını tamamladıktan sonra aşağıdaki formatta rapor oluştur:

```markdown
# Crypto Cyber Survivors - [Workflow Adı] Raporu
Tarih: YYYY-MM-DD
İncelenen Alan: [alan adı]

## Özet
- Toplam İncelenen Dosya: X
- Tespit Edilen Sorun: Y
- Critical Issues: Z
- Önerilen İyileştirme: W

## Detaylı Bulgular

### ✅ Başarılı Alanlar
1. [Bulgu 1]
2. [Bulgu 2]

### ⚠️ İyileştirme Gerektiren Alanlar
1. [Sorun 1]
   - Etki: [High/Medium/Low]
   - Öneri: [çözüm önerisi]
   - Tahmini Efor: [XH]

2. [Sorun 2]
   - ...

### 🚨 Kritik Sorunlar
1. [Kritik sorun 1]
   - Öncelik: P0/P1
   - Risk: [risk açıklaması]
   - Acil Aksiyon: [yapılması gerekenler]

## Action Items
- [ ] [Görev 1] - Atanan: [kişi] - Deadline: [tarih]
- [ ] [Görev 2] - ...

## Metrikler
- Code Coverage: X%
- Performance Score: Y/100
- Security Score: Z/100
- Maintainability Index: W/100

## Sonraki Adımlar
1. [Adım 1]
2. [Adım 2]
```

---

## 🎯 Workflow Öncelik Sırası

Projeyi ilk defa gözden geçiriyorsan, bu sırayı takip et:

1. **Proje Yapısı Analizi** (1. Bölüm) - Temel anlayış için
2. **Güvenlik Denetimi** (5. Bölüm) - Kritik güvenlik sorunları için
3. **Test Kapsamı ve Kalitesi** (4. Bölüm) - Güvenilirlik için
4. **Performans Optimizasyonu** (3. Bölüm) - User experience için
5. **Kod Kalitesi ve Standartlar** (2. Bölüm) - Maintainability için
6. **Mimari İyileştirme** (6. Bölüm) - Scalability için
7. **Mobil Optimizasyon** (7. Bölüm) - Mobile-first için
8. **WebSocket ve API Entegrasyonları** (8. Bölüm) - Real-time features için
9. **State Management İncelemesi** (9. Bölüm) - Data flow için
10. **Dokümantasyon ve Bakım** (10. Bölüm) - Long-term success için

---

## 💡 Claude Code Kullanım İpuçları

### Etkili Prompt'lar:

```
"Workflow #1.1'i çalıştır: Proje dosya organizasyonunu analiz et ve rapor oluştur"

"Workflow #3.1'deki React performans kontrolünü yap, useMemo/useCallback eksikliklerini tespit et"

"Workflow #5.1'e göre Supabase RLS politikalarını incele ve güvenlik açığı var mı kontrol et"

"Tüm workflow'ları sırayla çalıştır ve master rapor oluştur"
```

### Rapor İsteme:

```
"Workflow #2 tamamlandıktan sonra action item'ları öncelik sırasına koy"

"Tespit edilen tüm critical issue'ları P0/P1 önceliğe göre listele"

"Performance optimization için quick wins (düşük efor, yüksek etki) öner"
```

---

## 📈 Sürekli İyileştirme Döngüsü

Bu workflow'u düzenli aralıklarla çalıştır:

- **Günlük:** Lint, test, build kontrolü
- **Haftalık:** Code quality, test coverage analizi
- **Aylık:** Full security audit, performance profiling
- **Quarterly:** Architecture review, dependency updates
- **Major Release Öncesi:** Tüm workflow'ları end-to-end çalıştır

---

## 🎓 Ek Kaynaklar

- **React Best Practices:** https://react.dev/learn/thinking-in-react
- **TypeScript Guidelines:** https://typescript-eslint.io/rules/
- **Vitest Testing:** https://vitest.dev/guide/
- **Playwright E2E:** https://playwright.dev/docs/intro
- **Supabase Security:** https://supabase.com/docs/guides/database/postgres/row-level-security

---

**Hazırlayan:** Claude (Anthropic)  
**Versiyon:** 1.0  
**Proje:** Crypto Cyber Survivors  
**Tarih:** {{ current_date }}

*"Code quality is not an accident; it is the result of intelligent effort."*