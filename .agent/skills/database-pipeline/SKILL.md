# 🗄️ Database Alignment & Pipeline Skill

This skill provides the standard workflow for managing the Supabase PostgreSQL database pipeline in the Crypto Survivors project.

## 🎯 Global Goals
1.  **Zero Null Discrepancy**: No critical game data should ever be NULL in the DB.
2.  **Type Safety**: TypeScript types must always reflect the DB schema.
3.  **Strict Validation**: Data must be validated *before* hitting the database.

## 🛠️ Unified Workflow

### 1. Schema Changes (DB-First)
When adding or modifying columns:
- Create a new migration file in `supabase/migrations/NNN_xxx.sql`.
- **Rule**: Use `NOT NULL` for all required fields. Use `DEFAULT` for stats.
- **Rule**: Always include `created_at` and `updated_at` (and the `handle_updated_at` trigger).

### 2. Type Synchronization
After any schema change:
1. Run `npm run supabase:gen`.
2. Verify `types/supabase.ts` contains the new schema.
3. Fix any frontend TS errors caused by the change immediately.

### 3. Frontend Validation (Zod)
For every table insert:
1. Create a Zod schema in `schemas/dbContracts.ts` that matches the DB table exactly.
2. Use `.nonstrict()` if you only care about mandatory fields, or `.strict()` for full alignment.
3. Wrap insertions in a safe utility:

```typescript
// Example Implementation Path
import { DbTableSchema } from '../schemas/dbContracts';

async function safeInsert(table: 'game_sessions', data: any) {
  const validated = DbTableSchema.parse(data); // Throws if invalid
  return supabase.from(table).insert(validated);
}
```

## 🔍 Continuous Integration (Linter)
Monitor the `v_db_standards_violations` view regularly (via browser or console) to catch tables that:
- Lack primary keys.
- Allow NULL in critical stats.
- Use deprecated naming like `user_id`.

## 🚀 Deployment
Always run migrations via the Supabase CLI (`npx supabase db push`) to ensure production mirrors the development schema.
