---
description: LevelUpScreen bileşenini modüler yapıya refactor etme adımları
---

# LevelUpScreen Refactoring Workflow

## Ön Koşullar
- Tüm testler geçiyor olmalı (`npm test`)
- Lint hataları olmamalı (`npm run lint`)
- Mevcut durumun commit'lenmiş olması

## Faz 1: Klasör Yapısını Oluştur

### 1.1 Yeni klasör oluştur
```bash
mkdir -p components/screens/LevelUpScreen
```

### 1.2 Dosya yapısı
```
components/screens/LevelUpScreen/
├── index.ts                    # Ana export
├── LevelUpScreen.tsx           # Ana bileşen
├── SlotReel.tsx               # Slot animasyon bileşeni
├── CardIcon.tsx               # İkon render bileşeni
├── LevelUpErrorBoundary.tsx   # Error boundary
├── constants.ts               # SLOT_CONFIG, animation variants
└── types.ts                   # Interface tanımları
```

---

## Faz 2: Types ve Constants Ayır

### 2.1 types.ts oluştur
Aşağıdaki interface'leri taşı:
- `LevelUpScreenProps`
- `SlotReelProps`
- `ErrorBoundaryState`

### 2.2 constants.ts oluştur
Aşağıdakileri taşı:
- `SLOT_CONFIG` objesi
- `containerVariants` animation variants
- `titleVariants` animation variants

// turbo
### 2.3 Testleri çalıştır
```bash
npm test -- tests/screens/LevelUpScreen.test.tsx
```

---

## Faz 3: Error Boundary Ayır

### 3.1 LevelUpErrorBoundary.tsx oluştur
- `LevelUpErrorBoundary` class component'ını taşı
- `ErrorBoundaryState` interface'i types.ts'den import et

### 3.2 Import'ları güncelle
Ana dosyada:
```tsx
import { LevelUpErrorBoundary } from './LevelUpErrorBoundary';
```

---

## Faz 4: CardIcon Ayır

### 4.1 CardIcon.tsx oluştur
- `toPascalCase` helper fonksiyonunu taşı
- `MemoizedCardIcon` bileşenini taşı
- Lucide imports ekle
- Custom icon imports ekle (IconMarketChart, IconAlphaEye, vs.)

### 4.2 Export et
```tsx
export const CardIcon = React.memo(MemoizedCardIcon);
```

// turbo
### 4.3 Test et
```bash
npm test -- tests/screens/LevelUpScreen.test.tsx
```

---

## Faz 5: SlotReel Ayır

### 5.1 SlotReel.tsx oluştur
- `SlotReel` bileşenini taşı
- `SlotReelProps` interface'i types.ts'den import et
- `CardIcon` bileşenini import et
- `SLOT_CONFIG` ve animation variants'ı constants.ts'den import et

### 5.2 Export et
```tsx
export const SlotReel: React.FC<SlotReelProps> = memo(({ ... }) => { ... });
```

---

## Faz 6: Ana Bileşeni Temizle

### 6.1 LevelUpScreen.tsx güncelle
Sadece şunlar kalmalı:
- State yönetimi (stoppedCount, stopOrder)
- useEffect (audio, debug info)
- SlotReel render
- LevelUpErrorBoundary wrapper

### 6.2 Import'ları düzenle
```tsx
import { LevelUpScreenProps } from './types';
import { SLOT_CONFIG, containerVariants, titleVariants } from './constants';
import { LevelUpErrorBoundary } from './LevelUpErrorBoundary';
import { SlotReel } from './SlotReel';
```

---

## Faz 7: Index Export

### 7.1 index.ts oluştur
```tsx
export { LevelUpScreen } from './LevelUpScreen';
export type { LevelUpScreenProps } from './types';
```

### 7.2 Eski dosyayı sil
```bash
rm components/screens/LevelUpScreen.tsx
```

### 7.3 Import'ları güncelle
App.tsx ve diğer dosyalarda:
```tsx
// Eskisi
import { LevelUpScreen } from './components/screens/LevelUpScreen';
// Yenisi (aynı kalır, index.ts sayesinde)
import { LevelUpScreen } from './components/screens/LevelUpScreen';
```

---

## Faz 8: Final Kontrol

// turbo
### 8.1 Lint kontrolü
```bash
npm run lint
```

// turbo
### 8.2 Tüm testleri çalıştır
```bash
npm test
```

// turbo
### 8.3 Build kontrolü
```bash
npm run build
```

### 8.4 Manuel test
1. Oyunu başlat
2. Level up ekranını tetikle (düşman öldür, XP topla)
3. Kartların düzgün göründüğünü kontrol et
4. Kart seçiminin çalıştığını kontrol et
5. Mobil görünümü test et

---

## Faz 9: Commit

```bash
git add .
git commit -m "refactor: modularize LevelUpScreen into separate components"
```

---

## Geri Alma (Rollback)

Eğer sorun çıkarsa:
```bash
git checkout HEAD~1 -- components/screens/LevelUpScreen.tsx
rm -rf components/screens/LevelUpScreen/
```

---

## Dosya Boyutu Hedefleri

| Dosya | Hedef Satır |
|-------|-------------|
| types.ts | ~20 |
| constants.ts | ~50 |
| LevelUpErrorBoundary.tsx | ~50 |
| CardIcon.tsx | ~100 |
| SlotReel.tsx | ~180 |
| LevelUpScreen.tsx | ~120 |
| index.ts | ~5 |
| **TOPLAM** | ~525 (mevcut: 534) |

---

## Notlar

- Her fazdan sonra test çalıştır
- Bir şey bozulursa o fazı geri al, düzelt, devam et
- Commit'leri küçük tut (faz başına 1 commit olabilir)
- IDE'nin "Rename Symbol" özelliğini kullan import güncellemeleri için
