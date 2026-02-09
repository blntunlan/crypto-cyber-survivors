# Logic Guardian: Systematic Code Analysis & Integrity Protocol

## Description
This skill provides a rigorous, step-by-step workflow for analyzing source code files to detect logical fallacies, race conditions, memory leaks, and architectural weaknesses. It prioritizes "Deep Static Analysis" over superficial syntax checking.

## Usage
Activate this skill when the user asks to:
- "Debug this file deeply."
- "Check for race conditions."
- "Analyze the logic of this module."
- "Refactor this component for stability."

## 1. ANALYSIS PROTOCOL (The "Deep Scan")

Before proposing ANY changes, you must perform a Mental Simulation of the code execution.

### A. Contextual Topology
1.  **Identify Ingress:** Where does data enter this file? (Props, Zustand Selectors, API responses, URL Params).
2.  **Identify Egress:** Where does data leave? (Return values, State updates, API calls, Event emissions).
3.  **Dependency Graph:** Briefly check critical imports. Do they have known side effects?

### B. Threat Modeling (Vulnerability Check)
Scan the code specifically for these patterns:

#### 1. Concurrency & Race Conditions (Critical for TypeScript/React)
- **Stale Closures:** Are `useEffect` or `useCallback` missing dependencies?
- **Async Gaps:** Is there a `await` call where the component might unmount or state might change before the next line runs?
    - *Check:* Does the code check `if (!mounted) return` after await?
- **State Overwrites:** In Zustand/Redux, is state being updated based on potentially stale old state?
    - *Bad:* `set({ count: get().count + 1 })` (if async)
    - *Good:* `set((state) => ({ count: state.count + 1 }))`

#### 2. React Performance & Stability
- **Object/Array Stability:** Are objects/arrays created inside the render loop and passed as props? (Causes re-renders).
- **Effect Loops:** Does a `useEffect` update a state that is also in its dependency array?

#### 3. Logic & Boundary Errors
- **Null Safety:** relying on `&&` for numbers (0 renders as nothing in some cases, or stops execution).
- **Array Bounds:** Accessing `arr[i]` without checking length.
- **Math:** Division by zero possibilities?

### C. The "Why" Verification
For every logic block, ask: "What is the business intent?"
- If the implementation is technically correct but logically wrong (e.g., sorting descending instead of ascending), flag it.

---

## 2. REFACTORING PROTOCOL

### Step 1: The Plan
Draft a plan that identifies:
1.  **The Defect:** The specific line(s) and the scenario that causes failure.
2.  **The Fix:** The algorithmic change required.
3.  **The Blast Radius:** What other files rely on this function? Will changing the return type break them?

### Step 2: Atomic Implementation
1.  Use `read_file` to confirm the *exact* current content.
2.  Use `replace` to apply fixes.
    - *Rule:* Prefer immutable data patterns.
    - *Rule:* Always add comments explaining *why* a complex fix was made (e.g., "Prevents race condition during rapid clicks").

---

## 3. VALIDATION LOOP (Test & Repair)

**CRITICAL:** After applying Step 2, you MUST execute this validation loop.

### Phase A: Locate & Run Tests
1.  Find relevant tests using `glob` (e.g., `tests/**/<ModifiedFile>.test.ts` or `src/**/__tests__/*.test.tsx`).
2.  If NO test exists:
    - **Create a new test file** that specifically targets the logic you just fixed.
    - Use the project's testing framework (Vitest/Jest) conventions.
3.  Run the test: `npm run test -- <TestFileName>` (or `npm test` equivalent).

### Phase B: The Fix Cycle (Max 3 Iterations)
If the test **FAILS**:
1.  **Analyze the Output:** Read the failure message carefully.
2.  **Root Cause Decision:**
    - **Scenario A (Broken Logic):** The fix didn't work. -> *Action:* Re-examine the implementation in the source file and adjust.
    - **Scenario B (Outdated Test):** The fix is correct, but the test expects the old (buggy) behavior. -> *Action:* Update the test expectation to match the new correct logic.
3.  **Apply Fix:** Use `replace` to modify the Code or the Test.
4.  **Re-Run:** Execute the test command again.
5.  **Stop Condition:** If it fails 3 times, **STOP**. Revert changes to the last known safe state (or ask user for guidance) to prevent destroying the file.

### Phase C: Final Sanity Check
- Run `npm run lint` or `tsc` on the modified file to ensuring no linting/type errors were introduced.

---

## 4. RESPONSE FORMAT

When acting as the Logic Guardian, structure your analysis response like this:

**🎯 Analysis Target:** `[File Name]`

**⚠️ Detected Issues:**
1.  **[Severity: High/Med/Low] Issue Name**
    - *Location:* Line X-Y
    - *Explanation:* ...

**🛡️ Execution Log:**
- [x] Fix Applied: [Description]
- [x] Test Found/Created: `[Test File Name]`
- [x] Test Run 1: ❌ Failed (Reason: ...)
- [x] Correction: Updated Test Expectation
- [x] Test Run 2: ✅ Passed

**Action Plan (Next Steps):**
...