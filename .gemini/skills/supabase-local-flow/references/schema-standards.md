# Supabase Schema Standards

To maintain consistency between the Database and Typescript types, follow these rules:

## 1. Naming Conventions
- **Tables:** `snake_case` plural (e.g., `profiles`, `game_sessions`).
- **Columns:** `snake_case` (e.g., `auth_user_id`, `created_at`).
- **Primary Keys:** Always `id` as `UUID` (except for logs/history tables where `BIGSERIAL` might be used).
- **Foreign Keys:** `table_name_singular_id` (e.g., `profile_id`).

## 2. Security (RLS)
- Every table MUST have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- Use `InitPlan` optimization: `(SELECT auth.uid()) = auth_user_id`.
- For `profile_id` links, always use subquery verification: 
  `profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())`.

## 3. Auditing
- Every record MUST have `created_at TIMESTAMPTZ DEFAULT NOW()`.
- Modifiable records MUST have `updated_at TIMESTAMPTZ DEFAULT NOW()` and a trigger to update it.
