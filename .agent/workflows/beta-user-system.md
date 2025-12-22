---
description: Beta User System - Nickname login, performance metrics, error tracking implementation
---

# Beta User System Implementation Workflow

Reference: `docs/BETA_USER_SYSTEM_ROADMAP.md`

## Phase 1: Nickname Entry System

### 1.1 Create Database Tables
```bash
# Create Supabase migration via MCP
mcp_supabase-mcp-server_apply_migration with players table SQL
```

### 1.2 Create Services
// turbo
1. Create `services/auth/UserSessionService.ts`
2. Create `services/auth/NicknameValidator.ts`
3. Create `services/auth/types.ts`

### 1.3 Create Components
4. Create `components/screens/NicknameEntryScreen.tsx`
5. Create `components/auth/NicknameInput.tsx`

### 1.4 Create Context & Hooks
6. Create `services/auth/AuthProvider.tsx`
7. Create `hooks/useUserSession.ts`

### 1.5 Integrate into App Flow
8. Modify `App.tsx` to show NicknameEntryScreen before MainMenu

### 1.6 Run Tests
// turbo
```bash
npm run test -- --grep "UserSession"
```

---

## Phase 2: Performance Tracking

### 2.1 Create Performance Service
1. Create `services/analytics/PerformanceTracker.ts`
2. Create `types/analytics.ts`

### 2.2 Create Database Tables
```sql
-- performance_metrics table
-- device_profiles table
```

### 2.3 Create Hook
3. Create `hooks/usePerformanceMetrics.ts`

### 2.4 Integrate with Game Loop
4. Add performance sampling to `App.tsx` RAF loop

---

## Phase 3: Error Reporting

### 3.1 Create Error Service
1. Create `services/analytics/ErrorReporter.ts`

### 3.2 Create Database Table
```sql
-- error_reports table
```

### 3.3 Enhance ErrorBoundary
2. Update `components/ErrorBoundary.tsx` to report errors

### 3.4 Add Global Handlers
3. Add window.onerror and unhandledrejection handlers

---

## Verification Checklist

- [ ] Nickname screen appears on first visit
- [ ] Nickname is validated (3-16 chars, alphanumeric + _)
- [ ] Player record created in Supabase
- [ ] Nickname persisted in localStorage
- [ ] FPS data collected during gameplay
- [ ] Performance metrics synced to Supabase
- [ ] Errors captured and reported
- [ ] Device profile created
- [ ] Session includes player_id reference

---

## Quick Commands

// turbo-all
```bash
# Run lint
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Deploy to Railway
railway up
```
