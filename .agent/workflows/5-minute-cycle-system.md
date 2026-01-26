---
description: 5 Dakikalık Cycle-Based Game Loop Implementasyonu
---

# 5 Dakikalık Cycle-Based Game Loop

Bu workflow, oyunu 5 dakikalık cycle'lar halinde yapılandırır. Her cycle sonunda oyuncular coin ile çıkabilir veya devam edebilir. Market data ile entegre dinamik difficulty sistemi.

// turbo-all

---

## 🎯 Hedef Özeti

- **Mevcut cycle:** ~46 saniye
- **Hedef cycle:** 5 dakika (300 saniye)
- **Yeni mod:** Competitive Mode (leaderboard + coin)
- **Market entegrasyonu:** Dinamik wave intensity

---

## 📋 Pre-Implementation Checklist

// ultrathink
1. Mevcut DifficultyManager wave logic'ini incele
2. WavePhase type'ın kullanıldığı tüm yerleri listele
3. TimeService'in cycle tracking için uygun olup olmadığını kontrol et
4. Market data update frequency'sini doğrula (wave sync için)
5. Mevcut testlerin kapsamını değerlendir

---

## 🔄 Phase 1: Wave Duration Refaktörü

// ultrathink
### Adım 1.1: Wave Phase Yapısını Analiz Et
- [ ] `services/DifficultyManager.ts` dosyasındaki WAVE_DURATIONS sabitlerini incele
- [ ] `types/metrics.ts` dosyasındaki WavePhase type'ını incele
// turbo
- [ ] Tüm wave phase kullanımlarını grep ile tara

// think
### Adım 1.2: Yeni Wave Phase Yapısını Tasarla
- [ ] 7 phase'li yapıyı planla:
  - `warmup` (0:00-0:45) - Oyuncuyu alıştır
  - `buildup` (0:45-1:45) - Yavaş yavaş zorlaştır
  - `firstPeak` (1:45-2:15) - İlk adrenalin
  - `breather` (2:15-3:00) - Rahatlama
  - `escalation` (3:00-4:00) - Climax'a hazırlık
  - `climax` (4:00-4:45) - En yoğun
  - `resolution` (4:45-5:00) - Karar anı
- [ ] Her phase için multiplier değerlerini belirle
- [ ] Market volatility'nin phase'leri nasıl etkileyeceğini tasarla

### Adım 1.3: Etkilenen Sistemleri Listele
**Direkt Etkilenen:**
- `services/DifficultyManager.ts` - Wave logic
- `types/metrics.ts` - WavePhase type
- `types/DebugState.ts` - Debug wave info
- `components/hud/WaveTimer.tsx` - UI gösterimi
- `services/SpawnSystem.ts` - Enemy spawn rates

**Dolaylı Etkilenen:**
- `tests/DifficultyManager.test.ts`
- `tests/SpawnSystem.test.ts`
- `services/DebugService.ts`
- `services/metrics/MetricsService.ts`

---

## 🎮 Phase 2: Game Mode Sistemi

// think
### Adım 2.1: Mode Enum Tasarımı
- [ ] GameMode enum'u tasarla:
  - `CASUAL` - Mevcut mod (sınırsız, coin yok)
  - `COMPETITIVE` - 5 dk cycle, leaderboard, coin
- [ ] Mode'un nerede saklanacağını belirle (GameState? Zustand store?)

### Adım 2.2: Mode Seçim Ekranı Planı
- [ ] Ana menüde mode seçim butonlarını planla
- [ ] Her mode için açıklama metinlerini hazırla
- [ ] Mode geçişlerinin hangi state'leri resetleyeceğini belirle

### Adım 2.3: Etkilenen Sistemler
**Direkt Etkilenen:**
- `types.ts` - GameState, GameMode (yeni)
- `App.tsx` - Mode bazlı routing
- `stores/gameStore.ts` - Mode state

**Dolaylı Etkilenen:**
- `components/screens/MainMenu.tsx` (oluşturulacak)
- `components/GameUI.tsx` - Mode spesifik UI
- `services/MetricsService.ts` - Mode bazlı metrics

---

## 📊 Phase 3: Market Data Entegrasyonu

// ultrathink
### Adım 3.1: Dinamik Intensity Mapping
- [ ] Market RSI → Wave intensity mapping tasarla
- [ ] Market volatility (ATR) → Spawn rate mapping tasarla
- [ ] Volume spikes → Special event trigger tasarla

// think
### Adım 3.2: Market-Driven Phase Modifiers
- [ ] Her wave phase için market modifier formülü belirle:
  - Düşük volatilite = Phase süreleri uzar (rahat)
  - Yüksek volatilite = Phase süreleri kısalır (yoğun)
- [ ] RSI extreme'lerinde (oversold/overbought) özel efektler planla

### Adım 3.3: Etkilenen Sistemler
**Direkt Etkilenen:**
- `services/DifficultyManager.ts` - Market modifier entegrasyonu
- `hooks/useMarketData.ts` - Volatility exposure
- `services/market/MarketStateService.ts` - State calculation

**Dolaylı Etkilenen:**
- `railway-market-server/` - Server indicator consistency

---

## ⏱️ Phase 4: Cycle Completion Sistemi

// think
### Adım 4.1: Cycle Timer Oluştur
- [ ] CycleManager service tasarla (DifficultyManager'dan ayrı)
- [ ] 5 dakika countdown logic
- [ ] Cycle complete event
- [ ] Pause/resume cycle desteği

### Adım 4.2: Decision Screen Mockup
- [ ] Cycle complete modal tasarla
- [ ] Gösterilecek bilgiler:
  - Survival time
  - Coins earned (mockup değer)
  - Market P&L
  - Continue multiplier
- [ ] "Cash Out" ve "Continue" butonları
- [ ] Continue riskini açıklayan tooltip

### Adım 4.3: Etkilenen Sistemler
**Direkt Etkilenen:**
- `services/CycleManager.ts` (yeni)
- `components/screens/CycleCompleteScreen.tsx` (yeni)
- `types.ts` - CycleState, CycleCompleteData

**Dolaylı Etkilenen:**
- `App.tsx` - Cycle complete state handling
- `components/GameEngine.tsx` - Game pause on cycle end

---

## 🏆 Phase 5: Leaderboard Entegrasyonu

// think
### Adım 5.1: Leaderboard Veri Yapısı
- [ ] LeaderboardEntry type tasarla:
  - Player ID
  - Score (survival time * level * market bonus)
  - Cycle count
  - Timestamp
  - Market position (LONG/SHORT)

### Adım 5.2: Supabase Table Planı
- [ ] `leaderboard` table schema
- [ ] RLS (Row Level Security) kuralları
- [ ] Real-time subscription için index'ler

### Adım 5.3: UI Planı
- [ ] Leaderboard component tasarla
- [ ] Filtreleme: Today, Week, All-time
- [ ] Player ranking highlight
- [ ] Mode seçiminde cycle complete sonrası göster

### Adım 5.4: Etkilenen Sistemler
**Direkt Etkilenen:**
- `services/LeaderboardService.ts` (yeni)
- `components/Leaderboard.tsx` (yeni)
- Supabase `leaderboard` table

**Dolaylı Etkilenen:**
- `hooks/useSupabase.ts` - Real-time subscription

---

## 💰 Phase 6: Coin Sistemi (Mockup)

### Adım 6.1: Coin Calculation Logic (Mockup)
- [ ] Basit coin formülü tasarla:
  - Base: survival_seconds * 2
  - Kill bonus: kills * 5
  - Market bonus: pnl_percent * 100
  - Level bonus: level * 50
- [ ] Mockup olarak UI'da göster, backend'e kaydetme

### Adım 6.2: Coin Display UI
- [ ] Cycle sırasında coin counter (HUD)
- [ ] Coin animation on earn
- [ ] Cycle complete ekranında toplam

### Adım 6.3: Etkilenen Sistemler
**Direkt Etkilenen:**
- `services/CoinService.ts` (yeni, mockup)
- `components/hud/CoinCounter.tsx` (yeni)

**Dolaylı Etkilenen:**
- `components/screens/CycleCompleteScreen.tsx` - Coin display

---

## 🧪 Phase 7: Test Stratejisi

// turbo
### Adım 7.1: Unit Test Güncellemeleri
- [ ] DifficultyManager.test.ts - Yeni phase'ler için test
- [ ] CycleManager.test.ts - Cycle logic testleri
- [ ] Mevcut testlerin yeni phase'lerle uyumunu kontrol et

// turbo
### Adım 7.2: Integration Test Planı
- [ ] Wave transition'ların doğru zamanlamada olduğunu test et
- [ ] Market data → difficulty mapping'in tutarlı olduğunu test et
- [ ] Cycle complete event'in doğru tetiklendiğini test et

### Adım 7.3: Manual Test Senaryoları
- [ ] 5 dakikalık tam cycle oynanışı
- [ ] Cash out flow
- [ ] Continue flow
- [ ] Market extreme durumlarında oynanış

---

## 🐛 Potansiyel Riskler ve Mitigasyon

// ultrathink
### Risk 1: Wave Phase Backwards Compatibility
**Problem:** Mevcut 4-phase enum'u kullanan kodlar kırılabilir
**Mitigasyon:** Phase migration utility function

### Risk 2: Timer Drift
**Problem:** Wave timer ve cycle timer senkronizasyon sorunu
**Mitigasyon:** Her ikisi de TimeService'i kullansın

### Risk 3: Market Data Latency
**Problem:** Market update'leri gecikmeli gelirse difficulty yanıltıcı olur
**Mitigasyon:** Son bilinen değer kullan, stale threshold ekle

### Risk 4: Mobile Performance
**Problem:** Yeni cycle logic performance overhead'i
**Mitigasyon:** Expensive calculation'ları throttle et

---

## 📅 Uygulama Sırası

1. **Phase 1** - Wave Duration (Foundation)
2. **Phase 4** - Cycle Completion (Core mechanic)
3. **Phase 2** - Game Mode (Mode separation)
4. **Phase 3** - Market Integration (Dynamic feel)
5. **Phase 5** - Leaderboard (Competitive aspect)
6. **Phase 6** - Coin Mockup (Reward preview)
7. **Phase 7** - Testing (Validation)

---

## ✅ Completion Criteria

// turbo
- [ ] 5 dakikalık cycle düzgün çalışıyor
- [ ] 7 wave phase doğru transition yapıyor
- [ ] Market data difficulty'yi dinamik olarak etkiliyor
- [ ] Cycle complete ekranı mockup coin gösteriyor
- [ ] CASUAL ve COMPETITIVE mode ayrımı çalışıyor
- [ ] Tüm mevcut testler hala geçiyor
- [ ] Yeni testler eklendi ve geçiyor
- [ ] Leaderboard Supabase'e score kaydediyor

---

## 📝 Notlar

- Chest sistemi bu workflow'un scope'u dışında - sonraki iterasyonda
- Coin backend entegrasyonu sonraki iterasyonda
- Real-time leaderboard updates nice-to-have, MVP'de refresh on open yeterli
