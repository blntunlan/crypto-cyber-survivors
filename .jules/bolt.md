## 2025-03-24 - [Avoid test breaks related to dependencies]
**Learning:** Some test suites fail due to unconnected dependencies or stub failures like `Supabase` `signOut` error.
**Action:** When evaluating tests, separate those connected to recent code changes. Avoid fixing unrelated test failures if they are environment-specific to Supabase credentials.
