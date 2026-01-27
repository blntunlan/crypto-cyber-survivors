-- ============================================
-- ☢️ NUCLEAR DATABASE RESET
-- Date: 2026-01-26
-- Purpose: Completely wipe all public schema objects to start fresh.
-- ============================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Disconnect all other users from the database
    -- (Supabase typically handles this, but good practice for local/dev)

    -- 2. DROP all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- 3. DROP all views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;

    -- 4. DROP all functions & procedures
    FOR r IN (SELECT proname, oidvectortypes(parameter_types) as args
              FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    END LOOP;

    -- 5. DROP all types
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE n.nspname = 'public' AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;

END $$;

-- 6. Ensure extensions are active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
