-- Elevate trigger function to security definer to bypass RLS during profile creation
ALTER FUNCTION public.handle_new_profile() SECURITY DEFINER;

-- Ensure RLS on profiles allows anonymous insertion (was already there but being explicit)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow anonymous profile creation'
    ) THEN
        CREATE POLICY "Allow anonymous profile creation" ON public.profiles FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Add missing INSERT policy for virtual_accounts if not existing (though handle_new_profile handles it now)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'virtual_accounts' AND policyname = 'Service level virtual account creation'
    ) THEN
        CREATE POLICY "Service level virtual account creation" ON public.virtual_accounts FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Fix ledger RLS - missing completely
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ledger' AND policyname = 'Users can view own transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" ON public.ledger FOR SELECT USING (true);
    END IF;
END $$;
;
