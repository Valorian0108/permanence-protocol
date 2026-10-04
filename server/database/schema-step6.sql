-- Legacy Step 6: Create public read policies for the original direct-Supabase archive.
-- For nickname-enabled deployments, apply migrations/20261004_contributor_nicknames.sql afterward;
-- it removes these policies and routes public reads through sanitized server endpoints.
-- Also apply 20261003_flexible_record_context.sql before serving records with optional context.
CREATE POLICY "Allow public read access to ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to responses" ON responses FOR SELECT USING (true);
-- Writes use the server-only Supabase service-role key after Privy authentication.
-- No anon/authenticated INSERT, UPDATE, or DELETE policies are created here.
