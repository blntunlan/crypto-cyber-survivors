# 📋 Tasks and Improvements List

**Date**: 2026-01-18  
**Last Check**: Supabase Advisors, Lint, Tests, Roadmap

---

## 🔴 Critical (Must Be Done Immediately)

### Nothing! ✅

All critical issues have been fixed:
- ✅ RLS security vulnerabilities closed
- ✅ Data flow corrected (UPSERT pattern)
- ✅ Edge function returns UUID
- ✅ Lint 0 errors
- ✅ Tests passing (1431/1431)

---

## 🟡 Medium Priority (Performance Improvements)

### Supabase Performance Advisories

| Issue | Table | Recommendation | Impact |
|-------|-------|-------|------|
| Missing FK index | `player_achievements.achievement_id` | Add INDEX | Medium |
| Missing FK index | `player_achievements.session_id` | Add INDEX | Medium |
| Missing FK index | `player_inventory.item_id` | Add INDEX | Medium |
| Missing FK index | `verification_failures.session_id` | Add INDEX | Low |
| Unused index | `idx_market_state_whale_tier` | Remove or wait | Low |
| Unused index | `idx_price_logs_pair_timestamp` | Remove or wait | Low |
| Unused index | `idx_coin_transactions_player` | Remove or wait | Low |
| Unused index | `idx_withdrawal_status` | Remove or wait | Low |

**Fix SQL:**
```sql
-- Add missing FK indexes
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement_id 
  ON player_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_session_id 
  ON player_achievements(session_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item_id 
  ON player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_verification_failures_session_id 
  ON verification_failures(session_id);
```

---

## 🟢 Low Priority (Future Improvements)

### TODOs Found in Code

| File | Line | Description |
|-------|-------|----------|
| `tests/screens/CycleCompleteScreen.test.tsx` | 138 | CardIcons mock fix (test env) |

### Tasks Pending from Master Roadmap

| Category | Task | Priority |
|----------|------|---------|
| **Anti-Cheat** | Session signing | ⭐⭐⭐⭐⭐ |
| **Anti-Cheat** | Replay hash verification | ⭐⭐⭐⭐ |
| **Anti-Cheat** | Client obfuscation | ⭐⭐⭐ |
| **Anti-Cheat** | DevTools detection | ⭐⭐⭐ |
| **PWA** | Manifest + icons | ⭐⭐⭐⭐ |
| **PWA** | Service worker (offline) | ⭐⭐⭐ |
| **PWA** | Install prompt | ⭐⭐⭐ |
| **UI/UX** | Tutorial/Onboarding | ⭐⭐ |
| **Web3** | Wallet Connect | ⬜ (Future) |
| **Web3** | NFT Contract | ⬜ (Future) |
| **Native** | Capacitor | ⬜ (Future) |
| **Native** | App Store submission | ⬜ (Future) |

---

## 📊 Current Status Summary

| Check | Status |
|---------|-------|
| **Supabase Security** | ✅ 0 errors |
| **Supabase Performance** | 🟡 8 INFO (not critical) |
| **ESLint** | ✅ 0 errors, 0 warnings |
| **Unit Tests** | ✅ 1431 passed |
| **Railway Services** | ✅ 2/2 active |
| **Edge Functions** | ✅ 2/2 active |
| **Data Flow** | ✅ Corrected |
| **RLS Policies** | ✅ Corrected |

---

## 🚀 Recommended Next Steps

### Immediate (Today)
1. ~~Deploy changes to Railway~~ (optional - tests passing)

### This Week
1. **Add FK indexes** (5 min migration)
2. **Create PWA manifest** (30 min)
3. **Add Service worker** (1 hour)

### Next Sprint
1. Anti-cheat session signing
2. Replay verification
3. Tutorial/Onboarding

---

## 🎯 Decision Points

| Decision | Options | Status |
|-------|-----------|-------|
| NFT blockchain | Solana vs Polygon | ⬜ Pending |
| Monetization | Free-to-play vs NFT-gated | ⬜ Pending |
| Token | Existing vs new token | ⬜ Pending |

---

## ✅ Results

**No critical issues!** Project is in a stable state. 

Performance indexes can be added but are not urgent - the game is already working.

---

// END OF PROTOCOL
