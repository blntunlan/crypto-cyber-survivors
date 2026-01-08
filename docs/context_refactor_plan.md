# Context Pattern Refactoring Plan

Bu doküman, uygulamanın React Context Pattern ile yeniden yapılandırılmasını planlar. Amaç: state management iyileştirmesi, "prop drilling" azaltımı ve modülerlik artışı.

---

## Neden Context Pattern?

**Mevcut Durum:**
1. **Static Singletons**: `UserSessionService`, `AudioService` - React lifecycle ile uyumsuz
2. **Prop Drilling**: `App.tsx` → `GameEngine` → `GameUI` zincirleme prop geçişleri
3. **Karmaşık Root State**: `App.tsx` çok fazla state yönetiyor

**Hedef:**
- `useUser()`, `useAudio()`, `useGame()` hook'ları ile erişim
- Otomatik re-render yalnızca ilgili değişikliklerde
- Test edilebilir ve modüler yapı

---

## Context Listesi

| # | Context | Öncelik | Karmaşıklık | Bağımlılıklar |
|---|---------|---------|-------------|---------------|
| 1 | UserContext | 🔴 Yüksek | Düşük | localStorage, Supabase |
| 2 | AudioContext | 🟡 Orta | Orta | Howler, localStorage |
| 3 | GameContext | 🔴 Yüksek | Yüksek | MarketData, PlayerState, GameStatus |
| 4 | SettingsContext | 🟡 Orta | Düşük | ThemeContext genişlemesi |

---

## 1. UserContext

### Proposed Interface
```typescript
interface UserContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => void;
  updateLastSeen: () => Promise<void>;
}
```

### Etkilenen Dosyalar
- `services/UserSessionService.ts` → Context'e dönüşecek
- `components/screens/NicknameEntryScreen.tsx` → `useUser` kullanacak
- `components/screens/MainMenu.tsx` → `useUser` kullanacak
- `App.tsx` → Provider sarmalama

---

## 2. AudioContext

### Proposed Interface
```typescript
interface AudioContextType {
  isMuted: boolean;
  masterVolume: number;
  toggleMute: () => void;
  setVolume: (vol: number) => void;
  playSound: (id: string) => void;
  playMusic: (trackId: string) => void;
}
```

### Etkilenen Dosyalar
- `services/audio/AudioService.ts` → Context wrapper
- `components/settings/SettingsPanel.tsx` → `useAudio` kullanacak
- `components/ui/PauseMenu.tsx` → `useAudio` kullanacak
- `App.tsx` → `isMuted` state kaldırılacak

---

## 3. GameContext

### Proposed Interface
```typescript
interface GameContextType {
  status: GameStatus;
  market: MarketData;
  player: PlayerStats;
  controls: {
    startGame: (options: GameOptions) => void;
    pauseGame: () => void;
    resumeGame: () => void;
    endGame: (reason: string) => void;
  };
}
```

### Etkilenen Dosyalar
- `App.tsx` → State'ler GameProvider'a taşınacak
- `components/GameEngine.tsx` → `useGame` kullanacak
- `components/GameUI.tsx` → `useGame` kullanacak
- `hooks/useMarketData.ts` → GameProvider içine entegre

---

## 4. SettingsContext

### Proposed Interface
```typescript
interface SettingsContextType {
  theme: 'retro' | 'cyberpunk';
  graphicsQuality: 'low' | 'medium' | 'high';
  showDebug: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
```

---

# Refactoring Roadmap

## Phase 1: UserContext (Öncelik: Yüksek)

### Faz 1.1: Hazırlık (Refactor Workflow)
- [x] Baseline testleri çalıştır: `npm run test`
- [x] `UserSessionService.ts` test coverage kontrol
- [x] Bağımlı dosyaları listele (grep ile)

### Faz 1.2: Keşfet (Feature Workflow)
- [x] `UserSessionService.ts` implementasyonunu incele
- [x] `NicknameEntryScreen` ve `MainMenu` user logic'ini analiz et
- [x] Supabase entegrasyon noktalarını belirle

### Faz 1.3: Planla
- [x] `contexts/UserContext.tsx` oluştur
- [x] `UserProvider` component yaz
- [x] `useUser` hook export et (`contexts/useUser.ts`)
- [x] Migration stratejisi belirle (breaking changes?)

### Faz 1.4: Kodla (TDD)
- [x] `tests/contexts/UserContext.test.tsx` yaz
- [x] Testlerin başarısız olduğunu doğrula
- [x] `UserProvider` implementasyonu yap
- [x] Testlerin geçtiğini doğrula (7 test passed)

### Faz 1.5: Entegrasyon
- [x] `App.tsx`'e `UserProvider` ekle
- [x] `NicknameEntryScreen` → `useUser` migrasyon
- [ ] `MainMenu` → `useUser` migrasyon (user verisi kullanılmıyor, gerek yok)
- [x] Tüm testleri çalıştır (1235 test passed)

### Faz 1.6: Doğrula
- [x] `npm run lint:fix` (1 warning - fast refresh, kabul edilebilir)
- [x] `npm run test` (1235 test passed)
- [ ] Manuel test (login/logout flow)
- [ ] Commit: `refactor(auth): implement UserContext`

---

## Phase 2: AudioContext (Öncelik: Orta)

### Faz 2.1: Hazırlık
- [ ] `AudioService.ts` analizi
- [ ] Mevcut `isMuted` state kullanımları
- [ ] localStorage persistence logic

### Faz 2.2: Kodla
- [ ] `contexts/AudioContext.tsx` oluştur
- [ ] `AudioProvider` implementasyonu
- [ ] `useAudio` hook

### Faz 2.3: Entegrasyon
- [ ] `SettingsPanel` → `useAudio`
- [ ] `PauseMenu` → `useAudio`
- [ ] `App.tsx` → `isMuted` state kaldır

### Faz 2.4: Doğrula
- [ ] Lint + Test
- [ ] Commit: `refactor(audio): implement AudioContext`

---

## Phase 3: GameContext (Öncelik: Yüksek - Karmaşık)

### Faz 3.1: Hazırlık
- [ ] `App.tsx` state analizi (gameStatus, marketData, playerStats)
- [ ] `GameEngine` ve `GameUI` prop bağımlılıkları
- [ ] `useMarketData`, `usePlayerState` hook'ları analizi

### Faz 3.2: Planlama
- [ ] State migration stratejisi
- [ ] Breaking changes değerlendirmesi
- [ ] Performans impact analizi (context re-renders)

### Faz 3.3: Kodla
- [ ] `contexts/GameContext.tsx` oluştur
- [ ] Alt context'lere ayır (MarketContext, PlayerContext?)
- [ ] `useGame`, `useMarket`, `usePlayer` hooks

### Faz 3.4: Entegrasyon
- [ ] `App.tsx` → `GameProvider` sarmalama
- [ ] `GameEngine` prop'ları → Context
- [ ] `GameUI` prop'ları → Context

### Faz 3.5: Cleanup
- [ ] Kullanılmayan prop'ları kaldır
- [ ] Test güncellemeleri
- [ ] Commit: `refactor(game): implement GameContext`

---

## Phase 4: Cleanup & Documentation

- [ ] Eski static service kullanımlarını kaldır
- [ ] JSDoc güncellemeleri
- [ ] Test Provider wrapper'ları oluştur
- [ ] Performance profiling

---

# Status Tracker

| Phase | Durum | Başlangıç | Bitiş | Notes |
|-------|-------|-----------|-------|-------|
| Phase 1: UserContext | ✅ Neredeyse Tamamlandı | 2026-01-09 | - | Context, tests, entegrasyon tamamlandı. Manuel test bekliyor. |
| Phase 2: AudioContext | ⏳ Beklemede | - | - | - |
| Phase 3: GameContext | ⏳ Beklemede | - | - | - |
| Phase 4: Cleanup | ⏳ Beklemede | - | - | - |

---

# Risk Assessment

| Risk | Olasılık | Etki | Mitigation |
|------|----------|------|------------|
| Context re-render performance | Orta | Yüksek | useMemo, context splitting |
| Breaking changes | Düşük | Orta | Incremental migration |
| Test failures | Orta | Düşük | TDD yaklaşımı |
| Supabase entegrasyon | Düşük | Orta | Lazy loading, fallback |
