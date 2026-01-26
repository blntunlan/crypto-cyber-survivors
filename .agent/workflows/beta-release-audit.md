---
description: Kapsamlı beta release öncesi denetim - Tüm sistemleri fazlar halinde tarar ve düzeltir
---

# 🚀 Beta Release Audit Workflow

Bu workflow projeyi beta release için hazırlar. Her faz eksiksiz tamamlanmalı, workaround yerine gerçek çözümler uygulanmalıdır.

---

## 📋 Ön Koşullar

// turbo
1. Geliştirme sunucusunu durdur (varsa)
2. Temiz bir git durumu olduğundan emin ol:
   ```bash
   git status
   ```

---

## FAZ 1: KOD KALİTESİ VE STATIK ANALİZ

### 1.1 TypeScript Strict Kontrolü
// turbo
```bash
npx tsc --noEmit --strict
```
- Tüm type hatalarını listele
- `any` kullanımlarını tespit et ve düzelt
- Eksik type tanımlarını tamamla

### 1.2 ESLint Denetimi
// turbo
```bash
npm run lint
```
- Tüm hataları düzelt (warning dahil)
- `@ts-ignore` ve `eslint-disable` kullanımlarını incele, mümkünse kaldır

### 1.3 Kullanılmayan Kod Analizi
- `grep_search` ile kullanılmayan export'ları bul
- Dead code'u tespit et ve kaldır
- Kullanılmayan dependency'leri temizle:
  ```bash
  npx depcheck
  ```

### 1.4 Import Düzeni
- Circular import'ları tespit et:
  ```bash
  npx madge --circular --extensions ts,tsx .
  ```
- Kırık import'ları düzelt

---

## FAZ 2: TEST KAPSAMLILIĞI

### 2.1 Unit Test Çalıştırma
// turbo
```bash
npm run test -- --run
```
- Tüm testlerin geçtiğinden emin ol
- Başarısız testleri düzelt (skip etme!)

### 2.2 Coverage Analizi
// turbo
```bash
npm run test:coverage
```
Hedefler:
- Statements: %80+
- Branches: %70+
- Functions: %75+
- Lines: %80+

### 2.3 Eksik Test Alanları
Aşağıdaki kritik sistemlerin test edildiğinden emin ol:
- [ ] GameEngine render loop
- [ ] PhysicsSystem collisions
- [ ] MarketService WebSocket
- [ ] CardSystem upgrades
- [ ] ComboSystem mechanics
- [ ] DifficultyManager scaling
- [ ] PoolManager object reuse
- [ ] SpawnSystem enemy generation

### 2.4 E2E Testleri
// turbo
```bash
npm run test:e2e
```
- Tüm browser'larda test geçmeli
- Flaky testleri stabilize et

---

## FAZ 3: OYUN MEKANİKLERİ DENETİMİ

### 3.1 Player Sistemi
İncele ve doğrula:
- [ ] Player hareket hızı ve sınırları
- [ ] Dash mekanizması (cooldown, duration, invincibility)
- [ ] HP/Armor/Dodge hesaplamaları
- [ ] Level up XP scaling
- [ ] Stat caps (MAX_SPEED, MAX_ARMOR, MAX_DODGE vs.)

### 3.2 Combat Sistemi
- [ ] Bullet spawn ve trajectory
- [ ] Damage hesaplama (base, crit, super crit)
- [ ] Fire rate scaling
- [ ] Enemy hit detection (spatial grid accuracy)
- [ ] Knockback physics

### 3.3 Enemy Sistemi
- [ ] Spawn patterns ve timing
- [ ] Enemy behavior patterns (chase, intercept, zigzag)
- [ ] Health scaling by difficulty
- [ ] Death animations ve gem drops
- [ ] Off-screen culling

### 3.4 Difficulty Sistemi
- [ ] Market PnL'e bağlı difficulty scaling
- [ ] Time-based difficulty increase
- [ ] Kill streak bonuses
- [ ] Volatility effects
- [ ] Near-death difficulty reduction

### 3.5 Card/Upgrade Sistemi
- [ ] Card rarity weights
- [ ] Card stat application
- [ ] Tier progression (Common → Legendary)
- [ ] Synergy bonuses

### 3.6 Combo Sistemi
- [ ] Combo timeout
- [ ] XP multiplier calculation
- [ ] Milestone rewards
- [ ] Visual feedback

---

## FAZ 4: MARKET ENTEGRASYONLARİ

### 4.1 WebSocket Bağlantıları
- [ ] Binance WebSocket connection/reconnection
- [ ] Coinbase fallback mekanizması
- [ ] Connection timeout handling
- [ ] Data validation (price sanity checks)

### 4.2 Market Hesaplamaları
- [ ] PnL calculation (Long/Short)
- [ ] Leverage application
- [ ] Liquidation price calculation
- [ ] RSI indicators

### 4.3 Railway Market Server
- [ ] Health check endpoint
- [ ] Price logging to Supabase
- [ ] Error handling

---

## FAZ 5: UI/UX DENETİMİ

### 5.1 Responsive Design
Test edilecek ekranlar:
- [ ] Desktop (1920x1080, 2560x1440)
- [ ] Tablet (1024x768, 768x1024)
- [ ] Mobile (375x667, 414x896)

### 5.2 Menu Ekranları
- [ ] MainMenu - tüm butonlar çalışıyor mu?
- [ ] PauseMenu - resume/quit işlevleri
- [ ] LevelUpScreen - card selection
- [ ] GameOverScreen - retry/menu
- [ ] SettingsPanel - audio/theme toggles

### 5.3 HUD Elemanları
- [ ] HP bar smooth animation
- [ ] XP bar fill accuracy
- [ ] Combo counter visibility
- [ ] Market data display
- [ ] FPS counter (dev mode)

### 5.4 Mobile Controls
- [ ] Virtual joystick responsiveness
- [ ] Touch dash button
- [ ] Haptic feedback
- [ ] Gesture recognition

---

## FAZ 6: PERFORMANS OPTİMİZASYONU

### 6.1 FPS Profiling
- [ ] 60 FPS hedefi (desktop)
- [ ] 30 FPS minimum (mobile)
- [ ] Frame drop analizi
- [ ] Memory leak kontrolü

### 6.2 Object Pooling
- [ ] PoolManager pre-warm values
- [ ] Pool size limits
- [ ] Cleanup triggers

### 6.3 Render Pipeline
- [ ] Canvas batch rendering
- [ ] Culling optimization
- [ ] Particle limits
- [ ] Background layer performance

### 6.4 Bundle Size
// turbo
```bash
npm run build
```
- Bundle size < 500KB (gzipped) hedefi
- Unnecessary imports removal
- Tree shaking verification

---

## FAZ 7: GÜVENLİK VE VERİ BÜTÜNLÜĞÜ

### 7.1 Anti-Cheat
- [ ] Score verification logic
- [ ] Replay protection
- [ ] Rate limiting

### 7.2 Supabase RLS
- [ ] Tüm tablolarda RLS enabled
- [ ] Policy'ler doğru yapılandırılmış
- [ ] Service role key güvenliği

### 7.3 Environment Variables
- [ ] Tüm secrets .env dosyalarında
- [ ] .env.example güncel
- [ ] Production vs Development config

---

## FAZ 8: EDGE CASE VE HATA YÖNETİMİ

### 8.1 Network Errors
- [ ] WebSocket disconnect handling
- [ ] Retry logic
- [ ] Offline mode graceful degradation
- [ ] Reconnection UI feedback

### 8.2 Game State Edge Cases
- [ ] Pause during level up
- [ ] Tab visibility change
- [ ] Browser back button
- [ ] Low battery mode
- [ ] Screen orientation change

### 8.3 Math Edge Cases
- [ ] Division by zero checks
- [ ] NaN propagation prevention
- [ ] Infinity handling
- [ ] Integer overflow

### 8.4 Error Boundaries
- [ ] React error boundaries implemented
- [ ] Graceful error recovery
- [ ] Error logging to analytics

---

## FAZ 9: DOKÜMANTASYON

### 9.1 Code Documentation
- [ ] Tüm public methods JSDoc
- [ ] Complex logic açıklamaları
- [ ] Type definitions complete

### 9.2 README Güncellemesi
- [ ] Features list accurate
- [ ] Setup instructions verified
- [ ] Screenshots current

### 9.3 CHANGELOG
- [ ] Version bump
- [ ] Breaking changes documented
- [ ] New features listed

---

## FAZ 10: FINAL RELEASE CHECKLIST

### 10.1 Pre-Release
// turbo
```bash
npm run lint && npm run test -- --run && npm run build
```

### 10.2 Git Operations
```bash
git add -A
git commit -m "chore: beta release v1.0.0-beta.1"
git tag v1.0.0-beta.1
git push origin main --tags
```

### 10.3 Deployment
```bash
railway up
supabase db push
supabase functions deploy
```

### 10.4 Post-Deploy Verification
- [ ] Production URL accessible
- [ ] WebSocket connections working
- [ ] Market data flowing
- [ ] Game playable end-to-end
- [ ] Leaderboard functional

---

## 📊 Faz İlerleme Takibi

| Faz | Açıklama | Durum |
|-----|----------|-------|
| 1 | Kod Kalitesi | ⏳ |
| 2 | Test Kapsamlılığı | ⏳ |
| 3 | Oyun Mekanikleri | ⏳ |
| 4 | Market Entegrasyonları | ⏳ |
| 5 | UI/UX | ⏳ |
| 6 | Performans | ⏳ |
| 7 | Güvenlik | ⏳ |
| 8 | Edge Cases | ⏳ |
| 9 | Dokümantasyon | ⏳ |
| 10 | Final Release | ⏳ |

---

## ⚠️ Kurallar

1. **Workaround YASAK** - Her problem kök nedeninden çözülmeli
2. **Skip YASAK** - Testler skip edilmemeli, düzeltilmeli
3. **@ts-ignore YASAK** - Type hataları proper type ile çözülmeli
4. **console.log YASAK** - Logger service kullanılmalı
5. **any YASAK** - Proper typing kullanılmalı

---

*Bu workflow'u `/beta-release-audit` komutuyla çalıştır*
