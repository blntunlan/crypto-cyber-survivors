## $(date +%Y-%m-%d) - Array.forEach to for loops in hot paths
**Learning:** In high-frequency game engine loops (like 60 FPS update paths in `MovementSystem.ts` and `EntityRenderer.ts`), `Array.prototype.forEach` causes unnecessary closure function allocations per entity, per frame, leading to increased GC pressure and micro-stutters.
**Action:** Replace `Array.prototype.forEach` with standard `for` loops (`for (let i = 0, len = arr.length; i < len; i++)`) in engine subsystems. Ensure `return` is converted to `continue` and guard against sparse arrays with `if (arr[i] === undefined) continue;`.

## 2024-05-14 - pnpm and npm ci in Github Actions
**Learning:** `npm ci` fails if `package.json` and `package-lock.json` are not perfectly in sync, which can occur if someone uses `pnpm install` at the root and updates a common dependency without pushing `package-lock.json` changes.
**Action:** When making small fixes, avoid regenerating or pushing `package-lock.json` files unless it is explicitly requested, as modifying lockfiles can cause cascading CI failures in `npm ci` steps in other environments or jobs.
