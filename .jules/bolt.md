## 2025-05-23 - ProjectileRenderer Allocation Optimization
**Learning:** `ProjectileRenderer` was allocating 3 arrays (`normals`, `crits`, `superCrits`) per frame in Retro mode.
**Action:** Replaced local array variables with reused class properties (`this.retroNormals`, etc.) to eliminate per-frame allocation and reduce GC pressure.
