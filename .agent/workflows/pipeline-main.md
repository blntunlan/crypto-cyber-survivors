---
description: Beta Release Pipeline Orchestrator - Manages the end-to-end release process
---

# 🏗️ Beta Release Pipeline Orchestrator

This pipeline is designed for the first **Beta Release** and establishes a permanent workflow for stable promotions.

## 🌉 Branching Strategy
- `main`: Production (Active: https://crypto-survivors.com)
- `beta`: Release candidates and beta-grade builds.
- `develop`: Ongoing feature development and integration.

## 🧬 Pipeline Stages

### STAGE 0: Setup & Branching
Initialize the beta environment and establish the branch structure.
- **Workflow**: `/pipeline-setup`

### STAGE 1: Deep Logic Audit & Zero-Workaround Fix
Comprehensive code review to eliminate logic errors and structural issues.
- **Workflow**: `/pipeline-audit-fix`
- **Rule**: NO workarounds. Solve the root cause.

### STAGE 2: Systematic Validation
Verification of all systems through the full test suite.
- **Workflow**: `/pipeline-validation`
- **Goal**: 100% test pass rate + coverage targets.

### STAGE 3: Release & Promotion
Deployment to beta environment and tagging.
- **Workflow**: `/pipeline-release`

---

## 🛠️ How to run
1. Start with `/pipeline-setup` to prepare branches.
2. Follow the stages in order.
3. Once completed, new features will live in `develop` and move to `beta` only after passing this pipeline.

*Created for Beta Release v1.0.0-beta*
