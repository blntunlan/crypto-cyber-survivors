# Supabase Security Best Practices Reference

## Row Level Security (RLS)
- **Always Enable RLS**: Every table in the `public` schema must have RLS enabled.
- **Avoid Default Allow**: Never use `USING (true)` for `anon` or `authenticated` roles unless the data is truly public.
- **Service Role**: Remind users that `service_role` bypasses RLS. It should only be used in Edge Functions or backend services.
- **auth.uid()**: Use `auth.uid() = user_id` for owner-based access.
- **Policies by Action**: Explicitly define policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

## Schema Security
- **Sensitive Data**: Keep sensitive data (emails, keys) in private schemas or encrypted columns if possible.
- **Function Security**: Use `SECURITY INVOKER` (default) for functions unless `SECURITY DEFINER` is strictly necessary (e.g., for auth triggers). If using `SECURITY DEFINER`, set the `search_path` to empty or a specific schema.

## Common Pitfalls
- **Implicit Joins in Policies**: Be careful with complex joins in RLS policies as they can cause performance issues.
- **Leaking Existence**: `SELECT` policies should filter out rows rather than throwing errors to avoid leaking that a record exists.
