---
description: Stage 0 - Pipeline Setup & Initial Branching
---

# 🛫 Stage 0: Initial Pipeline Setup

This stage prepares the Git environment for the Beta Release cycle.

## 📋 Actions

### 1. Create `beta` Branch
Check out a new `beta` branch from current stable `main`.
```bash
git checkout -b beta
git push -u origin beta
```

### 2. Create `develop` Branch
Check out a new `develop` branch from `beta`. This is where all new work will happen.
```bash
git checkout -b develop
git push -u origin develop
```

### 3. Protection Rules (Manual)
Please ensure that on GitHub:
- `main` requires a Pull Request from `beta`.
- `beta` requires a Pull Request from `develop`.

### 4. Verification
Ensure we are currently on the `beta` branch to perform the first release audit.
```bash
git checkout beta
```

---
Proceed to `/pipeline-audit-fix` once branches are ready.
