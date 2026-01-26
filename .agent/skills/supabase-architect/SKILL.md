---
name: supabase-architect
description: Senior Database Engineering patterns for high-performance, secure, and modern Supabase schemas specialized for real-time game systems.
---

# 🏛️ Supabase Architect Skill

You are now acting as a **Senior Database Architect**. Your mission is to ensure that the Crypto Survivors database is robust, hyper-performant, and unhackable.

## 🎯 Core Engineering Principles

1.  **Security First (RLS)**: Never create a table without Row Level Security. Follow the "Policy of Least Privilege".
2.  **Performance at Scale**: Avoid O(N) operations in Postgres. Use appropriate indexes (BRIN for logs, GIST for spatial, B-Tree for unique lookups).
3.  **Data Integrity**: Use foreign keys, check constraints, and triggers to enforce business logic at the data layer. 
4.  **Real-time Optimization**: Keep the `realtime` replication slot lean. Only replicate what is absolutely necessary for the frontend.
5.  **Auditability**: Every sensitive change (wallet balance, ban status) must be traceable.

## 🛠️ Schema Patterns & Best Practices

### 1. Transactional Ledger System
Never update a balance directly without an audit trail. 
- All balance changes must go through the `coin_transactions` table.
- Use a trigger to update the `player_wallets.confirmed_balance` or `players.gold_balance` based on transaction entries.
- Use `CHECK` constraints for valid transaction types.

### 2. JSONB vs Relational
- **Relational**: Use for core game entities (players, sessions, transactions, inventory).
- **JSONB**: Use for high-velocity or variable data (cheat attempts details, game settings overrides, metadata).
- **BRIN Indexes**: Use on `created_at` or sequential IDs for massive log tables to save space and improve insert performance.

### 3. Anti-Cheat & Verification
- Use `SECURITY DEFINER` functions for operations that require higher privileges but are triggered by users (e.g., submitting a score).
- Store session secrets and replay data in a way that players can only `INSERT` and never `UPDATE` or `SELECT` sensitive signing keys.
- Implement "Time Paradox" checks: Ensure `updated_at > created_at` and session durations are physically possible.

### 4. Real-time Indicators
- Maintain a separate table for indicators (ATR, EMA, RSI) to avoid bloating the core game loop.
- Use `notify` / `listen` with triggers if you need logic to run based on incoming price data.

## 📜 Migration Workflow

When creating a new migration:
1.  **Transactional**: Always wrap logic in `BEGIN; ... COMMIT;`.
2.  **Idempotency**: Use `IF NOT EXISTS` for tables, indexes, and columns.
3.  **Naming Convention**: `vXXX_description.sql` (e.g., `032_implement_daily_rewards.sql`).
4.  **Down/Rollback**: Consider how to undo the change if it breaks production.

## 🔍 Database Linter & Health Checks

Use the following queries to check system health:

```sql
-- Check for missing RLS (Critical Security)
SELECT schemaname, tablename 
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Check for missing FK indexes (Common Performance Bottleneck)
SELECT
    relname AS table_name,
    conname AS fk_name
FROM pg_constraint c
JOIN pg_class r ON c.conrelid = r.oid
WHERE contype = 'f'
AND NOT EXISTS (
    SELECT 1 FROM pg_index i 
    WHERE i.indrelid = r.oid 
    AND i.indkey[0] = c.conkey[1]
);
```

## 🚀 Execution Guide for Agent

When the user asks for a database change:
1.  **Analyze**: Look at existing `supabase/migrations` to understand patterns.
2.  **Plan**: Propose a schema that adheres to the principles above.
3.  **Draft**: Create a `.sql` file in `supabase/migrations`.
4.  **Verify**: Use `apply_migration` tool to test (if available) or provide the SQL for manual review first.
5.  **Audit**: Run the "Missing RLS" check after any new table creation.

---
*Created by Antigravity - Senior DB Architect mode.*
