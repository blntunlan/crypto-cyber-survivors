# 🏗️ App.tsx Refactoring Blueprint

`App.tsx` bileşeni şu an ~600 satıra ulaşmış bir "God Component" durumundadır. Bu doküman, bu devasa yapıyı modüler ve sürdürülebilir bir mimariye bölmek için uygulanacak teknik adımları içerir.

## 🎯 Hedef
- `App.tsx` satır sayısını <150'ye düşürmek.
- İş mantığını (Market, Session) UI katmanından ayırmak.
- Bileşenlerin (Screens) bağımsız olarak test edilebilir olmasını sağlamak.

---

## 📋 Mevcut Sorumluluk Tablosu (Analiz)

| Sorumluluk | Mevcut Konum | Hedef Konum |
|------------|--------------|-------------|
| Market & ATR Logic | `App.tsx` | `hooks/useMarketData.ts` |
| Player State & Stats | `App.tsx` | `hooks/usePlayerState.ts` |
| Game State Management | `App.tsx` | `App.tsx` (Core Logic) |
| Main Menu UI | Render Block | `components/screens/MainMenu.tsx` |
| Level Up UI | Render Block | `components/screens/LevelUpScreen.tsx` |
| Pause Menu UI | Render Block | `components/screens/PauseMenu.tsx` |
| Game Over UI | Render Block | `components/screens/GameOverScreen.tsx` |

---

## 🛠️ Uygulama Planı

### Faz 1: UI Ekranlarının Ayrılması (Extract Components)
İlk aşamada sadece arayüz kodları dışarı taşınır. Bu sayede `App.tsx` içindeki devasa JSX blokları temizlenir.

1.  **MainMenu:** `position` seçimi ve `Settings` butonu buraya taşınır.
2.  **LevelUpScreen:** `CardSystem` entegrasyonu ve seçim mantığı buraya taşınır.
3.  **PauseMenu:** Run istatistikleri ve sistem butonları buraya taşınır.
4.  **GameOverScreen:** P&L özeti ve final istatistikleri buraya taşınır.

### Faz 2: Custom Hook'ların Oluşturulması (Extract Logic)
Bileşen içindeki `useEffect` ve `useCallback` kalabalığı hook'lara çekilir.

1.  **`useMarketData`:**
    *   WebSocket bağlantısı.
    *   Price history & ATR hesaplamaları.
    *   Return: `{ marketData, entryPrice, setEntryPrice, ... }`
2.  **`usePlayerStats`:**
    *   Player ref yönetimi.
    *   Reset logic.
    *   Heal on level up logic.

### Faz 3: App.tsx'in Orkestrasyon Rolü
Tüm parçalar birleştirilir. `App.tsx` artık sadece şuna benzer:

```tsx
export const App = () => {
  const { marketData, ... } = useMarketData();
  const { player, resetPlayer, ... } = usePlayerStats();
  const [status, setStatus] = useState(GameStatus.MENU);

  return (
    <main>
      <GameEngine status={status} player={player} ... />
      
      {status === MENU && <MainMenu onStart={...} />}
      {status === LEVEL_UP && <LevelUpScreen onSelect={...} />}
      {/* ...diğer ekranlar */}
    </main>
  );
}
```

---

## 🚦 Başarı Kriterleri
- [ ] `App.tsx` içinde hiç `useEffect` (global olmayan) kalmaması.
- [ ] Ekranların (Screens) kendi içinde `prop-types` kullanması.
- [ ] `npm run test` komutunun tüm aşamalarda yeşil kalması.
- [ ] Yeni bir ekran (Settings vb.) eklemenin `App.tsx`'i değiştirmeden yapılabilmesi.

---

## 🚀 Başlama Talimatı
Refactoring'e **Faz 1: MainMenu Extraction** ile başlanması önerilir. Bu, en az riskli ve en hızlı temizlik sağlayan adımdır.
