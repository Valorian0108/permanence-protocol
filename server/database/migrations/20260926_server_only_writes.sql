-- Run in the Supabase SQL editor to prevent anon/authenticated users from
-- inserting, updating, or deleting archival rows directly. Server routes use
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS and must remain server-only.

DROP POLICY IF EXISTS "Allow insert to ideas" ON ideas;
DROP POLICY IF EXISTS "Allow insert to responses" ON responses;
DROP POLICY IF EXISTS "Prevent updates to ideas" ON ideas;
DROP POLICY IF EXISTS "Prevent deletes to ideas" ON ideas;
DROP POLICY IF EXISTS "Prevent updates to responses" ON responses;
DROP POLICY IF EXISTS "Allow deletes to responses only when parent idea is deleted" ON responses;

-- Remove any other table policies that grant writes to public API roles.
DROP POLICY IF EXISTS "ideas_insert_policy" ON ideas;
DROP POLICY IF EXISTS "ideas_update_policy" ON ideas;
DROP POLICY IF EXISTS "ideas_delete_policy" ON ideas;
DROP POLICY IF EXISTS "responses_insert_policy" ON responses;
DROP POLICY IF EXISTS "responses_update_policy" ON responses;
DROP POLICY IF EXISTS "responses_delete_policy" ON responses;

-- Remove any other policy that grants writes, regardless of its custom name,
-- while preserving public SELECT policies.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policies.polname, tables.relname
    FROM pg_policy AS policies
    JOIN pg_class AS tables ON tables.oid = policies.polrelid
    JOIN pg_namespace AS namespaces ON namespaces.oid = tables.relnamespace
    WHERE namespaces.nspname = 'public'
      AND tables.relname IN ('ideas', 'responses')
      AND policies.polcmd <> 'r'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.polname, policy_record.relname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON TABLE ideas, responses FROM PUBLIC, anon, authenticated;
