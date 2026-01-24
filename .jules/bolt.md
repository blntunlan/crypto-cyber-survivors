## 2025-02-20 - Redundant Double-Kill Logic in High-Frequency Loops
**Learning:** In the collision loop, failing to check `enemy.isDying` immediately after a bullet impact allowed subsequent bullets in the same frame to trigger `handleEnemyDeath` multiple times. This caused redundant event emissions, particle spawning, and potential logic errors (double rewards).
**Action:** Always verify if an entity is still valid/alive *after* a potential state change (like taking damage) within the same iteration loop, especially when processing batches (like multiple bullets per frame).
