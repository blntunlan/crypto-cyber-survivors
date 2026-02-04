-- Enable RLS on schema_versions
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read schema versions
CREATE POLICY "Allow public read access to schema_versions" ON public.schema_versions
    FOR SELECT
    TO public
    USING (true);;
