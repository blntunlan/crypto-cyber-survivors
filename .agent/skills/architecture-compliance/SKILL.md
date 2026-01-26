---
name: architecture-compliance
description: Enforce high-level architectural patterns and performance rules (Pooling, SpatialGrid, Singletons).
---

# Architecture & Performance Compliance Skill

Bu skill, projenin `GEMINI.md` ve `docs/ARCHITECTURE.md` dosyalarında belirtilen kritik mimari ve performans kurallarına uyup uymadığını denetler. Amaç, sistemin ölçeklenebilirliğini korumak ve performans darboğazlarını (bugs) erkenden yakalamaktır.

## Usage

```
/architecture-compliance [module_path]
```

## Workflow

### 1. Performance: Object Creation in Hot Paths

Oyun döngüsü (update/render) içinde sürekli obje oluşturulup oluşturulmadığını kontrol et.

```bash
# new keyword'ünün GameEngine veya loop içindeki kullanımını ara
grep -r "new " components/GameEngine.tsx services/renderers/ --context=2
```

**Kural:** `update` veya `render` metodları içinde `new Vector2`, `new Error`, veya object literal `{}` oluşturulmamalıdır. `PoolManager` kullanılmalıdır.

### 2. Performance: Collision & Distance Checks

Mesafe ve çarpışma kontrollerinde O(N^2) algoritmalardan kaçınılması.

```bash
# İç içe döngüleri veya SpatialGrid kullanılmayan aramaları tespit et
grep -r ".forEach" services/CombatSystem.ts services/PhysicsSystem.ts --context=3
```

**Kural:** Düşman/Mermi aramaları için `SpatialGrid` kullanılmalıdır. Array üzerinde `find` veya `filter` kullanımı, eğer liste büyükse yasaktır.

### 3. Service Architecture: Singleton Pattern

Servislerin doğru şekilde singleton olarak oluşturulduğunu ve state'i kapsüllediğini doğrula.

```bash
# Singleton instance kontrolü
grep -r "static instance" services/
```

**Kural:**
- Servislerin `constructor`'ı `private` olmalıdır.
- State dışarıya direkt `public` açılmamalı, getter/setter veya metodlar kullanılmalıdır.
- `EventBus` üzerinden iletişim kurulmalıdır.

### 4. Memory Management: Event Listeners

Event listener'ların temizlenip temizlenmediğini kontrol et. React bileşenlerinde `useEffect` cleanup fonksiyonları ve Servislerde `dispose`/`reset` metodları.

```bash
# EventBus.on kullanıp off kullanmayan yerleri basitçe tara (Manuel review gerekebilir)
grep -r "EventBus.on" components/
grep -r "EventBus.off" components/
```

**Kural:** Her `EventBus.on` veya `window.addEventListener` için bir `off`/`remove` karşılığı olmalıdır.

### 5. Data Flow: Hardcoded Values

Magic number'ların ve hardcoded konfigürasyonların kullanımını engelle.

```bash
# Sayısal değerlerin kod içine gömüldüğü yerleri (tahmini) ara
grep -rP " = [0-9]{2,}" components/Game* 
```

**Kural:** Hız, hasar, can gibi değerler `config/` altındaki dosyalardan (`GameConfig.ts`, `EnemyConfig.ts`) gelmelidir.

## Reporting

Bulguları şu başlıklar altında raporla:

### 🏗️ Architectural Violations
- **Pooling Misses**: [Dosya/Satır] (Loop içinde `new` kullanımı)
- **Grid Usage**: [Dosya] (SpatialGrid yerine array scan)
- **Singleton Issues**: [Servis] (Public state veya instance hatası)

### ⚠️ Memory & Resources
- **Event Leaks**: [Component] (Cleanup eksik)

### ✅ Compliance Score
- Mimari kurallara uyum durumu: (High/Medium/Low)
