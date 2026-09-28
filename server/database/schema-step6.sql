-- Step 6: Create RLS policies
CREATE POLICY "Allow public read access to ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to responses" ON responses FOR SELECT USING (true);
-- Writes use the server-only Supabase service-role key after Privy authentication.
-- No anon/authenticated INSERT, UPDATE, or DELETE policies are created here.
