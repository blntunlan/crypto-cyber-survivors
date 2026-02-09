---
description: SCALABILITY DISCIPLINE - Unified Feature Scaffold (Feature-Based Slicing)
---

Follow this workflow to create a new, self-contained feature as per the Scalability Discipline.

## 1. Directory Setup
Create a dedicated folder under `features/` for the new system.
- `features/[feature-name]/`
  - `services/`: Specific singleton services for the feature.
  - `components/`: UI components (View layer).
  - `hooks/`: Custom React hooks for UI-logic connection.
  - `types/`: Interface and Type definitions.

## 2. Service Protocol
If the feature requires logic:
1. Create a Singleton Service in `features/[feature-name]/services/`.
2. **MANDATORY**: Implement a `reset()` method to clear state.
3. **MANDATORY**: Register the reset method in the global `test-utils` or `GameStore.reset()`.
4. Use `EventBus` for cross-feature communication.

## 3. Data Integration
- Place all magic numbers and balancing data in `config/`.
- Ensure the feature consumes this data dynamically.

## 4. Localization
1. Add keys to `public/locales/en/common.json`.
2. // turbo
   Run `node sync_locales.cjs` to propagate to other languages.

## 5. Validation (TDD)
1. Create tests in `tests/features/[feature-name]/`.
2. Ensure 70%+ coverage.
3. // turbo
   Run `npm run test -- --run` to verify.

---
*Reference: docs/SCALABILITY_DISCIPLINE.md Section 2.2*
