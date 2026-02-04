# 🚀 Database Renaissance - Master Roadmap

This file tracks the reconstruction of the database from scratch, using a SOLID and Scalable architecture.

## 📅 Status: STARTING (2026-01-26)

---

## 🧹 Phase 0: Cleanup & Preparation

- [ ] Archiving/deleting old files under `supabase/migrations`.
- [ ] Identification of old table references in `Supabase.ts` and services.
- [ ] `DROP` all tables in the database (Full cleanup, not TRUNCATE).

## 🏛️ Phase 1: Core Identity & Auth

- [ ] `profiles`: Central player profile (Nickname, XP, Level).
- [ ] `identities`: Multi-auth (Email, Twitter, Discord, Google) mapping.
- [ ] `wallets`: Wallet addresses for Web3 readiness (Phantom, MetaMask).
- [ ] `virtual_accounts`: Main table for virtual balance (Gold, Gems).
- [ ] **Verification:** `schema_version` table and sync control mechanism.

## 📊 Phase 2: Performance & Error Monitoring

- [ ] `error_logs`: Detailed logging of client-side and server-side errors (stack trace, device info).
- [ ] `performance_metrics`: Device-based benchmark data (Average FPS, Memory, Device Model, OS).
- [ ] Detailed `metadata` columns for mobile and desktop separation.

## ⚔️ Phase 3: Gameplay & Anti-Cheat

- [ ] `sessions`: Game sessions and `session_secret` architecture.
- [ ] `price_history`: Optimized (Partitioning/BRIN) table for per-second data from Railway.
- [ ] `market_state`: Live data affecting global game dynamics.
- [ ] **Sync Check:** Type consistency test between backend services and table schema.

## 💰 Phase 4: Finance & Ledger

- [ ] `ledger`: Undeletable financial transaction records (Immutable Audit Trail).
- [ ] `shop_items`: Product definitions.
- [ ] `inventory`: Player inventory.

## 🎁 Phase 5: Rewards & Airdrops (Beta & Early Adopter)

- [ ] `eligibility_criteria`: Reward eligibility rules (e.g., "Reached level 10 during beta").
- [ ] `claims`: Claim system for earned rewards.

---

## 🛠️ Modern Verification Methods (To Be Integrated)

1. **Auto-TypeGen:** Full type safety with `npm run supabase:gen`.
2. **Schema Integrity:** `check_db_version()` RPC call when backend services start.
3. **Automated Integration Tests:** Vitest suites testing the compatibility of the database and services.

---

*Note: This file will be updated throughout the process.*

// END OF PROTOCOL
