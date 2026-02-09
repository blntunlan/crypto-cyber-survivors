# Refactoring Architect: SOLID & Design Pattern Evolution Protocol

## Description
This skill transforms existing code into a highly maintainable, decoupled, and performant architecture. It applies SOLID principles, Design Patterns (Strategy, Factory, Decorator, etc.), and modern state management patterns (Slice Pattern) while ensuring O(1) performance in game loops.

## Usage
Activate this skill when the user asks to:
- "Refactor the codebase for better standards."
- "Apply SOLID principles to this module."
- "Modernize the architecture."
- "Reduce coupling between services."
- "Improve maintainability and testability."

---

## 1. ARCHITECTURAL AUDIT (The "Blueprint Check")

Before making changes, evaluate the code against these five pillars:

### A. S - Single Responsibility (The "Atomicity" Check)
- **God Classes/Stores:** Does a file handle more than 3 distinct domains (e.g., Audio + UI + Progress)?
- **Logic vs. Orchestration:** Is a service doing heavy math AND managing event emissions?
    - *Action:* Split into Logic-Only pure functions and Orchestration-Only services.

### B. O - Open/Closed (The "Extension" Check)
- **Switch/If-Else Chains:** Are there long chains of type checks (e.g., `if (enemyType === 'bear')`)?
    - *Action:* Replace with **Strategy Pattern** or **Factory Pattern**.

### C. L/I - Liskov & Interface Segregation (The "Contract" Check)
- **Fat Interfaces:** Does an interface have methods that some implementations don't use?
    - *Action:* Break into smaller, specialized interfaces (e.g., `IMovable`, `IDamageable`).

### D. D - Dependency Inversion (The "Decoupling" Check)
- **Concrete Hard-coding:** Does a service import another concrete service directly?
    - *Action:* Use **Interface-based injection** or ensure dependencies are passed via constructors/init methods.

---

## 2. REFACTORING STRATEGIES

### Strategy 1: The Slice Pattern (For Zustand)
- Break monolithic stores into logical slices:
    - `settingsSlice.ts`, `progressSlice.ts`, `sessionSlice.ts`.
- Merge them into a single `useGameStore` to maintain a single source of truth but with isolated code.

### Strategy 2: Logic Extraction (Pure Functions)
- Extract math-heavy logic (intercept calculations, damage rolls) into `utils/` or `strategies/` as pure, stateless functions.
- This makes them 100% unit-testable without mocking services.

### Strategy 3: Service Layering
- **Layer 1 (Data):** Raw config and state.
- **Layer 2 (Logic):** Pure calculations.
- **Layer 3 (Service):** State management and EventBus orchestration.
- **Layer 4 (UI/Engine):** Consumers of Layer 3.

---

## 3. IMPLEMENTATION WORKFLOW

### Phase 1: Dependency Analysis
- Use `search_file_content` to find all files importing the target module.
- List all public methods being refactored.

### Phase 2: Parallel Implementation
- Create the NEW version of the service/store (e.g., `NewCombatSystem.ts`) alongside the old one if the change is high-risk.
- Or use atomic `replace` if the change is strictly structural.

### Phase 3: Integrity Verification
1. **Type Check:** Run `tsc` to ensure the "Contract" is still honored.
2. **Unit Tests:** Every refactored logic MUST have a corresponding test that covers edge cases.
3. **Performance Check:** Ensure NO `new` keywords or `.map/.filter` are added to functions called within `processAutoFire` or `render`.

---

## 4. SUCCESS METRICS
- **Cyclomatic Complexity:** Reduced.
- **File Length:** Under 200 lines (ideal).
- **Test Coverage:** 100% for the refactored logic.
- **Coupling:** Zero direct imports of concrete services (prefer interfaces).
