# Update Database Types Skill

## Description
Updates the local TypeScript types to match the current Supabase database schema.

## When to Use
- After making changes to the Supabase database schema (creating tables, adding columns).
- When you encounter type errors related to database entities.
- Before starting work on a feature that involves new database tables.

## Instructions
1.  Run the Supabase type generation command:
    ```bash
    npm run supabase:gen
    ```
2.  Verify that `types/supabase.ts` (or the configured output file) has been updated.
3.  If the command fails, check your internet connection and Supabase login status (`npx supabase login`).
4.  If types are updated, run `npm run lint` to ensure no breaking changes were introduced to existing code.

## Context
This project uses Supabase for the backend. We maintain strict TypeScript types generated directly from the database schema to ensure type safety.
