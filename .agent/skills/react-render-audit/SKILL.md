---
name: react-render-audit
description: Analyze React components for re-render performance, hook usage, and state management bugs.
---

# React Render & State Audit Skill

Bu skill, React bileşenlerinin verimliliğini, hook kullanımlarını ve state yönetim hatalarını (Zustand entegrasyonu dahil) analiz eder. UI takılmalarını ve state senkronizasyon hatalarını (bugları) önlemeyi hedefler.

## Usage

```
/react-render-audit [component_path]
```

## Workflow

### 1. Re-render Triggers

Gereksiz render tetikleyicilerini kontrol et. Object/Array referanslarının `useMemo` veya `useCallback` olmadan prop olarak geçilip geçilmediği.

```bash
# Inline object/function prop geçişlerini ara
grep -r "={{" components/ # Inline object
grep -r "={() =>" components/ # Inline function
```

**Kural:** Büyük listeler veya sık güncellenen bileşenlerde (örn. `GameUI`, `HUD`) inline object/function prop'lardan kaçınılmalı.

### 2. Zustand State Selection

Global state'e (Zustand) bağlanırken sadece gerekli dilimlerin (slices) seçilip seçilmediği.

```bash
# useGameStore kullanımını kontrol et
grep -r "useGameStore(" components/
```

**Kural:** `useGameStore(state => state)` ŞEKLİNDE TÜM STATE'İ SEÇMEK YASAKTIR. `state => state.gold` gibi atomik seçimler yapılmalı veya `useShallow` kullanılmalıdır.

### 3. Hook Dependencies

`useEffect` ve `useCallback` bağımlılık dizilerinin doğruluğu (ESLint kuralı `react-hooks/exhaustive-deps` genellikle yakalar ama manuel mantık kontrolü gerekir).

- **Senaryo:** `useEffect` içinde kullanılan bir değişkenin dependency array'de olmaması (stale closure bug).
- **Aksiyon:** `npm run lint` çıktısındaki warning'leri "error" gibi ele al.

### 4. Heavy Computation in Render

Render gövdesinde (return öncesi) yapılan ağır işlemler.

```bash
# Render içinde map/filter/find işlemlerini ara
grep -r ".map(" components/ --context=2
grep -r ".filter(" components/ --context=2
```

**Kural:** Render sırasında yapılan list filtering/sorting işlemleri `useMemo` içine alınmalıdır.

### 5. Context vs Props vs Store

Veri akışının doğru olup olmadığını kontrol et.
- **Context:** Tema, Dil gibi seyrek değişen veriler için.
- **Zustand:** Oyun durumu, Market verisi gibi sık değişen veriler için.
- **Props:** Sadece 1-2 seviye aşağı inecek veriler için.

## Reporting

Bulguları şu başlıklar altında raporla:

### ⚛️ React Performance Issues
- **Wasted Renders**: [Component] (Inline props, Missing memo)
- **State Selection**: [Component] (Bad Zustand selector)
- **Heavy Compute**: [Component] (Unmemoized calculation)

### 🐛 Potential Bugs
- **Stale Closures**: [Hook] (Missing deps)
- **Race Conditions**: [Effect] (Async state update without cancel)

### 🛠️ Refactor Suggestions
- [ ] Wrap `handleX` in `useCallback` in `GameUI.tsx`
- [ ] Use `useShallow` for `playerStats` in `HUD.tsx`
