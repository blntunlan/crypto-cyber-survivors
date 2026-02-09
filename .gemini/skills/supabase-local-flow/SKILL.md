---
name: supabase-local-flow
description: Manages the Local-First development workflow for Supabase, ensuring absolute synchronization between database schema and frontend types. Use when adding new migrations, starting local development, or fixing database-code drifts.
---

# Supabase Local-First Workflow

This skill enforces a "Database-as-Code" discipline to prevent drifts between Supabase and the application code.

## 🛠️ Core Commands

- **Start Local Dev:** `supabase start` (Requires Docker)
- **Stop Local Dev:** `supabase stop`
- **Capture Changes:** `supabase db diff --local -f <name>` (Creates a migration from local schema changes)
- **Apply & Sync:** `supabase migration up && npm run supabase:gen`

## 📋 Standard Workflow

### 1. Feature Development
1. Start the local environment: `supabase start`.
2. Apply any pending migrations: `supabase migration up`.
3. Make changes to the database using Supabase Studio (`localhost:54323`).
4. Generate a migration for your changes: `supabase db diff --local -f my_feature_name`.
5. Sync types: `npm run supabase:gen`.

### 2. Deployment
1. Verify all local migrations pass: `supabase db reset`.
2. Push to production: `npx supabase db push`.
3. Always verify `types/supabase.ts` is committed alongside migrations.

## 🛡️ Guardrails

- **NEVER** modify production schema directly via Dashboard.
- **ALWAYS** run `npm run supabase:gen` after any migration change.
- **ALWAYS** check `VITE_SUPABASE_URL` in `.env.development` points to `http://127.0.0.1:54321`.

## 📂 Resources
- [Schema Best Practices](references/schema-standards.md)
- [Seed Data Guide](references/seeding.md)
