# 🗄️ Crypto Survivors Database Guidelines

This document defines our database standards. All new migrations must comply with these rules.

## 📏 Naming Standards

- **Tables**: `snake_case` and plural (`players`, `game_sessions`).
- **Columns**: `snake_case` (`player_id`, `created_at`).
- **Views**: Use `v_` prefix (`v_leaderboard`).
- **Triggers**: Use `trg_` prefix (`trg_players_updated_at`).
- **Foreign Keys**: Must end with `_id` and contain the related table name (`player_id`).

## 🕒 Atomic Timestamps

Every table must include these two columns without exception:
- `created_at`: `TIMESTAMPTZ DEFAULT NOW()` (Never changes).
- `updated_at`: `TIMESTAMPTZ DEFAULT NOW()` (Triggered on every update).

**Trigger Example:**
```sql
CREATE TRIGGER trg_table_name_updated_at 
BEFORE UPDATE ON public.table_name 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## 🆔 Identity Management

- Primary Keys must always be `UUID` and use `gen_random_uuid()`.
- Player references must always be named `player_id` (Legacy `user_id` is deprecated).

## 📊 Governance Layer (Views)

The use of `v_` prefixed views instead of direct tables in application code (Frontend/Edge Functions) is encouraged. This protects the application when the table structure changes (Breaking Change).

## 🛡️ Security (RLS)

- No table shall be left with `Row Level Security` (RLS) disabled.
- **Deny by Default**: Disable all permissions first (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), then add only required permissions.
- Use special functions with `SECURITY DEFINER` and permission checks for sensitive operations (e.g., updating `wallet_balance`).

## 💰 Economy & Transaction Logic (Ledger)

- Balances must never be modified directly via `UPDATE`.
- Every balance change must be entered as a record in the `ledger` table.
- The current balance can be updated in the `player_wallets` table via a trigger or calculated from the transaction table.

## 🚀 Performance & Indexing

- **BRIN Indexes**: Use `BRIN` (Block Range Index) for large append-only tables like log tables (`price_logs`, `cheat_attempts`).
- **FK Indexes**: An index must be defined for every foreign key column.
- **JSONB Querying**: Add a `GIN` index if JSONB columns are to be queried.

## 🧹 Migration Management

- Migration files must be in the format `XXX_description.sql`.
- Every migration must be wrapped in `BEGIN;` and `COMMIT;` blocks.
- Every migration file must be **Idempotent** (`IF NOT EXISTS`, `DROP IF EXISTS`).

---

// END OF PROTOCOL
