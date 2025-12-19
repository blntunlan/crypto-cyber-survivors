# Game Engine Refactor - Task List ✅ COMPLETED

Bu dosya, kod review sonucunda belirlenen iyileştirme görevlerini içerir.

**Status:** ✅ Tamamlandı (Sadece opsiyonel Quadtree task bekliyor)

---

## 🔴 P0 - Kritik (Hemen Yapılmalı)

### Task 1: GameHUD setTimeout Memory Leak Fix
**Dosya:** `components/GameHUD.tsx`
**Sorun:** setTimeout component unmount olduğunda temizlenmiyor
**Çözüm:** 
- setTimeout ID'sini ref'te sakla
- useEffect cleanup'ta clearTimeout çağır

```typescript
// Önce
setTimeout(() => {
  setCombo(prev => ({ ...prev, milestoneText: '' }));
}, 2000);

// Sonra
const timeoutRef = useRef<NodeJS.Timeout | null>(null);
// ... event handler içinde:
if (timeoutRef.current) clearTimeout(timeoutRef.current);
timeoutRef.current = setTimeout(() => {
  setCombo(prev => ({ ...prev, milestoneText: '' }));
}, 2000);
// ... cleanup'ta:
if (timeoutRef.current) clearTimeout(timeoutRef.current);
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025)

---

### Task 2: GameHUD useEffect Dependency Fix
**Dosya:** `components/GameHUD.tsx`
**Sorun:** RAF useEffect'inde dependency array yok, her render'da restart oluyor
**Çözüm:**
- `[status]` dependency ekle
- `updateLoop` fonksiyonunu useCallback ile wrap et

```typescript
// Önce
useEffect(() => {
  requestRef.current = requestAnimationFrame(updateLoop);
  return () => { ... };
}); // ← Dependency yok!

// Sonra
useEffect(() => {
  requestRef.current = requestAnimationFrame(updateLoop);
  return () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };
}, [status]);
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025)

---


---

## 🟡 P1 - Önemli (Yakın Zamanda)

### Task 10: App.tsx "God Component" Refactoring
**Dosya:** `App.tsx` (~600 satır)
**Sorun:** Tek bir bileşende Market Mantığı, Oyun Durumu, Oyuncu Verisi ve tüm UI Ekranları (Menu, LevelUp, Pause, GameOver) toplanmış durumda.
**Çözüm:**
- **UI Ekranlarını Ayır:** 
  - `components/screens/MainMenu.tsx`
  - `components/screens/LevelUpScreen.tsx` (LevelUp ismiyle karışmasın diye Screen ekiyle)
  - `components/screens/PauseMenu.tsx`
  - `components/screens/GameOverScreen.tsx`
- **Logic'i Hook'lara Taşı:**
  - `hooks/useMarketData.ts`: MarketService bağlantısı ve ATR hesaplaması.
  - `hooks/useGameStats.ts`: Oyuncu verileri (`Player` state) ve resetleme mantığı.
- **App.tsx Rolü:** Sadece global state orkestrasyonu ve üst seviye route yönetimi.

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - UI ve Hook refactor tamamlandı, testler eklendi.

---

### Task 3: PhysicsSystem Unused Imports Cleanup
**Dosya:** `services/PhysicsSystem.ts`
**Sorun:** Bullet, Gem, Particle import edilip kullanılmıyor
**Çözüm:** Import'u şu şekilde değiştir:

```typescript
// Önce
import { Player, GameState, Bullet, Enemy, Gem, Particle } from '../types';

// Sonra
import { Player, GameState, Enemy } from '../types';
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025)

---

### Task 4: levelUpFlash Duplikasyonu Çözümü
**Dosyalar:** 
- `components/GameEngine.tsx` (satır 57, 130, 132, 143)
- `components/GameHUD.tsx` (satır 28, 65-66, 92-95)

**Sorun:** Flash hem Canvas (GameState) hem React (GameHUD) tarafından yönetiliyor
**Çözüm Seçenekleri:**

**Seçenek A - Tamamen React'a Taşı (Önerilen):**
1. GameState'ten `levelUpFlash` alanını kaldır
2. GameEngine'den flash logic'i kaldır
3. GameHUD'daki EventBus listener yeterli

**Seçenek B - Tamamen Canvas'ta Bırak:**
1. GameHUD'dan flash state ve rendering kaldır
2. GameRenderer'da flash overlay ekle

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - Seçenek A uygulandı, GameState'ten kaldırıldı

---

### Task 5: Flash Decay Frame-Rate Independence
**Dosya:** `components/GameHUD.tsx`
**Sorun:** `prev - 0.05` sabit değer kullanıyor, farklı FPS'lerde farklı davranıyor
**Çözüm Seçenekleri:**

**A) CSS Transition Kullan:**
```tsx
<div 
  className="absolute inset-0 bg-white transition-opacity duration-500"
  style={{ opacity: flash > 0 ? 0.5 : 0 }}
/>
```

**B) deltaTime Kullan:**
```typescript
const lastTimeRef = useRef(performance.now());
// updateLoop içinde:
const now = performance.now();
const dt = (now - lastTimeRef.current) / 1000;
lastTimeRef.current = now;
setFlash(prev => Math.max(0, prev - dt * 2)); // 0.5 saniyede fade
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - Seçenek A (CSS Transition) uygulandı

---

## 🟢 P2 - İyileştirme (Zaman Olduğunda)

### Task 6: Extract CombatSystem (Firing Logic)
**Dosyalar:** 
- Yeni: `services/CombatSystem.ts`
- Güncelle: `components/GameEngine.tsx`

**Sorun:** ~40 satır firing logic hala GameEngine içinde (satır 168-211)
**Çözüm:**

```typescript
// services/CombatSystem.ts
export class CombatSystem {
  public static processAutoFire(
    pool: PoolManager,
    player: Player,
    state: GameState,
    time: number
  ): void {
    if (time - state.lastFireTime <= player.fireRate) return;
    
    const nearest = this.findNearestEnemy(pool, player);
    if (!nearest) return;
    
    this.fireBullets(pool, player, nearest, state, time);
    state.lastFireTime = time;
    audio.playShoot();
  }
  
  private static findNearestEnemy(...) { ... }
  private static fireBullets(...) { ... }
}

// GameEngine.tsx'de kullanım:
CombatSystem.processAutoFire(p, player, s, time);
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - CombatSystem.ts oluşturuldu

---

### Task 7: Move Background Animation to Renderer
**Dosyalar:**
- Güncelle: `services/GameRenderer.ts`
- Güncelle: `components/GameEngine.tsx`

**Sorun:** Background candle animation logic GameEngine'de (satır 111-123)
**Çözüm:**

```typescript
// GameRenderer.ts
public updateBackgroundCandles(
  candles: Candle[],
  pnl: number,
  difficulty: number,
  dtFactor: number,
  width: number,
  height: number
): void {
  const trendMultiplier = pnl >= 0 ? -1 : 1;
  candles.forEach(c => {
    const volatilitySpeed = c.speed * (1 + difficulty / 1.5);
    c.y += volatilitySpeed * trendMultiplier * dtFactor;
    // wrap logic...
  });
}
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - updateBackgroundCandles metodu eklendi

---

## 🟢 P3 - Nice-to-Have

### Task 8: SpawnSystem Magic Numbers
**Dosya:** `services/SpawnSystem.ts`
**Sorun:** Spawn offset olarak hardcoded `50` kullanılıyor
**Çözüm:**

```typescript
// constants.ts'e ekle
GAME_ENGINE: {
  // ...mevcut
  SPAWN_OFFSET: 50,
}

// SpawnSystem.ts'de kullan
if (edge === 0) {
  x = Math.random() * width;
  y = -GAME_ENGINE.SPAWN_OFFSET;
}
// vs.
```

**Durum:** [x] ✅ Tamamlandı (18 Aralık 2025) - SPAWN_OFFSET constant eklendi

---

### Task 9: Add Spatial Partitioning (Quadtree)
**Dosyalar:**
- Yeni: `services/SpatialGrid.ts` veya `services/Quadtree.ts`
- Güncelle: `services/PhysicsSystem.ts`

**Sorun:** O(n²) collision check - 100 enemy × 50 bullet = 5000 check/frame
**Çözüm:** Quadtree veya spatial grid ile O(n log n) veya O(n) yap

**Not:** Bu advanced optimization, öncelik düşük. Entity sayısı 500+ olduğunda düşünülür.

**Durum:** [ ] Bekliyor

---

## 📊 İlerleme Özeti

| Öncelik | Toplam | Tamamlanan | Yüzde |
|---------|--------|------------|-------|
| P0 | 2 | 2 | 100% ✅ |
| P1 | 4 | 4 | 100% ✅ |
| P2 | 2 | 2 | 100% ✅ |
| P3 | 2 | 1 | 50% (Opsiyonel) |
| **Toplam** | **10** | **9** | **90%** |

---

## 🚀 Önerilen Sıra

1. ✅ Task 1-5 (Kritik bug fixler tamam)
2. 🔄 Task 10 - App.tsx Refactoring (Önerilen)
3. ⏸️ Task 6-9 - İyileştirmeler
