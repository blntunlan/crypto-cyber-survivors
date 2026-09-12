## 2024-03-24 - Zero-Allocation Spatial Target Filtering
**Learning:** In high-frequency 60FPS loops (like findNearestEnemy), using inline closures with forEachInRange creates significant garbage collection pressure due to function allocation per frame per enemy query. The codebase supports forEachInRangeWithContext specifically to bypass this.
**Action:** Use a static shared targeting context (e.g., TARGETING_CONTEXT) and a standalone function reference with forEachInRangeWithContext instead of inline closures with forEachInRange.
