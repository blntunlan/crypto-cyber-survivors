## 2024-05-11 - Combat System Nearest Target Object Unboxing
**Learning:** In the heavily iterated spatial loops (like `findNearestEnemy` in CombatSystem), constantly allocating temporary result objects (`{ x, y, distSq, speed }`) on every better match creates unnecessary GC pressure that can impact frame stability.
**Action:** Unbox temporary structure updates into primitive local variables during the inner loops of hot paths. Only allocate and return the final encapsulating object after the loop finishes.
