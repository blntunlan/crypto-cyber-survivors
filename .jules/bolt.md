# Bolt's Journal

## 2024-05-22 - CI Failure Investigation
**Learning:** CI failed due to `TypeError: __vite_ssr_import_1__.Logger.warn is not a function` and related `AssertionError`s in `services/supabase/client.test.ts` and `SupabaseInfrastructure.test.ts`. This suggests a circular dependency or import order issue with `Logger` when running in the test environment (Vitest). The `Logger` import in `services/supabase/client.ts` seems to be the culprit.
**Action:** Replace `Logger.warn` with `console.warn` in `services/supabase/client.ts` to break the circular dependency. This is a robust fix for low-level infrastructure code that might be imported by the Logger itself or its dependencies.

## 2024-05-22 - Supabase Client Mocking in Tests
**Learning:** Replacing `Logger` with `console` fixed the circular dependency, but tests `tests/services/supabase/client.test.ts` and `tests/services/SupabaseInfrastructure.test.ts` are still failing with `AssertionError`.
1. `SupabaseInfrastructure.test.ts`: `expect(supabase).toBeNull()` failed because `supabase` is now an object (the proxy object exported by `client.ts`), even when configuration is missing. The test expects `null` but the code exports a proxy object.
2. `client.test.ts`: `expect(createClient).toHaveBeenCalled()` failed. This likely means the module is being imported *before* the environment variables are stubbed, or `vi.mock` is not working as expected with the dynamic import pattern used in the test.
**Action:**
1. Update `SupabaseInfrastructure.test.ts` to check `expect(supabase.auth).toBeUndefined()` instead of `toBeNull()`, matching the actual implementation of the proxy object.
2. Update `client.test.ts` to ensure `vi.stubEnv` is called *before* dynamic import, or verify the mocking strategy. The test uses `await import(...)` so it should pick up the env vars if set before. However, if the module was already imported by another test or setup file, it might be cached. We need to reset modules.
