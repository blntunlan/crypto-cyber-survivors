# ⏱️ TimeService Architecture Plan

**Durum:** 📋 Planlandı (Gelecek implementasyon için)
**Öncelik:** Lootbox sistemi eklendiğinde implemente edilecek
**Tahmini Süre:** 30-45 dakika

---

## Amaç

Merkezi zaman yönetimi servisi oluşturmak:
- Slow-motion power-up'lar (lootbox item)
- Dramatik anlar (boss spawn, near-death)
- Pause/resume senkronizasyonu
- Time-based UI elements (cooldown bars)

---

## Mimari

```
┌───────────────────────────────────────────────────────────┐
│                     TimeService                            │
│  Singleton - Merkezi zaman yönetimi                        │
├───────────────────────────────────────────────────────────┤
│  State:                                                    │
│  - timeScale: number (1.0 = normal, 0.2 = slow-mo)        │
│  - effectDuration: number (ms remaining)                   │
│  - effectName: string | null                               │
│                                                            │
│  Methods:                                                  │
│  - getTimeScale(): number                                  │
│  - setTimeScale(scale, duration?, name?): void            │
│  - update(deltaTime): void (called in game loop)          │
│  - reset(): void                                           │
│                                                            │
│  Events:                                                   │
│  - timeScaleChanged: { scale, duration, name }            │
│  - timeEffectEnded: { name }                              │
└───────────────────────────────────────────────────────────┘
```

---

## Kod Taslağı

### TimeService.ts

```typescript
import { EventBus } from './EventBus';

interface TimeEffect {
    scale: number;
    duration: number;
    name: string;
}

class TimeServiceClass {
    private static instance: TimeServiceClass | null = null;
    
    private currentScale: number = 1.0;
    private activeEffect: TimeEffect | null = null;
    private effectTimeRemaining: number = 0;
    
    private constructor() {}
    
    static getInstance(): TimeServiceClass {
        if (!TimeServiceClass.instance) {
            TimeServiceClass.instance = new TimeServiceClass();
        }
        return TimeServiceClass.instance;
    }
    
    /**
     * Get current time scale (1.0 = normal, 0.2 = 5x slow)
     */
    getTimeScale(): number {
        return this.currentScale;
    }
    
    /**
     * Get scaled delta time for game systems
     */
    getScaledDelta(rawDelta: number): number {
        return rawDelta * this.currentScale;
    }
    
    /**
     * Activate a time effect
     * @param scale - Time scale (0.2 = slow-mo, 2.0 = speed-up)
     * @param duration - Duration in milliseconds
     * @param name - Effect name for UI display
     */
    activateEffect(scale: number, duration: number, name: string): void {
        this.currentScale = scale;
        this.effectTimeRemaining = duration;
        this.activeEffect = { scale, duration, name };
        
        EventBus.emit('timeScaleChanged', {
            scale,
            duration,
            name,
            remaining: duration
        });
    }
    
    /**
     * Update effect timer (call from game loop with real delta)
     */
    update(realDeltaTime: number): void {
        if (this.effectTimeRemaining > 0) {
            this.effectTimeRemaining -= realDeltaTime;
            
            if (this.effectTimeRemaining <= 0) {
                const endedEffect = this.activeEffect;
                this.currentScale = 1.0;
                this.activeEffect = null;
                this.effectTimeRemaining = 0;
                
                if (endedEffect) {
                    EventBus.emit('timeEffectEnded', { name: endedEffect.name });
                }
            }
        }
    }
    
    /**
     * Get remaining effect time (0-1 for progress bar)
     */
    getEffectProgress(): number {
        if (!this.activeEffect) return 0;
        return this.effectTimeRemaining / this.activeEffect.duration;
    }
    
    getActiveEffectName(): string | null {
        return this.activeEffect?.name ?? null;
    }
    
    reset(): void {
        this.currentScale = 1.0;
        this.activeEffect = null;
        this.effectTimeRemaining = 0;
    }
}

export const TimeService = TimeServiceClass.getInstance();
```

---

## Entegrasyon Noktaları

### 1. GameEngine.tsx

```typescript
// Mevcut:
const deltaTime = s.lastTime ? time - s.lastTime : 16.67;
const dtFactor = deltaTime / 16.67;

// Değişecek:
const rawDelta = s.lastTime ? time - s.lastTime : 16.67;
TimeService.update(rawDelta); // Update effect timer
const deltaTime = TimeService.getScaledDelta(rawDelta);
const dtFactor = deltaTime / 16.67;
```

### 2. EventBus.ts - Yeni Event Tipleri

```typescript
timeScaleChanged: { scale: number; duration: number; name: string; remaining: number };
timeEffectEnded: { name: string };
```

### 3. GameHUD.tsx - Progress Bar (Yeni Bileşen)

```typescript
// TimeEffectBar component
// - EventBus.on('timeScaleChanged') ile göster
// - Progress bar animasyonu
// - Effect icon/name gösterimi
```

---

## Kullanım Örnekleri

### Lootbox Power-Up: Slow-Mo

```typescript
// Lootbox item kullanıldığında
TimeService.activateEffect(0.2, 5000, '⏳ Bullet Time');
// 5 saniye boyunca oyun %20 hızda çalışır
```

### Boss Spawn Dramatik An

```typescript
// Boss spawn öncesi
TimeService.activateEffect(0.3, 1500, '⚠️ Boss Incoming');
// 1.5 saniye dramatik yavaşlama
```

### Near-Death Adrenaline

```typescript
// HP < 10% olduğunda
TimeService.activateEffect(0.5, 2000, '💀 Near Death');
// 2 saniye adrenaline slow-mo
```

---

## UI Bileşenleri

### TimeEffectBar.tsx

```
┌────────────────────────────────────────────┐
│  ⏳ BULLET TIME                            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  4.2s    │
└────────────────────────────────────────────┘
```

- Screen edge glow effect (slow-mo aktifken)
- Sound effect (slow-mo başlayınca)
- Timer countdown göstergesi

---

## Test Stratejisi

1. **Unit Tests:**
   - TimeService.activateEffect
   - TimeService.update (timer countdown)
   - TimeService.getScaledDelta

2. **Integration Tests:**
   - GameEngine with scaled time
   - UI progress bar updates

3. **Manual Tests:**
   - Slow-mo sırasında düşman hareketi
   - Combo timer'ın da yavaşlaması
   - UI responsiveness

## 🎯 Etkilenecek Sistemler Analizi

### Etkilenmesi GEREKEN Sistemler (Oyun İçi - Scaled Time)

| Sistem | Dosya | Nasıl Etkilenir? |
|--------|-------|------------------|
| **Düşman Hareketi** | `EnemyBehaviors.ts` | `dtFactor` scaled → yavaş hareket |
| **Mermi Hareketi** | `PhysicsSystem.ts` | `b.x += b.vx * dtFactor` → yavaş mermi |
| **Parçacıklar** | `PhysicsSystem.ts` | Particle movement + life → yavaş |
| **Gem Mıknatısı** | `PhysicsSystem.ts` | Pull speed → yavaş çekim |
| **Player Hareketi** | `GameEngine.tsx` | `player.x += ... * dtFactor` → yavaş hareket |
| **Dash Timer** | `GameEngine.tsx` | Dash süresi uzar |
| **Fire Rate** | `CombatSystem.ts` | Ateş hızı yavaşlar |
| **Knockback** | `PhysicsSystem.ts` | Geri tepme yavaş |
| **Shake/Crit Flash** | `GameEngine.tsx` | Efekt süresi uzar |
| **Spawn Timer** | `SpawnSystem.ts` | Düşman spawn yavaşlar |

### Etkilenmemesi GEREKEN Sistemler (Real-Time)

| Sistem | Dosya | Neden? |
|--------|-------|--------|
| **Wave Timer** | `GameHUD.tsx` | Hayatta kalma süresi gerçek zamanlı olmalı |
| **Session Time** | `App.tsx` | İstatistik doğruluğu için |
| **Market Data** | `useMarketData.ts` | WebSocket event-driven, oyun zamanından bağımsız |
| **Milestone Time** | `MilestoneService.ts` | Gerçek zaman milestone'ları |
| **UI Animasyonlar** | CSS | CSS animations browser tarafından yönetilir |

### ⚠️ Tartışmalı Sistemler (Tasarım Kararı Gerekli)

**Combo Timer:**
| Seçenek | Etki | Öneri |
|---------|------|-------|
| Real-time | Slow-mo sırasında combo kaybedilebilir | ❌ Oyuncuya haksızlık |
| Scaled | Slow-mo combo'yu korur | ✅ **Önerilen** |

**Dash Cooldown:**
| Seçenek | Etki | Öneri |
|---------|------|-------|
| Real-time | Aynı cooldown | Dengeli |
| Scaled | Slow-mo'da daha sık dash | ✅ Power-up hissi verir |

### 📊 Özet Diagram

```
SCALED (Oyun İçi)          REAL-TIME (Meta)
─────────────────          ────────────────
✓ Düşman hareketi          ✓ Wave timer (survival)
✓ Mermi hareketi           ✓ Session time
✓ Player hareketi          ✓ Market data
✓ Dash timer               ✓ Time milestones
✓ Fire rate                
✓ Spawn timer              TARTIŞMALI
✓ Knockback                ─────────────
✓ Particle effects         ? Combo timeout → Önerilen: Scaled
✓ Combo timeout            ? Dash cooldown → Önerilen: Scaled
```

---

## 🚨 Kritik Dezavantajlar

### 1. Oyun Dengeleme Karmaşıklığı
```
Problem: Slow-mo = Oyuncuya büyük avantaj
- Düşmanları görmek kolaylaşır
- Aim yapmak kolaylaşır
- Mermilerden kaçmak kolaylaşır
- Strateji düşünmek için zaman

Sonuç: Oyun çok kolay hissedebilir
       Leaderboard adaleti bozulabilir
```

### 2. Fire Rate Paradoksu
```
Mevcut: Fire rate = 200ms (saniyede 5 mermi)

Slow-mo 0.2x:
- Fire rate = 200ms * 5 = 1000ms (saniyede 1 mermi)
- Düşmanlar 5x yavaş ama mermiler de 5x az

Soru: Bu dengeli mi? 
Cevap: Oyuncu HALA avantajlı (aim + kaçış kolaylığı)
```

### 3. WebSocket Market Data Senkronizasyonu
```
Problem:
- Market data real-time geliyor
- Difficulty Manager market'e bağlı
- Slow-mo sırasında difficulty nasıl hesaplanacak?

Çözüm: Difficulty real-time kalmalı, sadece spawn/enemy scaled
```

---

## ⚠️ Edge Cases

### 1. Slow-Mo Sırasında Level Up
| Adım | Durum |
|------|-------|
| 1 | Slow-mo aktif (5 saniye) |
| 2 | 2. saniyede XP dolup level up olur |
| 3 | Level up ekranı açılır |
| ? | Slow-mo timer ne olur? |

**Öneri:** Slow-mo timer PAUSE olur (adil)

### 2. Slow-Mo Sırasında Pause
| Adım | Durum |
|------|-------|
| 1 | Slow-mo aktif |
| 2 | Oyuncu ESC'ye basıp pause |
| 3 | 5 dakika AFK |
| ? | Resume'da slow-mo durumu? |

**Öneri:** Timer pause'da durur (haksız kayıp önlenir)

### 3. Çoklu Slow-Mo Stack
```
Senaryo: Item 1 aktif (0.3x, 5s) + Item 2 kullanılıyor (0.2x, 8s)

Seçenekler:
A) Üst üste: 0.06x (AŞIRI YAVAŞ) ❌
B) Replace: 0.2x, 8s (eski kaybolur) ✅ ÖNERİLEN
C) Queue: İlki bitince ikinci başlar
D) En güçlü: 0.2x, MAX süre
```

### 4. Slow-Mo Bitişi Anında Collision
```
Senaryo:
1. Mermi düşmana 5 pixel kala
2. Slow-mo bitiyor (1.0x'e geçiş)
3. Düşman aniden hızlanıyor

Potansiyel Bug: Hit/miss tutarsızlığı

Çözüm: 0.5 saniyelik smooth transition (ease-out)
```

### 5. Combo Timer Davranışı
| Seçenek | Sorun |
|---------|-------|
| Combo SCALED | Unfair advantage |
| Combo REAL-TIME | Kill yapmak zor, combo kaybedilir |

**Hibrit Çözüm:** Slow-mo aktifken combo timer FROZEN (ne scaled ne real-time)

### 6. Spawn Timer + Slow-Mo
```
Spawn SCALED = Daha az düşman spawn → Ekran temizlenir

Bu istenebilir (power fantasy) ama dikkat:
- Çok güçlü olabilir
- Run başına item limiti düşünülmeli
```

---

## 🔧 Teknik Edge Cases

### Delta Time Extremes
```typescript
// Tab değiştirme + Slow-mo
rawDelta = 5000ms (5 saniye tab'da değildi)
scaledDelta = 5000 * 0.1 = 500ms

// Bu normalde yönetilir ama slow-mo timer:
// - Real-time mi? → 5 saniye ilerler, effect biter
// - Paused mu? → Tab değiştirmede pause gerekli
```

### Floating Point Precision
```typescript
// Aşırı küçük scale değerleri
scale = 0.001 → dtFactor = 0.0000167
enemy.x += 2 * 0.0000167 = 0.0000334

// Birikimli hata riski → MIN_SCALE = 0.1 limit koy
```

### Performans Etkisi
```
Normal: 60 FPS = 1 saniye oyun zamanı
Slow-mo 0.2x: 60 FPS = 0.2 saniye oyun zamanı

Ekranda daha uzun süre düşman kalır
→ Potansiyel entity birikimi
→ MAX_ENEMIES limiti bu yüzden önemli ✅
```

---

## 📊 Risk Matrisi

| Risk | Olasılık | Etki | Çözüm |
|------|----------|------|-------|
| Level up sırasında slow-mo | Yüksek | Orta | Effect pause |
| Pause sırasında slow-mo | Yüksek | Düşük | Effect pause |
| Çoklu item stack | Orta | Orta | Replace policy |
| Combo desync | Yüksek | Yüksek | Freeze combo timer |
| Market data desync | Orta | Düşük | Real-time difficulty |
| Delta time extremes | Düşük | Yüksek | Tab visibility check |
| Leaderboard fairness | Yüksek | Yüksek | Ayrı kategori/limit |

---

## 💡 Önerilen Çözümler

### Leaderboard Fairness
1. Slow-mo kullanılan run'lar ayrı kategori
2. Slow-mo süresi score hesabından düşülür
3. Run başına max 3 item limiti

### Timer Pause Standardı
```typescript
if (GameStatus !== PLAYING) {
    TimeService.pauseEffect(); // Effect timer durur
}
```

### Transition Smoothing
```typescript
// Ani hız değişimi yerine:
currentScale = lerp(currentScale, targetScale, 0.02);
// ~0.5 saniyede smooth geçiş
```

### Scale Limitleri
```typescript
const MIN_SCALE = 0.1;  // Max 10x yavaş
const MAX_SCALE = 2.0;  // Max 2x hızlı
```

---

## Notlar

- Audio pitch scaling düşünülebilir (slow-mo'da ses yavaşlar)
- Visual post-processing filter (motion blur, chromatic aberration)
- Speed-up power-up da eklenebilir (2x hız, riskli ama ödüllü)

---

**Oluşturulma:** 2025-12-19
**Son Güncelleme:** 2025-12-19
**Durum:** 📋 Planlandı (Detaylı analiz tamamlandı)
