-- Step 6: Create RLS policies
CREATE POLICY "Allow public read access to ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to responses" ON responses FOR SELECT USING (true);
CREATE POLICY "Allow insert to ideas" ON ideas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert to responses" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Prevent updates to ideas" ON ideas FOR UPDATE USING (false);
CREATE POLICY "Prevent deletes to ideas" ON ideas FOR DELETE USING (false);
CREATE POLICY "Prevent updates to responses" ON responses FOR UPDATE USING (false);
CREATE POLICY "Allow deletes to responses only when parent idea is deleted" ON responses FOR DELETE USING (true);