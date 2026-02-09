-- Enable RLS on schema_versions table
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

-- Optionally, add a default policy (read-only for now)
CREATE POLICY "Allow read access to all" ON public.schema_versions
FOR SELECT USING (true);