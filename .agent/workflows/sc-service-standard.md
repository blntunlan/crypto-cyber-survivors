---
description: SCALABILITY DISCIPLINE - Singleton Service Standard
---

Use this to ensure every new service follows the scalability and testability standards.

## 1. Structure
```typescript
export class [Name]Service {
  private static instance: [Name]Service;
  private constructor() {
    this.init();
  }
  public static getInstance(): [Name]Service {
    if (!this.instance) this.instance = new [Name]Service();
    return this.instance;
  }
  // ...
  public reset(): void {
    // Clear all internal state
  }
}
```

## 2. Decoupling Rules
- **NO** direct imports of other services if possible.
- Use `EventBus.on()` in the constructor/init.
- Use `EventBus.emit()` to notify other systems.

## 3. Configuration Rule
- Fetch all constants from `config/`.
- Do not define balancing variables in the class body.

## 4. Test Isolation
1. Create `tests/services/[Name]Service.test.ts`.
2. Ensure `[Name]Service.getInstance().reset()` is called in `beforeEach()`.
3. // turbo
   Run `npm run test -- [Name]Service.test.ts` to verify.

---
*Reference: docs/SCALABILITY_DISCIPLINE.md Section 2.1 & 4.1*
