# Analiz: Düşmanların Üst Üste Binmesi (Enemy Clumping) Sorunu

## 1. Mevcut Durum (Current State)
Oyunda düşmanlar (Enemy), hedefe (Player) ulaştıklarında veya aynı rotayı takip ettiklerinde tek bir noktada toplanarak üst üste biniyorlar. Bu durum, yüzlerce düşmanın bazen tek bir düşman gibi görünmesine neden oluyor.

## 2. Kök Neden Analizi (Root Cause)
Koddaki incelemeler sonucunda sorunun nedenleri şunlardır:
*   **Bağımsız Hareket Mantığı (`strategies/EnemyBehaviors.ts`):** Her düşman sadece oyuncunun koordinatlarını baz alarak hareket ediyor. Diğer düşmanların nerede olduğunu kontrol etmedikleri için hepsi en kısa yoldan (aynı nokta) oyuncuya gitmeye çalışıyor.
*   **Eksik Çarpışma Çözümleme (`services/physics/CollisionSystem.ts`):** Mevcut fizik sistemi; `Oyuncu-Düşman` ve `Mermi-Düşman` etkileşimlerini hesaplıyor ancak `Düşman-Düşman` itme kuvveti veya çarpışma kontrolü (Collision Resolution) sistemde yer almıyor.
*   **Yarıçap İhlali:** Fizik motoru düşmanları birer "nokta" gibi görüyor, oysa her birinin bir `radius` (yarıçap) değeri var. Bu yarıçaplar hareket sırasında korunmuyor.

## 3. Olumsuz Etkiler (Negative Impacts)
*   **Görsel Kalite:** Düşman çeşitliliği ve kalabalık sürüsü hissi kayboluyor; oyun "tek bir dev düşman" varmış gibi hissettiriyor.
*   **Oyun Dengesi (Balance):** Alan etkili (AOE) silahlar veya mermiler, üst üste binmiş 50 düşmana aynı anda vurarak oyunun zorluk dengesini bozuyor.
*   **Performans Yanılgısı:** Oyuncu ekranda az düşman görüyor sanırken aslında üst üste binmiş yüzlerce düşmanın update döngüsü CPU'yu yormaya devam ediyor.

## 4. Önerilen Çözümler (Proposed Solutions)

### A. Ayrışma Kuvveti (Separation Steering Force) - **[En İyi Çözüm]**
"Boids" algoritmasının bir parçası olan *Separation* mantığı uygulanır. Her düşman, çok yakınındaki arkadaşlarına bakıp onları hafifçe ters yöne iten küçük bir kuvvet uygular.
*   **Uygulama:** Mevcut `SpatialGrid` (enemyGrid) kullanılarak O(N) karmaşıklığında, sadece en yakındaki düşmanlar kontrol edilerek yapılır.
*   **Avantajı:** Çok doğal, organik ve akışkan bir sürü (swarm) hareketi sağlar. Titreme yapmaz.

### B. Sert Çarpışma Çözümleme (Hard Collision Resolution)
Eğer iki düşman birbirinin yarıçapı içine girerse (overlap), matematiksel olarak birbirlerinden uzaklaştırılırlar (`pos += normal * overlap`).
*   **Avantajı:** Üst üste binmeyi matematiksel olarak %100 engeller.
*   **Dezavantajı:** Çok kalabalık sahnelerde (wall of enemies) düşmanların ışınlanıyor veya titriyor gibi görünmesine neden olabilir.

### C. Hız Sapması (Velocity Perturbation)
Her düşman tipi için oyuncuya giden yola küçük bir "jitter" veya farklı hız çarpanları eklenir. 
*   **Avantajı:** Çok düşük işlem maliyeti.
*   **Dezavantajı:** Tam bir çözüm değildir; düşmanlar eninde sonunda oyuncunun üzerinde yine birleşeceklerdir.

## 5. Teknik Uygulama Planı (Öneri)

Aşağıdaki adımlarla **Separation Steering** implementasyonu sisteme eklenebilir:

1.  **MovementSystem Güncelleme:** `MovementSystem.updateEnemies` döngüsü içine bir "Separation" adımı eklenir.
2.  **Grid Sorgusu:** Her düşman için `enemyGrid.forEachNearby` kullanılarak komşu düşmanlar bulunur.
3.  **İtme Vektörü Hesabı:** 
    ```typescript
    const dx = enemy.x - neighbor.x;
    const dy = enemy.y - neighbor.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = (enemy.radius + neighbor.radius);
    if (dist < minDist) {
        // İtme kuvveti
        const force = (minDist - dist) / minDist;
        separationX += (dx / dist) * force;
        separationY += (dy / dist) * force;
    }
    ```
4.  **Kuvvet Uygulama:** Hesaplanan bu küçük "itme", düşmanın ana hedefine olan hareket vektörüne eklenir.

---
**Özet:** Sorun, düşmanların birbirini hissetmemesidir. **Separation Steering** ekleyerek hem görsel derinliği artırabilir hem de oyunun "Vampire Survivors" tarzı sürü (horde) hissini güçlendirebiliriz.
