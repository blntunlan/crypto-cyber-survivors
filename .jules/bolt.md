## 2025-03-01 - Zero Allocation For Loops
**Learning:** Converting forEach to for loops in tight game loops is necessary, but under noUncheckedIndexedAccess, array access requires an undefined check, and early returns must be converted to continue.
**Action:** Always add `if (item === undefined) continue;` when refactoring iterators.
